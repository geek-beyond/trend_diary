import type { ArticleMedia } from '@trend-diary/domain/article/media'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

export interface DiarySource {
  media: ArticleMedia
  read: number
  skip: number
}

interface DiaryReadItemResponse {
  readHistoryId: string
  articleId: string
  media: ArticleMedia
  title: string
  url: string
  readAt: string
}

export interface DiaryResponse {
  date: string
  sources: DiarySource[]
  reads: {
    data: DiaryReadItemResponse[]
    page: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface DiaryRangeItemResponse {
  date: string
  summary: {
    read: number
    skip: number
  }
  sources: DiarySource[]
}

interface DiaryRangeResponse {
  data: DiaryRangeItemResponse[]
  reads?: DiaryResponse['reads']
}

export default function useDiaryApi() {
  const { client, apiCall } = createSWRFetcher()

  const fetchDiary = async (date: string, page: number) => {
    const result = await apiCall<DiaryRangeResponse>(() =>
      client.articles.diary.$get(
        {
          query: {
            from: date,
            to: date,
            // クエリはURL上文字列で送られるため、検証前の入力型（string）に合わせる
            page: page.toString(),
          },
        },
        { init: { credentials: 'include' } },
      ),
    )

    if (!result?.reads || !result?.data?.[0]) {
      throw new Error('ダイアリーの取得に失敗しました')
    }

    const day = result.data[0]
    return {
      date: day.date,
      sources: day.sources,
      reads: result.reads,
    }
  }

  const fetchDiaryRange = async (from: string, to: string) => {
    const result = await apiCall<DiaryRangeResponse>(() =>
      client.articles.diary.$get(
        {
          query: {
            from,
            to,
          },
        },
        { init: { credentials: 'include' } },
      ),
    )
    if (!result) {
      throw new Error('ダイアリー範囲の取得に失敗しました')
    }
    return result.data
  }

  return {
    fetchDiary,
    fetchDiaryRange,
  }
}
