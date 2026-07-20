const MIN_SQLITE_ID = 0n
const MAX_SAFE_DB_ID = BigInt(Number.MAX_SAFE_INTEGER)

// DB の ID は非負かつ safe integer 範囲が契約。境界の定義が変換（toDbId）と
// API パラメータ検証で二重にならないよう、判定をここに集約する
export function isWithinDbIdRange(id: bigint): boolean {
  return id >= MIN_SQLITE_ID && id <= MAX_SAFE_DB_ID
}

export function toDbId(id: bigint): number {
  if (!isWithinDbIdRange(id)) {
    throw new RangeError(`ID out of range for DB number conversion: ${id.toString()}`)
  }
  return Number(id)
}

export function toDbIds(ids: bigint[]): number[] {
  return ids.map(toDbId)
}

export function fromDbId(id: number | bigint): bigint {
  if (typeof id === 'bigint') {
    return id
  }
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new RangeError(`Invalid DB id: ${id}`)
  }
  return BigInt(id)
}
