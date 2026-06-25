/**
 * Slide Navigation System
 * Adds prev/next/home buttons and keyboard navigation to presentation slides.
 * 
 * Usage: Include this script at the bottom of each slide HTML:
 *   <link rel="stylesheet" href="nav.css">
 *   <script src="nav.js"></script>
 */

(function() {
  const TOTAL_SLIDES = 18;

  // Determine current slide number from filename
  function getCurrentSlide() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    if (filename === 'index.html' || filename === '' || filename === 'apresentation') return 1;
    const match = filename.match(/page(\d+)\.html?/);
    return match ? parseInt(match[1], 10) : 1;
  }

  // Get URL for a slide number
  function getSlideUrl(num) {
    if (num === 1) return 'index.html';
    return `page${num}.html`;
  }

  const current = getCurrentSlide();
  const prev = current > 1 ? getSlideUrl(current - 1) : null;
  const next = current < TOTAL_SLIDES ? getSlideUrl(current + 1) : null;

  // Create navigation bar
  const nav = document.createElement('nav');
  nav.className = 'slide-nav';
  nav.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      ${current > 1 ? `<button class="nav-home" title="Ir para o início (Home)" onclick="event.preventDefault(); navigateSlide('index.html')">🏠 Início</button>` : ''}
      ${prev ? `<button class="nav-prev" title="Slide anterior (←)" onclick="event.preventDefault(); navigateSlide('${prev}')">← Voltar</button>` : `<span class="nav-prev nav-disabled">← Voltar</span>`}
    </div>
    <span class="nav-counter">${current} / ${TOTAL_SLIDES}</span>
    <div style="display:flex; align-items:center; gap:8px;">
      ${next ? `<button class="nav-next" title="Próximo slide (→)" onclick="event.preventDefault(); navigateSlide('${next}')">Próximo →</button>` : `<span class="nav-next nav-disabled">Próximo →</span>`}
      <button class="nav-fullscreen" title="Tela cheia (F)" onclick="toggleFullscreen()">⛶</button>
    </div>
    <span class="nav-hint">← → navegar | F fullscreen | Esc sair</span>
  `;

  // Expose navigateSlide globally for button onclick
  window.navigateSlide = function(url) { navigateTo(url); };

  document.body.appendChild(nav);

  // Slide footer (© 2026 Thoughtworks | Confidential + page number)
  const footer = document.createElement('div');
  footer.className = 'slide-footer-overlay';
  footer.innerHTML = `
    <span class="footer-text">© 2026 Thoughtworks &nbsp;|&nbsp; Confidential</span>
    <span class="footer-page">${String(current).padStart(2, '0')}</span>
  `;
  document.body.appendChild(footer);

  // Fullscreen navigation overlay (invisible clickable areas on left/right edges)
  const fsNav = document.createElement('div');
  fsNav.className = 'fullscreen-nav-overlay';
  fsNav.innerHTML = `
    <div class="fs-nav-left" title="← Slide anterior">${prev ? '' : ''}</div>
    <div class="fs-nav-right" title="→ Próximo slide">${next ? '' : ''}</div>
  `;
  document.body.appendChild(fsNav);

  // ─── Fullscreen Persistence ──────────────────────────────────────────
  // Browsers block requestFullscreen() without user gesture on new page loads.
  // Solution: show a transparent overlay that captures the first click/keypress
  // and uses that gesture to re-enter fullscreen seamlessly.
  const FS_KEY = 'slide-fullscreen';

  function navigateTo(url) {
    if (document.fullscreenElement || localStorage.getItem(FS_KEY) === 'true') {
      localStorage.setItem(FS_KEY, 'true');
    }
    window.location.href = url;
  }

  // Restore fullscreen: show overlay that captures first interaction
  function restoreFullscreen() {
    if (localStorage.getItem(FS_KEY) !== 'true') return;

    // Hide normal nav bar immediately (we're in presentation mode)
    nav.style.display = 'none';

    // Create a transparent overlay that captures the first user gesture
    const overlay = document.createElement('div');
    overlay.id = 'fs-restore-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 99999; cursor: pointer;
      background: rgba(0,0,0,0.95);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 16px;
    `;
    overlay.innerHTML = `
      <div style="color: white; font-family: Inter, sans-serif; font-size: 18px; opacity: 0.8;">
        Clique ou pressione qualquer tecla para continuar
      </div>
      <div style="color: rgba(255,255,255,0.5); font-family: Inter, sans-serif; font-size: 14px;">
        Slide ${current} / ${TOTAL_SLIDES}
      </div>
    `;

    function enterFS() {
      document.documentElement.requestFullscreen().then(() => {
        overlay.remove();
        setTimeout(scaleSlide, 100);
      }).catch(() => {
        overlay.remove();
        localStorage.removeItem(FS_KEY);
        nav.style.display = 'flex';
        scaleSlide();
      });
    }

    overlay.addEventListener('click', enterFS);
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        localStorage.removeItem(FS_KEY);
        overlay.remove();
        nav.style.display = 'flex';
        scaleSlide();
        document.removeEventListener('keydown', handler);
        return;
      }
      e.preventDefault();
      enterFS();
      document.removeEventListener('keydown', handler);
    });

    document.body.appendChild(overlay);

    // Also try requestFullscreen directly (works in some browsers if page loaded via user navigation)
    setTimeout(() => {
      if (document.getElementById('fs-restore-overlay')) {
        document.documentElement.requestFullscreen().then(() => {
          overlay.remove();
          setTimeout(scaleSlide, 100);
        }).catch(() => {
          // Overlay stays - user needs to click/press key
        });
      }
    }, 200);
  }

  // Click handlers for fullscreen navigation areas
  fsNav.querySelector('.fs-nav-left').addEventListener('click', function() {
    if (prev) navigateTo(prev);
  });
  fsNav.querySelector('.fs-nav-right').addEventListener('click', function() {
    if (next) navigateTo(next);
  });

  // Fullscreen toggle
  window.toggleFullscreen = function() {
    if (!document.fullscreenElement) {
      localStorage.setItem(FS_KEY, 'true');
      document.documentElement.requestFullscreen().then(() => {
        nav.style.display = 'none';
        setTimeout(scaleSlide, 100);
      }).catch(() => {});
    } else {
      localStorage.removeItem(FS_KEY);
      document.exitFullscreen().then(() => {
        nav.style.display = 'flex';
        setTimeout(scaleSlide, 100);
      });
    }
  };

  document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
      nav.style.display = 'none';
      localStorage.setItem(FS_KEY, 'true');
    } else {
      nav.style.display = 'flex';
      localStorage.removeItem(FS_KEY);
    }
    setTimeout(scaleSlide, 150);
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      if (next) navigateTo(next);
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (prev) navigateTo(prev);
    }
    if (e.key === 'Home') {
      e.preventDefault();
      navigateTo('index.html');
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      window.toggleFullscreen();
    }
    if (e.key === 'Escape') {
      localStorage.removeItem(FS_KEY);
    }
  });

  // Responsive scaling
  function scaleSlide() {
    const container = document.querySelector('.slide-container');
    if (!container) return;

    const slideW = 1920;
    const slideH = 1080;
    const windowW = window.innerWidth;
    const isFullscreen = !!document.fullscreenElement;
    const navHeight = isFullscreen ? 0 : 48;
    const windowH = window.innerHeight - navHeight;

    const scaleX = windowW / slideW;
    const scaleY = windowH / slideH;
    const scale = Math.min(scaleX, scaleY);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';

    // Center horizontally and vertically
    const scaledW = slideW * scale;
    const scaledH = slideH * scale;
    const offsetX = Math.max(0, (windowW - scaledW) / 2);
    const offsetY = Math.max(0, (windowH - scaledH) / 2);
    container.style.marginLeft = `${offsetX}px`;
    container.style.marginTop = `${offsetY}px`;
  }

  scaleSlide();
  window.addEventListener('resize', scaleSlide);

  // Restore fullscreen if we were presenting before navigation
  restoreFullscreen();

  // LinkedIn QR Code (shown on last slide only)
  if (current === TOTAL_SLIDES || current === 1) {
    const linkedin = document.createElement('div');
    linkedin.className = 'linkedin-overlay';
    linkedin.innerHTML = `
      <img src="img/linkedin-qr.svg" alt="QR Code LinkedIn Luana Cristina">
      <a href="https://www.linkedin.com/in/luanacristinaas/" target="_blank" rel="noopener">LinkedIn</a>
    `;
    document.body.appendChild(linkedin);
  }

  // Auto-hide nav after 3 seconds of inactivity
  let hideTimeout;
  function showNav() {
    nav.style.opacity = '1';
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => { nav.style.opacity = '0.3'; }, 3000);
  }
  document.addEventListener('mousemove', showNav);
  showNav();
})();
