package store

// cloneUser は呼び出し側の map/スライス書き換えがストア本体に漏れないよう deep copy する。
// 旧シャローコピー実装では `clone.AppMetadata["k"]=v` が RWMutex 外からストアの map を
// 直接書き換え、Snapshot 中の goroutine と並走して concurrent map fatal を起こすリスクがあった。
func (s *Store) cloneUser(u *User) *User {
	c := *u
	c.AppMetadata = cloneAnyMap(u.AppMetadata)
	c.UserMetadata = cloneAnyMap(u.UserMetadata)
	if u.Identities != nil {
		c.Identities = make([]Identity, len(u.Identities))
		for i, id := range u.Identities {
			ic := id
			ic.IdentityData = cloneAnyMap(id.IdentityData)
			c.Identities[i] = ic
		}
	}
	if u.PasswordHash != nil {
		c.PasswordHash = append([]byte(nil), u.PasswordHash...)
	}
	return &c
}

func (s *Store) cloneSession(sess *Session) *Session {
	c := *sess
	return &c
}

func (s *Store) cloneRefreshToken(rt *RefreshToken) *RefreshToken {
	c := *rt
	return &c
}

func cloneAnyMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	cp := make(map[string]any, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}
