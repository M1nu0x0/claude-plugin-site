// Checks the built site the way a crawler reads it: the HTML as served, without running any script.
// Every rule here is mechanical, so the same site always gets the same verdict.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'node-html-parser'
import { HtmlValidate } from 'html-validate'
import { alternates, langs, pageUrl } from './site.mjs'

const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    // The pages keep their CSS and the redirect script inline on purpose: one request per page.
    'no-inline-style': 'off',
    // Translated strings carry their own punctuation and quotes.
    'no-raw-characters': 'off',
    // Astro writes boolean attributes and void elements its own way.
    'attribute-boolean-style': 'off',
    'void-style': 'off',
    'attribute-empty-style': 'off',
    // Long one-line code samples are fine.
    'long-title': 'off',
    // Shields.io badges are decorative and say alt="".
    'wcag/h37': ['error', { allowEmpty: true }],
    // The hero types its text into an empty span.
    'empty-heading': 'error',
    'no-redundant-role': 'off',
  },
})

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

// The file a URL on this site is served from, or null when the URL is not on this site.
function fileFor(out, site, url) {
  const base = new URL(site.site)
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null
  let path = decodeURIComponent(url.pathname.slice(base.pathname.length))
  if (path === '' || path.endsWith('/')) path += 'index.html'
  return join(out, path)
}

export async function checkDist(out, site) {
  const errors = [], warnings = []
  const want = alternates(site)

  for (const l of langs(site)) {
    const L = site.languages[l]
    const url = pageUrl(site, l)
    const file = join(out, L.path, 'index.html')
    const where = `${L.path || '/'}index.html`
    if (!existsSync(file)) { errors.push(`${where}: not built`); continue }
    const html = readFileSync(file, 'utf8')
    const doc = parse(html, { comment: false })
    const err = m => errors.push(`${where}: ${m}`)
    const meta = sel => doc.querySelectorAll(sel).map(e => e.getAttribute('content'))
    const one = (sel, label) => {
      const all = doc.querySelectorAll(sel)
      if (all.length !== 1) err(`${all.length} × ${label}, want exactly 1`)
      return all[0]
    }

    if (doc.querySelector('html')?.getAttribute('lang') !== l) err(`<html lang> is not "${l}"`)
    const title = one('title', '<title>')
    if (title && title.text !== L.title) err(`<title> is "${title.text}", site.json says "${L.title}"`)
    const desc = one('meta[name="description"]', 'meta description')
    if (desc && desc.getAttribute('content') !== L.description) err('meta description differs from site.json')
    const canonical = one('link[rel="canonical"]', 'canonical')
    if (canonical && canonical.getAttribute('href') !== url) err(`canonical is ${canonical.getAttribute('href')}, want ${url}`)

    const alts = doc.querySelectorAll('link[rel="alternate"][hreflang]').map(e => `${e.getAttribute('hreflang')} ${e.getAttribute('href')}`)
    if (!sameSet(alts, want.map(([a, b]) => `${a} ${b}`))) err(`hreflang alternates are [${alts.join(', ')}]`)

    const og = p => meta(`meta[property="${p}"]`)
    if (og('og:url')[0] !== url) err('og:url is not the canonical URL')
    if (og('og:title')[0] !== L.ogTitle) err('og:title differs from site.json')
    if (og('og:description')[0] !== L.ogDescription) err('og:description differs from site.json')
    if (og('og:locale')[0] !== L.ogLocale) err('og:locale differs from site.json')
    const otherLocales = langs(site).filter(x => x !== l).map(x => site.languages[x].ogLocale)
    if (!sameSet(og('og:locale:alternate'), otherLocales)) err('og:locale:alternate does not list the other languages')
    const image = og('og:image')[0]
    if (image !== site.site + L.ogImage) err(`og:image is ${image}, want ${site.site + L.ogImage}`)
    else if (!existsSync(join(out, L.ogImage))) err(`og:image ${L.ogImage} is not in the build`)
    if (!og('og:image:alt')[0]) err('og:image:alt is missing')
    if (meta('meta[name="twitter:card"]')[0] !== 'summary_large_image') err('twitter:card is not summary_large_image')

    const ld = doc.querySelectorAll('script[type="application/ld+json"]')
    if (ld.length !== 1) err(`${ld.length} JSON-LD blocks, want 1`)
    for (const s of ld) {
      try {
        const data = JSON.parse(s.text)
        if (data.inLanguage !== l) err(`JSON-LD inLanguage is ${data.inLanguage}`)
        if (data.url !== url) err('JSON-LD url is not the canonical URL')
        if (!data.softwareVersion) warnings.push(`${where}: JSON-LD has no softwareVersion`)
      } catch (e) { err(`JSON-LD does not parse: ${e.message}`) }
    }

    const h1 = doc.querySelectorAll('h1')
    if (h1.length !== 1) err(`${h1.length} × <h1>, want exactly 1`)
    for (const img of doc.querySelectorAll('img')) {
      const src = img.getAttribute('src')
      if (img.getAttribute('alt') === undefined) err(`<img src="${src}"> has no alt`)
      // Images of this site have a known size. An outside image such as a badge can vary in width, so it
      // needs at least a height to keep the line from jumping.
      const local = fileFor(out, site, new URL(src, url)) !== null
      if (local ? !img.getAttribute('width') || !img.getAttribute('height') : !img.getAttribute('height')) {
        err(`<img src="${src}"> has no ${local ? 'width and height' : 'height'} (layout shift)`)
      }
    }

    // Every link and asset on this site must exist in the build. This is what catches a relative
    // images/x.png on /ko/ that the browser would look for at /ko/images/x.png.
    for (const el of doc.querySelectorAll('[href], [src]')) {
      const ref = el.getAttribute('href') ?? el.getAttribute('src')
      if (!ref || /^(#|data:|mailto:|javascript:)/.test(ref)) continue
      let target
      try { target = new URL(ref, url) } catch { err(`bad URL ${ref}`); continue }
      const path = fileFor(out, site, target)
      if (path === null) continue
      const exists = existsSync(path) && statSync(path).isFile()
      if (!exists) err(`${el.tagName.toLowerCase()} → ${ref} resolves to ${target.pathname}, which is not in the build`)
    }

    const current = doc.querySelectorAll('[data-lang-link][aria-current="page"]')
    if (current.length !== 1 || current[0].getAttribute('data-lang-link') !== l) err('the language links do not mark this page as current')

    const report = await validator.validateString(html, where)
    for (const r of report.results) for (const m of r.messages) {
      err(`html-validate ${m.ruleId} (line ${m.line}): ${m.message}`)
    }
  }

  const sitemapFile = join(out, 'sitemap.xml')
  if (!existsSync(sitemapFile)) errors.push('sitemap.xml is not built')
  else {
    const xml = readFileSync(sitemapFile, 'utf8')
    for (const l of langs(site)) if (!xml.includes(`<loc>${pageUrl(site, l)}</loc>`)) errors.push(`sitemap.xml has no <loc> for ${l}`)
  }
  return { errors, warnings }
}
