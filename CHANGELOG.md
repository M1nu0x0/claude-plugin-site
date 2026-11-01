# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-01

### Added

- An Astro integration that reads and checks `src/site.json`, sets `site`, `base` and trailing slashes from its URL, serves it to pages as `virtual:plugin-site`, writes `sitemap.xml` with hreflang alternates, and checks every built page
- `PluginPage`, `Hero`, `Install`, `Cmd` and `Faq` components, taken from the claude-turn-duration and claude-safe-zsh sites
- Schema and SEO rules for `site.json`: required fields, title and description width (Hangul and CJK count as two), the same strings in every language, the strings the layout uses, question and answer pairs
- Checks on the built HTML: lang, title, description, canonical, hreflang, Open Graph, Twitter card, JSON-LD, one `<h1>`, image alt and size, every link and asset on the site present in the build, and html-validate
- The `plugin-site` command: `lint`, `check`, `lastmod` and `og`
