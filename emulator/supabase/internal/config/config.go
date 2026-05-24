// Package config はエミュレータ起動設定をフラグ/環境変数から読み出す。
package config

import (
	"flag"
	"os"
	"time"
)

type Config struct {
	Addr     string
	LogLevel string
	Auth     AuthConfig
}

type AuthConfig struct {
	JWTSecret      string
	JWTIssuer      string
	AccessTokenTTL time.Duration
	ReuseInterval  time.Duration
}

func Default() Config {
	return Config{
		Addr:     "127.0.0.1:54321",
		LogLevel: "info",
		Auth: AuthConfig{
			JWTSecret:      DefaultJWTSecret,
			JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
			AccessTokenTTL: time.Hour,
			ReuseInterval:  10 * time.Second,
		},
	}
}

// Parse は os.Args[1:] と環境変数から Config を組み立てる（CLI フラグ優先）。
func Parse(args []string) (Config, error) {
	cfg := Default()
	if v := os.Getenv("SUPABASE_EMULATOR_ADDR"); v != "" {
		cfg.Addr = v
	}
	if v := os.Getenv("SUPABASE_EMULATOR_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("SUPABASE_EMULATOR_JWT_SECRET"); v != "" {
		cfg.Auth.JWTSecret = v
	}

	fs := flag.NewFlagSet("supabase-emulator", flag.ContinueOnError)
	fs.StringVar(&cfg.Addr, "addr", cfg.Addr, "listen address (host:port)")
	fs.StringVar(&cfg.LogLevel, "log-level", cfg.LogLevel, "log level (debug|info|warn|error)")
	fs.StringVar(&cfg.Auth.JWTSecret, "jwt-secret", cfg.Auth.JWTSecret, "JWT HS256 secret")
	fs.StringVar(&cfg.Auth.JWTIssuer, "jwt-issuer", cfg.Auth.JWTIssuer, "JWT issuer (iss claim)")
	fs.DurationVar(&cfg.Auth.AccessTokenTTL, "access-token-ttl", cfg.Auth.AccessTokenTTL, "access_token TTL")
	fs.DurationVar(&cfg.Auth.ReuseInterval, "refresh-reuse-interval", cfg.Auth.ReuseInterval, "refresh_token reuse interval")

	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	return cfg, nil
}
