/* ==========================================================
   Dr. Athul Nazar & Fami Fathima — Wedding Invitation
   Vanilla ES6 · no libraries
   ========================================================== */
(() => {
  'use strict';

  /* ---------- config ---------- */
  const WEDDING_TIME = new Date('2026-11-15T18:00:00+05:30').getTime(); // 6:00 PM IST
  const MUSIC_SRC = 'assets/music.mp3';     // drop a file here to enable the music button; '' disables it

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const body = document.body;
  const opening = $('#opening');
  const video = $('#openVideo');
  const tapBtn = $('#tapOpen');
  const skipBtn = $('#skipBtn');
  const firstPage = $('#invitation');

  /* ==========================================================
     MUSIC (optional — only appears if assets/music.mp3 exists)
     ========================================================== */
  const music = (() => {
    const btn = $('#musicBtn');
    let audio = null;
    let available = false;
    let resumeAfterHidden = false;

    const setState = (on) => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Mute background music' : 'Play background music');
      btn.classList.remove('is-hint');
    };

    if (MUSIC_SRC && btn) {
      audio = new Audio();
      audio.loop = true;
      audio.volume = 0.6;
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => {
        available = true;
        btn.hidden = false;
        if (audio.paused) btn.classList.add('is-hint');
      }, { once: true });
      audio.addEventListener('error', () => {   // file missing → no button, no broken UI
        available = false;
        btn.hidden = true;
      });
      audio.src = MUSIC_SRC;

      btn.addEventListener('click', () => toggle());

      // be polite: pause when the tab is hidden, resume if it was playing
      document.addEventListener('visibilitychange', () => {
        if (!audio || !available) return;
        if (document.hidden && !audio.paused) { resumeAfterHidden = true; audio.pause(); }
        else if (!document.hidden && resumeAfterHidden) { resumeAfterHidden = false; audio.play().catch(() => setState(false)); }
      });
    }

    /** Must be called from inside a user gesture (click/tap). */
    function play() {
      if (!audio) return;
      const p = audio.play();
      if (p && p.then) p.then(() => setState(true)).catch(() => setState(false));
    }
    function toggle() {
      if (!audio || !available) return;
      if (audio.paused) play();
      else { audio.pause(); setState(false); }
    }
    return { play };
  })();

  /* ==========================================================
     OPENING VIDEO → INVITATION TRANSITION
     ========================================================== */
  let revealed = false;
  let holdTimer = null;

  const decodeFirstPage = () => {
    const img = $('img', firstPage);
    if (!img) return Promise.resolve();
    if (img.decode) return img.decode().catch(() => {});
    return img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; });
  };

  async function revealInvitation({ fast = false } = {}) {
    if (revealed) return;
    revealed = true;
    clearTimeout(holdTimer);

    // make sure the invitation artwork is ready so the crossfade never shows a blank frame
    await Promise.race([decodeFirstPage(), sleep(2500)]);

    window.scrollTo(0, 0);
    opening.classList.toggle('is-fast', fast || reduceMotion);
    opening.classList.add('is-leaving');                       // 1 · crossfade video → invitation art

    const fadeMs = reduceMotion ? 50 : fast ? 700 : 1100;
    await sleep(reduceMotion ? 50 : fadeMs * 0.7);

    body.classList.remove('is-opening');
    body.classList.add('is-opened');
    $$('[data-reveal]', firstPage).forEach((el) => el.classList.add('in'));   // 2 · staged text reveal (delays set inline)

    await sleep(fadeMs * 0.35);
    // free the video + overlay
    video.pause();
    video.removeAttribute('src');
    $$('source', video).forEach((s) => s.remove());
    video.load();
    opening.remove();
  }

  function scheduleReveal() {
    if (revealed || holdTimer) return;
    holdTimer = setTimeout(() => revealInvitation(), 0);
  }

  function showTapButton(label) {
    if (revealed) return;
    if (label) tapBtn.textContent = label;
    tapBtn.hidden = false;
  }

  function startVideo() {
    // The video's first frame (the poster) is the closed invitation. Wait for the guest to open it.
    video.pause();
    showTapButton('Open Invitation');
  }

  video.addEventListener('playing', () => { tapBtn.hidden = true; });
  video.addEventListener('ended', scheduleReveal);
  video.addEventListener('timeupdate', () => {
    // the last ~1.8s of the clip is a still frame, so start the crossfade early
    if (video.duration && video.currentTime >= video.duration - 1.8) scheduleReveal();
  });
  video.addEventListener('error', () => revealInvitation({ fast: true }));
  const firstSource = $('source', video);
  if (firstSource) firstSource.addEventListener('error', () => revealInvitation({ fast: true }));

  tapBtn.addEventListener('click', () => {
    music.play();                                              // a real user gesture — allowed
    tapBtn.hidden = true;
    if (reduceMotion) { revealInvitation(); return; }
    video.play().catch(() => revealInvitation({ fast: true }));
  });

  skipBtn.addEventListener('click', () => {
    music.play();
    revealInvitation({ fast: true });
  });

  startVideo();

  /* ==========================================================
     SCROLL REVEALS (IntersectionObserver)
     ========================================================== */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

  $$('[data-reveal]').forEach((el) => {
    if (firstPage.contains(el)) return;                        // first page is revealed by the opening sequence
    revealIO.observe(el);
  });

  /* ==========================================================
     VISIBILITY + GENTLE PARALLAX
     ========================================================== */
  const pages = $$('.page');
  const visiblePages = new Set();
  const pageIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      e.target.classList.toggle('is-visible', e.isIntersecting);
      if (e.isIntersecting) visiblePages.add(e.target); else visiblePages.delete(e.target);
    });
    if (!reduceMotion) requestParallax();
  }, { rootMargin: '12% 0px' });
  pages.forEach((p) => pageIO.observe(p));

  let parallaxQueued = false;
  function requestParallax() {
    if (parallaxQueued || reduceMotion) return;
    parallaxQueued = true;
    requestAnimationFrame(() => {
      parallaxQueued = false;
      const vh = window.innerHeight;
      visiblePages.forEach((p) => {
        const r = p.getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
        p.style.setProperty('--py', (progress * -7).toFixed(2) + 'px');   // text drifts a hair against the paper
        p.style.setProperty('--sy', (progress * -26).toFixed(2) + 'px');  // light drifts a little more
      });
    });
  }
  if (!reduceMotion) {
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
  }

  /* ==========================================================
     COUNTDOWN — to 15 Nov 2026, 6:00 PM IST (works in any viewer timezone)
     ========================================================== */
  const els = {
    d: $('#cdDays'), h: $('#cdHours'), m: $('#cdMins'), s: $('#cdSecs'),
    timer: $('#timer'), done: $('#timerDone'), summary: $('#cdSummary'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  const last = { d: '', h: '', m: '', s: '' };
  let tickTimer = null;

  function setText(key, value) {
    if (last[key] !== value) { last[key] = value; els[key].textContent = value; }
  }

  function tick() {
    const diff = Math.max(0, WEDDING_TIME - Date.now());       // never negative
    if (diff === 0) {
      els.timer.hidden = true;
      els.done.hidden = false;
      els.done.removeAttribute('hidden');
      els.done.classList.add('in');
      els.summary.textContent = 'Our beautiful journey has begun.';
      return;                                                   // stop scheduling — timer is finished
    }
    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    setText('d', pad(days));
    setText('h', pad(hours));
    setText('m', pad(mins));
    setText('s', pad(secs));
    if (secs === 0 || !els.summary.textContent) {
      els.summary.textContent = `${days} days, ${hours} hours and ${mins} minutes until the wedding.`;
    }
    // re-align to the next whole second so the display never drifts
    tickTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  tick();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(tickTimer); }
    else { clearTimeout(tickTimer); tick(); }
  });
  window.addEventListener('pagehide', (e) => {                  // tidy up observers + timers
    if (e.persisted) return;                                     // page is going into the back/forward cache
    clearTimeout(tickTimer);
    [revealIO, pageIO].forEach((o) => o.disconnect());
  });
})();
