package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGetUser_ValidBearer(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	seeded := seed(t, st, tk, "alice@example.com", "password123")
	h := NewGetUser(st, tk)

	req := newRequest(t, http.MethodGet, "/auth/v1/user", nil)
	req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestGetUser_MissingAuthHeader(t *testing.T) {
	st := newStoreWith(nil)
	h := NewGetUser(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/user", nil))

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status: %d", rec.Code)
	}
	if got := rec.Header().Get("X-Supabase-Api-Version"); got == "" {
		t.Error("X-Supabase-Api-Version header missing")
	}
	if !strings.Contains(rec.Body.String(), `"session_not_found"`) {
		t.Errorf("error_code missing: %s", rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "Auth session missing") {
		t.Errorf("msg missing: %s", rec.Body.String())
	}
}

func TestGetUser_ExpiredToken_UsesInjectedClock(t *testing.T) {
	current := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := func() time.Time { return current }
	st := newStoreWith(clock)
	tk := newTokensWith(st, clock)
	seeded := seed(t, st, tk, "alice@example.com", "password123")
	h := NewGetUser(st, tk)

	current = current.Add(2 * time.Hour)
	req := newRequest(t, http.MethodGet, "/auth/v1/user", nil)
	req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status: %d", rec.Code)
	}
}
