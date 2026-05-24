package handler

import (
	"errors"

	jwtv5 "github.com/golang-jwt/jwt/v5"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

// claims は GoTrue が access_token に載せる claim 集合。
type claims struct {
	jwtv5.RegisteredClaims
	Role         string         `json:"role,omitempty"`
	Email        string         `json:"email,omitempty"`
	SessionID    string         `json:"session_id,omitempty"`
	AppMetadata  map[string]any `json:"app_metadata,omitempty"`
	UserMetadata map[string]any `json:"user_metadata,omitempty"`
}

// verifyToken は jwtv5.WithTimeFunc 経由で注入 clock を渡すラッパ。
// 実時計に固定すると、テストで Clock を fake にした効果が JWT 期限検証まで及ばない。
func (h *Handler) verifyToken(token string) (*claims, error) {
	parsed, err := jwtv5.ParseWithClaims(token, &claims{}, func(t *jwtv5.Token) (any, error) {
		if _, ok := t.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(h.cfg.JWTSecret), nil
	}, jwtv5.WithTimeFunc(h.clock))
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

func (h *Handler) issueSession(u *store.User) (*tokenResponse, error) {
	sess, err := h.store.CreateSession(u.ID)
	if err != nil {
		return nil, err
	}
	rt, err := h.store.IssueRefreshToken(u.ID, sess.ID)
	if err != nil {
		return nil, err
	}
	return h.buildTokenResponse(u, sess.ID, rt.Token)
}

func (h *Handler) buildTokenResponse(u *store.User, sessionID, refreshToken string) (*tokenResponse, error) {
	now := h.clock()
	exp := now.Add(h.cfg.AccessTokenTTL)
	c := claims{
		RegisteredClaims: jwtv5.RegisteredClaims{
			Subject:   u.ID,
			Issuer:    h.cfg.JWTIssuer,
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
	signed, err := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, c).SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}
	return &tokenResponse{
		AccessToken:  signed,
		TokenType:    "bearer",
		ExpiresIn:    int64(h.cfg.AccessTokenTTL.Seconds()),
		ExpiresAt:    exp.Unix(),
		RefreshToken: refreshToken,
		User:         u,
	}, nil
}
