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
  // Instead of navigating to a new page (which exits fullscreen),
  // we fetch the next slide's content and swap it in-place.
  // This keeps fullscreen active because we never leave the page.
  const FS_KEY = 'slide-fullscreen';
  let isPresenting = false;

  function navigateTo(url) {
    if (document.fullscreenElement || isPresenting) {
      // In presentation mode: load next slide content without page navigation
      fetchAndSwapSlide(url);
    } else {
      // Normal mode: regular navigation
      window.location.href = url;
    }
  }

  // Fetch another slide's HTML and swap the .slide-container content
  async function fetchAndSwapSlide(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse the new page's HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContainer = doc.querySelector('.slide-container');
      const newStyles = doc.querySelectorAll('style');
      
      if (!newContainer) {
        // Fallback: just navigate normally
        window.location.href = url;
        return;
      }

      // Remove old inline styles from head (keep nav.css and chrome.css)
      document.querySelectorAll('head style').forEach(s => s.remove());
      
      // Add new page's styles
      newStyles.forEach(style => {
        document.head.appendChild(style.cloneNode(true));
      });

      // Swap the slide container
      const currentContainer = document.querySelector('.slide-container');
      if (currentContainer) {
        currentContainer.replaceWith(newContainer.cloneNode(true));
      }

      // Update URL without reload (so back button works)
      history.pushState({ slide: url }, '', url);

      // Recalculate current slide number and update nav
      const newCurrent = getSlideFromUrl(url);
      updateNavState(newCurrent);

      // Rescale
      setTimeout(scaleSlide, 50);
    } catch (e) {
      // If fetch fails, fall back to normal navigation
      window.location.href = url;
    }
  }

  function getSlideFromUrl(url) {
    const filename = url.split('/').pop();
    if (filename === 'index.html' || filename === '') return 1;
    const match = filename.match(/page(\d+)\.html?/);
    return match ? parseInt(match[1], 10) : 1;
  }

  function updateNavState(slideNum) {
    const newPrev = slideNum > 1 ? getSlideUrl(slideNum - 1) : null;
    const newNext = slideNum < TOTAL_SLIDES ? getSlideUrl(slideNum + 1) : null;

    // Update counter
    const counter = nav.querySelector('.nav-counter');
    if (counter) counter.textContent = `${slideNum} / ${TOTAL_SLIDES}`;

    // Update footer page number
    const pageNum = footer.querySelector('.footer-page');
    if (pageNum) pageNum.textContent = String(slideNum).padStart(2, '0');

    // Update keyboard handlers
    document.onkeydown = function(e) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (newNext) navigateTo(newNext);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (newPrev) navigateTo(newPrev);
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
        isPresenting = false;
        localStorage.removeItem(FS_KEY);
      }
    };
  }

  // Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.slide) {
      fetchAndSwapSlide(e.state.slide);
    }
  });

  function restoreFullscreen() {
    // Not needed with SPA approach - fullscreen never breaks
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
      isPresenting = true;
      localStorage.setItem(FS_KEY, 'true');
      document.documentElement.requestFullscreen().then(() => {
        nav.style.display = 'none';
        setTimeout(scaleSlide, 100);
      }).catch(() => {});
    } else {
      isPresenting = false;
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
      isPresenting = true;
    } else {
      nav.style.display = 'flex';
      isPresenting = false;
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
