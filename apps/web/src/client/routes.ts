import type { RouteConfigEntry } from '@react-router/dev/routes'
import { index, layout, prefix, type RouteConfig, route } from '@react-router/dev/routes'
import type { href } from 'react-router'

const PATH_INDEX = '/'

interface GroupRoute {
  readonly prefix: string
  readonly layout?: string
  readonly routes: readonly RouteNode[]
}

interface Route {
  readonly path: string
  readonly file: `./routes/${string}.tsx`
}

interface LayoutNode {
  readonly layout: `./routes/${string}.tsx`
  readonly children: readonly Route[]
}

type RouteNode = Route | LayoutNode

const baseGroup = {
  prefix: '',
  routes: [
    { path: PATH_INDEX, file: './routes/_index/route.tsx' },
    { path: '/login', file: './routes/login/route.tsx' },
    { path: '/signup', file: './routes/signup/route.tsx' },
    { path: '/privacy-policy', file: './routes/privacy-policy/route.tsx' },
    { path: '/terms-of-service', file: './routes/terms-of-service/route.tsx' },
  ],
} as const satisfies GroupRoute

const appLayoutGroup = {
  prefix: '',
  layout: './routes/app-layout.tsx',
  routes: [
    { path: '/trends', file: './routes/trends._index/route.tsx' },
    // 保護ページはセッション確定を待つ protected-layout 配下にまとめ、確定前のちらつきを一箇所で防ぐ
    {
      layout: './routes/protected-layout.tsx',
      children: [
        { path: '/inbox', file: './routes/inbox/route.tsx' },
        { path: '/diary', file: './routes/diary/route.tsx' },
        { path: '/analytics', file: './routes/analytics/route.tsx' },
        { path: '/settings', file: './routes/settings/route.tsx' },
      ],
    },
  ],
} as const satisfies GroupRoute

const groupRoutes = [baseGroup, appLayoutGroup] as const satisfies GroupRoute[]

function buildRouteNode(node: RouteNode): RouteConfigEntry {
  if ('layout' in node) {
    return layout(node.layout, node.children.map(buildRouteNode))
  }

  return node.path === PATH_INDEX ? index(node.file) : route(node.path, node.file)
}

function buildGroupRoute(group: GroupRoute): RouteConfigEntry[] {
  const routes = group.routes.map(buildRouteNode)
  const layoutRoutes = group.layout ? [layout(group.layout, routes)] : routes

  return group.prefix ? prefix(group.prefix, layoutRoutes) : layoutRoutes
}

const routing: RouteConfig = groupRoutes.flatMap(buildGroupRoute)
export default routing

/**
 * InternalPath
 *
 * アプリケーションで使用される内部パスのユニオン型。
 * React Router の href ヘルパーの引数型（型生成されたルート定義が正）から導出する。
 */
export type InternalPath = Parameters<typeof href>[0]
