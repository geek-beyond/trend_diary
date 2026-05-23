// Supabase エミュレータのエントリポイント。
// シングルバイナリで auth（将来 storage/realtime も）を 1ポートにマウントする。
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/config"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/jwt"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "supabase-emulator: "+err.Error())
		os.Exit(1)
	}
}

func run(args []string) error {
	cfg, err := config.Parse(args)
	if err != nil {
		return err
	}
	if cfg.Auth.AnonKey == "" {
		cfg.Auth.AnonKey = jwt.AnonKey
	}
	if cfg.Auth.ServiceRoleKey == "" {
		cfg.Auth.ServiceRoleKey = jwt.ServiceRoleKey
	}

	logger := newLogger(cfg.LogLevel)
	slog.SetDefault(logger)

	mux := http.NewServeMux()
	authSvc := auth.NewService(auth.Config{
		JWTSecret:      cfg.Auth.JWTSecret,
		JWTIssuer:      cfg.Auth.JWTIssuer,
		AccessTokenTTL: cfg.Auth.AccessTokenTTL,
		ReuseInterval:  cfg.Auth.ReuseInterval,
		RequireAPIKey:  cfg.Auth.RequireAPIKey,
		AnonKey:        cfg.Auth.AnonKey,
		ServiceRoleKey: cfg.Auth.ServiceRoleKey,
	})
	authSvc.Mount(mux)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           withLogging(logger, mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("supabase emulator started", "addr", cfg.Addr, "require_api_key", cfg.Auth.RequireAPIKey)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		logger.Info("shutting down", "signal", sig.String())
	case err := <-errCh:
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return err
	}
	return nil
}

func newLogger(level string) *slog.Logger {
	var lv slog.Level
	if err := lv.UnmarshalText([]byte(strings.ToUpper(level))); err != nil {
		lv = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lv}))
}

// withLogging はリクエストを構造化ログに残す薄いミドルウェア。
func withLogging(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &statusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(ww, r)
		logger.Debug("http",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
