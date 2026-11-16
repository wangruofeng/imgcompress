package exporter

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"os"
	"testing"
)

func TestAdditionalFormatExtensions(t *testing.T) {
	raw, err := os.ReadFile("../../scripts/fixtures/animation.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture map[string]string
	if err = json.Unmarshal(raw, &fixture); err != nil {
		t.Fatal(err)
	}
	gif, _ := base64.StdEncoding.DecodeString(fixture["gif"])
	apng, _ := base64.StdEncoding.DecodeString(fixture["apng"])
	avif := make([]byte, 24)
	binary.BigEndian.PutUint32(avif, 24)
	copy(avif[4:], "ftypavif")
	copy(avif[16:], "mif1")
	for _, tt := range []struct {
		mime, ext string
		data      []byte
	}{
		{"image/gif", ".gif", gif}, {"image/apng", ".apng", apng}, {"image/avif", ".avif", avif}, {"image/svg+xml", ".svg", []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`)},
	} {
		ext, err := extension(tt.data, tt.mime)
		if err != nil || ext != tt.ext {
			t.Errorf("%s: %s %v", tt.mime, ext, err)
		}
	}
	if _, err = extension(gif, "image/avif"); err == nil {
		t.Fatal("accepted mismatching MIME")
	}
	copy(avif[8:], "avis")
	if _, err = extension(avif, "image/avif"); err == nil {
		t.Fatal("accepted AVIF sequence")
	}
}
