// Package uuidx は RFC 4122 v4 UUID を crypto/rand から生成する。
package uuidx

import (
	"crypto/rand"
	"encoding/hex"
)

// New は v4 UUID 文字列（小文字、ハイフン区切り）を返す。
func New() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// crypto/rand のエラーは実質起こらない。起きたらプロセス死亡で問題ない。
		panic(err)
	}
	// version 4 (上位4ビットを 0100 に)
	b[6] = (b[6] & 0x0f) | 0x40
	// variant RFC 4122 (上位2ビットを 10 に)
	b[8] = (b[8] & 0x3f) | 0x80

	dst := make([]byte, 36)
	hex.Encode(dst[0:8], b[0:4])
	dst[8] = '-'
	hex.Encode(dst[9:13], b[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], b[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], b[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:36], b[10:16])
	return string(dst)
}
