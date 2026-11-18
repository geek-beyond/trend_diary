import { describe, expect, it } from 'vitest'
import { extractRssDescriptionText } from './rss-description'

describe('extractRssDescriptionText', () => {
  it.each([
    {
      name: 'ネストしたHTMLから文の順序と段落の区切りを保ってテキストを取り出す',
      input:
        '<blockquote><p>この記事は<a href="/example"><strong>参考</strong></a>になります。</p><div>概要<br>追記</div></blockquote>',
      expected: 'この記事は参考になります。\n概要\n追記',
    },
    {
      name: '空文字を空文字として返す',
      input: '',
      expected: '',
    },
    {
      name: '名前付きおよび数値のHTML文字参照をデコードする',
      input: '<p>A &amp; B &#169; &#x2605; &lt;em&gt;</p>',
      expected: 'A & B © ★ <em>',
    },
    {
      name: '非表示要素の内容とHTMLコメントを取り除く',
      input:
        '<p>前<script>script</script><style>style</style><template><p>template</p></template><iframe>iframe</iframe><noscript>noscript</noscript><!-- comment -->後</p>',
      expected: '前後',
    },
    {
      name: 'プレーンテキストの改行と不等号を保持する',
      input: '1 < 2\n3 > 2',
      expected: '1 < 2\n3 > 2',
    },
  ])('$name', ({ input, expected }) => {
    expect(extractRssDescriptionText(input)).toBe(expected)
  })
})
