package config

import (
	"testing"
	"time"
)

func TestParse(t *testing.T) {
	t.Run("デフォルト値を返す", func(t *testing.T) {
		t.Setenv("SUPABASE_EMULATOR_ADDR", "")
		t.Setenv("SUPABASE_EMULATOR_LOG_LEVEL", "")
		t.Setenv("SUPABASE_EMULATOR_JWT_SECRET", "")
		cfg, err := Parse(nil)
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if cfg.Addr != "127.0.0.1:54321" {
			t.Errorf("Addr: %s", cfg.Addr)
		}
		if cfg.Auth.AccessTokenTTL != time.Hour {
			t.Errorf("AccessTokenTTL: %s", cfg.Auth.AccessTokenTTL)
		}
		if cfg.Auth.JWTSecret != DefaultJWTSecret {
			t.Errorf("JWTSecret default mismatch")
		}
	})

	t.Run("CLIフラグが環境変数より優先される", func(t *testing.T) {
		t.Setenv("SUPABASE_EMULATOR_ADDR", "0.0.0.0:9999")
		cfg, err := Parse([]string{"-addr", "127.0.0.1:8888"})
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if cfg.Addr != "127.0.0.1:8888" {
			t.Errorf("Addr: %s", cfg.Addr)
		}
	})

	t.Run("--jwt-secret フラグで秘密鍵を上書きできる", func(t *testing.T) {
		cfg, err := Parse([]string{"-jwt-secret", "custom-secret-for-testing-1234567890"})
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if cfg.Auth.JWTSecret != "custom-secret-for-testing-1234567890" {
			t.Errorf("JWTSecret: %s", cfg.Auth.JWTSecret)
		}
	})
}
