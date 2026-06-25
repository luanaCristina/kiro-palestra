/**
 * Slide Navigation System (Simple & Reliable)
 * 
 * Navigation: ← → arrows, click areas, buttons
 * Fullscreen: Use browser's native F11 (persists across pages)
 *             Or press F to toggle via Fullscreen API
 * 
 * Include in each slide:
 *   <link rel="stylesheet" href="nav.css">
 *   <script src="nav.js"></script>
 */

(function() {
  const TOTAL_SLIDES = 18;

  function getCurrentSlide() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    if (filename === 'index.html' || filename === '' || filename === 'index') return 1;
    const match = filename.match(/page(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  function getSlideUrl(num) {
    if (num === 1) return 'index.html';
    return `page${num}.html`;
  }

  const current = getCurrentSlide();
  const prev = current > 1 ? getSlideUrl(current - 1) : null;
  const next = current < TOTAL_SLIDES ? getSlideUrl(current + 1) : null;

  // Navigation bar (hidden in fullscreen via CSS)
  const nav = document.createElement('nav');
  nav.className = 'slide-nav';
  nav.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      ${current > 1 ? `<button class="nav-home" onclick="location.href='index.html'">🏠 Início</button>` : ''}
      ${prev ? `<button class="nav-prev" onclick="location.href='${prev}'">← Voltar</button>` : `<span class="nav-prev nav-disabled">← Voltar</span>`}
    </div>
    <span class="nav-counter">${current} / ${TOTAL_SLIDES}</span>
    <div style="display:flex; align-items:center; gap:8px;">
      ${next ? `<button class="nav-next" onclick="location.href='${next}'">Próximo →</button>` : `<span class="nav-next nav-disabled">Próximo →</span>`}
      <button class="nav-fullscreen" onclick="goFullscreen()" title="Apresentar (F11 recomendado)">⛶ Apresentar</button>
    </div>
  `;
  document.body.appendChild(nav);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'slide-footer-overlay';
  footer.innerHTML = `
    <span class="footer-text">© 2026 Thoughtworks &nbsp;|&nbsp; Confidential</span>
    <span class="footer-page">${String(current).padStart(2, '0')}</span>
  `;
  document.body.appendChild(footer);

  // Fullscreen function
  window.goFullscreen = function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        alert('Use F11 para tela cheia (navegação entre slides mantém F11 ativo)');
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Keyboard navigation (works in fullscreen and normal mode)
  document.addEventListener('keydown', function(e) {
    // Don't intercept F11 (let browser handle it natively)
    if (e.key === 'F11') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      if (next) window.location.href = next;
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (prev) window.location.href = prev;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      window.location.href = 'index.html';
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      window.goFullscreen();
    }
  });

  // Responsive scaling
  function scaleSlide() {
    const container = document.querySelector('.slide-container');
    if (!container) return;

    const slideW = 1920;
    const slideH = 1080;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    const scaleX = windowW / slideW;
    const scaleY = windowH / slideH;
    const scale = Math.min(scaleX, scaleY);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';

    const scaledW = slideW * scale;
    const scaledH = slideH * scale;
    container.style.marginLeft = `${Math.max(0, (windowW - scaledW) / 2)}px`;
    container.style.marginTop = `${Math.max(0, (windowH - scaledH) / 2)}px`;
  }

  scaleSlide();
  window.addEventListener('resize', scaleSlide);

  // Hide/show nav based on fullscreen
  document.addEventListener('fullscreenchange', () => {
    nav.style.display = document.fullscreenElement ? 'none' : 'flex';
    scaleSlide();
  });

  // LinkedIn QR Code (first and last slide)
  if (current === TOTAL_SLIDES || current === 1) {
    const linkedin = document.createElement('div');
    linkedin.className = 'linkedin-overlay';
    linkedin.innerHTML = `
      <img src="img/linkedin-qr.svg" alt="QR Code LinkedIn">
      <a href="https://www.linkedin.com/in/luanacristinaas/" target="_blank">LinkedIn</a>
    `;
    document.body.appendChild(linkedin);
  }

  // Auto-hide nav
  let hideTimeout;
  function showNav() {
    if (document.fullscreenElement) return;
    nav.style.opacity = '1';
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => { nav.style.opacity = '0.4'; }, 3000);
  }
  document.addEventListener('mousemove', showNav);
  showNav();
})();
