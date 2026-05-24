// Package httpx は本エミュレータで頻用する HTTP 補助を集める。
package httpx

import (
	"encoding/json"
	"net/http"
)

// ReadJSON はリクエストボディから JSON を読み出す。
// supabase-js は gotrue_meta_security 等の追加フィールドを送るため、未知フィールドは黙って無視する。
func ReadJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}
