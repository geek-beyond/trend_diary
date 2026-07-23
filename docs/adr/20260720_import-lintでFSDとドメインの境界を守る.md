# import-lintでFSDとドメインの境界を守る

Status: Accepted

Relevant PR:

# Context

web クライアントは FSD（Feature-Sliced Design）に沿って `features/` `entities/` のスライスへ分割し、各スライスは `index.ts` を公開 API として持つ。ドメイン層（`packages/domain`）も集約（`article` / `account`）ごとにディレクトリを分け、集約の `index.ts` を公開 API としている。

しかし「公開 API を経由せずスライス／集約の内部実装へ直接 import する」ことを機械的に禁止する仕組みが無く、境界の遵守はレビューの目視に依存していた。内部への直接 import は、公開 API という抽象の境界を崩し、リファクタリング時の影響範囲を無制限に広げる。

## References

- https://github.com/uhyo/import-lint
- https://zenn.dev/uhyo/articles/import-lint-intro

# Decision

import 境界の検査に import-lint（`@import-lint/cli`）を導入する。設定は `.importlintrc.jsonc` に置き、`pnpm lint` の一部として実行する（pre-commit フックと CI の code-quality ジョブで担保される）。

境界（package）は `packageDirectory` で以下に限定する。

- `apps/web/src/client/features/*`（FSD スライス）
- `apps/web/src/client/entities/*`（FSD スライス）
- `packages/domain/src/*`（ドメイン集約。ただしテスト用共有ユーティリティの `test-helper` は除外）

`defaultImportability: "package"` と `indexLoophole: true` により、境界内の export は既定で同一パッケージ内限定とし、境界直下の `index.ts` の素の再エクスポートだけを公開 API として一段外へ昇格させる。境界に一致しないディレクトリは単一のプロジェクトルートパッケージに属し相互に自由に import できるため、既存コードへ段階的に導入できる。

## Reason

- ESLint プラグイン（eslint-plugin-import-access）の後継であり、公開 API 経由のカプセル化という本プロジェクトの運用意図に合致するため
- `packageDirectory` により「どのディレクトリを境界とするか」をディレクトリ名の変更なしに宣言でき、FSD スライスとドメイン集約だけを対象にできるため
- 単体の高速な CLI で、既存の lint ゲート（`pnpm lint`）へ追加するだけで済むため

検討した代替案:

- dependency-cruiser / eslint-plugin-boundaries: レイヤーの依存方向（features → entities → shared 等）まで表現できるが、設定が重く、本プロジェクトが第一に守りたい「公開 API 経由のカプセル化」に対しては過剰だった。import-lint はレイヤー方向そのものは強制しないため、方向の制約は引き続きレビューで担保する。

なお `@import-lint/cli` の境界機能（`packageDirectory`）は 0.1.6 以降でのみ利用でき、当該バージョンは `minimumReleaseAge` の隔離期間内にある。そのため `pnpm-workspace.yaml` の `minimumReleaseAgeExclude` で `@import-lint/*` のみを隔離対象から除外し、バージョンは `0.1.6` に固定する。除外は開発用リンター単体に限定し、実行時依存へは波及しない。

# Consequences

- スライス／集約の内部実装への直接 import が lint エラーとして検出されるようになり、境界の遵守がレビューの目視からゲートへ移った
- 外部へ公開したい要素は境界直下の `index.ts` に再エクスポートする、という手順が明確になった
- import-lint の新しいリリースは `minimumReleaseAge` の隔離を経ずに解決されうるため、バージョン更新時は変更内容を確認した上で固定バージョンを引き上げる運用とする
