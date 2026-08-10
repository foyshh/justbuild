document.addEventListener('DOMContentLoaded', () => {
  // Nav: tinted background once scrolled, and hidden altogether while the
  // visitor is scrolling down through the page. It reappears the moment
  // they scroll back up, rest the cursor near the top of the window, or
  // are still close to the top of the page — so it never sits fixed over
  // the photography the whole time.
  const nav = document.querySelector('.site-nav');
  const mobileMenuEl = document.querySelector('.mobile-menu');
  let lastY = window.scrollY;
  let mouseNearTop = false;
  const REVEAL_ZONE = 90;   // px from top of viewport that counts as "cursor near top"
  const HIDE_DELTA = 6;     // px of scroll needed before we react, to ignore jitter

  const updateNav = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);

    const menuOpen = mobileMenuEl && mobileMenuEl.classList.contains('open');
    const atTop = y < 60;
    const scrollingUp = y < lastY - HIDE_DELTA;
    const scrollingDown = y > lastY + HIDE_DELTA;

    if (menuOpen || atTop || scrollingUp || mouseNearTop) {
      nav.classList.remove('nav-hidden');
    } else if (scrollingDown) {
      nav.classList.add('nav-hidden');
    }
    lastY = y;
  };
  updateNav();

  let navTicking = false;
  window.addEventListener('scroll', () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => { updateNav(); navTicking = false; });
  }, { passive: true });
  window.addEventListener('mousemove', (e) => {
    const near = e.clientY < REVEAL_ZONE;
    if (near !== mouseNearTop) { mouseNearTop = near; updateNav(); }
  });

  // Mobile menu
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => mobileMenu.classList.add('open'));
    mobileMenu.querySelector('.close').addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
  }

  // Scroll reveal — arm the fade only once JS is confirmed running,
  // so content is never stuck invisible if a script fails to load.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('js-armed');
    observer.observe(el);
  });

  // Image develop — photos desaturate + zoom out until they scroll
  // into view, then settle into color and true scale. Fires once.
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        imgObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.img-block').forEach(el => imgObserver.observe(el));

  // Architectural sketch motif — traces in once per section, then rests.
  const sketchObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        sketchObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.sketch-layer').forEach(el => sketchObserver.observe(el));

  // Headline stagger — wraps text into per-line spans that rise in
  // sequentially. Runs before the reveal observer sees the parent so
  // the split markup exists by the time IntersectionObserver fires.
  document.querySelectorAll('.split-line').forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    // .sl-line is already display:block, so it creates its own line break —
    // joining with an extra <br> would double the gap between lines.
    el.innerHTML = lines.map((line, i) =>
      '<span class="sl-line" style="transition-delay:' + (i * 0.11) + 's"><span>' + line.trim() + '</span></span>'
    ).join('');
  });
  const splitObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        splitObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.split-line').forEach(el => splitObserver.observe(el));

  // Portfolio lightbox
  const triggers = document.querySelectorAll('[data-lightbox-src]');
  const lightbox = document.querySelector('.lightbox');
  if (triggers.length && lightbox) {
    const items = Array.from(triggers).map(t => ({
      src: t.getAttribute('data-lightbox-src'),
      title: t.getAttribute('data-lightbox-title') || '',
      loc: t.getAttribute('data-lightbox-loc') || ''
    }));
    const img = lightbox.querySelector('img');
    const caption = lightbox.querySelector('.lightbox-caption');
    const count = lightbox.querySelector('.lightbox-count');
    let idx = 0;

    const show = (i) => {
      idx = (i + items.length) % items.length;
      img.src = items[idx].src;
      img.alt = items[idx].title;
      caption.textContent = items[idx].title + (items[idx].loc ? '  —  ' + items[idx].loc : '');
      count.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    };

    triggers.forEach((t, i) => {
      t.addEventListener('click', (e) => {
        e.preventDefault();
        show(i);
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    });
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(idx - 1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(idx + 1));
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') { lightbox.classList.remove('open'); document.body.style.overflow = ''; }
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Testimonial slideshow — auto-cycles every 4.5s, no controls.
  document.querySelectorAll('.testimonial-slideshow').forEach((wrap) => {
    const slides = wrap.querySelectorAll('.ts-slide');
    if (slides.length < 2) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, 4500);
  });

  // Curated Collections carousel — rider-controlled scroll.
  // Mouse-drag, trackpad, and touch all move the native scroll position;
  // a slim custom bar mirrors that position since the real scrollbar is hidden.
  const track = document.querySelector('.collection-track');
  const thumb = document.querySelector('.collection-scrollbar-thumb');
  if (track) {
    let isDown = false, startX = 0, startScroll = 0, moved = false;

    const syncThumb = () => {
      if (!thumb) return;
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? track.scrollLeft / max : 0;
      const thumbWidth = Math.max(12, (track.clientWidth / track.scrollWidth) * 100);
      thumb.style.width = thumbWidth + '%';
      thumb.style.left = pct * (100 - thumbWidth) + '%';
    };
    syncThumb();
    track.addEventListener('scroll', syncThumb);
    window.addEventListener('resize', syncThumb);

    track.addEventListener('mousedown', (e) => {
      isDown = true; moved = false;
      startX = e.pageX; startScroll = track.scrollLeft;
      track.classList.add('dragging');
      // Prevent the browser's native image/link drag-ghost from hijacking
      // the gesture partway through — without this, mousemove stops
      // firing once native drag takes over.
      e.preventDefault();
    });
    window.addEventListener('mouseup', () => { isDown = false; track.classList.remove('dragging'); });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    // Suppress the click-through on cards when a drag just happened,
    // so dragging never accidentally opens a portfolio link.
    track.querySelectorAll('a.collection-card').forEach((card) => {
      card.addEventListener('click', (e) => { if (moved) e.preventDefault(); });
    });
  }

  // Selected Works — full-screen, scroll-pinned showcase. The section is
  // given one viewport of height per slide; while it's pinned, each
  // slide's position/opacity is driven directly by how far the visitor
  // has scrolled through that range — a continuous 1:1 link to scroll,
  // not a timed animation, so the motion always feels as calm or as
  // quick as the visitor themselves is scrolling.
  const flipSection = document.querySelector('.flip-portfolio');
  if (flipSection) {
    const slides = Array.from(flipSection.querySelectorAll('.flip-slide'));
    const hint = flipSection.querySelector('.flip-hint');
    const idxCurrent = flipSection.querySelector('.flip-index-current');
    const idxTotal = flipSection.querySelector('.flip-index-total');
    if (idxTotal) idxTotal.textContent = String(slides.length).padStart(2, '0');
    const mq = window.matchMedia('(min-width: 701px)');

    const layoutFlip = () => {
      flipSection.style.height = mq.matches ? (slides.length * 100) + 'vh' : '';
    };

    const updateFlip = () => {
      if (!mq.matches) return;
      const rect = flipSection.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      let progress = total > 0 ? (-rect.top) / total : 0;
      progress = Math.max(0, Math.min(1, progress));
      const raw = progress * (slides.length - 1);
      const active = Math.round(raw);

      slides.forEach((slide, i) => {
        const delta = Math.max(-1, Math.min(1, i - raw));
        slide.style.transform = 'translateY(' + (delta * 100) + '%)';
        slide.style.opacity = String(1 - Math.min(1, Math.abs(delta)) * 0.85);
        slide.style.zIndex = String(Math.round((1 - Math.min(1, Math.abs(delta))) * 10));
      });
      if (idxCurrent) idxCurrent.textContent = String(active + 1).padStart(2, '0');
      if (hint) hint.classList.toggle('is-gone', progress > 0.02);
    };

    layoutFlip();
    updateFlip();
    window.addEventListener('resize', () => { layoutFlip(); updateFlip(); });

    let flipTicking = false;
    window.addEventListener('scroll', () => {
      if (flipTicking) return;
      flipTicking = true;
      requestAnimationFrame(() => { updateFlip(); flipTicking = false; });
    }, { passive: true });
  }

  // Contact form (visual feedback only, no backend)
  const form = document.getElementById('enquiryForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Message Sent';
      btn.style.opacity = '0.7';
      setTimeout(() => { btn.textContent = original; btn.style.opacity = '1'; form.reset(); }, 2400);
    });
  }

  // Methodology: scroll-staged house build (About page).
  // As each numbered step crosses the vertical center of the viewport,
  // the sticky illustration reveals every piece up to that stage, and
  // the rail arrows between steps light up to mark progress made.
  const methodVisual = document.querySelector('.method-visual');
  if (methodVisual) {
    const steps = document.querySelectorAll('.method-step');
    const stageEls = methodVisual.querySelectorAll('[data-stage]');
    const railArrows = document.querySelectorAll('.rail-arrow');
    const opticGroup = methodVisual.querySelector('.optic-group');

    const setStage = (stage) => {
      stageEls.forEach((el) => {
        const s = parseInt(el.dataset.stage, 10);
        el.classList.toggle('revealed', s <= stage);
      });
      railArrows.forEach((el) => {
        const a = parseInt(el.dataset.arrow, 10);
        el.classList.toggle('revealed', a <= (stage - 1));
      });
      // Discovery + Curation: binoculars in place. Realization: dissolving.
      // Unveiling: gone — the finished room stands with nothing between
      // the visitor and it.
      if (opticGroup) {
        opticGroup.classList.toggle('optic-fade', stage >= 3);
        opticGroup.classList.toggle('optic-hide', stage >= 4);
      }
    };

    setStage(1); // sensible default before any step has crossed center

    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setStage(parseInt(entry.target.dataset.stage, 10));
        }
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });

    steps.forEach((el) => stepObserver.observe(el));
  }
});
