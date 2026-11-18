import Std

namespace ArticleStore

/-!
TypeScript実装との同値性を別途レビューできるよう、モデルの性質だけを証明対象にする。
-/

def deduplicate [BEq α] [LawfulBEq α] (items : List α) : List α :=
  items.eraseDups

theorem deduplicate_has_no_duplicates [BEq α] [LawfulBEq α] (items : List α) :
    (deduplicate items).Nodup := by
  simp [deduplicate]

theorem deduplicate_preserves_membership [BEq α] [LawfulBEq α] (items : List α) (item : α) :
    item ∈ deduplicate items ↔ item ∈ items := by
  simp [deduplicate]

theorem deduplicate_preserves_nonempty [BEq α] [LawfulBEq α] (items : List α)
    (nonempty : items ≠ []) : deduplicate items ≠ [] := by
  cases items with
  | nil => contradiction
  | cons head tail => simp [deduplicate]

/- 1行ごとのパラメータ数から安全な挿入行数を計算するため。 -/
def maxRowsForParameters (parameterBudget columnsPerRow : Nat) : Nat :=
  parameterBudget / columnsPerRow

theorem maxRows_respects_parameter_budget (parameterBudget columnsPerRow : Nat)
    (positiveColumns : 0 < columnsPerRow) :
    maxRowsForParameters parameterBudget columnsPerRow * columnsPerRow ≤ parameterBudget := by
  exact Nat.div_mul_le_self parameterBudget columnsPerRow

end ArticleStore
