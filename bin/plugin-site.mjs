#!/usr/bin/env node
// Commands for a plugin site, run from its site/ directory:
//   plugin-site lint            check src/site.json against the schema and the SEO rules
//   plugin-site check [dist]    check a built site again (astro build already does this)
//   plugin-site lastmod <base>  warn when the site's text changed since <base> but `updated` did not
//   plugin-site og              draw public/images/og*.png from site.json (needs Playwright and Chromium)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { checkSite } from '../src/schema.mjs'
import { checkDist } from '../src/check.mjs'
import { ogHtml } from '../src/og.mjs'

const [cmd, arg] = process.argv.slice(2)
const SITE_JSON = 'src/site.json'
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

function load() {
  if (!existsSync(SITE_JSON)) fail(`no ${SITE_JSON} here; run plugin-site from the site's directory`)
  const { site, errors, warnings } = checkSite(readJson(SITE_JSON))
  for (const w of warnings) console.log(`::warning file=${SITE_JSON}::${w}`)
  if (errors.length) fail(errors.map(e => `${SITE_JSON}: ${e}`).join('\n'))
  return site
}
function fail(msg) { console.error(msg); process.exit(1) }

// The page sources whose words count for `updated`: .astro files under src/, without <style> and <script>.
function astroFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = join(dir, e.name)
    return e.isDirectory() ? astroFiles(p) : e.name.endsWith('.astro') ? [p] : []
  })
}

switch (cmd) {
  case 'lint': {
    load()
    console.log(`${SITE_JSON} passes`)
    break
  }
  case 'check': {
    const site = load()
    const { errors, warnings } = await checkDist(resolve(arg ?? 'dist'), site)
    for (const w of warnings) console.log(`::warning::${w}`)
    if (errors.length) fail(errors.map(e => `::error::${e}`).join('\n'))
    console.log('the built site passes')
    break
  }
  case 'lastmod': {
    if (!arg) fail('usage: plugin-site lastmod <base commit>')
    const prefix = execFileSync('git', ['rev-parse', '--show-prefix'], { encoding: 'utf8' }).trim()
    const show = path => {
      try { return execFileSync('git', ['show', `${arg}:${prefix}${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) }
      catch { return null }
    }
    const words = s => s.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, '')
    const oldJson = show(SITE_JSON)
    if (oldJson === null) { console.log(`the base has no ${SITE_JSON} yet`); break }
    const strip = json => { const { updated, ...rest } = JSON.parse(json); return { updated, rest: JSON.stringify(rest) } }
    const before = strip(oldJson), after = strip(readFileSync(SITE_JSON, 'utf8'))
    let changed = before.rest !== after.rest
    for (const f of astroFiles('src')) {
      const old = show(relative('.', f))
      if (old === null || words(old) !== words(readFileSync(f, 'utf8'))) changed = true
    }
    if (changed && before.updated === after.updated) {
      console.log(`::warning file=${prefix}${SITE_JSON},title=updated not changed::The site's text changed but "updated" is still ${after.updated}. Set it to today's date: it is the sitemap's lastmod and the JSON-LD's dateModified.`)
    } else console.log('updated is in step with the text')
    break
  }
  case 'og': {
    const site = load()
    let chromium
    try { ({ chromium } = createRequire(join(process.cwd(), 'x'))('playwright')) }
    catch { fail('plugin-site og needs Playwright: npm i -D playwright && npx playwright install chromium') }
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
    for (const lang of Object.keys(site.languages)) {
      await page.setContent(ogHtml(site, lang), { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const out = join('public', site.languages[lang].ogImage)
      await page.screenshot({ path: out })
      console.log(out)
    }
    await browser.close()
    break
  }
  default:
    fail('usage: plugin-site lint | check [dist] | lastmod <base> | og')
}
