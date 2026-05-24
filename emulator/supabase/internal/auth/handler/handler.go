package handler

import (
	"net/http"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

type Config struct {
	JWTSecret      string
	JWTIssuer      string
	AccessTokenTTL time.Duration
	// RequireAPIKey が true なら middleware が apikey/Authorization を検証する。
	// 既定 false は kumo 流の "no auth required" 方針。
	RequireAPIKey  bool
	AnonKey        string
	ServiceRoleKey string
	Clock          func() time.Time
}

type Handler struct {
	cfg   Config
	store *store.Store
	clock func() time.Time
}

func New(cfg Config, st *store.Store) *Handler {
	if cfg.Clock == nil {
		cfg.Clock = time.Now
	}
	if cfg.AccessTokenTTL == 0 {
		cfg.AccessTokenTTL = time.Hour
	}
	if cfg.JWTIssuer == "" {
		cfg.JWTIssuer = "http://127.0.0.1:54321/auth/v1"
	}
	if cfg.JWTSecret == "" {
		panic("handler.New: JWTSecret is required")
	}
	return &Handler{cfg: cfg, store: st, clock: cfg.Clock}
}

func (h *Handler) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /auth/v1/health", h.handleHealth)
	mux.HandleFunc("GET /auth/v1/settings", h.handleSettings)
	mux.HandleFunc("POST /auth/v1/signup", h.withAPIKey(h.handleSignup))
	mux.HandleFunc("POST /auth/v1/token", h.withAPIKey(h.handleToken))
	mux.HandleFunc("GET /auth/v1/user", h.withAPIKey(h.handleGetUser))
	mux.HandleFunc("POST /auth/v1/logout", h.withAPIKey(h.handleLogout))
	mux.HandleFunc("GET /auth/v1/admin/users", h.withServiceRole(h.handleAdminListUsers))
	mux.HandleFunc("DELETE /auth/v1/admin/users/{id}", h.withServiceRole(h.handleAdminDeleteUser))
	mux.HandleFunc("POST /__emulator/reset", h.handleEmulatorReset)
	mux.HandleFunc("GET /__emulator/snapshot", h.handleEmulatorSnapshot)
	mux.HandleFunc("POST /__emulator/users", h.handleEmulatorSeedUser)
}
