export type UndefinedOr<T> = T | undefined
export type Nullable<T> = T | null

export function isNull<T>(value: Nullable<T>): value is null {
  return value === null
}
