// URL helpers shared by the layout, the sitemap and the checks. No Node APIs, so pages can import it too.

// The order of the language links in the header.
export const NAV_ORDER = ['ko', 'en', 'ja']
export const LABELS = { ko: '한국어', en: 'English', ja: '日本語' }
export const LOCALES = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP' }

export const langs = site => Object.keys(site.languages)
export const navLangs = site => [
  ...NAV_ORDER.filter(l => l in site.languages),
  ...langs(site).filter(l => !NAV_ORDER.includes(l)),
]
export const pageUrl = (site, lang) => site.site + site.languages[lang].path

// A path from one language page to another, relative so it works wherever the site is served from.
export const rel = (site, from, to) =>
  from === to ? './' : (site.languages[from].path ? '../' : './') + site.languages[to].path

// The hreflang alternates: every language, then x-default for the root page.
export const alternates = site => {
  const root = langs(site).find(l => site.languages[l].path === '')
  return [...langs(site).map(l => [l, pageUrl(site, l)]), ['x-default', pageUrl(site, root)]]
}

// What getStaticPaths returns for src/pages/[...lang].astro: the root language has no segment.
export const staticPaths = site => langs(site).map(lang => ({
  params: { lang: site.languages[lang].path ? lang : undefined },
  props: { lang },
}))

export const repoName = site => site.repo.split('/')[1]
export const repoUrl = site => `https://github.com/${site.repo}`
