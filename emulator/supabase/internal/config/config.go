// Package config はエミュレータ起動設定をフラグ/環境変数から読み出す。
package config

import (
	"flag"
	"os"
	"strconv"
	"time"
)

// Config はエミュレータ全体の設定。サブサービスは内側に詰める。
type Config struct {
	Addr     string
	LogLevel string
	Auth     AuthConfig
}

// AuthConfig は auth.Service.Config 相当を文字列ベースで保持し、main で詰め替える。
type AuthConfig struct {
	JWTSecret      string
	JWTIssuer      string
	AccessTokenTTL time.Duration
	ReuseInterval  time.Duration
	RequireAPIKey  bool
	AnonKey        string
	ServiceRoleKey string
}

// Default はゼロ値以外のデフォルトを埋めた Config を返す。
func Default() Config {
	return Config{
		Addr:     "127.0.0.1:54321",
		LogLevel: "info",
		Auth: AuthConfig{
			JWTSecret:      "super-secret-jwt-token-with-at-least-32-characters-long",
			JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
			AccessTokenTTL: time.Hour,
			ReuseInterval:  10 * time.Second,
			RequireAPIKey:  false,
		},
	}
}

// Parse は os.Args[1:] と環境変数からConfigを組み立てる（CLIフラグが優先）。
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
	if v := os.Getenv("SUPABASE_EMULATOR_ANON_KEY"); v != "" {
		cfg.Auth.AnonKey = v
	}
	if v := os.Getenv("SUPABASE_EMULATOR_SERVICE_ROLE_KEY"); v != "" {
		cfg.Auth.ServiceRoleKey = v
	}
	if v := os.Getenv("SUPABASE_EMULATOR_REQUIRE_API_KEY"); v != "" {
		b, _ := strconv.ParseBool(v)
		cfg.Auth.RequireAPIKey = b
	}

	fs := flag.NewFlagSet("supabase-emulator", flag.ContinueOnError)
	fs.StringVar(&cfg.Addr, "addr", cfg.Addr, "listen address (host:port)")
	fs.StringVar(&cfg.LogLevel, "log-level", cfg.LogLevel, "log level (debug|info|warn|error)")
	fs.StringVar(&cfg.Auth.JWTSecret, "jwt-secret", cfg.Auth.JWTSecret, "JWT HS256 secret")
	fs.StringVar(&cfg.Auth.JWTIssuer, "jwt-issuer", cfg.Auth.JWTIssuer, "JWT issuer (iss claim)")
	fs.DurationVar(&cfg.Auth.AccessTokenTTL, "access-token-ttl", cfg.Auth.AccessTokenTTL, "access_token TTL")
	fs.DurationVar(&cfg.Auth.ReuseInterval, "refresh-reuse-interval", cfg.Auth.ReuseInterval, "refresh_token reuse interval")
	fs.BoolVar(&cfg.Auth.RequireAPIKey, "auth", cfg.Auth.RequireAPIKey, "require apikey/Authorization header")
	fs.StringVar(&cfg.Auth.AnonKey, "anon-key", cfg.Auth.AnonKey, "anon JWT (when --auth)")
	fs.StringVar(&cfg.Auth.ServiceRoleKey, "service-role-key", cfg.Auth.ServiceRoleKey, "service_role JWT (when --auth)")

	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	return cfg, nil
}
