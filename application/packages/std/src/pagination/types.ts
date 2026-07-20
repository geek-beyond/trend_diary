interface BaseResult<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
}

export interface OffsetPaginationResult<T> extends BaseResult<T> {
  page: number
  limit: number
  total: number
  totalPages: number
}
