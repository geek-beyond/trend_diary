package handler

import (
	"errors"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

func unixToTime(sec int64) time.Time { return time.Unix(sec, 0) }

type Claims struct {
	Subject string `json:"sub,omitempty"`
	Issuer  string `json:"iss,omitempty"`
	// 本物 GoTrue と同じく単一 string で出すため、jwtv5.RegisteredClaims を embed せず自前定義する
	// （RegisteredClaims の Audience は ClaimStrings=[]string で配列に展開されてしまう）。
	Audience     string         `json:"aud,omitempty"`
	IssuedAt     int64          `json:"iat,omitempty"`
	Expiry       int64          `json:"exp,omitempty"`
	Role         string         `json:"role,omitempty"`
	Email        string         `json:"email,omitempty"`
	SessionID    string         `json:"session_id,omitempty"`
	AppMetadata  map[string]any `json:"app_metadata,omitempty"`
	UserMetadata map[string]any `json:"user_metadata,omitempty"`
}

// jwtv5.Claims インターフェース実装。標準 validator (exp/nbf チェック) を流用するために必要。
func (c Claims) GetExpirationTime() (*jwtv5.NumericDate, error) {
	if c.Expiry == 0 {
		return nil, nil
	}
	return jwtv5.NewNumericDate(unixToTime(c.Expiry)), nil
}

func (c Claims) GetIssuedAt() (*jwtv5.NumericDate, error) {
	if c.IssuedAt == 0 {
		return nil, nil
	}
	return jwtv5.NewNumericDate(unixToTime(c.IssuedAt)), nil
}

func (c Claims) GetNotBefore() (*jwtv5.NumericDate, error) { return nil, nil }
func (c Claims) GetIssuer() (string, error)                { return c.Issuer, nil }
func (c Claims) GetSubject() (string, error)               { return c.Subject, nil }
func (c Claims) GetAudience() (jwtv5.ClaimStrings, error) {
	if c.Audience == "" {
		return nil, nil
	}
	return jwtv5.ClaimStrings{c.Audience}, nil
}

type TokenResponse struct {
	AccessToken  string      `json:"access_token"`
	TokenType    string      `json:"token_type"`
	ExpiresIn    int64       `json:"expires_in"`
	ExpiresAt    int64       `json:"expires_at"`
	RefreshToken string      `json:"refresh_token"`
	User         *store.User `json:"user"`
}

// Factory が 1 インスタンス保持し全ハンドラから共有されるため、フィールドは構築後 immutable に保つこと。
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

// store.IssueSession で CreateSession + IssueRefreshToken を 1 ロックで実行することで、
// 並行 DeleteUser が走っても session 単独の leak が発生しない。
func (t *Tokens) Issue(u *store.User) (*TokenResponse, error) {
	sess, rt, err := t.store.IssueSession(u.ID)
	if err != nil {
		return nil, err
	}
	return t.Build(u, sess.ID, rt.Token)
}

// rotation 後の access_token 再発行で、既存 sessionID / refreshToken をそのまま流用するため
// Issue とは別経路で持つ。Issue にマージすると refresh のたびに新 session が増えて leak する。
func (t *Tokens) Build(u *store.User, sessionID, refreshToken string) (*TokenResponse, error) {
	now := t.clock()
	exp := now.Add(t.ttl)
	c := Claims{
		Subject:      u.ID,
		Issuer:       t.issuer,
		Audience:     u.Aud,
		IssuedAt:     now.Unix(),
		Expiry:       exp.Unix(),
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

// WithTimeFunc で注入 clock を渡さないとテストで Clock を fake にした効果が及ばない。
// WithIssuer は、公開定数 DefaultJWTSecret で署名された anon / service_role JWT が
// user token として通ってしまうのを防ぐため必須。
func (t *Tokens) Verify(token string) (*Claims, error) {
	parsed, err := jwtv5.ParseWithClaims(token, &Claims{}, func(tok *jwtv5.Token) (any, error) {
		if _, ok := tok.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(t.secret), nil
	}, jwtv5.WithTimeFunc(t.clock), jwtv5.WithIssuer(t.issuer), jwtv5.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

// logout で access_token が期限切れでも session を revoke できるべきなので、
// exp 検証を伴う Verify ではなくこちらで SessionID を取り出す（署名は VerifySignature で別途確認）。
func (t *Tokens) DecodeUnverified(token string) (*Claims, error) {
	parser := jwtv5.NewParser()
	parsed, _, err := parser.ParseUnverified(token, &Claims{})
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	return c, nil
}

// logout で期限切れトークンも受け入れたいが、署名は偽造防止のため必ず確認する用途。
func (t *Tokens) VerifySignature(token string) error {
	parser := jwtv5.NewParser(jwtv5.WithoutClaimsValidation())
	_, err := parser.Parse(token, func(tok *jwtv5.Token) (any, error) {
		if _, ok := tok.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(t.secret), nil
	})
	return err
}
