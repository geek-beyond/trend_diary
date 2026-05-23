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
		t.Setenv("SUPABASE_EMULATOR_ANON_KEY", "")
		t.Setenv("SUPABASE_EMULATOR_SERVICE_ROLE_KEY", "")
		t.Setenv("SUPABASE_EMULATOR_REQUIRE_API_KEY", "")
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
		if cfg.Auth.RequireAPIKey != false {
			t.Errorf("RequireAPIKey default must be false")
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

	t.Run("--authフラグでRequireAPIKey=true", func(t *testing.T) {
		cfg, err := Parse([]string{"-auth"})
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if !cfg.Auth.RequireAPIKey {
			t.Error("RequireAPIKey must be true")
		}
	})
}
