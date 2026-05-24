package handler

import (
	"net/http"
	"strings"
)

func (h *Handler) withAPIKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !h.cfg.RequireAPIKey {
			next(w, r)
			return
		}
		if !h.apiKeyValid(r) {
			writeAPIError(w, http.StatusUnauthorized, "No API key found in request")
			return
		}
		next(w, r)
	}
}

func (h *Handler) withServiceRole(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !h.cfg.RequireAPIKey {
			next(w, r)
			return
		}
		key := authBearer(r)
		if key == "" {
			key = r.Header.Get("apikey")
		}
		if key != h.cfg.ServiceRoleKey {
			writeAPIError(w, http.StatusForbidden, "User not allowed")
			return
		}
		next(w, r)
	}
}

func (h *Handler) apiKeyValid(r *http.Request) bool {
	if key := r.Header.Get("apikey"); key != "" {
		if key == h.cfg.AnonKey || key == h.cfg.ServiceRoleKey {
			return true
		}
	}
	if bearer := authBearer(r); bearer != "" {
		if bearer == h.cfg.AnonKey || bearer == h.cfg.ServiceRoleKey {
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
