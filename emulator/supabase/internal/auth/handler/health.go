package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type Health struct{}

func NewHealth() *Health { return &Health{} }

func (h *Health) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"version":     "v2.150.0",
		"name":        "GoTrue",
		"description": "GoTrue is a user registration and authentication API (emulator)",
	})
}
