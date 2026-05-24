package handler

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func (h *Handler) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	perPage, _ := strconv.Atoi(q.Get("per_page"))
	if perPage <= 0 {
		perPage = 50
	}

	snap := h.store.Snapshot()
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

	users := snap.Users[start:end]
	if users == nil {
		users = []store.User{}
	}

	// supabase-js GoTrueAdminApi.listUsers は x-total-count と Link ヘッダから
	// nextPage / lastPage / total を組み立てる。
	total := len(snap.Users)
	w.Header().Set("x-total-count", strconv.Itoa(total))
	if link := buildPaginationLinkHeader(r, page, perPage, total); link != "" {
		w.Header().Set("Link", link)
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"users": users,
		"aud":   "authenticated",
	})
}

func buildPaginationLinkHeader(r *http.Request, page, perPage, total int) string {
	if perPage <= 0 {
		return ""
	}
	lastPage := (total + perPage - 1) / perPage
	if lastPage < 1 {
		lastPage = 1
	}
	base := r.URL.Path
	links := ""
	if page < lastPage {
		links += fmt.Sprintf(`<%s?page=%d&per_page=%d>; rel="next"`, base, page+1, perPage)
	}
	if lastPage > 1 {
		if links != "" {
			links += ", "
		}
		links += fmt.Sprintf(`<%s?page=%d&per_page=%d>; rel="last"`, base, lastPage, perPage)
	}
	return links
}

func (h *Handler) handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeAPIError(w, http.StatusBadRequest, "user id is required")
		return
	}
	if err := h.store.DeleteUser(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			writeAPIError(w, http.StatusNotFound, "User not found")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{})
}
