package auth

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (s *Service) handleGetUser(w http.ResponseWriter, r *http.Request) {
	u, err := s.authenticateUser(r)
	if err != nil {
		// supabase-js v2 は X-Supabase-Api-Version + error_code='session_not_found' で
		// AuthSessionMissingError に instanceof マップする。msg のフォールバック判定も
		// アプリ側で残っているので "Auth session missing" 文字列も維持する。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "session_not_found",
			"AuthSessionMissingError: Auth session missing!")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}

// authenticateUser は Authorization Bearer の access_token を検証して該当 User を返す。
// 失敗時は ErrUserNotFound を返す（呼び出し側で401を返却）。
func (s *Service) authenticateUser(r *http.Request) (*User, error) {
	token := authBearer(r)
	if token == "" {
		return nil, ErrUserNotFound
	}
	// apikey と一致する場合（anon/service_role）は user とみなさない
	if token == s.cfg.AnonKey || token == s.cfg.ServiceRoleKey {
		return nil, ErrUserNotFound
	}
	claims, err := s.verifyToken(token)
	if err != nil {
		return nil, ErrUserNotFound
	}
	u, ok := s.store.FindUserByID(claims.Subject)
	if !ok {
		return nil, ErrUserNotFound
	}
	return u, nil
}
