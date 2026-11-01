// The Astro integration. In astro.config.mjs:
//   import pluginSite from '@m1nu0x0/claude-plugin-site'
//   export default defineConfig({ integrations: [pluginSite()] })
// It reads and checks src/site.json, sets site/base/trailing slashes from its URL, serves it to pages as
// `virtual:plugin-site`, writes sitemap.xml after the build and then checks every built page.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkSite } from './schema.mjs'
import { alternates, langs, pageUrl } from './site.mjs'
import { checkDist } from './check.mjs'

export { checkSite, KIT_KEYS, width } from './schema.mjs'
export * from './site.mjs'
export * from './hero.mjs'

// Reads site.json and the plugin's version. Throws with every problem listed when the data is not valid.
export function loadSite(file, pluginJson) {
  const { site, errors, warnings } = checkSite(JSON.parse(readFileSync(file, 'utf8')))
  if (errors.length) {
    const e = new Error(`${file} is not valid:\n  - ${errors.join('\n  - ')}`)
    e.warnings = warnings
    throw e
  }
  const version = pluginJson ? JSON.parse(readFileSync(pluginJson, 'utf8')).version : undefined
  return { site: { ...site, version }, warnings }
}

export function sitemap(site) {
  const links = alternates(site).map(([l, href]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`).join('\n')
  const urls = langs(site).map(l => `  <url>
    <loc>${pageUrl(site, l)}</loc>
    <lastmod>${site.updated}</lastmod>
${links}
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

const VIRTUAL = 'virtual:plugin-site'

export default function pluginSite({ data = 'src/site.json', pluginJson } = {}) {
  let site
  return {
    name: '@m1nu0x0/claude-plugin-site',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, addWatchFile, logger }) => {
        const root = fileURLToPath(config.root)
        const file = resolve(root, data)
        const raw = JSON.parse(readFileSync(file, 'utf8'))
        const versionFile = resolve(root, pluginJson ?? `../plugins/${raw.plugin}/.claude-plugin/plugin.json`)
        const loaded = loadSite(file, versionFile)
        site = loaded.site
        for (const w of loaded.warnings) logger.warn(w)
        addWatchFile(file)
        addWatchFile(versionFile)
        const url = new URL(site.site)
        updateConfig({
          site: url.origin,
          base: url.pathname,
          trailingSlash: 'always',
          build: { format: 'directory', inlineStylesheets: 'always' },
          vite: {
            plugins: [{
              name: VIRTUAL,
              resolveId: id => (id === VIRTUAL ? '\0' + VIRTUAL : undefined),
              load: id => (id === '\0' + VIRTUAL ? `export default ${JSON.stringify(site)}` : undefined),
            }],
          },
        })
      },
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir)
        writeFileSync(resolve(out, 'sitemap.xml'), sitemap(site))
        const { errors, warnings } = await checkDist(out, site)
        for (const w of warnings) logger.warn(w)
        if (errors.length) throw new Error(`The built site failed its checks:\n  - ${errors.join('\n  - ')}`)
        logger.info(`checked ${langs(site).length} pages and sitemap.xml`)
      },
    },
  }
}
