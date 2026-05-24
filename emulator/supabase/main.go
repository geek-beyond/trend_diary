// Supabase エミュレータのエントリポイント。
// シングルバイナリで auth（将来 storage/realtime も）を 1 ポートにマウントする。
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

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/config"
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

	logger := newLogger(cfg.LogLevel)
	slog.SetDefault(logger)

	clock := time.Now
	st := store.New(store.Config{Clock: clock, ReuseInterval: cfg.Auth.ReuseInterval})
	tk := handler.NewTokens(st, cfg.Auth.JWTSecret, cfg.Auth.JWTIssuer, cfg.Auth.AccessTokenTTL, clock)

	mux := http.NewServeMux()
	mux.Handle("GET /auth/v1/health", handler.NewHealth())
	mux.Handle("GET /auth/v1/settings", handler.NewSettings())
	mux.Handle("POST /auth/v1/signup", handler.NewSignup(st, tk))
	mux.Handle("POST /auth/v1/token", handler.NewToken(st, tk))
	mux.Handle("GET /auth/v1/user", handler.NewGetUser(st, tk))
	mux.Handle("POST /auth/v1/logout", handler.NewLogout(st, tk))
	mux.Handle("GET /auth/v1/admin/users", handler.NewAdminListUsers(st))
	mux.Handle("DELETE /auth/v1/admin/users/{id}", handler.NewAdminDeleteUser(st))
	mux.Handle("POST /__emulator/reset", handler.NewReset(st))
	mux.Handle("GET /__emulator/snapshot", handler.NewSnapshot(st))
	mux.Handle("POST /__emulator/users", handler.NewSeedUser(st))

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           withLogging(logger, mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("supabase emulator started", "addr", cfg.Addr)
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
	return srv.Shutdown(ctx)
}

func newLogger(level string) *slog.Logger {
	var lv slog.Level
	if err := lv.UnmarshalText([]byte(strings.ToUpper(level))); err != nil {
		lv = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lv}))
}

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
