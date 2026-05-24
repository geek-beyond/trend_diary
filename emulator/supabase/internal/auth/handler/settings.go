package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (h *Handler) handleHealth(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"version":     "v2.150.0",
		"name":        "GoTrue",
		"description": "GoTrue is a user registration and authentication API (emulator)",
	})
}

func (h *Handler) handleSettings(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"external": map[string]bool{
			"anonymous_users": false,
			"email":           true,
			"phone":           false,
		},
		"disable_signup":     false,
		"mailer_autoconfirm": true,
		"phone_autoconfirm":  false,
		"sms_provider":       "",
		"saml_enabled":       false,
	})
}
