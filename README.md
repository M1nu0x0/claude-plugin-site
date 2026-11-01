# claude-plugin-site

Claude Code 플러그인마다 만드는 GitHub Pages 사이트의 공용 키트입니다. [Astro](https://astro.build) 통합 하나와 컴포넌트 몇 개로, 플러그인 레포에는 **문구(`site.json`)와 섹션 순서(페이지 파일 하나)만** 남깁니다.

사용하는 사이트: [claude-turn-duration](https://m1nu0x0.github.io/claude-turn-duration/), [claude-safe-zsh](https://m1nu0x0.github.io/claude-safe-zsh/)

## 키트가 해 주는 것

- **언어별 정적 페이지**: `/`(영어), `/ko/`, `/ja/`를 각각 미리 렌더링합니다. 검색엔진과 링크 미리보기가 JavaScript 없이 그 언어로 읽습니다.
- **SEO head**: 언어마다 title, description, 자기 자신을 가리키는 canonical, hreflang(x-default 포함), Open Graph, Twitter 카드, JSON-LD(`SoftwareSourceCode`, 플러그인 버전 포함).
- **sitemap.xml**: 모든 언어 페이지와 hreflang alternate, `lastmod`.
- **공용 레이아웃**: 헤더(언어 링크, 테마 전환), 히어로, 설치 섹션, 자주 묻는 질문, 푸터, 브라우저 언어 제안 바, `?lang=` 옛 링크 리다이렉트.
- **빌드 단계 검사**: 아래 규칙 중 하나라도 어긋나면 `astro build`가 실패합니다. 사람이나 에이전트의 리뷰가 아니라 규칙이 판정하므로, 같은 사이트는 언제나 같은 결과를 받습니다.

### 검사 규칙

`site.json`을 읽을 때(빌드 시작 전):

- 스키마: 필수 필드, URL·날짜·로케일 형식, 언어 경로(`""` 또는 `"xx/"`)
- 제목과 설명의 표시 폭(한글·CJK는 2칸): 너무 짧거나 길면 오류, 검색 결과에서 잘릴 만하면 경고
- 모든 언어가 영어와 같은 문자열 키를 가짐(빠진 번역, 남는 번역 모두 오류)
- 레이아웃이 쓰는 문자열(`copy`, `installTitle`, `foot` 등)이 있음, `q1`/`a1`처럼 질문과 답이 짝을 이룸
- 언어끼리 제목이 겹치지 않음

빌드된 HTML을 크롤러처럼 읽어서(빌드 끝):

- `<html lang>`, title, description이 `site.json`과 같음
- canonical이 자기 URL, hreflang이 모든 언어와 x-default를 정확히 나열
- og:url, og:title, og:description, og:locale, og:locale:alternate, og:image(빌드에 파일이 있는지까지), og:image:alt, twitter:card
- JSON-LD가 파싱되고 `inLanguage`, `url`이 맞음
- `<h1>`이 정확히 하나, 모든 `<img>`에 alt와 크기
- **사이트 안의 모든 링크와 이미지가 빌드 결과에 실제로 있음**(예: `/ko/`에서 상대경로 `images/x.png`가 `/ko/images/x.png`를 가리키는 실수)
- 현재 언어 링크에 `aria-current="page"`
- [html-validate](https://html-validate.org) 권장 규칙
- sitemap.xml에 모든 언어 페이지가 있음

## 플러그인 레포에 붙이기

```
site/
  package.json
  astro.config.mjs
  src/site.json            모든 문구, 언어별
  src/pages/[...lang].astro 섹션 순서
  src/env.d.ts
  public/images/            스크린샷, og.png, og-ko.png, og-ja.png
```

`site/package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": { "dev": "astro dev", "build": "astro build", "lint": "plugin-site lint", "og": "plugin-site og" },
  "dependencies": {
    "@m1nu0x0/claude-plugin-site": "github:M1nu0x0/claude-plugin-site#v0.1.0",
    "astro": "^7.4.4"
  }
}
```

`site/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import pluginSite from '@m1nu0x0/claude-plugin-site'

export default defineConfig({ integrations: [pluginSite()] })
```

`site`, `base`, 끝 슬래시, 출력 형식은 `site.json`의 `site` URL에서 정해지므로 따로 쓰지 않습니다. 플러그인 버전은 `../plugins/<plugin>/.claude-plugin/plugin.json`에서 읽습니다(다른 위치면 `pluginSite({ pluginJson: '...' })`).

`site/src/env.d.ts`:

```ts
/// <reference types="astro/client" />
/// <reference types="@m1nu0x0/claude-plugin-site/virtual" />
```

`site/src/pages/[...lang].astro`:

```astro
---
import site from 'virtual:plugin-site'
import { staticPaths } from '@m1nu0x0/claude-plugin-site'
import PluginPage from '@m1nu0x0/claude-plugin-site/components/PluginPage.astro'
import Hero from '@m1nu0x0/claude-plugin-site/components/Hero.astro'
import Install from '@m1nu0x0/claude-plugin-site/components/Install.astro'
import Faq from '@m1nu0x0/claude-plugin-site/components/Faq.astro'

export const getStaticPaths = () => staticPaths(site)
const { lang } = Astro.props
const t = site.languages[lang].strings
---
<PluginPage lang={lang}>
  <Hero slot="hero" lang={lang} />
  <Install lang={lang} />
  <section aria-labelledby="how">
    <h2 id="how" set:html={t.howTitle} />
    <p set:html={t.how1} />
  </section>
  <Faq lang={lang} />
</PluginPage>
```

이미지는 상대경로 대신 `` `${import.meta.env.BASE_URL}images/x.png` ``로 씁니다. 상대경로를 쓰면 빌드 검사가 잡습니다.

### site.json

[claude-turn-duration의 site.json](https://github.com/M1nu0x0/claude-turn-duration/blob/main/site/src/site.json)이 완전한 예입니다. 최상위 필드:

| 필드 | 뜻 |
| - | - |
| `site` | 사이트 URL, `/`로 끝남. `https://m1nu0x0.github.io/claude-xxx/` |
| `updated` | 문구를 마지막으로 바꾼 날. sitemap `lastmod`와 JSON-LD `dateModified` |
| `name` | 히어로 제목과 JSON-LD 이름. `Xxx for Claude` |
| `repo`, `plugin` | `M1nu0x0/claude-xxx`, 마켓플레이스의 플러그인 이름. 설치 명령과 링크에 쓰임 |
| `programmingLanguage`, `favicon` | JSON-LD 언어, `data:image/svg+xml,` 아이콘 |
| `hero` | 선택. `{ "mono": true, "answer": "명령", "line": "출력", "lineMs": 3.75 }`처럼 언어와 무관한 히어로 |
| `languages.<xx>` | `path`, `title`, `description`, `font`, `ogLocale`, `ogImage`, `ogImageText`, `ogImageLine`, `ogImageAlt`, `ogTitle`, `ogDescription`, `suggest`, `strings` |

`strings`의 값에는 `<code>` 같은 HTML을 쓸 수 있습니다. 질문은 `q1`/`a1`, `q2`/`a2`…로 두면 `<Faq>`가 번호 순서대로 그립니다.

히어로의 둘째 줄을 실시간으로 바꾸려면(예: 방문자의 시계) 페이지에서 `window.pluginSiteHeroLine = ({ lang, answer, seconds }) => '...'`를 `<script is:inline slot="scripts">`로 정의합니다.

## 명령

`site/`에서 실행합니다.

```sh
npm run build                 # 빌드 + 검사 (dist/)
npm run dev                   # 로컬 미리보기
npx plugin-site lint          # site.json만 빠르게 검사
npx plugin-site check dist    # 빌드된 결과를 다시 검사
npx plugin-site lastmod <base> # 문구가 바뀌었는데 updated가 그대로면 경고 (CI의 PR 단계용)
npm run og                    # public/images/og*.png 생성 (Playwright와 Chromium 필요)
```

## 배포

플러그인 레포의 `.github/workflows/pages.yml`이 main 푸시 때 `site/`를 빌드해 GitHub Pages로 배포합니다. 레포 설정의 Pages 소스는 **GitHub Actions**여야 합니다. 검사에 실패하면 배포하지 않습니다.

## 키트 고치기

```sh
npm install
npm test        # test/fixture 예제 사이트를 빌드하고, 일부러 망가뜨린 결과를 검사가 잡는지 확인
```

바꾼 뒤에는 `package.json`의 `version`을 올리고 같은 이름의 태그(`v0.2.0`)를 만듭니다. 각 플러그인 레포는 `site/package.json`의 `#v0.1.0`을 새 태그로 바꿔 받습니다.

## License

MIT
