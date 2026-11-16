package main

import (
	"archive/zip"
	"encoding/base64"
	"os"
	"testing"
)

func TestDesktopZIPTransaction(t *testing.T) {
	d := &Desktop{dir: t.TempDir(), saved: map[string]bool{}}
	id, err := d.BeginZip()
	if err != nil {
		t.Fatal(err)
	}
	encoded := base64.StdEncoding.EncodeToString([]byte("\x89PNG\r\n\x1a\nexample"))
	if err = d.AddZip("wrong", "a.png", "image/png", encoded); err == nil {
		t.Fatal("accepted wrong transaction")
	}
	for _, name := range []string{"a.png", "a.jpg", "中文.png"} {
		if err = d.AddZip(id, name, "image/png", encoded); err != nil {
			t.Fatal(err)
		}
	}
	path, err := d.FinishZip(id)
	if err != nil {
		t.Fatal(err)
	}
	if !d.saved[path] {
		t.Fatal("ZIP not registered for Finder")
	}
	r, err := zip.OpenReader(path)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	if len(r.File) != 3 {
		t.Fatal(len(r.File))
	}
	files, _ := os.ReadDir(d.dir)
	if len(files) != 1 {
		t.Fatal("individual files or temporary file leaked", files)
	}
	if _, err = d.FinishZip(id); err == nil {
		t.Fatal("reused completed transaction")
	}
}

func TestDesktopCancelZIPAndRetry(t *testing.T) {
	d := &Desktop{dir: t.TempDir(), saved: map[string]bool{}}
	id, err := d.BeginZip()
	if err != nil {
		t.Fatal(err)
	}
	if _, err = d.BeginZip(); err == nil {
		t.Fatal("overlapping ZIP transaction")
	}
	if err = d.CancelZip(id); err != nil {
		t.Fatal(err)
	}
	files, _ := os.ReadDir(d.dir)
	if len(files) != 0 {
		t.Fatal(files)
	}
	id, err = d.BeginZip()
	if err != nil {
		t.Fatal(err)
	}
	if err = d.CancelZip(id); err != nil {
		t.Fatal(err)
	}
}
