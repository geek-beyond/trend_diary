package config

// DefaultJWTSecret は Supabase CLI が `supabase start` でローカル demo に発行するものと一致する。
// アプリ側の .dev.vars.example / supabase/config.toml と整合させるため値を変更しないこと。
const DefaultJWTSecret = "super-secret-jwt-token-with-at-least-32-characters-long"
