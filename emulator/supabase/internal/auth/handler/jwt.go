package handler

import (
	"errors"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

// Claims は GoTrue が access_token に載せる claim 集合。
type Claims struct {
	jwtv5.RegisteredClaims
	Role         string         `json:"role,omitempty"`
	Email        string         `json:"email,omitempty"`
	SessionID    string         `json:"session_id,omitempty"`
	AppMetadata  map[string]any `json:"app_metadata,omitempty"`
	UserMetadata map[string]any `json:"user_metadata,omitempty"`
}

// TokenResponse は supabase-js が session として保持する GoTrue AccessTokenResponse。
type TokenResponse struct {
	AccessToken  string      `json:"access_token"`
	TokenType    string      `json:"token_type"`
	ExpiresIn    int64       `json:"expires_in"`
	ExpiresAt    int64       `json:"expires_at"`
	RefreshToken string      `json:"refresh_token"`
	User         *store.User `json:"user"`
}

// Tokens は access_token の発行・検証を担当する。各ハンドラから共有される。
type Tokens struct {
	store  *store.Store
	secret string
	issuer string
	ttl    time.Duration
	clock  func() time.Time
}

func NewTokens(st *store.Store, secret, issuer string, ttl time.Duration, clock func() time.Time) *Tokens {
	if clock == nil {
		clock = time.Now
	}
	if ttl == 0 {
		ttl = time.Hour
	}
	if issuer == "" {
		issuer = "http://127.0.0.1:54321/auth/v1"
	}
	if secret == "" {
		panic("handler.NewTokens: secret is required")
	}
	return &Tokens{store: st, secret: secret, issuer: issuer, ttl: ttl, clock: clock}
}

// Issue は user から session + refresh_token + access_token を新規発行する。
func (t *Tokens) Issue(u *store.User) (*TokenResponse, error) {
	sess, err := t.store.CreateSession(u.ID)
	if err != nil {
		return nil, err
	}
	rt, err := t.store.IssueRefreshToken(u.ID, sess.ID)
	if err != nil {
		return nil, err
	}
	return t.Build(u, sess.ID, rt.Token)
}

// Build は既存の sessionID / refreshToken を流用して access_token を組み立てる（rotation 後など）。
func (t *Tokens) Build(u *store.User, sessionID, refreshToken string) (*TokenResponse, error) {
	now := t.clock()
	exp := now.Add(t.ttl)
	c := Claims{
		RegisteredClaims: jwtv5.RegisteredClaims{
			Subject:   u.ID,
			Issuer:    t.issuer,
			Audience:  jwtv5.ClaimStrings{u.Aud},
			IssuedAt:  jwtv5.NewNumericDate(now),
			ExpiresAt: jwtv5.NewNumericDate(exp),
		},
		Role:         u.Role,
		Email:        u.Email,
		SessionID:    sessionID,
		AppMetadata:  u.AppMetadata,
		UserMetadata: u.UserMetadata,
	}
	signed, err := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, c).SignedString([]byte(t.secret))
	if err != nil {
		return nil, err
	}
	return &TokenResponse{
		AccessToken:  signed,
		TokenType:    "bearer",
		ExpiresIn:    int64(t.ttl.Seconds()),
		ExpiresAt:    exp.Unix(),
		RefreshToken: refreshToken,
		User:         u,
	}, nil
}

// Verify は注入 clock 基準で exp 判定する。jwt 本体の time.Now() に固定されると
// テストで Clock を fake にした効果が及ばないため WithTimeFunc で渡す。
func (t *Tokens) Verify(token string) (*Claims, error) {
	parsed, err := jwtv5.ParseWithClaims(token, &Claims{}, func(tok *jwtv5.Token) (any, error) {
		if _, ok := tok.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(t.secret), nil
	}, jwtv5.WithTimeFunc(t.clock))
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}
