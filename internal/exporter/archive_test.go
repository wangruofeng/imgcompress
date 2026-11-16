package exporter

import (
	"archive/zip"
	"bytes"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestArchiveContainsAllImagesAndResolvesNames(t *testing.T) {
	dir := t.TempDir()
	a, err := NewArchive(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"旅行.jpg", "旅行.png", "PHOTO.png", "photo.png"} {
		if err = a.Add(name, "image/png", png); err != nil {
			t.Fatal(err)
		}
	}
	path, err := a.Finish()
	if err != nil {
		t.Fatal(err)
	}
	files, _ := os.ReadDir(dir)
	if len(files) != 1 || filepath.Ext(files[0].Name()) != ".zip" {
		t.Fatal(files)
	}
	r, err := zip.OpenReader(path)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	want := []string{"旅行-compressed.png", "旅行-compressed-1.png", "PHOTO-compressed.png", "photo-compressed-1.png"}
	if len(r.File) != len(want) {
		t.Fatal(len(r.File))
	}
	for i, f := range r.File {
		if f.Name != want[i] {
			t.Fatal(f.Name)
		}
		in, e := f.Open()
		if e != nil {
			t.Fatal(e)
		}
		data, e := io.ReadAll(in)
		in.Close()
		if e != nil || !bytes.Equal(data, png) {
			t.Fatal("ZIP entry bytes changed", e)
		}
	}
}

func TestArchiveCancelAndInvalidImages(t *testing.T) {
	dir := t.TempDir()
	a, err := NewArchive(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"../escape.png", "/tmp/a.png", "a\\b.png"} {
		if a.Add(name, "image/png", png) == nil {
			t.Fatal(name)
		}
	}
	if a.Add("a.webp", "image/webp", png) == nil {
		t.Fatal("accepted MIME mismatch")
	}
	if err = a.Add("ok.png", "image/png", png); err != nil {
		t.Fatal(err)
	}
	if err = a.Cancel(); err != nil {
		t.Fatal(err)
	}
	if err = a.Cancel(); err != nil {
		t.Fatal(err)
	}
	files, _ := os.ReadDir(dir)
	if len(files) != 0 {
		t.Fatal(files)
	}
	if _, err = a.Finish(); err == nil {
		t.Fatal("finished cancelled archive")
	}
}

func TestArchiveEmptyAndRepeatedExport(t *testing.T) {
	dir := t.TempDir()
	empty, err := NewArchive(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = empty.Finish(); err == nil {
		t.Fatal("empty ZIP published")
	}
	paths := map[string]bool{}
	for i := 0; i < 2; i++ {
		a, e := NewArchive(dir)
		if e != nil {
			t.Fatal(e)
		}
		if e = a.Add("a.jpg", "image/png", png); e != nil {
			t.Fatal(e)
		}
		p, e := a.Finish()
		if e != nil {
			t.Fatal(e)
		}
		if paths[p] {
			t.Fatal("overwrote previous ZIP")
		}
		paths[p] = true
	}
	files, _ := os.ReadDir(dir)
	if len(files) != 2 {
		t.Fatal(files)
	}
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".partial") {
			t.Fatal("temporary file leaked")
		}
	}
}
