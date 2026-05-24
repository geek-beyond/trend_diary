package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type Settings struct{}

func NewSettings() *Settings { return &Settings{} }

func (h *Settings) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	httpx.MustFromContext(r.Context()).JSON(http.StatusOK, map[string]any{
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
