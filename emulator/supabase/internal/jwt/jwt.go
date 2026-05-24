// Package jwt は HS256 の JWT 署名・検証を自前で実装する。
// 標準ライブラリだけに依存し、エミュレータ用途に必要な機能のみ提供する。
package jwt

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrMalformed        = errors.New("jwt: malformed token")
	ErrUnsupportedAlg   = errors.New("jwt: unsupported algorithm")
	ErrInvalidSignature = errors.New("jwt: invalid signature")
	ErrExpired          = errors.New("jwt: token expired")
)

// Claims はGoTrueが発行するJWTで使うフィールドのみを保持する。
// JSONタグはGoTrueと完全一致させること。
type Claims struct {
	Subject      string         `json:"sub"`
	Issuer       string         `json:"iss,omitempty"`
	Audience     string         `json:"aud,omitempty"`
	Role         string         `json:"role,omitempty"`
	Email        string         `json:"email,omitempty"`
	IssuedAt     int64          `json:"iat,omitempty"`
	Expiry       int64          `json:"exp,omitempty"`
	SessionID    string         `json:"session_id,omitempty"`
	AppMetadata  map[string]any `json:"app_metadata,omitempty"`
	UserMetadata map[string]any `json:"user_metadata,omitempty"`
}

type header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

// Sign は claims を HS256 で署名し、JWT 文字列を返す。
func Sign(c Claims, secret string) (string, error) {
	h := header{Alg: "HS256", Typ: "JWT"}
	hb, err := json.Marshal(h)
	if err != nil {
		return "", err
	}
	cb, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	signingInput := encodeSegment(hb) + "." + encodeSegment(cb)
	sig := hmacSHA256([]byte(signingInput), []byte(secret))
	return signingInput + "." + encodeSegment(sig), nil
}

// Verify はトークン署名と exp を検証して Claims を返す（時刻基準は実時計）。
func Verify(token, secret string) (Claims, error) {
	return VerifyAt(token, secret, time.Now())
}

// VerifyAt は指定時刻を基準に exp を判定する。Service が注入された clock を渡せるよう公開している。
func VerifyAt(token, secret string, now time.Time) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrMalformed
	}
	headerJSON, err := decodeSegment(parts[0])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	var h header
	if err := json.Unmarshal(headerJSON, &h); err != nil {
		return Claims{}, ErrMalformed
	}
	if h.Alg != "HS256" {
		return Claims{}, ErrUnsupportedAlg
	}

	expected := hmacSHA256([]byte(parts[0]+"."+parts[1]), []byte(secret))
	got, err := decodeSegment(parts[2])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	if subtle.ConstantTimeCompare(expected, got) != 1 {
		return Claims{}, ErrInvalidSignature
	}

	claimsJSON, err := decodeSegment(parts[1])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	var c Claims
	if err := json.Unmarshal(claimsJSON, &c); err != nil {
		return Claims{}, ErrMalformed
	}
	if c.Expiry != 0 && now.Unix() >= c.Expiry {
		return Claims{}, ErrExpired
	}
	return c, nil
}

func encodeSegment(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeSegment(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(s)
}

func hmacSHA256(message, key []byte) []byte {
	m := hmac.New(sha256.New, key)
	m.Write(message)
	return m.Sum(nil)
}
