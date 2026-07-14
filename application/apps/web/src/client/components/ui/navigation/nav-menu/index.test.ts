import type { ReactNode } from 'react'
import { Children, isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { SheetClose } from '@/client/components/shadcn/sheet'
import type { MenuItem } from '@/client/entities/navigation'
import NavMenu from './index'

const menuItems: MenuItem[] = [
  {
    title: 'トレンド記事',
    url: '/trends',
    icon: () => null,
  },
]

// oxlint-disable-next-line typescript/no-restricted-types -- 任意の props を受けて children の有無を絞り込む型ガードの役割のため
function hasChildren(props: unknown): props is { children: ReactNode } {
  return typeof props === 'object' && props !== null && 'children' in props
}

describe('NavMenu', () => {
  it('sheet表示では各メニュー項目がSheetCloseでラップされる', () => {
    const element = NavMenu({ variant: 'sheet', menuItems })

    if (!isValidElement(element)) {
      throw new Error('NavMenuがReactElementを返さなかった')
    }

    if (!hasChildren(element.props)) {
      throw new Error('NavMenuの戻り値がchildrenを持たなかった')
    }
    const children = element.props.children
    const menuItemElement = Children.toArray(children).find(
      (child) => isValidElement(child) && child.type === SheetClose,
    )

    if (!menuItemElement || !isValidElement(menuItemElement)) {
      throw new Error('メニュー項目がReactElementではない')
    }

    expect(menuItemElement.type).toBe(SheetClose)
  })

  it('sidebar表示ではSheetCloseを使用しない', () => {
    const element = NavMenu({ variant: 'sidebar', menuItems })

    if (!isValidElement(element)) {
      throw new Error('NavMenuがReactElementを返さなかった')
    }

    expect(element.type).not.toBe(SheetClose)
  })
})
