package handler

import (
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (h *Handler) handleEmulatorReset(w http.ResponseWriter, _ *http.Request) {
	h.store.Reset()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleEmulatorSnapshot(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, h.store.Snapshot())
}

type seedUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) handleEmulatorSeedUser(w http.ResponseWriter, r *http.Request) {
	var req seedUserRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		writeAPIError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	hash, err := store.HashPassword(req.Password)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	u, err := h.store.CreateUser(req.Email, hash)
	if err != nil {
		writeAPIError(w, http.StatusConflict, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, u)
}
