package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLogout_NoAuth_Returns204(t *testing.T) {
	st := newStoreWith(nil)
	h := NewLogout(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/logout", nil))

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestLogout_ValidBearer_RevokesRefreshToken(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	seeded := seed(t, st, tk, "alice@example.com", "password123")
	logout := NewLogout(st, tk)
	tokenH := NewToken(st, tk)

	req := newRequest(t, http.MethodPost, "/auth/v1/logout", nil)
	req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
	rec := httptest.NewRecorder()
	logout.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status: %d", rec.Code)
	}

	refresh := httptest.NewRecorder()
	tokenH.ServeHTTP(refresh, newRequest(t, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
		"refresh_token": seeded.RefreshToken,
	}))
	if refresh.Code != http.StatusBadRequest {
		t.Errorf("refresh after logout status: %d", refresh.Code)
	}
}
