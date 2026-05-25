# Supabaseのfunctions内のディレクトリ構成について

Status: Accepted

Relevant PR:

- https://github.com/Geek-Beyond/trend_diary/pull/107

# Context

はじめは、honoのアプリケーションと同じようにDDD風に内容を記述していた
しかし、レビューのタイミングで記述量の多さなどの観点からフラットにファイルを配置するべきという意見が出た

## References

- https://github.com/Geek-Beyond/trend_diary/pull/107#pullrequestreview-2797667986

# Decision

DDDとしてディレクトリで分割するのではなく、モジュールとしてファイルで分割をする

## Reason

- ドメインが複雑でないため、ドメインを中心にして開発しなくていいため

# Consequences

- supabaseのedge functionsの内部のファイルが簡潔になった
