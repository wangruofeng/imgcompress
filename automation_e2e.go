//go:build e2e

package main

import (
	_ "github.com/egoist/mygo/plugins/automation"
	"os"
)

// The inspector/socket and local test URL are absent from release builds.
func init() {
	frontendURL = os.Getenv("IMGCOMPRESS_TEST_URL")
	if frontendURL == "bundled" {
		frontendURL = "/"
	}
	if frontendURL == "" {
		frontendURL = "http://127.0.0.1:5173"
	}
}
