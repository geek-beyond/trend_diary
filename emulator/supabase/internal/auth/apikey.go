package auth

import (
	"net/http"
	"strings"
)

// withAPIKey は RequireAPIKey=true のとき apikey ヘッダ or Authorization Bearer を検証するラッパ。
// 検証は AnonKey / ServiceRoleKey のどちらかと一致すればOK。
// デフォルト（フラグなし）では何もせず handler を呼ぶ。
func (s *Service) withAPIKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.cfg.RequireAPIKey {
			next(w, r)
			return
		}
		if !s.apiKeyValid(r) {
			writeAPIError(w, http.StatusUnauthorized, "No API key found in request")
			return
		}
		next(w, r)
	}
}

// withServiceRole は admin エンドポイント用。service_role キーが必須。
func (s *Service) withServiceRole(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.cfg.RequireAPIKey {
			next(w, r)
			return
		}
		key := authBearer(r)
		if key == "" {
			key = r.Header.Get("apikey")
		}
		if key != s.cfg.ServiceRoleKey {
			writeAPIError(w, http.StatusForbidden, "User not allowed")
			return
		}
		next(w, r)
	}
}

func (s *Service) apiKeyValid(r *http.Request) bool {
	if key := r.Header.Get("apikey"); key != "" {
		if key == s.cfg.AnonKey || key == s.cfg.ServiceRoleKey {
			return true
		}
	}
	if bearer := authBearer(r); bearer != "" {
		if bearer == s.cfg.AnonKey || bearer == s.cfg.ServiceRoleKey {
			return true
		}
	}
	return false
}

func authBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return ""
	}
	return strings.TrimSpace(h[len(prefix):])
}
