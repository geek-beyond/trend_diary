package auth

import "net/http"

func (s *Service) handleLogout(w http.ResponseWriter, r *http.Request) {
	// GoTrue は logout を冪等として扱い、Bearer が無い/anon/期限切れでも 204 を返す。
	// 旧実装は 401 を返していたため、supabase-js が session 期限切れ状態で signOut を
	// 呼んだときにアプリ側で AuthSessionMissingError が偽陽性発火していた。
	token := authBearer(r)
	if token != "" && token != s.cfg.AnonKey && token != s.cfg.ServiceRoleKey {
		if claims, err := s.verifyToken(token); err == nil && claims.SessionID != "" {
			s.store.RevokeRefreshTokensBySession(claims.SessionID)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}
