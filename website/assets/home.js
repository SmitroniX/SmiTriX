(function () {
  'use strict';

  var DICT = {
    en: {
      metaDesc: 'SmiTriX: a free, open-source gym and nutrition tracker by Asmit Jogdand (SmitroniX). No login on web or demo, no ads, no subscription. 1,300+ animated exercises, automatic progression and Docker self-hosting.',
      title: 'SmiTriX — Free Open-Source Gym & Nutrition Tracker',
      navFeatures: 'What it does', navCompare: 'Compare', navShots: 'Screens', navPrivacy: 'Privacy', navDocs: 'Docs', navApi: 'API', navAbout: 'About', navDownload: 'Download',
      skip: 'Skip to content',
      dlCount: 'downloads on GitHub',
      heroL1: 'Lift.', heroL2: 'Log it.', heroL3: 'Grow.',
      heroLead: 'The open-source gym log that asks for nothing on the web: no login in the demo, no ads, no paywall. Tap the muscles you want to train, log your sets and watch your numbers climb.',
      ctaDownload: 'Download APK', ctaDemo: 'Open Live Demo', ctaGithub: 'View on GitHub',
      heroMeta: 'Android 7.0+ & Self-Host Docker · No login on website/demo · No ads · GPL-3.0',
      liveNote: 'Interactive live demo — no login required.',
      liveFull: 'Open fullscreen ↗',
      featTitle: 'What it does',
      f1t: 'Train by tapping the body', f1d: 'Tap muscles, front and back, and get a targeted session. Warm-up, working, failure and drop sets, RPE or RIR, Olympic plates per side, and per-side reps.',
      f2t: 'Automatic progression', f2d: 'Suggests more reps or more weight next session, flags plateaus, schedules deload sessions and keeps your 1RM curves clean.',
      f3t: 'A rest timer you can hear', f3d: 'Vertical draining tick bar, custom chime presets, voice coach announcements, screen flash & sage edge glow when rest ends.',
      f4t: 'Routines and circuits', f4d: 'Fixed weekly plan or rolling rotation, 3D routine folders, supersets, timed circuits with rounds, starter plans and instant exercise swaps.',
      f5t: 'Progress that is real', f5d: 'Estimated 1RM, personal records, volume charts, streaks that survive rest days, muscle recovery map, 20 3D medals and shareable monthly recaps.',
      f6t: 'Body and photos', f6d: 'Body weight curve with goal tracking, ten body measurements plus custom ones, progress photo timeline with before/after compare and muscle map mode.',
      f7t: 'Nutrition & recovery (beta)', f7d: '560+ built-in foods, calorie ring & macro bars, water vessel, protein shakes, supplements, fasting timer, plus sauna, cold plunge and guided breathwork.',
      f8t: '1,300+ animated exercises', f8d: 'Full animation & step-by-step instructions, equipment filters, training places (Gym, Home, Outdoors), plus custom exercises with your own media.',
      f9t: 'Journal and notes', f9d: 'Session notes, pinned per-exercise cues, calendar training journal with folders, and form check video vault.',
      f10t: '12 calculators & AI Coach', f10d: 'Built-in 1RM, plates, BMI, macros, body fat, warm-up pyramid, RPE load, strength standards, Wilks, FFMI, protein & water calculators — plus optional BYOK AI Coach.',
      f11t: 'Your data, yours', f11d: 'Import from Hevy, Strong, FitNotes or CSV. Export full JSON backups anytime. No login on website or demo; optional cloud sync inside the Android app or self-host via Docker.',
      f12t: '15 languages, your way', f12d: 'Dark, OLED and Light themes, warm dots or subtle grid backgrounds, custom accent colors, kg or lb, built for sweaty gym hands.',
      cmpTitle: 'SmiTriX versus other apps',
      cmpLead: 'What matters when you pick a gym tracker, with zero small print.',
      cmpCol: 'SmiTriX', cmpColO: 'Typical subscription apps',
      cmp1: 'Price', cmp1a: '100% free forever, no paid tier', cmp1b: 'Limited free tier + monthly subscription',
      cmp2: 'Web & Demo Login', cmp2a: 'No login on website or demo — app-only account option', cmp2b: 'Account wall before you can even try it',
      cmp3: 'Ads & tracking', cmp3a: 'Zero ads, zero trackers', cmp3b: 'Ads or invasive analytics',
      cmp4: 'Your data', cmp4a: 'Local-first on your device, full JSON export anytime', cmp4b: 'Locked on proprietary servers',
      cmp5: 'Source code', cmp5a: 'Open source (GNU GPL-3.0) on GitHub & GitLab', cmp5b: 'Closed source',
      cmp6: 'Limits', cmp6a: 'Unlimited routines, charts, history & exports', cmp6b: 'Capped routines behind paywall',
      cmp7: 'All in one', cmp7a: 'Workouts, progress, nutrition, recovery, journal & 12 tools', cmp7b: 'Usually workouts only',
      cmp8: 'Switching over', cmp8a: 'Import from Hevy, Strong, FitNotes & CSV in seconds', cmp8b: 'Exporting often costs extra',
      cmp9: 'Self-hosting', cmp9a: 'One-command Docker container on your own hardware', cmp9b: 'Not possible',
      cmp10: 'Exercise library', cmp10a: '1,300+ animated exercises + custom builder', cmp10b: 'Often locked or smaller catalog',
      shotsTitle: 'Screens',
      shotsLead: 'Real screens across training, progress, nutrition, body timeline and settings. Tap any phone to inspect full size.',
      sHome: 'Home', sTrain: 'Body Map', sSession: 'Live Workout', sProgress: 'Progress',
      sNutrition: 'Nutrition', sLibrary: 'Exercises', sRoutines: 'Routines', sBody: 'Muscle Timeline',
      sNotes: 'Journal', sPlaces: 'Places', sSettings: 'Settings',
      privTitle: 'Your data stays under your control',
      privP1: 'On the website and live demo, SmiTriX asks for zero login and saves everything strictly in your browser. Nothing is sent anywhere.',
      privP2: 'Inside the Android app you can train with optional cloud sync or pair to your own self-hosted Docker instance — and export your complete JSON vault anytime.',
      privOpen: 'Open Source on GitHub', privOpenSub: 'Audit every line of code (GPL-3.0)',
      privDoc: 'Self-Hosting & Docs', privDocSub: 'Run SmiTriX on your own server with Docker',
      whyTitle: 'Why it exists',
      whyP1: 'Built by Asmit Jogdand (SmitroniX) for lifters who want a fast, tactile gym log without paywalls, cluttered social feeds, or forced logins on the web.',
      whyP2: 'Licensed under GNU GPL-3.0 (with UI/UX inspiration and attribution to GymMane by InlitX under GPL-3.0). Contributions, translations and bug reports are always welcome.',
      supTitle: 'Support the project',
      supP1: 'SmiTriX is free and open source — no ads, no paywalls, ever. If it helps you hit PRs, consider buying Asmit a coffee or starring the repository on GitHub.',
      supP2: 'Bug reports, feature ideas and community feedback on Discord help just as much.',
      supBtn: 'Buy me a coffee', supStar: 'Star on GitHub', supDiscord: 'Join Discord',
      dlTitle: 'Get SmiTriX', dlLead: 'Download the signed Android APK, run the live no-login web demo, or self-host with Docker.',
      dlApk: 'Download SmiTriX.apk', dlWebDemo: 'Launch Demo (No Login)',
      dlHint: 'Verify your APK checksum below, or self-host locally with <code>docker compose up -d</code>.',
      copy: 'Copy', copied: 'Copied',
      footCode: 'Source', footDocs: 'Docs', footApi: 'API', footIssues: 'Report a bug', footCoffee: 'Buy me a coffee', footAdmin: 'Admin'
    },
    es: {
      metaDesc: 'SmiTriX: diario de gimnasio y nutrición gratis y de código abierto por Asmit Jogdand (SmitroniX). Sin login en la web ni en la demo, sin anuncios y sin suscripción.',
      title: 'SmiTriX — Diario de gimnasio y nutrición gratis y abierto',
      navFeatures: 'Qué hace', navCompare: 'Comparativa', navShots: 'Capturas', navPrivacy: 'Privacidad', navDocs: 'Docs', navApi: 'API', navAbout: 'Acerca de', navDownload: 'Descargar',
      skip: 'Saltar al contenido',
      dlCount: 'descargas en GitHub',
      heroL1: 'Levanta.', heroL2: 'Anota.', heroL3: 'Mejora.',
      heroLead: 'El diario de gimnasio abierto que no pide nada en la web: sin login en la demo, sin anuncios ni suscripción. Toca los músculos, apunta tus series y sube tus números.',
      ctaDownload: 'Descargar APK', ctaDemo: 'Abrir Demo', ctaGithub: 'Ver en GitHub',
      heroMeta: 'Android 7.0+ y Docker · Sin login en web/demo · Sin anuncios · GPL-3.0',
      liveNote: 'Demo interactiva en vivo — sin iniciar sesión.',
      liveFull: 'Pantalla completa ↗',
      featTitle: 'Qué hace',
      f1t: 'Entrenar tocando el cuerpo', f1d: 'Toca los músculos, de frente y espalda, para armar tu sesión. Series de calentamiento, fallo, dropsets, RPE/RIR y discos por lado.',
      f2t: 'Progresión automática', f2d: 'Sugiere más reps o peso la próxima vez, avisa de estancamientos, sesiones ligeras de descarga y gráficas de 1RM.',
      f3t: 'Descanso que sí avisa', f3d: 'Barra vertical de ticks, tonos personalizados, entrenador por voz, destello de pantalla y resplandor en los bordes.',
      f4t: 'Rutinas y circuitos', f4d: 'Plan semanal fijo o por rotación, carpetas 3D, superseries, circuitos por tiempo, planes iniciales y cambios rápidos.',
      f5t: 'Progreso de verdad', f5d: '1RM estimado, récords personales, volumen, rachas que respetan descansos, mapa de recuperación, 20 medallas 3D y resumen mensual.',
      f6t: 'Cuerpo y fotos', f6d: 'Peso corporal con meta, diez medidas corporales más personalizadas, fotos de progreso y línea de tiempo muscular.',
      f7t: 'Nutrición y recuperación (beta)', f7d: 'Más de 560 alimentos, calorías y macros, agua, batidos, suplementos, ayuno, sauna, frío y respiración guiada.',
      f8t: 'Más de 1.300 ejercicios animados', f8d: 'Animaciones e instrucciones paso a paso, filtros por material y lugares (Gimnasio, Casa, Parque) más ejercicios propios.',
      f9t: 'Diario y notas', f9d: 'Notas por sesión y por ejercicio, diario en calendario con carpetas y vídeos de técnica.',
      f10t: '12 calculadoras y AI Coach', f10d: '1RM, discos, IMC, macros, grasa corporal, calentamiento, RPE, Wilks, FFMI, proteína y agua, más AI Coach opcional.',
      f11t: 'Tus datos son tuyos', f11d: 'Importa Hevy, Strong, FitNotes o CSV. Exporta copias JSON completas. Sin login en web ni demo; sincronización opcional solo en la app Android o Docker.',
      f12t: '15 idiomas, a tu gusto', f12d: 'Tema oscuro, OLED y claro, fondo de puntos o cuadrícula, colores de acento y kg o lb.',
      cmpTitle: 'SmiTriX frente a otras apps',
      cmpLead: 'Lo que importa al elegir tu app de gimnasio, sin letra pequeña.',
      cmpCol: 'SmiTriX', cmpColO: 'Apps típicas de suscripción',
      cmp1: 'Precio', cmp1a: '100% gratis siempre, sin versión de pago', cmp1b: 'Plan limitado + suscripción mensual',
      cmp2: 'Login en Web/Demo', cmp2a: 'Sin login en web ni demo — cuenta opcional solo en app', cmp2b: 'Cuenta obligatoria incluso para probar',
      cmp3: 'Anuncios y rastreo', cmp3a: 'Cero anuncios y cero rastreo', cmp3b: 'Anuncios o analítica habitual',
      cmp4: 'Tus datos', cmp4a: 'En tu dispositivo con copia JSON completa', cmp4b: 'Encerrados en sus servidores',
      cmp5: 'Código fuente', cmp5a: 'Abierto (GNU GPL-3.0) en GitHub y GitLab', cmp5b: 'Cerrado',
      cmp6: 'Límites', cmp6a: 'Rutinas, gráficas e historial ilimitados', cmp6b: 'Límites detrás de pago',
      cmp7: 'Todo en uno', cmp7a: 'Entreno, progreso, nutrición, recuperación, diario y 12 herramientas', cmp7b: 'Normalmente solo entreno',
      cmp8: 'Migrar tus datos', cmp8a: 'Importa Hevy, Strong, FitNotes y CSV al instante', cmp8b: 'Exportar suele ser de pago',
      cmp9: 'Autoalojamiento', cmp9a: 'Contenedor Docker en un solo comando', cmp9b: 'No disponible',
      cmp10: 'Ejercicios', cmp10a: 'Más de 1.300 ejercicios animados + propios', cmp10b: 'Catálogo más reducido o bloqueado',
      shotsTitle: 'Capturas',
      shotsLead: 'Pantallas reales de entreno, progreso, nutrición, línea de tiempo y ajustes. Toca cualquiera para ampliarla.',
      sHome: 'Inicio', sTrain: 'Mapa corporal', sSession: 'Sesión', sProgress: 'Progreso',
      sNutrition: 'Nutrición', sLibrary: 'Ejercicios', sRoutines: 'Rutinas', sBody: 'Línea temporal',
      sNotes: 'Diario', sPlaces: 'Lugares', sSettings: 'Ajustes',
      privTitle: 'Tus datos siempre bajo tu control',
      privP1: 'En la web y la demo en vivo, SmiTriX no pide inicio de sesión y guarda todo localmente en tu navegador.',
      privP2: 'En la app Android puedes usar sincronización opcional en la nube o conectar tu propio servidor Docker — y exportar tu copia JSON cuando quieras.',
      privOpen: 'Código abierto en GitHub', privOpenSub: 'Audita cada línea (GPL-3.0)',
      privDoc: 'Documentación y Docker', privDocSub: 'Despliega SmiTriX en tu propio servidor',
      whyTitle: 'Por qué existe',
      whyP1: 'Creado por Asmit Jogdand (SmitroniX) para entrenar rápido y sin distracciones, sin suscripciones ni registros obligatorios en la web.',
      whyP2: 'Licencia GNU GPL-3.0 (basado en GymMane de InlitX bajo GPL-3.0). Aportes, traducciones y reportes de errores son bienvenidos.',
      supTitle: 'Apoya el proyecto',
      supP1: 'SmiTriX es gratis y abierto para siempre. Si te ayuda a entrenar, invita un café a Asmit o dale una estrella en GitHub.',
      supP2: 'Un reporte claro o unirte a la comunidad en Discord ayuda muchísimo.',
      supBtn: 'Invítame a un café', supStar: 'Estrella en GitHub', supDiscord: 'Unirse a Discord',
      dlTitle: 'Descarga SmiTriX', dlLead: 'Descarga el APK firmado para Android, prueba la demo sin login o autoaloja con Docker.',
      dlApk: 'Descargar SmiTriX.apk', dlWebDemo: 'Abrir Demo (Sin Login)',
      dlHint: 'Verifica el checksum SHA-256 abajo o autoaloja con <code>docker compose up -d</code>.',
      copy: 'Copiar', copied: 'Copiado',
      footCode: 'Código', footDocs: 'Docs', footApi: 'API', footIssues: 'Reportar fallo', footCoffee: 'Invítame a un café', footAdmin: 'Admin'
    }
  };

  var lang = localStorage.getItem('smitrix-web-lang');
  if (!lang) lang = (navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';

  function t(key) { return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key; }

  var SHOTS = [
    { f: 'home', k: 'sHome' },
    { f: 'train', k: 'sTrain' },
    { f: 'session', k: 'sSession' },
    { f: 'progress', k: 'sProgress' },
    { f: 'nutrition', k: 'sNutrition' },
    { f: 'library', k: 'sLibrary' },
    { f: 'routines', k: 'sRoutines' },
    { f: 'body', k: 'sBody' },
    { f: 'notes', k: 'sNotes' },
    { f: 'places', k: 'sPlaces' },
    { f: 'settings', k: 'sSettings' }
  ];

  var track = document.getElementById('shotsTrack');
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbIdx = 0, lbOpener = null;

  function buildShots() {
    if (!track) return;
    function card(s, i, dup) {
      return '<figure class="shot"' + (dup ? ' aria-hidden="true"' : '') + '>' +
        '<div class="phone" role="button" tabindex="' + (dup ? '-1' : '0') + '" data-i="' + i +
        '" aria-label="' + t(s.k) + '"><div class="island"></div>' +
        '<img src="assets/shots/' + s.f + '.webp" width="630" height="1400" loading="lazy" alt="SmiTriX — ' +
        t(s.k) + '" /></div><figcaption class="cap">' + t(s.k) + '</figcaption></figure>';
    }
    track.innerHTML = SHOTS.map(function (s, i) { return card(s, i, false); }).join('') +
      SHOTS.map(function (s, i) { return card(s, i, true); }).join('');
  }

  function openLb(i, opener) {
    lbIdx = (i + SHOTS.length) % SHOTS.length;
    lbImg.src = 'assets/shots/' + SHOTS[lbIdx].f + '.webp';
    lbImg.alt = 'SmiTriX — ' + t(SHOTS[lbIdx].k);
    lbCap.textContent = t(SHOTS[lbIdx].k);
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
    lbOpener = opener || null;
    document.getElementById('lbX').focus();
  }
  function closeLb() {
    lb.classList.remove('on');
    document.body.style.overflow = '';
    if (lbOpener) lbOpener.focus();
  }
  if (track) {
    track.addEventListener('click', function (e) {
      var p = e.target.closest('.phone');
      if (p) openLb(parseInt(p.dataset.i, 10), p);
    });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var p = e.target.closest('.phone');
      if (p) { e.preventDefault(); openLb(parseInt(p.dataset.i, 10), p); }
    });
  }
  if (lb) {
    document.getElementById('lbX').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', function () { openLb(lbIdx - 1, lbOpener); });
    document.getElementById('lbNext').addEventListener('click', function () { openLb(lbIdx + 1, lbOpener); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') openLb(lbIdx - 1, lbOpener);
      else if (e.key === 'ArrowRight') openLb(lbIdx + 1, lbOpener);
    });
  }

  // Embedded live interactive SmiTriX no-login demo frame
  var frame = document.getElementById('demoFrame');
  var loading = document.getElementById('demoLoading');
  var frameSrc = '';
  var failSafe = 0;

  function revealFrame() {
    clearTimeout(failSafe);
    if (frame) frame.classList.add('on');
    if (loading) loading.classList.add('off');
  }

  function renderDemoFrame() {
    if (!frame) return;
    var key = 'demo/?lang=' + lang + '#/home';
    if (frameSrc === key) return;
    frameSrc = key;
    frame.classList.remove('on');
    if (loading) loading.classList.remove('off');
    var m = document.getElementById('demoMsg');
    if (m) m.hidden = true;
    frame.src = key;
    clearTimeout(failSafe);
    failSafe = setTimeout(function () {
      revealFrame();
    }, 3500);
  }

  if (frame) {
    frame.addEventListener('load', function () {
      setTimeout(revealFrame, 250);
    });
    addEventListener('message', function (e) {
      if ((e.data === 'smitrix-ready' || e.data === 'gm-ready') && e.source === frame.contentWindow) {
        revealFrame();
      }
    });
    var screenEl = document.querySelector('.device .screen');
    var fitFrame = function () {
      if (!screenEl) return;
      frame.style.transform = 'scale(' + (screenEl.clientWidth / 390).toFixed(4) + ')';
    };
    fitFrame();
    addEventListener('resize', fitFrame);
    if (window.ResizeObserver && screenEl) new ResizeObserver(fitFrame).observe(screenEl);
  }

  function applyLang() {
    var d = DICT[lang] || DICT.en;
    document.documentElement.lang = lang;
    document.title = d.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', d.metaDesc);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n')];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-html')];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    buildShots();
    fmtDlNow();
    renderDemoFrame();
    if (lb && lb.classList.contains('on')) lbCap.textContent = t(SHOTS[lbIdx].k);
  }

  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.dataset.lang;
      localStorage.setItem('smitrix-web-lang', lang);
      applyLang();
    });
  });

  // Reveal on scroll
  var slowMo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // Scroll spy
  var spy = [].slice.call(document.querySelectorAll('.lnks a.lnk')).map(function (a) {
    var href = a.getAttribute('href') || '';
    return { a: a, sec: href.charAt(0) === '#' ? document.querySelector(href) : null };
  }).filter(function (s) { return s.sec; });

  addEventListener('scroll', function () {
    var mark = document.documentElement.scrollTop + 140, on = null;
    spy.forEach(function (s) { if (s.sec.offsetTop <= mark) on = s.a; });
    spy.forEach(function (s) { s.a.classList.toggle('on', s.a === on); });
  }, { passive: true });

  // Live GitHub download counter for SmitroniX/SmiTriX
  var dlNum = document.getElementById('dlNum');
  var dlShown = 0, dlRaf = 0;
  function fmtDl(v) { return Math.round(v).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US'); }
  function fmtDlNow() { if (dlNum && dlShown) dlNum.textContent = fmtDl(dlShown); }
  function countDl(n) {
    if (!n || !dlNum) return;
    cancelAnimationFrame(dlRaf);
    if (slowMo) { dlShown = n; fmtDlNow(); return; }
    var from = dlShown, t0 = performance.now(), dur = 1400;
    (function step(now) {
      var p = Math.min(1, Math.max(0, (now - t0) / dur));
      dlShown = from + (n - from) * (1 - Math.pow(1 - p, 3));
      dlNum.textContent = fmtDl(dlShown);
      if (p < 1) dlRaf = requestAnimationFrame(step);
    })(t0);
  }
  var dlCache = null;
  try { dlCache = JSON.parse(localStorage.getItem('smitrix-downloads') || 'null'); } catch (e) {}
  if (!dlCache || !(dlCache.n > 0) || !(dlCache.t > 0)) dlCache = null;
  if (dlCache) countDl(dlCache.n);
  function saveDl(n) {
    if (!n) return;
    try { localStorage.setItem('smitrix-downloads', JSON.stringify({ n: n, t: Date.now() })); } catch (e) {}
    countDl(n);
  }
  if (!dlCache || Date.now() - dlCache.t > 36e5) {
    fetch('https://api.github.com/repos/SmitroniX/SmiTriX/releases?per_page=100')
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (rs) {
        var n = 0;
        rs.forEach(function (r) { (r.assets || []).forEach(function (a) { n += a.download_count || 0; }); });
        if (n > 0) saveDl(n);
        else if (dlNum && !dlShown) dlNum.textContent = 'GPL-3.0';
      })
      .catch(function () { if (dlNum && !dlShown) dlNum.textContent = 'GPL-3.0'; });
  }

  // Copy checksum / docker command buttons
  document.querySelectorAll('.hash-row button').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = b.parentNode.querySelector('code').textContent;
      var done = function () {
        b.textContent = t('copied');
        b.classList.add('ok');
        setTimeout(function () { b.textContent = t('copy'); b.classList.remove('ok'); }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {});
    });
  });

  var yEl = document.getElementById('y');
  if (yEl) yEl.textContent = new Date().getFullYear();
  applyLang();
})();
