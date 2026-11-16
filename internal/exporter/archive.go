package exporter

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Archive streams already compressed images to a temporary ZIP. It never
// writes individual image files, and publishes only a complete archive.
type Archive struct {
	file   *os.File
	writer *zip.Writer
	dir    string
	names  map[string]bool
	count  int
	closed bool
}

func NewArchive(dir string) (*Archive, error) {
	f, err := os.CreateTemp(dir, ".imgcompress-*.partial")
	if err != nil {
		return nil, err
	}
	return &Archive{file: f, writer: zip.NewWriter(f), dir: dir, names: map[string]bool{}}, nil
}

func (a *Archive) Add(name, mime string, data []byte) error {
	if a.closed {
		return errors.New("压缩包已关闭")
	}
	if a.count >= 200 {
		return errors.New("压缩包最多包含 200 张图片")
	}
	if name == "" || name == "." || name == ".." || strings.ContainsAny(name, "/\\\x00") || len(name) > 180 {
		return errors.New("无效的图片文件名")
	}
	if len(data) == 0 || len(data) > MaxBytes {
		return errors.New("图片为空或超过 100 MB")
	}
	ext, err := extension(data, mime)
	if err != nil {
		return err
	}
	stem := strings.TrimSuffix(name, filepath.Ext(name))
	if strings.TrimSpace(stem) == "" {
		stem = "image"
	}
	entry := stem + "-compressed" + ext
	for n := 1; a.names[strings.ToLower(entry)]; n++ {
		entry = fmt.Sprintf("%s-compressed-%d%s", stem, n, ext)
	}
	header := &zip.FileHeader{Name: entry, Method: zip.Store, Modified: time.Now()}
	header.SetMode(0644)
	w, err := a.writer.CreateHeader(header)
	if err != nil {
		return err
	}
	if _, err = w.Write(data); err != nil {
		return err
	}
	a.names[strings.ToLower(entry)] = true
	a.count++
	return nil
}

func (a *Archive) Cancel() error {
	if a.closed {
		return nil
	}
	a.closed = true
	return errors.Join(a.file.Close(), os.Remove(a.file.Name()))
}

func (a *Archive) Finish() (path string, err error) {
	if a.closed {
		return "", errors.New("压缩包已关闭")
	}
	defer func() { err = errors.Join(err, a.Cancel()) }()
	if a.count == 0 {
		return "", errors.New("没有可打包的图片")
	}
	if err = a.writer.Close(); err != nil {
		return "", err
	}
	if _, err = a.file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	stem := "ImgCompress-" + time.Now().Format("20060102-150405")
	for n := 0; n < 10000; n++ {
		suffix := ""
		if n > 0 {
			suffix = fmt.Sprintf("-%d", n)
		}
		candidate := filepath.Join(a.dir, stem+suffix+".zip")
		out, openErr := os.OpenFile(candidate, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		if errors.Is(openErr, os.ErrExist) {
			continue
		}
		if openErr != nil {
			return "", openErr
		}
		_, copyErr := io.Copy(out, a.file)
		closeErr := out.Close()
		if err = errors.Join(copyErr, closeErr); err != nil {
			return "", errors.Join(err, os.Remove(candidate))
		}
		return candidate, nil
	}
	return "", errors.New("同名压缩包过多，请更换文件夹")
}
