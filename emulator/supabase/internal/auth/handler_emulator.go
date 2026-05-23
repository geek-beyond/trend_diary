package auth

import (
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (s *Service) handleEmulatorReset(w http.ResponseWriter, _ *http.Request) {
	s.store.Reset()
	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) handleEmulatorSnapshot(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, s.store.Snapshot())
}

type seedUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// handleEmulatorSeedUser はテストヘルパ用に password ハッシュ込みでユーザを直接登録する。
func (s *Service) handleEmulatorSeedUser(w http.ResponseWriter, r *http.Request) {
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
	hash, err := HashPassword(req.Password)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	u, err := s.store.CreateUser(req.Email, hash)
	if err != nil {
		writeAPIError(w, http.StatusConflict, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, u)
}
