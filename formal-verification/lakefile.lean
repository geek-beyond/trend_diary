import Lake

open Lake DSL

package «article-store» where
  version := v!"0.1.0"
  testDriver := "ArticleStoreTests"
  lintDriver := "«lean-fmt»/«lean-fmt»"
  lintDriverArgs := #["check"]

require «lean-fmt» from git
  "https://github.com/jcreinhold/lean-fmt" @ "v4.36.0-fmt.1"

@[default_target]
lean_lib ArticleStore

lean_exe ArticleStoreTests where
  root := `ArticleStoreTests
  supportInterpreter := true
