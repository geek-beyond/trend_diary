package auth

import (
	"net/http"
	"time"
)

// Config は Service の依存と挙動を制御する。
type Config struct {
	// JWTSecret は HS256 の秘密鍵。空なら jwt.DefaultSecret を使う。
	JWTSecret string
	// JWTIssuer は発行する access_token の iss クレーム。
	JWTIssuer string
	// AccessTokenTTL は access_token の有効期間。0 なら 1時間。
	AccessTokenTTL time.Duration
	// ReuseInterval は refresh token rotation の reuse window。0 なら 10秒。
	ReuseInterval time.Duration
	// Clock はテスト用の時計注入。nil なら time.Now。
	Clock func() time.Time
	// RequireAPIKey は --auth フラグ相当。true なら apikey / Authorization の検証を行う。
	RequireAPIKey bool
	// AnonKey は require_api_key=true のときに許容する公開鍵。
	AnonKey string
	// ServiceRoleKey は admin エンドポイントで要求するキー。
	ServiceRoleKey string
}

// Service は GoTrue 互換ルートを保持する。Mount で *http.ServeMux に登録する。
type Service struct {
	cfg   Config
	store *Store
	clock func() time.Time
}

// NewService は Service を構築する。
func NewService(cfg Config) *Service {
	if cfg.Clock == nil {
		cfg.Clock = time.Now
	}
	if cfg.AccessTokenTTL == 0 {
		cfg.AccessTokenTTL = time.Hour
	}
	if cfg.ReuseInterval == 0 {
		cfg.ReuseInterval = 10 * time.Second
	}
	if cfg.JWTSecret == "" {
		// keys.go の DefaultSecret を遅延参照したいが import 循環回避のためここに直書きはしない
		// 呼び出し側で必ず設定する前提。空文字なら panic で気付けるようにする。
		panic("auth.NewService: JWTSecret is required")
	}
	if cfg.JWTIssuer == "" {
		cfg.JWTIssuer = "http://127.0.0.1:54321/auth/v1"
	}
	return &Service{
		cfg:   cfg,
		store: NewStore(StoreConfig{Clock: cfg.Clock, ReuseInterval: cfg.ReuseInterval}),
		clock: cfg.Clock,
	}
}

// Store は外部からテストで参照させる。
func (s *Service) Store() *Store { return s.store }

// Mount は GoTrue 互換ルートとエミュレータ拡張ルートを mux に登録する。
func (s *Service) Mount(mux *http.ServeMux) {
	// GoTrue互換
	mux.HandleFunc("GET /auth/v1/health", s.handleHealth)
	mux.HandleFunc("GET /auth/v1/settings", s.handleSettings)
	mux.HandleFunc("POST /auth/v1/signup", s.withAPIKey(s.handleSignup))
	mux.HandleFunc("POST /auth/v1/token", s.withAPIKey(s.handleToken))
	mux.HandleFunc("GET /auth/v1/user", s.withAPIKey(s.handleGetUser))
	mux.HandleFunc("POST /auth/v1/logout", s.withAPIKey(s.handleLogout))
	mux.HandleFunc("GET /auth/v1/admin/users", s.withServiceRole(s.handleAdminListUsers))
	mux.HandleFunc("DELETE /auth/v1/admin/users/{id}", s.withServiceRole(s.handleAdminDeleteUser))

	// エミュレータ拡張（テスト用ヘルパ）
	mux.HandleFunc("POST /__emulator/reset", s.handleEmulatorReset)
	mux.HandleFunc("GET /__emulator/snapshot", s.handleEmulatorSnapshot)
	mux.HandleFunc("POST /__emulator/users", s.handleEmulatorSeedUser)
}
