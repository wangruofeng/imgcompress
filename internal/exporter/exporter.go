// Package exporter writes images without replacing existing files.
package exporter

import (
	"bytes"
	"encoding/binary"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const MaxBytes = 100 * 1024 * 1024

func extension(data []byte, mime string) (string, error) {
	png := bytes.HasPrefix(data, []byte("\x89PNG\r\n\x1a\n"))
	switch {
	case mime == "image/png" && png:
		return ".png", nil
	case mime == "image/jpeg" && bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}):
		return ".jpg", nil
	case mime == "image/webp" && len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return ".webp", nil
	case mime == "image/apng" && png && isAPNG(data):
		return ".apng", nil
	case mime == "image/gif" && len(data) >= 13 && (string(data[:6]) == "GIF87a" || string(data[:6]) == "GIF89a"):
		return ".gif", nil
	case mime == "image/avif" && isAVIF(data):
		return ".avif", nil
	case mime == "image/svg+xml" && isSVG(data):
		return ".svg", nil
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

func isAPNG(data []byte) bool {
	for offset := 8; offset+12 <= len(data); {
		length := int(binary.BigEndian.Uint32(data[offset : offset+4]))
		if length > len(data)-offset-12 {
			return false
		}
		kind := string(data[offset+4 : offset+8])
		if kind == "acTL" {
			return length == 8
		}
		if kind == "IDAT" {
			return false
		}
		offset += 12 + length
	}
	return false
}
func isAVIF(data []byte) bool {
	if len(data) < 20 || string(data[4:8]) != "ftyp" {
		return false
	}
	end := int(binary.BigEndian.Uint32(data[:4]))
	if end < 20 || end > len(data) {
		return false
	}
	found := false
	for i := 8; i+4 <= end; i += 4 {
		if i == 12 {
			continue
		}
		brand := string(data[i : i+4])
		if brand == "avis" {
			return false
		}
		if brand == "avif" {
			found = true
		}
	}
	return found
}
func isSVG(data []byte) bool {
	decoder := xml.NewDecoder(bytes.NewReader(bytes.TrimPrefix(data, []byte{0xef, 0xbb, 0xbf})))
	for {
		token, err := decoder.Token()
		if err == io.EOF {
			return false
		}
		if err != nil {
			return false
		}
		if root, ok := token.(xml.StartElement); ok {
			return root.Name.Local == "svg" && (root.Name.Space == "" || root.Name.Space == "http://www.w3.org/2000/svg")
		}
	}
}
