// Genera las páginas web de los documentos legales en docs/legal/ (privacidad, términos y
// eliminación de cuenta). Las tiendas piden una URL pública de la política de privacidad y
// otra para pedir la eliminación de la cuenta: subí esa carpeta a un hosting (GitHub Pages, etc.).
//
// Uso:  node scripts/build-legal.js
// Completá antes los datos del titular en src/legal/config.json.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const config = require(path.join(root, 'src/legal/config.json'));
const content = require(path.join(root, 'src/legal/content.json'));
const outDir = path.join(root, 'docs/legal');

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
];

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fill(text, lang) {
  const values = { ...config, lastUpdated: config.lastUpdated[lang] || config.lastUpdated.es };
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key) => (typeof values[key] === 'string' ? values[key] : ''));
}

function renderDoc(doc, lang) {
  const parts = [`<h1>${escapeHtml(fill(doc.title, lang))}</h1>`, `<p class="intro">${escapeHtml(fill(doc.intro, lang))}</p>`];
  for (const section of doc.sections) {
    parts.push(`<h2>${escapeHtml(fill(section.h, lang))}</h2>`);
    for (const p of section.p || []) parts.push(`<p>${escapeHtml(fill(p, lang))}</p>`);
    if (section.ul) parts.push(`<ul>${section.ul.map((li) => `<li>${escapeHtml(fill(li, lang))}</li>`).join('')}</ul>`);
  }
  return parts.join('\n');
}

const css = `
  :root { color-scheme: light dark; --bg:#f5f6f8; --fg:#18181b; --muted:#52525b; --accent:#059669; --card:#fff; }
  @media (prefers-color-scheme: dark) { :root { --bg:#09090b; --fg:#fafafa; --muted:#a1a1aa; --accent:#10b981; --card:#18181b; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 20px 64px; }
  nav { display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 24px; }
  nav button { border:1px solid var(--muted); background:var(--card); color:var(--fg); padding:6px 14px; border-radius:999px; cursor:pointer; font:inherit; }
  nav button[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fff; }
  h1 { font-size: 1.8rem; margin: 0 0 8px; } h2 { font-size: 1.1rem; margin: 28px 0 6px; }
  .intro { color: var(--muted); } p, li { color: var(--fg); } ul { padding-left: 1.2rem; }
  .doc[hidden] { display:none; } footer { margin-top:48px; color:var(--muted); font-size:.9rem; } a { color: var(--accent); }
`;

const script = `
  const buttons = [...document.querySelectorAll('nav button')];
  const docs = [...document.querySelectorAll('.doc')];
  function show(code) {
    docs.forEach((d) => { d.hidden = d.dataset.lang !== code; });
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === code)));
    document.documentElement.lang = code;
  }
  const wanted = (new URLSearchParams(location.search).get('lang') || navigator.language || 'es').slice(0, 2);
  show(['es', 'en', 'pt'].includes(wanted) ? wanted : 'es');
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.lang)));
`;

function page(kind) {
  const title = fill(content[kind].es.title, 'es');
  const nav = languages.map((l) => `<button type="button" data-lang="${l.code}" aria-pressed="false">${l.label}</button>`).join('');
  const docs = languages
    .map((l) => `<article class="doc" data-lang="${l.code}" lang="${l.code}" hidden>${renderDoc(content[kind][l.code], l.code)}</article>`)
    .join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(config.appName)}</title><style>${css}</style></head>
<body><main><nav aria-label="Language">${nav}</nav>
${docs}
<footer>${escapeHtml(config.appName)} · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="delete-account.html">Delete account</a></footer>
</main><script>${script}</script></body></html>
`;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'privacy.html'), page('privacy'));
fs.writeFileSync(path.join(outDir, 'terms.html'), page('terms'));
fs.writeFileSync(path.join(outDir, 'delete-account.html'), page('deletion'));
fs.writeFileSync(
  path.join(outDir, 'index.html'),
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(config.appName)}</title><style>${css}</style></head>` +
    `<body><main><h1>${escapeHtml(config.appName)}</h1><ul><li><a href="privacy.html">Política de privacidad / Privacy Policy</a></li><li><a href="terms.html">Términos y condiciones / Terms</a></li><li><a href="delete-account.html">Eliminar cuenta / Delete account</a></li></ul></main></body></html>\n`,
);

const pending = Object.entries(config).filter(([key, value]) => key !== '_comment' && typeof value === 'string' && value.startsWith('['));
console.log('Páginas generadas en docs/legal/');
if (pending.length) {
  console.log('\nOJO: faltan datos en src/legal/config.json antes de publicar:');
  pending.forEach(([key, value]) => console.log(`  - ${key}: ${value}`));
}
