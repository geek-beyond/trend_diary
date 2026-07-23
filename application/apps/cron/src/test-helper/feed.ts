import { FEED_URL } from '../feed/config'

export { FEED_URL }

export interface FeedItem {
  title?: string
  url?: string
  author?: string
  content?: string
  contentEncoded?: string
  imageUrl?: string
}

export function buildQiitaAtom(items: FeedItem[]): string {
  const entries = items
    .map((item) =>
      [
        '  <entry>',
        item.title === undefined ? '' : `    <title>${item.title}</title>`,
        item.url === undefined ? '' : `    <link href="${item.url}"/>`,
        item.author === undefined ? '' : `    <author><name>${item.author}</name></author>`,
        item.content === undefined ? '' : `    <content type="html">${item.content}</content>`,
        '  </entry>',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
${entries}
</feed>`
}

export function buildZennRss(items: FeedItem[]): string {
  const entries = items
    .map((item) =>
      [
        '    <item>',
        item.title === undefined ? '' : `      <title>${item.title}</title>`,
        item.url === undefined ? '' : `      <link>${item.url}</link>`,
        item.content === undefined ? '' : `      <description>${item.content}</description>`,
        item.author === undefined ? '' : `      <dc:creator>${item.author}</dc:creator>`,
        item.imageUrl === undefined
          ? ''
          : `      <enclosure url="${item.imageUrl}" length="0" type="image/png"/>`,
        '    </item>',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    )
    .join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
${entries}
  </channel>
</rss>`
}

export function buildHatenaRdf(items: FeedItem[]): string {
  const seq = items.map((item) => `<rdf:li rdf:resource="${item.url}"/>`).join('')
  const entries = items
    .map((item) =>
      [
        `  <item rdf:about="${item.url}">`,
        `    <title>${item.title}</title>`,
        `    <link>${item.url}</link>`,
        item.content === undefined ? '' : `    <description>${item.content}</description>`,
        item.contentEncoded === undefined
          ? ''
          : `    <content:encoded>${item.contentEncoded}</content:encoded>`,
        item.author === undefined ? '' : `    <dc:creator>${item.author}</dc:creator>`,
        item.imageUrl === undefined
          ? ''
          : `    <hatena:imageurl>${item.imageUrl}</hatena:imageurl>`,
        '  </item>',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:hatena="http://www.hatena.ne.jp/info/xmlns#">
  <channel rdf:about="${FEED_URL.hatena}">
    <title>はてなブックマーク - 人気エントリー - テクノロジー</title>
    <link>https://b.hatena.ne.jp/hotentry/it</link>
    <items><rdf:Seq>${seq}</rdf:Seq></items>
  </channel>
${entries}
</rdf:RDF>`
}

export function rssResponse(xml: string) {
  return { ok: true, status: 200, text: async () => xml }
}
