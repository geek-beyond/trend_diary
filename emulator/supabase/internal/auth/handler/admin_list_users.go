package handler

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"

	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/auth/store"
)

func AdminListUsers(h *Handler) {
	page, _ := strconv.Atoi(h.Query("page"))
	if page <= 0 {
		page = 1
	}
	perPage, _ := strconv.Atoi(h.Query("per_page"))
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
	h.Header().Set("x-total-count", strconv.Itoa(total))
	if link := paginationLinkHeader(h.Request(), page, perPage, total); link != "" {
		h.Header().Set("Link", link)
	}

	h.JSON(http.StatusOK, map[string]any{
		"users": users,
		"aud":   "authenticated",
	})
}

// paginationLinkHeader は単一ページでも rel="last" を必ず付ける。
// supabase-js (GoTrueAdminApi.listUsers) は Link が空のとき pagination.total を 0 にしてしまうため、
// 本物 GoTrue と同じく rel="last" を常時出す。
func paginationLinkHeader(r *http.Request, page, perPage, total int) string {
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
	if links != "" {
		links += ", "
	}
	links += fmt.Sprintf(`<%s?page=%d&per_page=%d>; rel="last"`, base, lastPage, perPage)
	return links
}
