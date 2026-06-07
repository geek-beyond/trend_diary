import type { ReactNode } from 'react'
import { Children, isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { SheetClose } from '../../shadcn/sheet'
import type { MenuItem } from '../sidebar'
import NavMenu from './index'

const menuItems: MenuItem[] = [
  {
    title: 'トレンド記事',
    url: '/trends',
    icon: () => null,
  },
]

describe('NavMenu', () => {
  it('sheet表示では各メニュー項目がSheetCloseでラップされる', () => {
    const element = NavMenu({ variant: 'sheet', menuItems })

    if (!isValidElement(element)) {
      throw new Error('NavMenuがReactElementを返さなかった')
    }

    const children = (element.props as { children: ReactNode[] }).children
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
