package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSignup_Success(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", map[string]string{
		"email": "alice@example.com", "password": "password123",
	}))

	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
	var tr TokenResponse
	decodeJSON(t, rec, &tr)
	if tr.AccessToken == "" || tr.RefreshToken == "" {
		t.Fatal("missing tokens")
	}
	if tr.User.Email != "alice@example.com" {
		t.Errorf("email: %s", tr.User.Email)
	}
}

func TestSignup_DuplicateEmail(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	body := map[string]string{"email": "alice@example.com", "password": "password123"}
	h.ServeHTTP(httptest.NewRecorder(), newRequest(t, http.MethodPost, "/auth/v1/signup", body))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", body))
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status: %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "already registered") {
		t.Errorf("body must include 'already registered': %s", rec.Body.String())
	}
}

func TestSignup_DataPersistedToStore(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", map[string]any{
		"email": "alice@example.com", "password": "password123",
		"data": map[string]any{"nickname": "alice"},
	}))

	var tr TokenResponse
	decodeJSON(t, rec, &tr)
	if got := tr.User.UserMetadata["nickname"]; got != "alice" {
		t.Errorf("response nickname: %v", got)
	}

	stored, _ := st.FindUserByID(tr.User.ID)
	if got := stored.UserMetadata["nickname"]; got != "alice" {
		t.Errorf("store nickname: %v", got)
	}
}

func TestSignup_ShortPassword(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", map[string]string{
		"email": "alice@example.com", "password": "abc",
	}))
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestSignup_InvalidEmail(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", map[string]string{
		"email": "no-at-sign", "password": "password123",
	}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestSignup_StoresLowercaseEmail(t *testing.T) {
	st := newStoreWith(nil)
	h := NewSignup(st, newTokensWith(st, nil))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodPost, "/auth/v1/signup", map[string]string{
		"email": "Alice@Example.COM", "password": "password123",
	}))
	var tr TokenResponse
	decodeJSON(t, rec, &tr)
	if tr.User.Email != "alice@example.com" {
		t.Errorf("email: %s", tr.User.Email)
	}
	// Store にも lowercase で保存されている
	got, ok := st.FindUserByEmail("alice@example.com")
	if !ok {
		t.Fatal("lowercase lookup failed")
	}
	if got.Email != "alice@example.com" {
		t.Errorf("stored email: %s", got.Email)
	}
}

