---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript規約

## 型アサーション

- 型アサーション（`as`）は oxlint（`typescript/consistent-type-assertions: "never"`）で全面禁止しており、使うときは `// oxlint-disable-next-line typescript/consistent-type-assertions -- <理由>` で理由を明示する
  - 理由: アサーションは型検査の抜け穴になるため無条件には許さず、なぜ必要かをコードに残してレビューで妥当性を判断できるようにする

- `as unknown as T`（二重アサーション）は原則使わない。まず単一の `as T` で通らないか試し、通るなら単一にする
  - 理由: `as unknown as` は型の重なりチェックすら迂回する最も強い抜け穴で、実体と乖離したモック等を気づかず作り込みやすい。単一 `as` は「型が部分的に重なる」ことを最低限保証する
  - 例外: 判別共用体の解決値など、単一 `as` では型が重ならず二重が避けられない場合のみ使い、その旨を disable コメントの理由に書く（例: `supabase-auth-repository.test.ts` の `resolveAuthMock`）。まずは完全な型を組み立てる／throw で再現する等でアサーション自体を無くせないかを優先検討する
  - 補足: 「単一 `as` か二重 `as unknown as` か」の機械的な区別は oxlint が `no-restricted-syntax` を未サポートで強制できないため、レビューで担保する
