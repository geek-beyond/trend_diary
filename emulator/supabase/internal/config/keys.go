package config

// 以下の固定鍵は Supabase CLI が `supabase start` でローカル demo に発行するものと一致する。
// アプリ側の .dev.vars.example / supabase/config.toml と整合させるため値を変更しないこと。
// exp は 2032-05-17 で十分先まで有効。

const DefaultJWTSecret = "super-secret-jwt-token-with-at-least-32-characters-long"

const DefaultAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

const DefaultServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
