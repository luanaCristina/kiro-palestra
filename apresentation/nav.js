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
      ${current > 1 ? `<a href="index.html" class="nav-home" title="Ir para o início (Home)">🏠 Início</a>` : ''}
      ${prev ? `<a href="${prev}" class="nav-prev" title="Slide anterior (←)">← Voltar</a>` : `<span class="nav-prev nav-disabled">← Voltar</span>`}
    </div>
    <span class="nav-counter">${current} / ${TOTAL_SLIDES}</span>
    <div style="display:flex; align-items:center; gap:8px;">
      ${next ? `<a href="${next}" class="nav-next" title="Próximo slide (→)">Próximo →</a>` : `<span class="nav-next nav-disabled">Próximo →</span>`}
    </div>
    <span class="nav-hint">← → para navegar | Home para início</span>
  `;

  document.body.appendChild(nav);

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
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
  });

  // Responsive scaling
  function scaleSlide() {
    const container = document.querySelector('.slide-container');
    if (!container) return;

    const slideW = 1920;
    const slideH = 1080;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight - 48; // 48px for nav bar

    const scaleX = windowW / slideW;
    const scaleY = windowH / slideH;
    const scale = Math.min(scaleX, scaleY);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';

    // Center horizontally
    const scaledW = slideW * scale;
    const offsetX = Math.max(0, (windowW - scaledW) / 2);
    container.style.marginLeft = `${offsetX}px`;
  }

  scaleSlide();
  window.addEventListener('resize', scaleSlide);

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
