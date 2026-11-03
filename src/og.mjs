// @ts-check
// The link-preview image, 1200x630: the site's hero in one language. `plugin-site og` draws it.
/** @param {string} s */
const text = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** @param {import('./schema.mjs').Site} site @param {string} lang @returns {string} */
export function ogHtml(site, lang) {
  const L = site.languages[lang]
  const mono = site.hero.mono
  const answer = site.hero.answer ?? L.strings.answer
  // checkSite requires one of the two.
  const line = /** @type {string} */ (L.ogImageLine ?? site.hero.line)
  // The question is a translated string that may carry markup; the image wants it as plain text.
  const ask = L.strings.ask.replace(/<[^>]+>/g, '')
  const font = L.font
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=${font.replace(/ /g, '+')}:wght@400;600&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; background: #FFFFFF; color: #202020; }
  body { font-family: "${font}", system-ui, sans-serif; padding: 92px 96px 0; }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .chat {
    display: flex; flex-direction: column; height: 263px; padding: ${mono ? '36px 44px 0 42px' : '36px 42px 0 40px'};
    background: #FAFAFA; border: 2px solid #E4E4E4; border-radius: 28px;
  }
  .bubble { align-self: flex-end; background: #F0F0F0; border-radius: 22px; ${mono ? 'padding: 16px 30px; font-size: 31px;' : 'padding: 18px 31px; font-size: 33px;'} line-height: 44px; }
  .answer { ${mono ? 'font-size: 29px; line-height: 40px; margin-top: 30px;' : 'font-size: 33px; line-height: 44px; margin-top: 20px;'} }
  .answer .p { color: #6F6F6F; }
  .line { ${mono ? 'font-size: 25px; line-height: 34px; white-space: pre; margin-top: 10px;' : 'font-size: 28px; line-height: 38px; font-style: italic; margin-top: 12px;'} color: #6F6F6F; }
  h1 { font-size: 64px; line-height: 80px; font-weight: 600; letter-spacing: -0.01em; margin-top: 46px; }
  .sub { font-size: ${mono ? '28px; line-height: 40px; margin-top: 12px' : '30px; line-height: 42px; margin-top: 14px'}; color: #6F6F6F; }
  html[lang="ko"] .sub { word-break: keep-all; }
</style>
</head>
<body>
  <div class="chat">
    <p class="bubble">${text(ask)}</p>
    <p class="answer${mono ? ' mono' : ''}">${mono ? '<span class="p">$</span> ' : ''}${text(answer)}</p>
    <p class="line${mono ? ' mono' : ''}">${text(line)}</p>
  </div>
  <h1>${text(site.name)}</h1>
  <p class="sub">${text(L.ogImageText)}</p>
</body>
</html>
`
}
