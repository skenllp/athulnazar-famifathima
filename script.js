/* ==========================================================
   Dr. Fami Fathima & Dr. Athul Nazar — Nikkah Invitation
   Vanilla ES6 · no libraries
   ========================================================== */
(() => {
  'use strict';

  /* ---------- config ---------- */
  const WEDDING_TIME = new Date('2026-11-15T18:00:00+05:30').getTime(); // 6:00 PM IST
  const MUSIC_SRC = 'assets/song.mp3';     // drop a file here to enable the music button; '' disables it

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
  const firstPage = $('#invitation');

  /* ==========================================================
     MUSIC - Background music (starts on user interaction)
     ========================================================== */
  const music = (() => {
    // Try to use the HTML audio element first
    let audio = $('#bgMusic');
    if (!audio) {
      // Fallback: create audio element if not found
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = MUSIC_SRC;
    }
    
    let started = false;
    let isPlaying = false;
    audio.volume = 0.6;

    const musicControl = $('#musicControl');
    
    function updateButton() {
      if (!musicControl) return;
      musicControl.classList.toggle('is-playing', isPlaying);
      musicControl.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    }

    function start() {
      if (!audio || started) return;
      started = true;
      
      console.log('Starting wedding music...');
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('✓ Wedding music playing!');
          audio.volume = 0.6;
          isPlaying = true;
          updateButton();
          if (musicControl) musicControl.hidden = false;
        }).catch((error) => {
          console.error('Failed to play music:', error.message);
          isPlaying = false;
          updateButton();
          if (musicControl) musicControl.hidden = false;
        });
      }
    }

    function toggle() {
      if (!audio) return;
      
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
      } else {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            isPlaying = true;
            updateButton();
          }).catch((error) => {
            console.error('Failed to play music:', error.message);
            isPlaying = false;
            updateButton();
          });
        }
      }
      updateButton();
    }

    // Set up music control button
    if (musicControl) {
      musicControl.addEventListener('click', toggle);
    }

    return { start, toggle };
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

  function showTapButton() {
    if (revealed) return;
    tapBtn.hidden = false;
  }

  function startVideo() {
    // The video's first frame (the poster) is the closed invitation. Wait for the guest to open it.
    video.pause();
    showTapButton();
  }

  // drop the poster overlay only once the video has painted a frame past the start (no black/blank blink)
  const poster = $('#openPoster');
  let posterGone = false;
  function hidePoster() {
    if (posterGone || !poster) return;
    posterGone = true;
    poster.classList.add('is-gone');
    setTimeout(() => poster.remove(), 400);
  }
  video.addEventListener('playing', () => {
    tapBtn.hidden = true;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => setTimeout(hidePoster, 60));
    else setTimeout(hidePoster, 250);
  });
  video.addEventListener('ended', scheduleReveal);
  video.addEventListener('timeupdate', () => {
    // the last ~1.8s of the clip is a still frame, so start the crossfade early
    if (video.duration && video.currentTime >= video.duration - 1.8) scheduleReveal();
  });
  video.addEventListener('error', () => revealInvitation({ fast: true }));
  const firstSource = $('source', video);
  if (firstSource) firstSource.addEventListener('error', () => revealInvitation({ fast: true }));

  let autoTimer = null;
  function openNow() {
    if (opened) return;
    opened = true;
    clearTimeout(autoTimer);
    tapBtn.hidden = true;
    
    // Start music when user clicks to open invitation
    if (music && music.start) {
      music.start();
    }
    
    if (reduceMotion) { revealInvitation(); return; }
    video.play().catch(() => revealInvitation({ fast: true }));
  }
  let opened = false;

  tapBtn.addEventListener('click', () => openNow());

  // if the guest doesn't tap the seal, the invitation opens by itself after 6 seconds
  autoTimer = setTimeout(() => openNow(), 6000);

  startVideo();

  /* ==========================================================
     SCROLL DOWN BUTTON
     ========================================================== */
  const scrollDownBtn = $('#scrollDown');
  if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
      const countdown = $('#countdown');
      if (countdown) {
        countdown.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

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
      els.summary.textContent = `${days} days, ${hours} hours and ${mins} minutes until the Nikkah.`;
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
