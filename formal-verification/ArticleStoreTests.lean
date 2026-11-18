import ArticleStore

open ArticleStore

def main : IO Unit := do
  let urls := ["url/a", "url/b", "url/a"]
  if deduplicate urls != ["url/a", "url/b"] then
    throw <| IO.userError "URL deduplication did not keep the first occurrence"

  let rows := maxRowsForParameters 80 5
  if rows != 16 || rows * 5 > 80 then
    throw <| IO.userError "batch size exceeded the D1 parameter budget"
