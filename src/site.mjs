// @ts-check
// URL helpers shared by the layout, the sitemap and the checks. No Node APIs, so pages can import it too.

/** @typedef {import('./schema.mjs').Site} Site */

// The order of the language links in the header.
export const NAV_ORDER = ['ko', 'en', 'ja']
/** @type {Record<string, string>} */
export const LABELS = { ko: '한국어', en: 'English', ja: '日本語' }
/** @type {Record<string, string>} */
export const LOCALES = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP' }

/** @param {Site} site @returns {string[]} */
export const langs = site => Object.keys(site.languages)
/** @param {Site} site @returns {string[]} */
export const navLangs = site => [
  ...NAV_ORDER.filter(l => l in site.languages),
  ...langs(site).filter(l => !NAV_ORDER.includes(l)),
]
/** @param {Site} site @param {string} lang @returns {string} */
export const pageUrl = (site, lang) => site.site + site.languages[lang].path

// A path from one language page to another, relative so it works wherever the site is served from.
/** @param {Site} site @param {string} from @param {string} to @returns {string} */
export const rel = (site, from, to) =>
  from === to ? './' : (site.languages[from].path ? '../' : './') + site.languages[to].path

// The hreflang alternates: every language, then x-default for the root page.
/** @param {Site} site @returns {[string, string][]} */
export const alternates = site => {
  // checkSite has made sure exactly one language sits at the root.
  const root = /** @type {string} */ (langs(site).find(l => site.languages[l].path === ''))
  return [...langs(site).map(l => /** @type {[string, string]} */ ([l, pageUrl(site, l)])), ['x-default', pageUrl(site, root)]]
}

// What getStaticPaths returns for src/pages/[...lang].astro: the root language has no segment.
/** @param {Site} site */
export const staticPaths = site => langs(site).map(lang => ({
  params: { lang: site.languages[lang].path ? lang : undefined },
  props: { lang },
}))

/** @param {Site} site @returns {string} */
export const repoName = site => site.repo.split('/')[1]
/** @param {Site} site @returns {string} */
export const repoUrl = site => `https://github.com/${site.repo}`
