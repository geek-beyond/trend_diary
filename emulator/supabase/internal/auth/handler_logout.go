package auth

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/jwt"
)

func (s *Service) handleLogout(w http.ResponseWriter, r *http.Request) {
	token := authBearer(r)
	if token == "" || token == s.cfg.AnonKey || token == s.cfg.ServiceRoleKey {
		writeAPIError(w, http.StatusUnauthorized, "AuthSessionMissingError: Auth session missing!")
		return
	}
	claims, err := jwt.Verify(token, s.cfg.JWTSecret)
	if err != nil {
		writeAPIError(w, http.StatusUnauthorized, "invalid token")
		return
	}
	if claims.SessionID != "" {
		s.store.RevokeRefreshTokensBySession(claims.SessionID)
	}
	w.WriteHeader(http.StatusNoContent)
}
