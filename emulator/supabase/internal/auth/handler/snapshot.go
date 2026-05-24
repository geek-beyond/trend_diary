package handler

import "net/http"

func Snapshot(h *Handler) {
	h.JSON(http.StatusOK, h.store.Snapshot())
}
