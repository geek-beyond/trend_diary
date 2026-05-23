// Package httpx は本エミュレータで頻用するHTTP補助関数を集める。
package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON は HTTP レスポンスに JSON を書き出す。
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if body == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(body)
}

// ReadJSON はリクエストボディから JSON を読み出す。
// supabase-js は gotrue_meta_security 等の追加フィールドを送るため、未知フィールドは黙って無視する。
func ReadJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}
