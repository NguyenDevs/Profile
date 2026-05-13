export function initNavigation() {
  const nav = document.getElementById('bottom-nav');
  const toggle = document.getElementById('nav-toggle');
  if (!nav || !toggle) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.toggle('expanded');
  });

  document.addEventListener('click', () => {
    nav.classList.remove('expanded');
  });

  const navItems = nav.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      nav.classList.remove('expanded');
    });
  });

  nav.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

export function initProjectSlider() {
  const grid = document.querySelector('.projects-grid');
  const prevBtn = document.getElementById('project-prev');
  const nextBtn = document.getElementById('project-next');
  const dotsContainer = document.getElementById('project-dots');

  if (!grid || !prevBtn || !nextBtn || !dotsContainer || window.innerWidth > 768) return;

  const cards = Array.from(grid.children);
  const dots = Array.from(dotsContainer.children);
  let currentIndex = 0;

  function updateSlider(index) {
    if (index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;

    currentIndex = index;

    grid.scrollTo({
      left: currentIndex * window.innerWidth,
      behavior: 'smooth'
    });

    dots.forEach((dot, i) => {
      if (i === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
    prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
    nextBtn.style.opacity = currentIndex === cards.length - 1 ? '0.3' : '1';
    nextBtn.style.pointerEvents = currentIndex === cards.length - 1 ? 'none' : 'auto';
  }

  prevBtn.addEventListener('click', () => {
    updateSlider(currentIndex - 1);
  });

  nextBtn.addEventListener('click', () => {
    updateSlider(currentIndex + 1);
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      updateSlider(i);
    });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth <= 768) {
        grid.scrollTo({ left: currentIndex * window.innerWidth });
      }
    }, 250);
  });

  updateSlider(0);
}

export function updateNavActiveState() {
  const path = window.location.pathname;
  let filename = path.split('/').pop() || 'index.html';
  if (filename === '') filename = 'index.html';

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    const href = item.getAttribute('href');
    if (href === filename || (filename === 'index.html' && (href === './' || href === 'index.html'))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
