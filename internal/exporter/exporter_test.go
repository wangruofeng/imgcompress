package exporter

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

var png = []byte("\x89PNG\r\n\x1a\nexample")

func TestSaveNeverOverwrites(t *testing.T) {
	dir := t.TempDir()
	original := filepath.Join(dir, "photo-compressed.png")
	if err := os.WriteFile(original, []byte("original"), 0600); err != nil {
		t.Fatal(err)
	}
	path, err := Save(dir, "photo.jpg", "image/png", png)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(path) != "photo-compressed-1.png" {
		t.Fatal(path)
	}
	data, err := os.ReadFile(original)
	if err != nil || string(data) != "original" {
		t.Fatal("existing file changed", err)
	}
}

func TestRejectInvalidInputs(t *testing.T) {
	for _, name := range []string{"", ".", "..", "../escape.png", "/tmp/escape.png", "a\\b.png", "a\x00.png"} {
		if _, err := Save(t.TempDir(), name, "image/png", png); err == nil {
			t.Errorf("accepted %q", name)
		}
	}
	if _, err := Save(t.TempDir(), "x.png", "image/webp", png); err == nil {
		t.Fatal("accepted MIME mismatch")
	}
	if _, err := Save(t.TempDir(), "x.png", "image/png", nil); err == nil {
		t.Fatal("accepted empty data")
	}
}

func TestConcurrentExportsHaveUniqueNames(t *testing.T) {
	dir := t.TempDir()
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := Save(dir, "photo.png", "image/png", png); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	files, err := os.ReadDir(dir)
	if err != nil || len(files) != 12 {
		t.Fatal(len(files), err)
	}
}

func TestExistingSymlinkIsNotFollowed(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "keep.png")
	if err := os.WriteFile(target, []byte("keep"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(target, filepath.Join(dir, "photo-compressed.png")); err != nil {
		t.Fatal(err)
	}
	if _, err := Save(dir, "photo.png", "image/png", png); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(target)
	if err != nil || string(b) != "keep" {
		t.Fatal("symlink target changed")
	}
}
