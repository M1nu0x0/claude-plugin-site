import { defineConfig } from 'astro/config'
import pluginSite from '@m1nu0x0/claude-plugin-site'

export default defineConfig({
  integrations: [pluginSite({ pluginJson: 'plugin.json' })],
})
