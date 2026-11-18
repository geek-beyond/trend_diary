import { describe, expect, it } from 'vitest'
import { rssDescriptionToText } from './rss-description'

describe('rssDescriptionToText', () => {
  it('ネストしたHTMLから文の順序と段落の区切りを保ってテキストを取り出す', () => {
    const html =
      '<blockquote><p>この記事は<a href="/example"><strong>参考</strong></a>になります。</p><div>概要<br>追記</div></blockquote>'

    expect(rssDescriptionToText(html)).toBe('この記事は参考になります。\n概要\n追記')
  })

  it('空文字を空文字として返す', () => {
    expect(rssDescriptionToText('')).toBe('')
  })

  it('名前付きおよび数値のHTML文字参照をデコードする', () => {
    expect(rssDescriptionToText('<p>A &amp; B &#169; &#x2605; &lt;em&gt;</p>')).toBe(
      'A & B © ★ <em>',
    )
  })

  it('非表示要素の内容とHTMLコメントを取り除く', () => {
    const html =
      '<p>前<script>script</script><style>style</style><template><p>template</p></template><iframe>iframe</iframe><noscript>noscript</noscript><!-- comment -->後</p>'

    expect(rssDescriptionToText(html)).toBe('前後')
  })

  it('プレーンテキストの改行と不等号を保持する', () => {
    expect(rssDescriptionToText('1 < 2\n3 > 2')).toBe('1 < 2\n3 > 2')
  })
})
