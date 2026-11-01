// The shape of a plugin site's site/src/site.json, and the SEO rules every site must pass before it builds.
// Errors stop the build; warnings are printed and the build goes on.
import { z } from 'zod'

const LANG = /^[a-z]{2}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

// Strings the shared layout and components read. A page's own sections add more keys of their own.
export const KIT_KEYS = [
  'theme', 'copy', 'copied',
  'installTitle', 'installTerminal', 'installNote', 'installShell', 'installDesktop',
  'faqTitle', 'repo', 'releases', 'changelog', 'foot', 'ask',
]

const nonEmpty = z.string().trim().min(1)

const language = z.object({
  // '' for the language served at the site's root, otherwise 'xx/'.
  path: z.string().regex(/^(|[a-z]{2}\/)$/),
  title: nonEmpty,
  description: nonEmpty,
  font: z.enum(['IBM Plex Sans KR', 'IBM Plex Sans JP']),
  ogLocale: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/),
  ogImage: z.string().regex(/^images\/[\w.-]+\.png$/),
  ogImageText: nonEmpty,
  ogImageLine: nonEmpty.optional(),
  ogImageAlt: nonEmpty,
  ogTitle: nonEmpty,
  ogDescription: nonEmpty,
  suggest: z.object({ text: nonEmpty, go: nonEmpty, close: nonEmpty }).strict(),
  strings: z.record(z.string(), nonEmpty),
}).strict()

export const siteSchema = z.object({
  site: z.url().regex(/^https:\/\/.+\/$/, 'must be an https URL ending in /'),
  updated: z.string().regex(DATE, 'must be YYYY-MM-DD'),
  name: nonEmpty,
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'must be owner/name'),
  plugin: z.string().regex(/^[a-z0-9-]+$/),
  programmingLanguage: nonEmpty,
  favicon: z.string().startsWith('data:image/svg+xml,'),
  hero: z.object({
    mono: z.boolean().default(false),
    // Language-independent hero text, such as a command. Without it each language's strings.answer is used.
    answer: nonEmpty.optional(),
    line: nonEmpty.optional(),
    lineMs: z.number().positive().optional(),
  }).strict().default({ mono: false }),
  languages: z.record(z.string().regex(LANG), language),
}).strict()

// How wide text shows in a search result: CJK and Hangul take about two Latin letters' room.
const WIDE = /[ᄀ-ᇿ　-〿぀-ヿ㄰-㆏㐀-䶿一-鿿가-힣＀-｠￠-￦]/u
export const width = s => Array.from(s).reduce((n, c) => n + (WIDE.test(c) ? 2 : 1), 0)

// [field, min, warnAbove, errorAbove], in display width.
const LIMITS = [
  ['title', 20, 70, 90],
  ['description', 50, 165, 220],
  ['ogTitle', 5, 70, 90],
  ['ogDescription', 40, 200, 300],
]

// Returns { site, errors, warnings }. site is the parsed data with defaults filled in, or null on a schema error.
export function checkSite(data) {
  const errors = [], warnings = []
  const parsed = siteSchema.safeParse(data)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`)
    return { site: null, errors, warnings }
  }
  const site = parsed.data
  const langs = Object.keys(site.languages)

  if (!site.languages.en) errors.push('languages.en is required: English is the x-default page')
  const roots = langs.filter(l => site.languages[l].path === '')
  if (roots.length !== 1) errors.push(`exactly one language must have path "" (the site root); found ${roots.length}`)
  for (const l of langs) {
    const L = site.languages[l]
    if (L.path && L.path !== `${l}/`) errors.push(`languages.${l}.path must be "" or "${l}/"`)
    if (!L.ogLocale.startsWith(`${l}_`)) errors.push(`languages.${l}.ogLocale ${L.ogLocale} is not ${l}`)
    if (!site.hero.line && !L.ogImageLine) errors.push(`languages.${l}.ogImageLine is required when hero.line is not set`)
    if (!site.hero.answer && !L.strings.answer) errors.push(`languages.${l}.strings.answer is required when hero.answer is not set`)
    for (const [field, min, warn, max] of LIMITS) {
      const w = width(L[field])
      if (w < min) errors.push(`languages.${l}.${field} is too short (${w} < ${min}): "${L[field]}"`)
      else if (w > max) errors.push(`languages.${l}.${field} is too long (${w} > ${max}): "${L[field]}"`)
      else if (w > warn) warnings.push(`languages.${l}.${field} may be cut off in search results (${w} > ${warn})`)
    }
    for (const k of KIT_KEYS) if (!(k in L.strings)) errors.push(`languages.${l}.strings.${k} is missing (the shared layout uses it)`)
    const faq = Object.keys(L.strings).filter(k => /^[qa]\d+$/.test(k))
    for (const k of faq) {
      const pair = (k[0] === 'q' ? 'a' : 'q') + k.slice(1)
      if (!(pair in L.strings)) errors.push(`languages.${l}.strings.${k} has no ${pair}`)
    }
  }

  // Every language has the same strings as English, so no page falls back to another language.
  if (site.languages.en) {
    const en = Object.keys(site.languages.en.strings)
    for (const l of langs.filter(l => l !== 'en')) {
      const have = Object.keys(site.languages[l].strings)
      for (const k of en) if (!have.includes(k)) errors.push(`languages.${l}.strings.${k} is missing (en has it)`)
      for (const k of have) if (!en.includes(k)) errors.push(`languages.${l}.strings.${k} is not in en`)
    }
  }

  const titles = langs.map(l => site.languages[l].title)
  if (new Set(titles).size !== titles.length) errors.push('two languages share the same title')
  const images = langs.map(l => site.languages[l].ogImage)
  if (new Set(images).size !== images.length) warnings.push('two languages share the same ogImage')

  return { site: errors.length ? null : site, errors, warnings }
}
