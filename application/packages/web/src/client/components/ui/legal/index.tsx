import type { ReactNode } from 'react'
import { cn } from '../../shadcn/lib/utils'

interface HeadingProps {
  children: ReactNode
}

interface ParagraphProps {
  children: ReactNode
  className?: string
}

export function Heading1({ children }: HeadingProps) {
  return <h1 className='mb-8 text-3xl font-bold text-slate-900'>{children}</h1>
}

export function Heading2({ children }: HeadingProps) {
  return <h2 className='mb-4 mt-8 text-xl font-bold text-slate-900'>{children}</h2>
}

export function Heading3({ children }: HeadingProps) {
  return <h3 className='mb-3 mt-6 text-lg font-semibold text-slate-900'>{children}</h3>
}

export function Paragraph({ children, className }: ParagraphProps) {
  return <p className={cn('mb-6 leading-relaxed', className)}>{children}</p>
}
