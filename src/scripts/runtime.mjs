// Behaviour only: every page is pre-rendered in its own language, so search engines and link previews
// read it without running this script.
import { ANSWER_AT, ANSWER_MS, BUBBLE_AT, LINE_GAP, LINE_MS, turnSeconds } from '../hero.mjs'

const store = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch {} },
}
const root = document.documentElement
const here = root.lang

// Language: the redirect, if any, already ran in <head> (scripts/redirect.js). Choosing a language on
// the page saves it, and / goes there from then on.
document.querySelectorAll('[data-lang-link]').forEach(a => a.addEventListener('click', () => {
  store.set('lang', a.dataset.langLink)
}))

// When the browser's preferred language has its own page and the visitor has not chosen one, offer
// it in that language at the bottom of the page, instead of redirecting on a guess.
const offerLanguage = () => {
  if (store.get('lang') || store.get('offerClosed')) return
  const offers = JSON.parse(document.body.dataset.offers)
  const nav = (navigator.languages || [navigator.language || '']).map(l => l.slice(0, 2))
  const l = nav.find(l => l === here || Object.hasOwn(offers, l))
  if (!l || l === here) return
  const o = offers[l]
  const box = document.getElementById('offer')
  const [text, link, close] = box.children
  box.lang = l
  text.textContent = o.text
  link.textContent = o.go
  link.href = o.href
  link.addEventListener('click', () => store.set('lang', l))
  close.textContent = o.close
  close.addEventListener('click', () => { box.hidden = true; store.set('offerClosed', '1') })
  box.hidden = false
}

// Theme: system unless chosen.
const themeBtn = document.getElementById('theme')
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
const drawTheme = () => { themeBtn.textContent = isDark() ? '☾' : '☀' }
const savedTheme = store.get('theme')
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme
themeBtn.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark'
  store.set('theme', root.dataset.theme)
  drawTheme()
})
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawTheme)

// Copy: each button copies the command beside it.
document.querySelectorAll('.copy').forEach(btn => {
  const label = btn.textContent
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.parentElement.querySelector('code').textContent)
      btn.textContent = document.body.dataset.copied
      setTimeout(() => { btn.textContent = label }, 1600)
    } catch {}
  })
})

// The hero: the question goes up, the answer types out, then the line under it types out much faster.
// A page can make the line live (a clock, say) by defining window.pluginSiteHeroLine({ lang, answer,
// seconds }) in an inline script before this one runs; otherwise the line is the pre-rendered one.
const chat = document.getElementById('chat')
const playHero = () => {
  const answer = document.getElementById('answer')
  const line = document.getElementById('line')
  const answerText = answer.querySelector('.sr').textContent
  const staticLine = line.querySelector('.sr').textContent
  const lineMs = Number(chat.dataset.lineMs) || LINE_MS
  const lineText = () => window.pluginSiteHeroLine?.({ lang: here, answer: answerText, seconds: turnSeconds(answerText) }) ?? staticLine
  const fill = (p, text, shown) => {
    p.querySelector('.sr').textContent = text
    p.querySelector('.ghost').textContent = text
    p.querySelector('.typed').textContent = shown
  }
  const typeOut = (p, text, at, ms) => {
    const chars = Array.from(text)
    chars.forEach((_, i) => setTimeout(() => {
      p.querySelector('.typed').textContent = chars.slice(0, i + 1).join('')
    }, at + i * ms))
    return at + chars.length * ms
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    chat.classList.remove('pre')
    fill(answer, answerText, answerText)
    const l = lineText()
    fill(line, l, l)
    return
  }
  // Hide the bubble at once (no fall), so it only shows rising.
  chat.classList.add('instant', 'pre')
  void chat.offsetWidth
  chat.classList.remove('instant')
  const l = lineText()
  fill(answer, answerText, '')
  fill(line, l, '')
  setTimeout(() => chat.classList.remove('pre'), BUBBLE_AT)
  const answered = typeOut(answer, answerText, ANSWER_AT, ANSWER_MS)
  typeOut(line, l, answered + LINE_GAP, lineMs)
}

drawTheme()
offerLanguage()
if (chat) playHero()
