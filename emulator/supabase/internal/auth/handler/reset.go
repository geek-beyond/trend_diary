package handler

func Reset(h *Handler) {
	h.store.Reset()
	h.NoContent()
}
