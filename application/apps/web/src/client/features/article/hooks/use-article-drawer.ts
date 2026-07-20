import type { Nullable } from '@trend-diary/std/types/utility'
import { useState } from 'react'
import type { Article } from './use-articles'

export default function useArticleDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Nullable<Article>>(null)

  const open = (article: Article) => {
    setSelectedArticle(article)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setSelectedArticle(null)
  }

  return {
    isOpen,
    selectedArticle,
    open,
    close,
  }
}
