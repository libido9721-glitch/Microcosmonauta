// Lo común a las experiencias de los EPs (criaturas-abisales, un-cielo-de-agujeros, membranas):
// botones de compra/escucha, panel "acerca de", idioma (ES/EN/PT) y compartir grabaciones.
// La página se identifica con data-obra en el <script>.
// Cuando un disco salga en Bandcamp, Spotify o Apple Music, sólo hay que llenar su URL aquí.
(() => {
  const BANDCAMP_ARTISTA = ''; // Microcosmonauta: links propios se añadirán cuando estén disponibles
  const OBRAS = {
    'criaturas-abisales':   { name: 'Traumdeuter', cat: 'Interactive audiovisual experience', spotify: '', apple: '', youtube: '', amazon: '' },
    'un-cielo-de-agujeros': { name: 'un cielo de agujeros', cat: 'Fósforo · FSF-018', bandcamp: 'https://fantasm0genesis.bandcamp.com/album/un-cielo-de-agujeros', spotify: '', apple: '' },
    'membranas':            { name: 'membranas', cat: 'Fósforo · FSF-019', bandcamp: 'https://fantasm0genesis.bandcamp.com/album/membranas', spotify: '', apple: '' },
  };
  const obra = document.currentScript?.dataset.obra || '';
  const info = OBRAS[obra] || { name: document.title, cat: '' };

  // ---------------------------------------------------------------- idioma
  // Microcosmonauta: English first, then remember the visitor's choice.
  // El español vive en el HTML; los elementos con data-i18n="clave" se reemplazan con el diccionario.
  const LANGS = ['en', 'es', 'de'];
  const COMMON = {
    es: {
      buy: 'Comprar en Bandcamp', buyShort: 'Comprar', spotify: 'Guardar en Spotify', apple: 'Guardar en Apple Music',
      about: 'Acerca', aboutLabel: 'Acerca de esta obra', close: 'Cerrar', lang: 'Idioma',
      aboutP1: n => `${n} es una obra expandida de Traumdeuter: un EP que también es un visual que reacciona a la música. Lo puedes tocar desde tu compu o tu celular, grabarlo y compartirlo.`,
      aboutP2: 'Música y grabaciones de Traumdeuter.',
      aboutStream: 'Los enlaces oficiales de escucha se añadirán aquí.',
      aboutSoon: 'Los enlaces oficiales de escucha se añadirán aquí cuando estén disponibles.',
      share: 'Compartir', download: 'Descargar', copy: 'Copiar texto', copied: 'Copiado',
      shareNote: 'Al compartir copiamos el texto: pégalo en tu publicación para que te encontremos.',
      sharedCopied: 'El texto quedó copiado: pégalo en tu publicación.',
      downloaded: c => `Se descargó tu video${c ? ' y el texto quedó copiado' : ''}. Súbelo a Instagram o TikTok${c ? ' y pega el texto' : ''}.`,
      noRec: 'Este navegador no puede grabar video. Prueba en Chrome o Safari.',
      caption: (track, n, url, verb) => `Toqué «${track}» en ${n}, una obra expandida de Traumdeuter.\n${verb}: ${url}\nInstagram @traumdeuter.music · TikTok @traumdeuter`,
    },
    en: {
      buy: 'Listen', buyShort: 'Listen', spotify: 'Listen on Spotify', apple: 'Listen on Apple Music',
      about: 'About', aboutLabel: 'About this work', close: 'Close', lang: 'Language',
      aboutP1: n => `${n} is an expanded work by Traumdeuter: an EP that is also a visual that reacts to the music. You can play it from your computer or phone, record it and share it.`,
      aboutP2: 'Music and recordings by Traumdeuter.',
      aboutStream: 'Official listening links will appear here when available.',
      aboutSoon: 'Official listening links will appear here when available.',
      share: 'Share', download: 'Download', copy: 'Copy text', copied: 'Copied',
      shareNote: 'When you share, we copy the text: paste it in your post so we can find you.',
      sharedCopied: 'The text is copied: paste it in your post.',
      downloaded: c => `Your video was downloaded${c ? ' and the text is copied' : ''}. Upload it to Instagram or TikTok${c ? ' and paste the text' : ''}.`,
      noRec: 'This browser can’t record video. Try Chrome or Safari.',
      caption: (track, n, url, verb) => `I played “${track}” on ${n}, an expanded work by Traumdeuter.\n${verb}: ${url}\nInstagram @traumdeuter.music · TikTok @traumdeuter`,
    },
    de: {
      buy: 'Auf Spotify hören', buyShort: 'Hören', spotify: 'Auf Spotify öffnen', apple: 'Auf Apple Music öffnen',
      about: 'Info', aboutLabel: 'Über dieses Projekt', close: 'Schließen', lang: 'Sprache',
      aboutP1: n => `${n} ist ein interaktives audiovisuelles Projekt: ein Klangwerk, das zugleich eine auf Musik reagierende visuelle Erfahrung ist. Du kannst es am Computer oder Smartphone erkunden, aufnehmen und teilen.`,
      aboutP2: 'Musik und Aufnahmen von Traumdeuter.',
      aboutStream: 'Höre das Projekt auf Spotify oder Apple Music.',
      aboutSoon: 'Musiklinks werden ergänzt, sobald sie verfügbar sind.',
      share: 'Teilen', download: 'Herunterladen', copy: 'Text kopieren', copied: 'Kopiert',
      shareNote: 'Der Text wurde kopiert. Füge ihn deinem Beitrag hinzu.',
      sharedCopied: 'Der Text wurde kopiert.',
      downloaded: c => `Dein Video wurde heruntergeladen${c ? ' und der Text kopiert' : ''}.`,
      noRec: 'Dieser Browser kann kein Video aufnehmen. Bitte Chrome oder Safari verwenden.',
      caption: (track, n, url, verb) => `Ich habe „${track}“ in ${n} erlebt.\n${verb}: ${url}`,
    },
  };
  let page = { es: {}, en: {}, de: {} };
  const listeners = [];
  let lang = 'en';
  try { lang = localStorage.getItem('microcosmonauta-lang') || 'en'; } catch {}
  if (!LANGS.includes(lang)) lang = 'en';

  // t('clave', ...args): texto en el idioma actual (si la clave es función, se le pasan los args)
  function t(key, ...args) {
    const v = page[lang]?.[key] ?? COMMON[lang][key] ?? page.en?.[key] ?? COMMON.en[key] ?? key;
    return typeof v === 'function' ? v(...args) : v;
  }
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.dataset.es === undefined) el.dataset.es = el.innerHTML;
      const key = el.dataset.i18n;
      const v = lang === 'es' ? undefined : (page[lang]?.[key] ?? COMMON[lang][key]);
      el.innerHTML = typeof v === 'string' ? v : el.dataset.es;
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  }
  function setLang(code) {
    if (!LANGS.includes(code)) return;
    lang = code;
    try { localStorage.setItem('microcosmonauta-lang', code); } catch {}
    document.documentElement.lang = code;
    applyStatic();
    render();
    listeners.forEach(fn => { try { fn(lang); } catch {} });
  }
  // La página registra sus textos en ES / EN / DE.
  function i18n(dict) {
    page = { es: {}, en: {}, de: {}, ...dict };
    document.documentElement.lang = lang;
    applyStatic();
    listeners.forEach(fn => { try { fn(lang); } catch {} });
  }
  const onLang = fn => listeners.push(fn);

  // ---------------------------------------------------------------- estilos
  const css = document.createElement('style');
  css.textContent = `
    .buy { position: fixed; top: max(14px, env(safe-area-inset-top)); right: max(14px, env(safe-area-inset-right)); z-index: 30;
      display: flex; gap: 6px; align-items: center; opacity: max(0.6, var(--ui, 1)); transition: opacity 0.6s;
      font-family: Manrope, system-ui, sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
    .fs-btn ~ .buy { right: calc(max(14px, env(safe-area-inset-right)) + 42px); }
    .buy a, .buy button { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border-radius: 16px; white-space: nowrap;
      font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer;
      color: rgba(236, 232, 230, 0.92); text-decoration: none; border: 1px solid rgba(236, 232, 230, 0.28);
      background: rgba(0, 0, 0, 0.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      transition: background 0.2s, color 0.2s, border-color 0.2s; -webkit-tap-highlight-color: transparent; }
    .buy a:hover, .buy a:focus-visible, .buy button:hover, .buy button:focus-visible { background: rgba(236, 232, 230, 0.95); color: #000; border-color: transparent; outline: none; }
    .buy .main { background: rgba(236, 232, 230, 0.92); color: #000; border-color: transparent; }
    .buy .main:hover, .buy .main:focus-visible { background: #fff; }
    .buy svg { width: 13px; height: 13px; fill: currentColor; flex: none; }
    .buy .langs { display: inline-flex; align-items: center; height: 32px; padding: 0 4px; border-radius: 16px;
      border: 1px solid rgba(236, 232, 230, 0.28); background: rgba(0, 0, 0, 0.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
    .buy .langs button { height: 30px; padding: 0 7px; border: 0; background: none; color: rgba(236, 232, 230, 0.45); -webkit-backdrop-filter: none; backdrop-filter: none; }
    .buy .langs button.on { color: rgba(236, 232, 230, 0.95); }
    .buy .langs button:hover { background: none; color: #fff; }
    .buy .md, .buy .sm { display: none; }
    @media (max-width: 1400px) { .buy .lg { display: none; } .buy .md { display: inline; } }
    @media (max-width: 700px) {
      .buy { gap: 5px; font-size: 9px; letter-spacing: 0.1em; }
      .buy a, .buy button { height: 30px; padding: 0 10px; }
      .buy .md { display: none; }
      .buy .sm { display: inline; }
      .buy a.ico, .buy .about-btn { width: 30px; padding: 0; justify-content: center; }
      .buy .langs { width: 30px; height: 30px; padding: 0; justify-content: center; }
      .buy .langs button { width: 28px; padding: 0; justify-content: center; }
      .buy .langs button:not(.on) { display: none; }
    }
    .about { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 18px;
      background: rgba(0, 0, 0, 0.6); opacity: 0; pointer-events: none; transition: opacity 0.35s; }
    .about.on { opacity: 1; pointer-events: auto; }
    .about .card { width: min(460px, 100%); padding: 26px 26px 22px; border-radius: 14px; position: relative;
      background: rgba(8, 8, 10, 0.88); border: 1px solid rgba(236, 232, 230, 0.18); color: rgba(236, 232, 230, 0.92);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font-family: Manrope, system-ui, sans-serif; }
    .about .k { font-weight: 700; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(236, 232, 230, 0.5); margin: 0 0 10px; }
    .about h2 { font-weight: 200; font-size: 28px; line-height: 1.1; margin: 0 0 16px; }
    .about p { font-size: 14px; line-height: 1.6; margin: 0 0 12px; color: rgba(236, 232, 230, 0.78); }
    .about .acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 18px; }
    .about .acts a { display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border-radius: 16px; text-decoration: none;
      font-weight: 700; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(236, 232, 230, 0.92); border: 1px solid rgba(236, 232, 230, 0.28); }
    .about .acts a.main { background: rgba(236, 232, 230, 0.92); color: #000; border-color: transparent; }
    .about .acts svg { width: 13px; height: 13px; fill: currentColor; }
    .about .x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border: 0; background: none; cursor: pointer;
      color: rgba(236, 232, 230, 0.6); font-size: 22px; line-height: 1; }
    .about .x:hover { color: #fff; }`;
  document.head.append(css);

  const ICON = {
    bandcamp: '<svg viewBox="0 0 24 24"><path d="M0 18.75 7.44 5.25H24l-7.44 13.5z"/></svg>',
    spotify: '<svg viewBox="0 0 24 24"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.4-2.1-10.5-1.2a.75.75 0 1 1-.33-1.46c4.5-1 8.4-.6 11.6 1.4.35.2.46.66.24 1zm1.47-3.27a.94.94 0 0 1-1.29.3c-3.2-2-8.1-2.55-11.9-1.4a.94.94 0 1 1-.54-1.8c4.3-1.3 9.7-.67 13.4 1.6.44.27.58.85.31 1.3zm.13-3.4C15.2 8.3 8.9 8.1 5.2 9.2a1.12 1.12 0 1 1-.65-2.15c4.2-1.3 11.2-1.05 15.6 1.6a1.12 1.12 0 0 1-1.15 1.93z"/></svg>',
    apple: '<svg viewBox="0 0 24 24"><path d="M20 2.5v13.2a3.3 3.3 0 1 1-2-3V6.8L9 8.6v9.1a3.3 3.3 0 1 1-2-3V4.4z"/></svg>',
    soundcloud: '<svg viewBox="0 0 24 24"><path d="M11 7.6a5.6 5.6 0 0 1 9.3 3.6 3.4 3.4 0 0 1-.6 6.8H11zM9 9h1.2v9H9zm-2.3 1.5h1.2V18H6.7zm-2.3 1.2h1.2V18H4.4zM2 13.4h1.2V18H2z"/></svg>',
  };
  let links = { ...info };

  // ---------------------------------------------------------------- barra de arriba
  function render(over) {
    if (over) links = { ...links, ...over };
    document.querySelector('.buy')?.remove();
    const nav = document.createElement('nav');
    nav.className = 'buy';
    nav.setAttribute('aria-label', t('aboutLabel'));
    // tres largos de etiqueta: compu ancha, compu, celular (en celular Spotify y Apple Music quedan sólo como ícono)
    const item = (href, icon, lg, md, sm, cls) =>
      `<a class="${cls}" href="${href}" target="_blank" rel="noopener" aria-label="${lg}">${ICON[icon]}` +
      `<span class="lg">${lg}</span><span class="md">${md}</span>${sm ? `<span class="sm">${sm}</span>` : ''}</a>`;
    nav.innerHTML =
      `<div class="langs" role="group" aria-label="${t('lang')}">` +
        LANGS.map(c => `<button data-l="${c}" class="${c === lang ? 'on' : ''}" aria-pressed="${c === lang}">${c}</button>`).join('') +
      `</div>` +
      `<button class="about-btn" aria-label="${t('aboutLabel')}"><span class="lg">${t('about')}</span><span class="md">${t('about')}</span><span class="sm">?</span></button>` +
      (links.spotify ? item(links.spotify, 'spotify', t('spotify'), 'Spotify', '', 'ico') : '') +
      (links.apple ? item(links.apple, 'apple', t('apple'), 'Apple Music', '', 'ico') : '') +
      (links.soundcloud ? item(links.soundcloud, 'soundcloud', 'SoundCloud', 'SoundCloud', '', 'ico') : '') +
      (links.youtube ? `<a href="${links.youtube}" target="_blank" rel="noopener">YouTube</a>` : '') +
      (links.amazon ? `<a href="${links.amazon}" target="_blank" rel="noopener">Amazon Music</a>` : '');
    nav.addEventListener('pointerdown', e => e.stopPropagation());
    nav.addEventListener('click', e => e.stopPropagation());
    nav.querySelectorAll('.langs button').forEach(b => b.onclick = () => {
      // en celular sólo se ve el idioma actual: tocarlo pasa al siguiente
      const narrow = matchMedia('(max-width: 700px)').matches;
      setLang(narrow && b.dataset.l === lang ? LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length] : b.dataset.l);
    });
    nav.querySelector('.about-btn').onclick = openAbout;
    document.body.append(nav);
    if (aboutEl) fillAbout();
  }

  // ---------------------------------------------------------------- acerca de
  let aboutEl = null;
  function fillAbout() {
    const stream = links.spotify || links.apple;
    const a = (href, icon, label, cls = '') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${ICON[icon]}${label}</a>`;
    aboutEl.querySelector('.card').innerHTML =
      `<button class="x" aria-label="${t('close')}">×</button>` +
      `<p class="k">Traumdeuter${links.cat ? ' · ' + links.cat : ''}</p>` +
      `<h2>${links.name}</h2>` +
      `<p>${t('aboutP1', links.name)}</p><p>${t('aboutP2')}</p><p>${t(stream ? 'aboutStream' : 'aboutSoon')}</p>` +
      `<div class="acts">` +
        (links.youtube ? `<a href="${links.youtube}" target="_blank" rel="noopener">YouTube</a>` : '') +
        (links.amazon ? `<a href="${links.amazon}" target="_blank" rel="noopener">Amazon Music</a>` : '') +
        (links.spotify ? a(links.spotify, 'spotify', t('spotify')) : '') +
        (links.apple ? a(links.apple, 'apple', t('apple')) : '') +
        '' +
      `</div>`;
    aboutEl.querySelector('.x').onclick = closeAbout;
  }
  function openAbout() {
    if (!aboutEl) {
      aboutEl = document.createElement('div');
      aboutEl.className = 'about';
      aboutEl.setAttribute('role', 'dialog');
      aboutEl.innerHTML = '<div class="card"></div>';
      aboutEl.addEventListener('pointerdown', e => e.stopPropagation());
      aboutEl.addEventListener('click', e => { e.stopPropagation(); if (e.target === aboutEl) closeAbout(); });
      document.body.append(aboutEl);
    }
    fillAbout();
    aboutEl.setAttribute('aria-label', t('aboutLabel'));
    requestAnimationFrame(() => aboutEl.classList.add('on'));
  }
  function closeAbout() { aboutEl?.classList.remove('on'); }
  // Esc cierra el panel; mientras está abierto, las teclas no llegan a la experiencia (A S D F R...)
  addEventListener('keydown', e => {
    if (!aboutEl?.classList.contains('on')) return;
    if (e.key === 'Escape') closeAbout();
    e.stopImmediatePropagation();
  }, true);

  // ---------------------------------------------------------------- compartir
  // Menú nativo si el navegador puede mandar archivos (celular, Safari); si no, descarga el video.
  // En ambos casos el texto queda copiado para pegarlo en la publicación.
  async function compartir(file, text, title) {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch {}
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title, text }); } catch {}
      return copied ? t('sharedCopied') : '';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.append(a); a.click(); a.remove();
    return t('downloaded', copied);
  }

  window.fgObra = { render, compartir, t, i18n, onLang, setLang, get lang() { return lang; }, about: openAbout };
  document.documentElement.lang = lang;
  render();
  applyStatic();
})();
