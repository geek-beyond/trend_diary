package auth

import (
	"errors"
	"net/http"
	"sort"
	"strconv"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (s *Service) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	perPage, _ := strconv.Atoi(q.Get("per_page"))
	if perPage <= 0 {
		perPage = 50
	}

	snap := s.store.Snapshot()
	// 作成日時 ASC で並べる（GoTrue挙動寄せ）
	sort.Slice(snap.Users, func(i, j int) bool {
		return snap.Users[i].CreatedAt.Before(snap.Users[j].CreatedAt)
	})

	start := (page - 1) * perPage
	end := start + perPage
	if start > len(snap.Users) {
		start = len(snap.Users)
	}
	if end > len(snap.Users) {
		end = len(snap.Users)
	}

	// nil スライスが JSON で null になるのを避けるため空スライスに正規化する
	users := snap.Users[start:end]
	if users == nil {
		users = []User{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"users": users,
		"aud":   "authenticated",
	})
}

func (s *Service) handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeAPIError(w, http.StatusBadRequest, "user id is required")
		return
	}
	if err := s.store.DeleteUser(id); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			writeAPIError(w, http.StatusNotFound, "User not found")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{})
}
