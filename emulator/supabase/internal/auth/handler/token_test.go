package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTokenPassword_Success(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	_ = seed(t, st, tk, "alice@example.com", "password123")
	h := NewToken(st, tk)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
		"email": "alice@example.com", "password": "password123",
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestTokenPassword_WrongPassword(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	_ = seed(t, st, tk, "alice@example.com", "password123")
	h := NewToken(st, tk)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
		"email": "alice@example.com", "password": "WRONG",
	}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "invalid_grant") || !strings.Contains(body, "Invalid login credentials") {
		t.Errorf("body: %s", body)
	}
}

func TestTokenPassword_UnknownEmail(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	h := NewToken(st, tk)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
		"email": "nobody@example.com", "password": "password123",
	}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestToken_NoGrantType(t *testing.T) {
	st := newStoreWith(nil)
	h := NewToken(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token", map[string]string{
		"email": "alice@example.com", "password": "password123",
	}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestTokenRefresh_Success(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	first := seed(t, st, tk, "alice@example.com", "password123")
	h := NewToken(st, tk)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
		"refresh_token": first.RefreshToken,
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
	var rotated TokenResponse
	decodeJSON(t, rec, &rotated)
	if rotated.RefreshToken == first.RefreshToken {
		t.Error("refresh_token not rotated")
	}
}

func TestTokenRefresh_InvalidToken(t *testing.T) {
	st := newStoreWith(nil)
	h := NewToken(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
		"refresh_token": "bogus",
	}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Invalid Refresh Token") {
		t.Errorf("body: %s", rec.Body.String())
	}
}
