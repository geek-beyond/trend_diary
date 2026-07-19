import { Calendar, Check, ExternalLink, User, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/client/components/shadcn/drawer'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { cn } from '@/client/components/shadcn/lib/utils'
import type { Article } from '@/client/features/article/hooks/use-articles'
import { toJaDateString } from '@/common/locale/date'
import MediaIcon, { toMediaType } from './media-icon'

const DESCRIPTION_TOGGLE_THRESHOLD = 100

interface Props {
  article: Article
  isOpen: boolean
  onClose: () => void
  onMarkAsRead?: (articleId: string) => void | Promise<void>
  isLoggedIn?: boolean
}

export default function ArticleDrawer({
  article,
  isOpen,
  onClose,
  onMarkAsRead,
  isLoggedIn = false,
}: Props) {
  const isMobile = useIsMobile()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  const isRead = article.isRead ?? false
  const media = toMediaType(article.media)
  const { direction: drawerDirection, contentClass: drawerContentClass } =
    resolveDrawerLayout(isMobile)
  const shouldShowDescriptionToggle = article.description.length > DESCRIPTION_TOGGLE_THRESHOLD

  const handleReadArticle = () => {
    // ポップアップブロッカー対策として、先にウィンドウを開く
    window.open(article.url, '_blank', 'noopener,noreferrer')
    if (isLoggedIn) {
      // onMarkAsReadはawaitせず、バックグラウンドで実行
      onMarkAsRead?.(article.articleId)
    }

    onClose()
  }

  return createPortal(
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction={drawerDirection}>
      <DrawerContent className={drawerContentClass}>
        <DrawerHeader className='flex flex-row items-center justify-between pb-4'>
          <div className='flex flex-1 items-center gap-2' data-slot='drawer-header-icon'>
            <MediaIcon media={media} />
            <DrawerTitle className='text-xl leading-relaxed font-bold text-foreground'>
              {article.title}
            </DrawerTitle>
            {/* スクリーンリーダー向けの説明。Radix Dialog の aria-describedby 警告も解消する */}
            <DrawerDescription className='sr-only'>
              {article.author
                ? `${article.author}による記事「${article.title}」の概要`
                : `記事「${article.title}」の概要`}
            </DrawerDescription>
            {isRead && (
              <span
                data-testid='drawer-read-indicator'
                className='inline-flex items-center text-green-600'
              >
                <Check className='h-4 w-4' />
                <span className='ml-1 text-sm'>既読</span>
              </span>
            )}
          </div>
          <DrawerClose className='ring-offset-background focus:ring-ring cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none'>
            <X className='size-4' data-slot='x-icon' />
            <span className='sr-only'>Close</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Drawer内では文字選択とドラッグしてDrawerを閉じるアクションがバッティングする */}
        {/* data-vaul-no-dragをfalseに指定し、ドラッグしてDrawerが閉じないように */}
        <div className='flex-1 overflow-y-auto px-4 select-text' data-vaul-no-drag={false}>
          <div
            className='mb-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground'
            data-slot='drawer-content-meta'
          >
            <div className='flex items-center gap-1' data-slot='drawer-content-author'>
              <User className='size-4' />
              <span className='text-sm font-medium text-foreground'>{article.author}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Calendar className='size-4' />
              <span>{toJaDateString(article.createdAt)}</span>
            </div>
          </div>

          <div className='mb-8' data-slot='drawer-content-description'>
            <h3 className='mb-3 text-lg font-semibold text-foreground'>概要</h3>
            <p
              className={cn(
                'leading-relaxed text-foreground',
                shouldShowDescriptionToggle && !isDescriptionExpanded && 'line-clamp-4',
              )}
              data-slot='drawer-content-description-content'
            >
              {article.description}
            </p>
            {shouldShowDescriptionToggle && (
              <button
                type='button'
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                className='mt-2 cursor-pointer text-sm font-medium text-blue-600 underline decoration-transparent transition-colors hover:text-blue-700 hover:decoration-current'
                data-slot='drawer-description-toggle'
              >
                {isDescriptionExpanded ? '閉じる' : '続きを読む'}
              </button>
            )}
          </div>

          <div className='border-t p-4 space-y-3'>
            <button
              type='button'
              onClick={handleReadArticle}
              className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600'
              data-slot='drawer-content-button'
            >
              <ExternalLink className='size-4' />
              記事を読む
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>,
    document.body,
  )
}

function resolveDrawerLayout(isMobile: boolean): {
  direction: 'bottom' | 'right'
  contentClass: string
} {
  return {
    direction: isMobile ? 'bottom' : 'right',
    contentClass: isMobile
      ? 'h-[90vh] w-full data-[vaul-drawer-direction=bottom]:max-h-[90vh]'
      : 'h-full w-3/4 md:w-1/2',
  }
}
