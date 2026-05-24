package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealth_ReturnsGoTrueName(t *testing.T) {
	h := NewHealth()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"name":"GoTrue"`) {
		t.Errorf("body: %s", rec.Body.String())
	}
}

func TestSettings_MailerAutoconfirmTrue(t *testing.T) {
	h := NewSettings()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, newRequest(t, http.MethodGet, "/auth/v1/settings", nil))
	if !strings.Contains(rec.Body.String(), `"mailer_autoconfirm":true`) {
		t.Errorf("body: %s", rec.Body.String())
	}
}
