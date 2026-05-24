package handler

import "net/http"

// catch-all。デフォルトの http.NotFoundHandler は text/plain で X-Supabase-Api-Version も
// 無いため、supabase-js の typed error マッピングが効かない。
func NotFound(h *Handler) {
	h.ErrorCode(http.StatusNotFound, "not_found",
		"endpoint not found: "+h.Request().Method+" "+h.Request().URL.Path)
}
