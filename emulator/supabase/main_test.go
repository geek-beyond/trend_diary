package main

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestSmoke はビルド済みバイナリを起動し /auth/v1/health に到達することを確認する。
func TestSmoke(t *testing.T) {
	t.Run("バイナリ起動後にhealthエンドポイントが応答する", func(t *testing.T) {
		port, err := freePort()
		if err != nil {
			t.Fatalf("freePort: %v", err)
		}
		bin := buildBinary(t)
		cmd := exec.Command(bin, "-addr", "127.0.0.1:"+port)
		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()
		if err := cmd.Start(); err != nil {
			t.Fatalf("Start: %v", err)
		}
		t.Cleanup(func() {
			_ = cmd.Process.Kill()
			_, _ = io.Copy(io.Discard, stdout)
			_, _ = io.Copy(io.Discard, stderr)
			_, _ = cmd.Process.Wait()
		})

		// ListenAndServe が立ち上がるまで待つ
		deadline := time.Now().Add(5 * time.Second)
		var lastErr error
		for time.Now().Before(deadline) {
			resp, err := http.Get("http://127.0.0.1:" + port + "/auth/v1/health")
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode != http.StatusOK {
					t.Fatalf("status: %d", resp.StatusCode)
				}
				var body map[string]any
				if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
					t.Fatalf("decode: %v", err)
				}
				if body["name"] != "GoTrue" {
					t.Errorf("name: %v", body["name"])
				}
				return
			}
			lastErr = err
			time.Sleep(50 * time.Millisecond)
		}
		t.Fatalf("server did not start: %v", lastErr)
	})
}

func freePort() (string, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}
	defer l.Close()
	addr := l.Addr().String()
	return addr[strings.LastIndex(addr, ":")+1:], nil
}

func buildBinary(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	out := filepath.Join(dir, "supabase-emulator")
	cmd := exec.Command("go", "build", "-o", out, ".")
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("go build: %v", err)
	}
	return out
}
