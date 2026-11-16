// Package exporter writes images without replacing existing files.
package exporter

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const MaxBytes = 100 * 1024 * 1024

func extension(data []byte, mime string) (string, error) {
	switch {
	case mime == "image/png" && bytes.HasPrefix(data, []byte("\x89PNG\r\n\x1a\n")):
		return ".png", nil
	case mime == "image/jpeg" && bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}):
		return ".jpg", nil
	case mime == "image/webp" && len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return ".webp", nil
	default:
		return "", errors.New("图片内容与输出格式不匹配")
	}
}

// Save creates a unique file in dir. A failing write is removed, and existing
// files (including symlinks) are never followed or overwritten.
func Save(dir, name, mime string, data []byte) (string, error) {
	if name == "" || name == "." || name == ".." || strings.ContainsAny(name, "/\\\x00") || len(name) > 180 {
		return "", errors.New("无效的文件名（最长 180 字节）")
	}
	if len(data) == 0 || len(data) > MaxBytes {
		return "", errors.New("图片为空或超过 100 MB")
	}
	ext, err := extension(data, mime)
	if err != nil {
		return "", err
	}
	stem := strings.TrimSuffix(name, filepath.Ext(name))
	if strings.TrimSpace(stem) == "" {
		stem = "image"
	}
	for n := 0; n < 10000; n++ {
		suffix := ""
		if n > 0 {
			suffix = fmt.Sprintf("-%d", n)
		}
		path := filepath.Join(dir, stem+"-compressed"+suffix+ext)
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		if errors.Is(err, os.ErrExist) {
			continue
		}
		if err != nil {
			return "", err
		}
		_, writeErr := f.Write(data)
		closeErr := f.Close()
		if err = errors.Join(writeErr, closeErr); err != nil {
			return "", errors.Join(err, os.Remove(path))
		}
		return path, nil
	}
	return "", errors.New("同名文件过多，请更换输出文件夹")
}
