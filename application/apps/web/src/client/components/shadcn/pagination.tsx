import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import * as React from 'react'
import { Button, buttonVariants } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label='pagination'
      data-slot='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot='pagination-content'
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot='pagination-item' {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  disabled?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

function PaginationLink({
  className,
  isActive,
  disabled,
  size = 'icon',
  href,
  ...props
}: PaginationLinkProps) {
  const sharedClassName = cn(
    buttonVariants({
      variant: isActive ? 'outline' : 'ghost',
      size,
    }),
    'cursor-pointer',
    className,
  )

  // href が無い場合はページ遷移ではなくクリックハンドラで処理する操作ボタンのため、<a> ではなく <button> で描画する。
  // href の無い <a> は generic ロールとなり aria-disabled 等の ARIA 属性が許可されず、ユーザー補助ツリーの監査で不適格になる
  if (href === undefined) {
    return (
      <button
        type='button'
        disabled={disabled}
        aria-current={isActive ? 'page' : undefined}
        data-slot='pagination-link'
        data-active={isActive}
        className={sharedClassName}
        {...(props as React.ComponentProps<'button'>)}
      />
    )
  }

  return (
    <a
      href={href}
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={sharedClassName}
      {...props}
    />
  )
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to previous page'
      size='default'
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className='hidden sm:block'>前へ</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to next page'
      size='default'
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className='hidden sm:block'>次へ</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden={true}
      data-slot='pagination-ellipsis'
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className='size-4' />
      <span className='sr-only'>More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
