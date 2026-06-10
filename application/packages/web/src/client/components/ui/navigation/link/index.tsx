import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react'
import { Link } from 'react-router'
import { Button } from '@/client/components/shadcn/button'
import { InternalPath } from '@/client/routes'

export type ExternalPath = `https://${string}` | `http://${string}`

interface ExternalLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  to: ExternalPath
}

function ExternalLink({ to, children, ...props }: PropsWithChildren<ExternalLinkProps>) {
  return (
    // biome-ignore lint: plugin
    <a href={to} target='_blank' rel='noopener noreferrer nofollow' {...props}>
      {children}
    </a>
  )
}

interface InternalLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'to'> {
  to: InternalPath
}

function InternalLink({ to, children, ...props }: PropsWithChildren<InternalLinkProps>) {
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  )
}

function isExternalPath(to: string): to is ExternalPath {
  return /^https?:\/\//.test(to)
}

type AnchorLinkProps = PropsWithChildren<{
  to: InternalPath | ExternalPath
}> &
  Omit<ComponentPropsWithoutRef<'a'>, 'href'>

/**
 * AnchorLink
 * @description aタグを薄くラップしたコンポーネント。内部リンクの際はReact RouterのLinkコンポーネントとして動作し、
 *              外部リンクの際は新しいタブで開くaタグとして動作する。
 * @param to InternalPath | `https://${string}` | `http://${string}`, InternalPathはルーティング定義から型推論される
 * @param className
 * @param children
 * @link Linkのperf参考: https://zenn.dev/atusi/articles/3e37d4d54736fa#link
 */
export function AnchorLink({ to, children, ...props }: AnchorLinkProps) {
  return isExternalPath(to) ? (
    <ExternalLink to={to} {...props}>
      {children}
    </ExternalLink>
  ) : (
    <InternalLink to={to} {...props}>
      {children}
    </InternalLink>
  )
}

type LinkAsButtonProps = AnchorLinkProps

/**
 * LinkAsButton
 * @description 内部リンクの際はReact RouterのLink、外部リンクの際はaタグとして振る舞うボタンコンポーネント
 * @param to InternalPath | `https://${string}` | `http://${string}`
 * @param className Optional class name for styling
 */
export function LinkAsButton({ to, className, children }: LinkAsButtonProps) {
  return (
    <Button variant='link' asChild={true}>
      <AnchorLink to={to} className={className}>
        {children}
      </AnchorLink>
    </Button>
  )
}
