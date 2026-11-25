// Interaktive Extras für die Startseite. Alles ist Zusatz: ohne JavaScript bleibt die Seite vollständig.
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');
  if (!reduceMotion) root.classList.add('motion');

  // Fortschrittsleiste und drehender Stern beim Scrollen
  const bar = document.querySelector('.scroll-progress');
  const stamp = document.querySelector('.intro-stamp');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = root.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (stamp && !reduceMotion) stamp.style.transform = `rotate(${12 + window.scrollY * 0.25}deg)`;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Überschrift, die sich selbst neu schreibt
  const rotator = document.querySelector('.rotator[data-words]');
  if (rotator && !reduceMotion) {
    const words = rotator.dataset.words.split('|');
    let word = 0;
    let length = words[0].length;
    let deleting = true;
    const tick = () => {
      if (deleting) {
        length -= 1;
        rotator.textContent = words[word].slice(0, length);
        if (length > 0) return setTimeout(tick, 45);
        deleting = false;
        word = (word + 1) % words.length;
        return setTimeout(tick, 260);
      }
      length += 1;
      rotator.textContent = words[word].slice(0, length);
      if (length < words[word].length) return setTimeout(tick, 85);
      deleting = true;
      return setTimeout(tick, 2600);
    };
    setTimeout(tick, 2600);
  }

  // Lichtschein, der der Maus folgt, und leichtes Kippen der Projektkarten (nur mit Maus)
  if (finePointer && !reduceMotion) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.prepend(glow);
    window.addEventListener('pointermove', (event) => {
      glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      glow.classList.add('is-on');
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('is-on'));
    document.querySelectorAll('.project-card, .about-card').forEach((card) => {
      card.classList.add('spot');
      const tilt = card.matches('a.project-card');
      card.addEventListener('pointermove', (event) => {
        const box = card.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (tilt) {
          card.style.setProperty('--ry', `${((x / box.width - 0.5) * 7).toFixed(2)}deg`);
          card.style.setProperty('--rx', `${((0.5 - y / box.height) * 7).toFixed(2)}deg`);
        }
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Einblenden beim Scrollen, hochzählende Zahlen und Sprachbalken
  const countUp = (element) => {
    const target = Number(element.dataset.count);
    if (reduceMotion || !target) return;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min((now - start) / 900, 1);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    element.textContent = '0';
    requestAnimationFrame(step);
  };
  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('[data-count]').forEach(countUp);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach((item) => {
      if (item.dataset.reveal) item.style.animationDelay = `${item.dataset.reveal}ms`;
      observer.observe(item);
    });

    // Aktiven Bereich in der Navigation markieren
    const links = [...document.querySelectorAll('nav a[href^="#"]')];
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = links.find((a) => a.getAttribute('href') === `#${entry.target.id}`);
        if (link) link.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute('href'));
      if (section) navObserver.observe(section);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // E-Mail-Adresse mit einem Klick kopieren
  const copyButton = document.querySelector('.copy-mail[data-copy]');
  if (copyButton && navigator.clipboard && window.isSecureContext) {
    const status = document.querySelector('.copy-status');
    copyButton.hidden = false;
    let reset;
    copyButton.addEventListener('click', async () => {
      clearTimeout(reset);
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyButton.textContent = 'Kopiert ✓';
        copyButton.classList.add('is-done');
        if (status) status.textContent = 'E-Mail-Adresse kopiert';
      } catch {
        copyButton.textContent = 'Nicht möglich';
      }
      reset = setTimeout(() => {
        copyButton.textContent = 'Kopieren';
        copyButton.classList.remove('is-done');
        if (status) status.textContent = '';
      }, 2000);
    });
  }
})();
