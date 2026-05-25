package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/config"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "wait-healthy" {
		if err := waitHealthy(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, "supabase-emulator: "+err.Error())
			os.Exit(1)
		}
		return
	}
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

	clock := time.Now
	st := store.New(store.Config{Clock: clock, ReuseInterval: cfg.Auth.ReuseInterval})
	tk := handler.NewTokens(st, cfg.Auth.JWTSecret, cfg.Auth.JWTIssuer, cfg.Auth.AccessTokenTTL, clock)
	f := handler.NewFactory(st, tk)

	mux := http.NewServeMux()
	mux.Handle("GET /auth/v1/health", f.Handle(handler.Health))
	mux.Handle("GET /auth/v1/settings", f.Handle(handler.Settings))
	mux.Handle("POST /auth/v1/signup", f.Handle(handler.Signup))
	mux.Handle("POST /auth/v1/token", f.Handle(handler.Token))
	mux.Handle("GET /auth/v1/user", f.Handle(handler.GetUser))
	mux.Handle("POST /auth/v1/logout", f.Handle(handler.Logout))
	mux.Handle("GET /auth/v1/admin/users", f.Handle(handler.AdminListUsers))
	mux.Handle("DELETE /auth/v1/admin/users/{id}", f.Handle(handler.AdminDeleteUser))
	mux.Handle("POST /__emulator/reset", f.Handle(handler.Reset))
	mux.Handle("GET /__emulator/snapshot", f.Handle(handler.Snapshot))
	mux.Handle("POST /__emulator/users", f.Handle(handler.SeedUser))
	// Go 1.22 mux は具体性の高いパターンを優先するので "/" は既存ルートに干渉せず catch-all になる。
	mux.Handle("/", f.Handle(handler.NotFound))

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		fmt.Fprintf(os.Stdout, "supabase-emulator listening on %s\n", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-sigCh:
	case err := <-errCh:
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return srv.Shutdown(ctx)
}

// 別プロセスで起動済みのエミュレータに /auth/v1/health で ping し、ready になるまで待つ。
// CI から `supabase-emulator wait-healthy` を呼ぶことで、起動 → ready 待ちのシェルロジックを
// バイナリ側に閉じ込められる。
func waitHealthy(args []string) error {
	fs := flag.NewFlagSet("wait-healthy", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	addr := fs.String("addr", "127.0.0.1:54321", "listen address (host:port)")
	timeout := fs.Duration("timeout", 10*time.Second, "max wait duration")
	if err := fs.Parse(args); err != nil {
		return err
	}

	deadline := time.Now().Add(*timeout)
	url := "http://" + *addr + "/auth/v1/health"
	for time.Now().Before(deadline) {
		resp, err := http.Get(url)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("emulator at %s did not become healthy within %s", *addr, *timeout)
}
