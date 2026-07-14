import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface AuthAdminConfig {
  url: string
  serviceRoleKey: string
}

export interface AuthUserSummary {
  id: string
  email: string | null
}

// service_role 権限で認証ユーザーを管理するクライアント。テストの後始末でのみ使う。
// バックエンド(Supabase)はコンストラクタ内へ隠蔽し、呼び出し側へ生のクライアントや型を露出しない。
export class AuthAdminClient {
  private readonly client: SupabaseClient

  constructor(config: AuthAdminConfig) {
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async listUsers(): Promise<AuthUserSummary[]> {
    const summaries: AuthUserSummary[] = []
    const perPage = 200
    let page = 1

    while (true) {
      const { data, error } = await this.client.auth.admin.listUsers({ page, perPage })
      if (error) break

      summaries.push(...data.users.map((user) => ({ id: user.id, email: user.email ?? null })))

      if (data.users.length < perPage) break
      page += 1
    }

    return summaries
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.auth.admin.deleteUser(id)
  }
}
