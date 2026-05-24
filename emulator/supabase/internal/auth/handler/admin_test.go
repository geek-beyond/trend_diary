package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAdminListUsers_PaginationHeaders(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	for _, e := range []string{"a@example.com", "b@example.com", "c@example.com"} {
		seed(t, st, tk, e, "password123")
	}
	h := NewAdminListUsers(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=2", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
	if got := rec.Header().Get("x-total-count"); got != "3" {
		t.Errorf("x-total-count: %s", got)
	}
	link := rec.Header().Get("Link")
	if !strings.Contains(link, `rel="next"`) || !strings.Contains(link, `rel="last"`) {
		t.Errorf("Link must include next/last: %s", link)
	}
}

func TestAdminListUsers_LastPageHasNoNext(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	seed(t, st, tk, "alice@example.com", "password123")
	h := NewAdminListUsers(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=50", nil))
	if strings.Contains(rec.Header().Get("Link"), `rel="next"`) {
		t.Errorf("Link should not include rel=next: %s", rec.Header().Get("Link"))
	}
}

func TestAdminListUsers_EmptyStoreReturnsEmptyArray(t *testing.T) {
	st := newStoreWith(nil)
	h := NewAdminListUsers(st)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/admin/users", nil))
	if !strings.Contains(rec.Body.String(), `"users":[]`) {
		t.Errorf("users must be empty array: %s", rec.Body.String())
	}
}

func TestAdminDeleteUser_Success(t *testing.T) {
	st := newStoreWith(nil)
	tk := newTokensWith(st, nil)
	seeded := seed(t, st, tk, "alice@example.com", "password123")
	h := NewAdminDeleteUser(st)

	req := newRequest(t, http.MethodDelete, "/auth/v1/admin/users/"+seeded.User.ID, nil)
	req.SetPathValue("id", seeded.User.ID)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestAdminDeleteUser_NotFound(t *testing.T) {
	st := newStoreWith(nil)
	h := NewAdminDeleteUser(st)

	req := newRequest(t, http.MethodDelete, "/auth/v1/admin/users/nonexistent", nil)
	req.SetPathValue("id", "nonexistent")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status: %d", rec.Code)
	}
}
