// Types for the data the integration serves to pages. Add to a site's src/env.d.ts:
//   /// <reference types="@m1nu0x0/claude-plugin-site/virtual" />
declare module 'virtual:plugin-site' {
  interface Language {
    path: string
    title: string
    description: string
    font: string
    ogLocale: string
    ogImage: string
    ogImageText: string
    ogImageLine?: string
    ogImageAlt: string
    ogTitle: string
    ogDescription: string
    suggest: { text: string; go: string; close: string }
    strings: Record<string, string>
  }
  const site: {
    site: string
    updated: string
    name: string
    repo: string
    plugin: string
    programmingLanguage: string
    favicon: string
    hero: { mono: boolean; answer?: string; line?: string; lineMs?: number }
    languages: Record<string, Language>
    version?: string
  }
  export default site
}
