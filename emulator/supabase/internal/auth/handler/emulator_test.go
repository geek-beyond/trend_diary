package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReset_ClearsStore(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	seed(t, st, tk, "alice@example.com", "password123")
	h := NewReset(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/__emulator/reset", nil))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status: %d", rec.Code)
	}
	if got := len(st.Snapshot().Users); got != 0 {
		t.Errorf("users remain: %d", got)
	}
}

func TestSnapshot_EmptyStoreReturnsSnakeCaseArrays(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSnapshot(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/__emulator/snapshot", nil))
	body := rec.Body.String()
	for _, key := range []string{`"users":[]`, `"sessions":[]`, `"refresh_tokens":[]`} {
		if !strings.Contains(body, key) {
			t.Errorf("snapshot must contain %s: %s", key, body)
		}
	}
}

func TestSeedUser_Creates201(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSeedUser(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/__emulator/users", map[string]string{
		"email": "alice@example.com", "password": "password123",
	}))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestSeedUser_DuplicateEmail409(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSeedUser(st)

	body := map[string]string{"email": "alice@example.com", "password": "password123"}
	h.ServeHTTP(httptest.NewRecorder(), newRequest(t, http.MethodPost, "/__emulator/users", body))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/__emulator/users", body))
	if rec.Code != http.StatusConflict {
		t.Fatalf("status: %d", rec.Code)
	}
}
