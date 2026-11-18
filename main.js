/**
 * NOCTIS — Scrollytelling Core Engine
 * Vanilla JavaScript implementation:
 * - Canvas frame scrubbing via requestAnimationFrame and lerp
 * - Custom "headlight" cursor with lerp & morph
 * - Film grain noise generator (~8fps)
 * - Navigation hide/show on scroll
 * - Lineup hover accordion with 80ms debounce & keyboard nav
 * - Statement word-by-word scroll reveal
 * - Dismantle part callout anchors
 * - Reduced motion fallbacks
 */

(function () {
  'use strict';

  // State Management
  const state = {
    isMobile: window.innerWidth < 768,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    lastScrollY: window.scrollY,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    cursor: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    cursorActive: false,
    cursorMorph: false,
    cursorLabel: 'VIEW',
    
    // Hero Engine
    hero: {
      wrapper: null,
      canvas: null,
      ctx: null,
      progressLine: null,
      images: [],
      loaded: [],
      currentFrame: 0,
      targetFrame: 0,
      lastDrawnFrame: -1,
      progress: 0,
    },

    // Dismantle Engine
    dismantle: {
      wrapper: null,
      canvas: null,
      ctx: null,
      progressLine: null,
      images: [],
      loaded: [],
      currentFrame: 0,
      targetFrame: 0,
      lastDrawnFrame: -1,
      progress: 0,
    },

    // Lineup
    lineup: {
      container: null,
      activeIndex: 0,
      hoverTimeout: null,
    }
  };

  // Helper: Clamp
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  // Helper: Format frame path
  function getFramePath(template, index) {
    const padIndex = String(index).padStart(4, '0');
    return template.replace('{index}', padIndex);
  }

  /* ==========================================================================
     1. INITIALIZATION & PRELOADER
     ========================================================================== */
  function init() {
    setupDOMReferences();
    setupFilmGrain();
    setupCursor();
    setupNav();
    setupStatementWords();
    setupDismantleCallouts();
    setupLineupAccordion();
    setupSectionHeights();

    // Start loading hero initial batch for preloader
    startPreloader();

    // Resize listener
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Start main rAF render loop
    requestAnimationFrame(renderLoop);
  }

  function setupDOMReferences() {
    state.hero.wrapper = document.getElementById('heroSection');
    state.hero.canvas = document.getElementById('heroCanvas');
    state.hero.ctx = state.hero.canvas.getContext('2d', { alpha: false });
    state.hero.progressLine = document.getElementById('heroProgressLine');

    state.dismantle.wrapper = document.getElementById('dismantle');
    state.dismantle.canvas = document.getElementById('dismantleCanvas');
    state.dismantle.ctx = state.dismantle.canvas.getContext('2d', { alpha: false });
    state.dismantle.progressLine = document.getElementById('dismantleProgressLine');

    state.lineup.container = document.getElementById('lineupContainer');

    // Set initial canvas resolution
    resizeCanvas(state.hero.canvas);
    resizeCanvas(state.dismantle.canvas);
  }

  function setupSectionHeights() {
    if (state.prefersReducedMotion) return;
    if (state.hero.wrapper && CONFIG.heights.hero) {
      state.hero.wrapper.style.height = CONFIG.heights.hero;
    }
    if (state.dismantle.wrapper && CONFIG.heights.dismantle) {
      state.dismantle.wrapper.style.height = CONFIG.heights.dismantle;
    }
  }

  function resizeCanvas(canvas) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round((rect.width || window.innerWidth) * dpr);
    const h = Math.round((rect.height || window.innerHeight) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function handleResize() {
    state.isMobile = window.innerWidth < 768;
    resizeCanvas(state.hero.canvas);
    resizeCanvas(state.dismantle.canvas);
    resizeFilmGrain();
    // Force redraw on next rAF
    state.hero.lastDrawnFrame = -1;
    state.dismantle.lastDrawnFrame = -1;
  }

  /* ==========================================================================
     2. PRELOADER & IMAGE ASSET LOADING
     ========================================================================== */
  function startPreloader() {
    const preloader = document.getElementById('preloader');
    const preloaderLine = document.getElementById('preloaderLine');
    const preloaderCounter = document.getElementById('preloaderCounter');

    const heroCfg = CONFIG.frames.hero;
    const initialBatchCount = heroCfg.preloadInitial || 40;
    const pathTemplate = state.isMobile ? heroCfg.mobilePath : heroCfg.desktopPath;

    let loadedCount = 0;
    const heroTotal = heroCfg.count;

    // Allocate frame arrays
    state.hero.images = new Array(heroTotal);
    state.hero.loaded = new Array(heroTotal).fill(false);

    state.dismantle.images = new Array(CONFIG.frames.dismantle.count);
    state.dismantle.loaded = new Array(CONFIG.frames.dismantle.count).fill(false);

    // Load initial 1-40 frames
    for (let i = 1; i <= initialBatchCount; i++) {
      const img = new Image();
      const frameIdx = i - 1;
      state.hero.images[frameIdx] = img;
      img.src = getFramePath(pathTemplate, i);

      const onLoad = () => {
        state.hero.loaded[frameIdx] = true;
        loadedCount++;
        const pct = Math.min(100, Math.round((loadedCount / initialBatchCount) * 100));
        if (preloaderLine) preloaderLine.style.width = `${pct}%`;
        if (preloaderCounter) preloaderCounter.textContent = String(pct).padStart(3, '0');

        if (loadedCount >= initialBatchCount) {
          // Preloader exit sequence
          onPreloaderComplete();
        }
      };

      if (img.decode) {
        img.decode().then(onLoad).catch(onLoad);
      } else {
        img.onload = onLoad;
        img.onerror = onLoad;
      }
    }

    function onPreloaderComplete() {
      if (preloaderLine) preloaderLine.classList.add('flash');
      setTimeout(() => {
        if (preloader) preloader.classList.add('fade-out');
        // Initial draw of first frame
        drawFrame(state.hero, 0);
        // Continue background loading
        loadRemainingAssets();
      }, 140);
    }
  }

  function loadRemainingAssets() {
    // 1. Rest of Hero frames (41 to 750)
    const heroCfg = CONFIG.frames.hero;
    const heroPath = state.isMobile ? heroCfg.mobilePath : heroCfg.desktopPath;
    const startHero = (heroCfg.preloadInitial || 40) + 1;

    let idx = startHero;
    function loadNextHero() {
      if (idx > heroCfg.count) {
        loadDismantleAssets();
        return;
      }
      const frameIdx = idx - 1;
      const img = new Image();
      state.hero.images[frameIdx] = img;
      img.src = getFramePath(heroPath, idx);
      
      const onDone = () => {
        state.hero.loaded[frameIdx] = true;
        idx++;
        // Use requestIdleCallback or microtask to avoid starving main thread
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadNextHero);
        } else {
          setTimeout(loadNextHero, 4);
        }
      };

      if (img.decode) {
        img.decode().then(onDone).catch(onDone);
      } else {
        img.onload = onDone;
        img.onerror = onDone;
      }
    }
    loadNextHero();

    // 2. Dismantle frames
    function loadDismantleAssets() {
      const disCfg = CONFIG.frames.dismantle;
      const disPath = state.isMobile ? disCfg.mobilePath : disCfg.desktopPath;
      let dIdx = 1;

      function loadNextDismantle() {
        if (dIdx > disCfg.count) return;
        const frameIdx = dIdx - 1;
        const img = new Image();
        state.dismantle.images[frameIdx] = img;
        img.src = getFramePath(disPath, dIdx);

        const onDone = () => {
          state.dismantle.loaded[frameIdx] = true;
          dIdx++;
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadNextDismantle);
          } else {
            setTimeout(loadNextDismantle, 4);
          }
        };

        if (img.decode) {
          img.decode().then(onDone).catch(onDone);
        } else {
          img.onload = onDone;
          img.onerror = onDone;
        }
      }
      loadNextDismantle();
    }
  }

  /* ==========================================================================
     3. FILM GRAIN NOISE TILE (~8 FPS)
     ========================================================================== */
  let grainCanvas, grainCtx, offscreenGrain, offscreenCtx;
  const GRAIN_SIZE = 128;

  function setupFilmGrain() {
    grainCanvas = document.getElementById('filmGrain');
    if (!grainCanvas) return;
    grainCtx = grainCanvas.getContext('2d');

    // Create offscreen noise pattern
    offscreenGrain = document.createElement('canvas');
    offscreenGrain.width = GRAIN_SIZE;
    offscreenGrain.height = GRAIN_SIZE;
    offscreenCtx = offscreenGrain.getContext('2d');

    const imgData = offscreenCtx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i] = v;     // R
      data[i + 1] = v; // G
      data[i + 2] = v; // B
      data[i + 3] = 40; // Alpha
    }
    offscreenCtx.putImageData(imgData, 0, 0);

    resizeFilmGrain();

    // Shift noise about 8 times per second (125ms interval)
    setInterval(renderFilmGrain, 125);
  }

  function resizeFilmGrain() {
    if (!grainCanvas) return;
    grainCanvas.width = window.innerWidth;
    grainCanvas.height = window.innerHeight;
    renderFilmGrain();
  }

  function renderFilmGrain() {
    if (!grainCtx || !offscreenGrain) return;
    grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
    const pattern = grainCtx.createPattern(offscreenGrain, 'repeat');
    if (pattern) {
      const ox = (Math.random() * GRAIN_SIZE) | 0;
      const oy = (Math.random() * GRAIN_SIZE) | 0;
      grainCtx.save();
      grainCtx.translate(ox, oy);
      grainCtx.fillStyle = pattern;
      grainCtx.fillRect(-ox, -oy, grainCanvas.width + GRAIN_SIZE, grainCanvas.height + GRAIN_SIZE);
      grainCtx.restore();
    }
  }

  /* ==========================================================================
     4. CUSTOM CURSOR ("The Headlight", Desktop Only)
     ========================================================================== */
  function setupCursor() {
    const cursor = document.getElementById('cursorHeadlight');
    const label = document.getElementById('cursorLabel');
    if (!cursor) return;

    if (state.prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) {
      cursor.style.display = 'none';
      return;
    }

    document.addEventListener('mousemove', (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
      if (!state.cursorActive) {
        state.cursorActive = true;
        cursor.classList.add('active');
      }
    }, { passive: true });

    document.addEventListener('mousedown', () => {
      cursor.classList.add('down');
      setTimeout(() => cursor.classList.remove('down'), 120);
    });

    // Delegate hover states
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, [data-cursor], .lineup-slide');
      if (target) {
        state.cursorMorph = true;
        cursor.classList.add('morph');
        
        let customLabel = target.getAttribute('data-cursor');
        if (!customLabel) {
          if (target.classList.contains('lineup-slide')) {
            customLabel = target.classList.contains('active') ? 'CONFIGURE' : 'OPEN';
          } else if (target.tagName === 'A') {
            customLabel = 'VIEW';
          } else if (target.tagName === 'BUTTON') {
            customLabel = 'RESERVE';
          }
        }
        if (label && customLabel) {
          label.textContent = customLabel;
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('a, button, [data-cursor], .lineup-slide');
      if (target) {
        cursor.classList.remove('morph');
      }
    });
  }

  /* ==========================================================================
     5. NAVIGATION BEHAVIOR (Hide on scroll down, show on up)
     ========================================================================== */
  function setupNav() {
    const nav = document.getElementById('siteNav');
    if (!nav) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > state.lastScrollY && currentY > 100) {
            nav.classList.add('hidden');
          } else {
            nav.classList.remove('hidden');
          }
          state.lastScrollY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ==========================================================================
     6. SECTION 2 — STATEMENT WORD-BY-WORD SCROLL REVEAL
     ========================================================================== */
  let statementWords = [];

  function setupStatementWords() {
    const container = document.getElementById('statementText');
    if (!container) return;

    const rawText = container.textContent.trim();
    const words = rawText.split(/\s+/);
    container.innerHTML = '';

    statementWords = words.map((word) => {
      const span = document.createElement('span');
      span.className = 'statement-word';
      span.textContent = word;
      container.appendChild(span);
      return span;
    });
  }

  function updateStatementScroll() {
    const section = document.getElementById('statementSection');
    if (!section || statementWords.length === 0) return;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    
    // Progress as section passes through viewport center
    const progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    // Range inside middle 50%
    const activeProgress = clamp((progress - 0.25) / 0.50, 0, 1);

    const total = statementWords.length;
    statementWords.forEach((span, i) => {
      const threshold = i / total;
      span.style.opacity = activeProgress >= threshold ? '1' : '0.15';
    });
  }

  /* ==========================================================================
     7. SECTION 3 — DISMANTLE CALLOUTS
     ========================================================================== */
  function setupDismantleCallouts() {
    const layer = document.getElementById('dismantleCalloutsLayer');
    if (!layer || !CONFIG.dismantleCallouts) return;

    layer.innerHTML = '';
    CONFIG.dismantleCallouts.forEach((callout) => {
      const anchor = document.createElement('div');
      anchor.className = 'callout-anchor';
      anchor.id = callout.id;
      anchor.style.left = `${callout.x}%`;
      anchor.style.top = `${callout.y}%`;

      // 4px Xenon Dot
      const dot = document.createElement('div');
      dot.className = 'callout-dot';
      anchor.appendChild(dot);

      // SVG Hairline connector
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'callout-svg');
      svg.setAttribute('width', Math.abs(callout.labelOffsetX) + 20);
      svg.setAttribute('height', Math.abs(callout.labelOffsetY) + 20);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'callout-line');
      
      const x1 = 0;
      const y1 = 0;
      const x2 = callout.labelOffsetX;
      const y2 = callout.labelOffsetY;
      const tick = callout.labelOffsetX < 0 ? -20 : 20;
      // Draw straight diagonal hairline with technical caliper horizontal tick
      path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2} L ${x2 + tick} ${y2}`);
      svg.appendChild(path);
      anchor.appendChild(svg);

      // Text Content
      const content = document.createElement('div');
      content.className = 'callout-content';
      content.style.left = `${callout.labelOffsetX}px`;
      content.style.top = `${callout.labelOffsetY}px`;
      if (callout.labelOffsetX < 0) {
        content.style.transform = 'translateX(-100%)';
        content.style.textAlign = 'right';
      }

      content.innerHTML = `
        <span class="callout-code font-hud">${callout.code}</span>
        <span class="callout-title">${callout.title}</span>
      `;
      anchor.appendChild(content);

      layer.appendChild(anchor);
    });
  }

  function updateDismantleCallouts(progress) {
    if (!CONFIG.dismantleCallouts) return;
    CONFIG.dismantleCallouts.forEach((callout) => {
      const el = document.getElementById(callout.id);
      if (el) {
        if (progress >= callout.revealAt) {
          el.classList.add('visible');
        } else {
          el.classList.remove('visible');
        }
      }
    });
  }

  /* ==========================================================================
     8. SECTION 4 — LINEUP ACCORDION (Desktop hover & Mobile tap)
     ========================================================================== */
  function setupLineupAccordion() {
    const container = state.lineup.container;
    if (!container || !CONFIG.lineup) return;

    container.innerHTML = '';
    CONFIG.lineup.forEach((car, index) => {
      const slide = document.createElement('div');
      slide.className = `lineup-slide clickable ${index === 0 ? 'active' : ''}`;
      slide.setAttribute('role', 'button');
      slide.setAttribute('tabindex', '0');
      slide.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
      slide.setAttribute('data-index', index);
      slide.setAttribute('data-cursor', index === 0 ? 'CONFIGURE' : 'OPEN');

      slide.innerHTML = `
        <div class="slide-top">
          <span class="slide-number font-hud">${car.num}</span>
          <span class="slide-vertical-name font-hud">${car.name}</span>
          <h3 class="slide-active-title font-display">${car.name}</h3>
        </div>

        <div class="slide-floor-line" aria-hidden="true"></div>

        <div class="slide-image-wrap">
          <img src="${car.image}" alt="${car.alt}" class="slide-image" loading="lazy">
        </div>

        <div class="slide-bottom">
          <p class="slide-tagline">${car.tagline}</p>
          <div class="slide-specs-row font-hud">
            ${car.specs.map(s => `
              <div class="slide-spec-col">
                <span class="font-hud" style="font-size:10px; color:var(--fog);">${s.label}</span>
                <span class="slide-spec-val font-hud">${s.value}</span>
              </div>
            `).join('')}
          </div>
          <div class="slide-controls-row">
            <div class="slide-swatches">
              ${car.swatches.map((color, sIdx) => `
                <button type="button" class="swatch-btn ${sIdx === car.activeSwatch ? 'active' : ''}"
                        style="background-color: ${color};"
                        aria-label="Color swatch ${sIdx + 1}"
                        data-color="${color}"></button>
              `).join('')}
            </div>
            <a href="#reserve" class="slide-configure-link font-hud" data-cursor="RESERVE">
              <span>Configure</span>
              <span>→</span>
            </a>
          </div>
        </div>
      `;

      // Swatch click handlers
      const swatches = slide.querySelectorAll('.swatch-btn');
      swatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          swatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });

      // Hover on desktop (debounced 80ms)
      slide.addEventListener('mouseenter', () => {
        if (state.isMobile) return;
        clearTimeout(state.lineup.hoverTimeout);
        state.lineup.hoverTimeout = setTimeout(() => {
          activateSlide(index);
        }, 80);
      });

      slide.addEventListener('mouseleave', () => {
        clearTimeout(state.lineup.hoverTimeout);
      });

      // Click / Tap on mobile or desktop
      slide.addEventListener('click', () => {
        activateSlide(index);
      });

      // Keyboard arrow navigation
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateSlide(index);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (index + 1) % CONFIG.lineup.length;
          activateSlide(next);
          focusSlide(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (index - 1 + CONFIG.lineup.length) % CONFIG.lineup.length;
          activateSlide(prev);
          focusSlide(prev);
        }
      });

      container.appendChild(slide);
    });

    // Reveal slides stagger when lineup section scrolls into view
    const lineupSection = document.getElementById('lineup');
    if (lineupSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            lineupSection.classList.add('revealed');
            observer.unobserve(lineupSection);
          }
        });
      }, { threshold: 0.15 });
      observer.observe(lineupSection);
    }
  }

  function activateSlide(index) {
    if (state.lineup.activeIndex === index && !state.isMobile) return;
    state.lineup.activeIndex = index;

    const slides = state.lineup.container.querySelectorAll('.lineup-slide');
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      slide.setAttribute('data-cursor', isActive ? 'CONFIGURE' : 'OPEN');

      if (isActive) {
        slide.classList.remove('just-activated');
        // trigger animation restart
        void slide.offsetWidth;
        slide.classList.add('just-activated');
      }
    });

    // Update cursor label if mouse is currently over this slide
    const label = document.getElementById('cursorLabel');
    if (label && state.cursorMorph) {
      label.textContent = 'CONFIGURE';
    }
  }

  function focusSlide(index) {
    const slides = state.lineup.container.querySelectorAll('.lineup-slide');
    if (slides[index]) slides[index].focus();
  }

  /* ==========================================================================
     9. SCROLL CALCULATION & rAF MAIN LOOP
     ========================================================================== */
  function handleScroll() {
    updateSectionProgress(state.hero, CONFIG.frames.hero.count);
    updateSectionProgress(state.dismantle, CONFIG.frames.dismantle.count);
    updateStatementScroll();
  }

  function updateSectionProgress(sectionObj, frameCount) {
    const wrapper = sectionObj.wrapper;
    if (!wrapper) return;

    if (state.prefersReducedMotion) {
      sectionObj.progress = 0;
      sectionObj.targetFrame = 0;
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const maxScroll = wrapper.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const progress = clamp(-rect.top / maxScroll, 0, 1);
    sectionObj.progress = progress;
    sectionObj.targetFrame = Math.round(progress * (frameCount - 1));

    if (sectionObj.progressLine) {
      sectionObj.progressLine.style.width = `${progress * 100}%`;
    }
  }

  function renderLoop() {
    // 1. Smooth Custom Cursor Follow (lerp 0.18)
    if (state.cursorActive) {
      state.cursor.x += (state.mouse.x - state.cursor.x) * 0.18;
      state.cursor.y += (state.mouse.y - state.cursor.y) * 0.18;
      const cursor = document.getElementById('cursorHeadlight');
      if (cursor) {
        cursor.style.transform = `translate3d(${state.cursor.x}px, ${state.cursor.y}px, 0) translate(-50%, -50%)`;
      }
    }

    // 2. Hero Frame Scrubbing (lerp 0.15)
    if (!state.prefersReducedMotion) {
      const hero = state.hero;
      hero.currentFrame += (hero.targetFrame - hero.currentFrame) * 0.15;
      const roundedHero = Math.round(hero.currentFrame);
      if (roundedHero !== hero.lastDrawnFrame) {
        drawFrame(hero, roundedHero);
        hero.lastDrawnFrame = roundedHero;
      }
      updateHeroHUDAndChapters(hero.progress);

      // 3. Dismantle Frame Scrubbing (lerp 0.15)
      const dismantle = state.dismantle;
      dismantle.currentFrame += (dismantle.targetFrame - dismantle.currentFrame) * 0.15;
      const roundedDis = Math.round(dismantle.currentFrame);
      if (roundedDis !== dismantle.lastDrawnFrame) {
        drawFrame(dismantle, roundedDis);
        dismantle.lastDrawnFrame = roundedDis;
      }
      updateDismantleCallouts(dismantle.progress);
    }

    requestAnimationFrame(renderLoop);
  }

  /* ==========================================================================
     10. CANVAS DRAWING (Cover-fit landscape, Contain-fit portrait, Fade to black)
     ========================================================================== */
  function drawFrame(sectionObj, frameIndex) {
    const canvas = sectionObj.canvas;
    const ctx = sectionObj.ctx;
    if (!canvas || !ctx) return;

    // Find nearest loaded frame if target frame isn't loaded yet
    let img = sectionObj.images[frameIndex];
    if (!img || !sectionObj.loaded[frameIndex]) {
      img = findNearestLoadedImage(sectionObj, frameIndex);
    }
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    // Clear canvas to asphalt (#07080A)
    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, cw, ch);

    // Scaling rules:
    // Landscape screens: cover-fit
    // Portrait screens: contain-fit, vertically centered on --asphalt
    const isLandscape = cw >= ch;
    let scale;
    if (isLandscape) {
      scale = Math.max(cw / iw, ch / ih);
    } else {
      scale = Math.min(cw / iw, ch / ih);
    }

    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;
    const drawY = (ch - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Hero special effect: Over last 5% of scroll (0.95 -> 1.00), fade to solid black
    if (sectionObj === state.hero && CONFIG.heroBlackoutRange) {
      const [start, end] = CONFIG.heroBlackoutRange;
      if (sectionObj.progress >= start) {
        const blackoutAlpha = clamp((sectionObj.progress - start) / (end - start), 0, 1);
        ctx.fillStyle = '#07080A';
        ctx.globalAlpha = blackoutAlpha;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 1.0;
      }
    }
  }

  function findNearestLoadedImage(sectionObj, targetIdx) {
    const total = sectionObj.images.length;
    for (let offset = 1; offset < total; offset++) {
      const up = targetIdx + offset;
      if (up < total && sectionObj.loaded[up] && sectionObj.images[up]) {
        return sectionObj.images[up];
      }
      const down = targetIdx - offset;
      if (down >= 0 && sectionObj.loaded[down] && sectionObj.images[down]) {
        return sectionObj.images[down];
      }
    }
    return null;
  }

  /* ==========================================================================
     11. HERO HUD & CHAPTER TEXT UPDATES
     ========================================================================== */
  function updateHeroHUDAndChapters(progress) {
    // 1. HUD Telemetry
    const hudChapter = document.getElementById('hudChapter');
    const hudSpeed = document.getElementById('hudSpeed');
    const hudDistance = document.getElementById('hudDistance');

    const speed = Math.round(progress * CONFIG.hud.maxSpeed);
    const distance = (progress * CONFIG.hud.maxDistance).toFixed(1);

    if (hudSpeed) hudSpeed.textContent = `${String(speed).padStart(3, '0')} ${CONFIG.hud.speedUnit}`;
    if (hudDistance) hudDistance.textContent = `${distance} ${CONFIG.hud.distUnit}`;

    // 2. Chapters Activation
    const chapters = CONFIG.heroChapters;
    let activeChapterNum = 1;

    chapters.forEach((ch, idx) => {
      const el = document.getElementById(`heroChapter${idx + 1}`);
      const isActive = progress >= ch.range[0] && progress <= ch.range[1];
      if (el) {
        if (isActive) {
          el.classList.add('active');
          activeChapterNum = idx + 1;
          const masks = el.querySelectorAll('.reveal-mask');
          masks.forEach((m, mIdx) => {
            setTimeout(() => m.classList.add('revealed'), mIdx * 80);
          });
        } else {
          el.classList.remove('active');
          const masks = el.querySelectorAll('.reveal-mask');
          masks.forEach(m => m.classList.remove('revealed'));
        }
      }
    });

    if (hudChapter) {
      hudChapter.textContent = `0${activeChapterNum}/04`;
    }
  }

  // Run initialization on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
