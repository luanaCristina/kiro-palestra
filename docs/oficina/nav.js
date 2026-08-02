/**
 * Slide Navigation — Simple & Clean
 * 
 * For FULLSCREEN presentation: use presenter.html (iframe-based, never breaks)
 * For normal browsing: this script adds ← → navigation between individual HTML files
 */
(function() {
  const TOTAL_SLIDES = 15;

  function getCurrentSlide() {
    const filename = window.location.pathname.split('/').pop() || 'page1.html';
    if (filename === 'page1.html' || filename === '' || filename === 'page1') return 1;
    const match = filename.match(/page(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  function getSlideUrl(num) {
    return `page${num}.html`;
  }

  const current = getCurrentSlide();
  const prev = current > 1 ? getSlideUrl(current - 1) : null;
  const next = current < TOTAL_SLIDES ? getSlideUrl(current + 1) : null;

  // Don't inject nav if inside an iframe (presenter.html handles it)
  if (window.self !== window.top) return;

  // Navigation bar
  const nav = document.createElement('nav');
  nav.className = 'slide-nav';
  nav.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      ${current > 1 ? `<button class="nav-home" onclick="location.href='presenter.html'">🏠</button>` : `<button class="nav-home" onclick="location.href='../index.html'">🏠</button>`}
      ${prev ? `<button class="nav-prev" onclick="location.href='${prev}'">←</button>` : ''}
    </div>
    <span class="nav-counter">${current} / ${TOTAL_SLIDES}</span>
    <div style="display:flex;align-items:center;gap:8px;">
      ${next ? `<button class="nav-next" onclick="location.href='${next}'">→</button>` : ''}
      <a href="presenter.html" class="nav-fullscreen" title="Abrir modo apresentação (fullscreen)">⛶ Apresentar</a>
    </div>
  `;
  document.body.appendChild(nav);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'slide-footer-overlay';
  footer.innerHTML = `
    <span class="footer-text">© 2026 Thoughtworks | Confidential</span>
    <span class="footer-page">${String(current).padStart(2, '0')}</span>
  `;
  document.body.appendChild(footer);

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
      window.location.href = 'page1.html';
    }
  });

  // Responsive scaling
  function scaleSlide() {
    const container = document.querySelector('.slide-container');
    if (!container) return;
    const w = window.innerWidth, h = window.innerHeight;
    const scale = Math.min(w / 1920, h / 1080);
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';
    container.style.marginLeft = `${Math.max(0, (w - 1920 * scale) / 2)}px`;
    container.style.marginTop = `${Math.max(0, (h - 1080 * scale) / 2)}px`;
  }
  scaleSlide();
  window.addEventListener('resize', scaleSlide);

  // Auto-hide nav
  let t;
  document.addEventListener('mousemove', () => {
    nav.style.opacity = '1';
    clearTimeout(t);
    t = setTimeout(() => { nav.style.opacity = '0.3'; }, 3000);
  });
})();
