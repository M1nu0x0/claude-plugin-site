// What a page can define for scripts/runtime.mjs before it runs (see the hero's live line there).
interface Window {
  pluginSiteHeroLine?: (hero: { lang: string; answer: string; seconds: number }) => string
}
