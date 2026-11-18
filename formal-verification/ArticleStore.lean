import Std

namespace ArticleStore

/-!
TypeScript実装との同値性を別途レビューできるよう、モデルの性質だけを証明対象にする。
-/

def deduplicate [BEq α] [LawfulBEq α] (items : List α) : List α :=
  items.eraseDups

theorem deduplicate_has_no_duplicates [BEq α] [LawfulBEq α] (items : List α) :
    (deduplicate items).Nodup := by
  suffices result : ∀ n (items : List α), items.length = n → (deduplicate items).Nodup from
    result items.length items rfl
  intro n
  induction n using Nat.strongRecOn with
  | ind n ih =>
    intro items lengthEq
    cases items with
    | nil => simp [deduplicate]
    | cons head
      tail =>
      have smaller : (tail.filter fun item => !(item == head)).length < n := by
        rw [← lengthEq]
        simp only [List.length_cons]
        exact Nat.lt_succ_of_le (List.length_filter_le _ _)
      rw [deduplicate, List.eraseDups_cons]
      apply List.nodup_cons.mpr
      constructor
      · simp
      · exact ih _ smaller _ rfl

theorem deduplicate_preserves_membership [BEq α] [LawfulBEq α] (items : List α) (item : α) :
    item ∈ deduplicate items ↔ item ∈ items := by simp [deduplicate]

theorem deduplicate_preserves_nonempty [BEq α] [LawfulBEq α] (items : List α)
    (nonempty : items ≠ []) : deduplicate items ≠ [] := by
  cases items with
  | nil => contradiction
  | cons head tail =>
    intro empty
    have headIsPresent : head ∈ deduplicate (head :: tail) := by simp [deduplicate]
    rw [empty] at headIsPresent
    simp at headIsPresent

/- 1行ごとのパラメータ数から安全な挿入行数を計算するため。 -/
def maxRowsForParameters (parameterBudget columnsPerRow : Nat) : Nat :=
  parameterBudget / columnsPerRow

theorem maxRows_respects_parameter_budget (parameterBudget columnsPerRow : Nat) :
    maxRowsForParameters parameterBudget columnsPerRow * columnsPerRow ≤ parameterBudget := by
  exact Nat.div_mul_le_self parameterBudget columnsPerRow

end ArticleStore
