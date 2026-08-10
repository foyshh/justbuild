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

  // Hero — full-screen, scroll-jacked showcase (landing + four projects).
  // Because the section sits flush at the very top of the page and is
  // exactly one viewport tall, intercepting every wheel/key/touch event
  // while it fills the screen keeps window.scrollY pinned at 0 for the
  // whole sequence — no tall spacer or position:fixed juggling needed.
  // Once the visitor pushes past the first or last slide, one event is
  // allowed through un-prevented and normal page scroll takes over.
  const heroJack = document.getElementById('heroJack');
  if (heroJack) {
    const slides = Array.from(heroJack.querySelectorAll('.hero-jack-slide'));
    const hint = heroJack.querySelector('.flip-hint');
    const idxCurrent = heroJack.querySelector('.flip-index-current');
    const idxTotal = heroJack.querySelector('.flip-index-total');
    const dotsWrap = heroJack.querySelector('.hero-jack-dots');
    if (idxTotal) idxTotal.textContent = String(slides.length).padStart(2, '0');

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      if (i === 0) b.classList.add('is-active');
      dotsWrap.appendChild(b);
      return b;
    });

    const mq = window.matchMedia('(min-width: 701px)');
    let index = 0;
    let animating = false;
    const LOCK_MS = 950;

    const render = (newIndex) => {
      newIndex = Math.max(0, Math.min(slides.length - 1, newIndex));
      if (newIndex === index || animating) return;
      animating = true;
      slides.forEach((s, i) => {
        s.classList.remove('is-active', 'is-prev');
        if (i === newIndex) s.classList.add('is-active');
        else if (i === index) s.classList.add('is-prev');
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === newIndex));
      if (idxCurrent) idxCurrent.textContent = String(newIndex + 1).padStart(2, '0');
      if (hint) hint.classList.toggle('is-gone', newIndex > 0);
      index = newIndex;
      setTimeout(() => { animating = false; }, LOCK_MS);
    };

    const isFilling = () => {
      if (!mq.matches) return false;
      const r = heroJack.getBoundingClientRect();
      return Math.abs(r.top) < 1 && r.height >= window.innerHeight - 1;
    };

    window.addEventListener('wheel', (e) => {
      if (!isFilling()) return;
      if (animating) { e.preventDefault(); return; }
      const goingDown = e.deltaY > 0;
      if (goingDown && index < slides.length - 1) { e.preventDefault(); render(index + 1); }
      else if (!goingDown && index > 0) { e.preventDefault(); render(index - 1); }
      // else: at a boundary — let the browser scroll normally into/out of the hero
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!isFilling() || animating) return;
      if ((e.key === 'ArrowDown' || e.key === 'PageDown') && index < slides.length - 1) { e.preventDefault(); render(index + 1); }
      else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && index > 0) { e.preventDefault(); render(index - 1); }
    });

    let touchStartY = null;
    heroJack.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    heroJack.addEventListener('touchmove', (e) => {
      if (!isFilling() || touchStartY === null || animating) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (Math.abs(dy) < 40) return;
      if (dy > 0 && index < slides.length - 1) { e.preventDefault(); render(index + 1); touchStartY = e.touches[0].clientY; }
      else if (dy < 0 && index > 0) { e.preventDefault(); render(index - 1); touchStartY = e.touches[0].clientY; }
    }, { passive: false });

    dots.forEach((d, i) => d.addEventListener('click', () => render(i)));
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

  // Methodology: four-step image progression (About page). One fixed,
  // contained frame; the photo crossfades to the next as each step
  // scrolls to the center of the viewport — a continuous function of
  // scroll position, so scrolling back up reverses it exactly.
  const methodFrame = document.querySelector('.method-frame');
  const methodList = document.querySelector('.method-list');
  if (methodFrame && methodList) {
    const imgs = Array.from(methodFrame.querySelectorAll('.mf-img'));
    const railArrows = document.querySelectorAll('.rail-arrow');
    const numStages = imgs.length;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const updateMethod = () => {
      const rect = methodList.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the list's top reaches viewport-center, 1 when its bottom does —
      // scaled across every stage so each step gets an equal scroll range.
      const raw = ((vh / 2) - rect.top) / Math.max(1, rect.height);
      const progress = clamp(raw, 0, 1) * numStages;
      const activeStage = clamp(Math.ceil(progress) || 1, 1, numStages);

      imgs.forEach((img) => {
        img.classList.toggle('is-active', parseInt(img.dataset.stage, 10) === activeStage);
      });
      railArrows.forEach((el) => {
        const a = parseInt(el.dataset.arrow, 10);
        el.classList.toggle('revealed', progress >= a);
      });
    };

    updateMethod();
    let methodTicking = false;
    window.addEventListener('scroll', () => {
      if (methodTicking) return;
      methodTicking = true;
      requestAnimationFrame(() => { updateMethod(); methodTicking = false; });
    }, { passive: true });
    window.addEventListener('resize', updateMethod);
  }

  // Animated stat counters (About page) — count up quickly from 0 the
  // moment the panel enters view, then hold at the final value.
  document.querySelectorAll('.stat-num[data-count-to]').forEach((el) => {
    const target = parseInt(el.dataset.countTo, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 900;
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        counterObserver.unobserve(el);
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3); // fast out-of-the-gate, settles at the end
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counterObserver.observe(el);
  });
});
