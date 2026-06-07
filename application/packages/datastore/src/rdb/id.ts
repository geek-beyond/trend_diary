const MIN_SQLITE_ID = 0n
const MAX_SAFE_DB_ID = BigInt(Number.MAX_SAFE_INTEGER)

export function toDbId(id: bigint): number {
  if (id < MIN_SQLITE_ID || id > MAX_SAFE_DB_ID) {
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
