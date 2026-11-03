// @ts-check
// npm test
// Builds the example site in test/fixture with Astro, then breaks copies of its data and output to make
// sure each rule fails when it should.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkSite, width } from '../src/schema.mjs'
import { checkDist } from '../src/check.mjs'
import { rel, staticPaths } from '../src/site.mjs'

const fixture = fileURLToPath(new URL('./fixture/', import.meta.url))
// The fixture's site.json as plain data, for tests that break it on purpose.
const data = () => /** @type {any} */ (JSON.parse(readFileSync(join(fixture, 'src/site.json'), 'utf8')))
const errorsOf = (/** @type {(d: any) => void} */ mutate) => { const d = data(); mutate(d); return checkSite(d).errors }

test('the example site.json passes', () => {
  const { errors, site } = checkSite(data())
  assert.deepEqual(errors, [])
  assert.ok(site)
  assert.equal(site.hero.mono, false)
})

test('width counts Hangul and CJK as two', () => {
  assert.equal(width('abc'), 3)
  assert.equal(width('한국'), 4)
  assert.equal(width('日本'), 4)
})

test('site.json rules fail when they should', () => {
  assert.match(errorsOf(d => { delete d.languages.ko.strings.q1 }).join(), /ko\.strings\.q1 is missing/)
  assert.match(errorsOf(d => { d.languages.ko.strings.extra = 'x' }).join(), /ko\.strings\.extra is not in en/)
  assert.match(errorsOf(d => { d.languages.en.title = 'x'.repeat(95) }).join(), /title is too long/)
  assert.match(errorsOf(d => { d.languages.en.description = 'short' }).join(), /description is too short/)
  assert.match(errorsOf(d => { d.languages.ko.path = 'kr/' }).join(), /path must be "" or "ko\/"/)
  assert.match(errorsOf(d => { d.languages.ko.path = '' }).join(), /exactly one language/)
  assert.match(errorsOf(d => { delete d.languages.en.strings.copy; delete d.languages.ko.strings.copy }).join(), /strings\.copy is missing \(the shared layout uses it\)/)
  assert.match(errorsOf(d => { delete d.languages.en.strings.a1; delete d.languages.ko.strings.a1 }).join(), /q1 has no a1/)
  assert.match(errorsOf(d => { d.site = 'https://example.github.io/no-slash' }).join(), /ending in \//)
  assert.match(errorsOf(d => { d.languages.ko.title = d.languages.en.title }).join(), /same title/)
})

test('URL helpers', () => {
  const { site } = checkSite(data())
  assert.ok(site)
  assert.equal(rel(site, 'en', 'ko'), './ko/')
  assert.equal(rel(site, 'ko', 'en'), '../')
  assert.equal(rel(site, 'ko', 'ko'), './')
  assert.deepEqual(staticPaths(site).map(p => p.params.lang), [undefined, 'ko'])
})

test('the example site builds, and broken output fails the checks', async t => {
  execFileSync('npx', ['astro', 'build', '--silent'], { cwd: fixture, stdio: 'inherit' })
  const { site } = checkSite(data())
  assert.ok(site)
  const built = join(fixture, 'dist')
  assert.deepEqual((await checkDist(built, { ...site, version: '1.2.3' })).errors, [])

  const broken = async (/** @type {(html: string) => string} */ edit) => {
    const dir = mkdtempSync(join(tmpdir(), 'plugin-site-'))
    cpSync(built, dir, { recursive: true })
    const file = join(dir, 'ko/index.html')
    writeFileSync(file, edit(readFileSync(file, 'utf8')))
    return (await checkDist(dir, site)).errors.join('\n')
  }
  await t.test('a relative image on /ko/', async () => {
    assert.match(await broken(h => h.replace('</main>', '<img src="images/og.png" width="1" height="1" alt=""></main>')), /resolves to \/claude-example\/ko\/images\/og\.png/)
  })
  await t.test('a canonical pointing at another language', async () => {
    assert.match(await broken(h => h.replace('href="https://example.github.io/claude-example/ko/"', 'href="https://example.github.io/claude-example/"')), /canonical/)
  })
  await t.test('a missing hreflang', async () => {
    assert.match(await broken(h => h.replace(/<link rel="alternate" hreflang="en"[^>]*>/, '')), /hreflang/)
  })
  await t.test('the wrong html lang', async () => {
    assert.match(await broken(h => h.replace('<html lang="ko"', '<html lang="en"')), /<html lang> is not "ko"/)
  })
  await t.test('a second h1', async () => {
    assert.match(await broken(h => h.replace('</main>', '<h1>again</h1></main>')), /2 × <h1>/)
  })
  await t.test('invalid HTML', async () => {
    assert.match(await broken(h => h.replace('</main>', '<p><div>x</div></p></main>')), /html-validate/)
  })
})
