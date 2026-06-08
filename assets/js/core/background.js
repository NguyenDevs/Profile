export function initDynamicBackground() {
  const interBubble = document.querySelector('.interactive');
  if (!interBubble) return;

  let curX = 0;
  let curY = 0;
  let tgX = 0;
  let tgY = 0;

  function move() {
    curX += (tgX - curX) / 20;
    curY += (tgY - curY) / 20;
    interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    requestAnimationFrame(move);
  }

  window.addEventListener('mousemove', (event) => {
    tgX = event.clientX;
    tgY = event.clientY;
  });

  move();
}

/* ── Background Text Strip ── */
const STRIP_PATHS = [
  { rotate: -30, startX: -250, endX: 250, left: '0', bottom: '15%', top: 'auto', right: 'auto' },
  { rotate:  25, startX: -250, endX: 250, left: '0', top: '12%',   bottom: 'auto', right: 'auto' },
  { rotate: -25, startX:  250, endX:-250, right:'0', bottom: '15%', left: 'auto',  top: 'auto' },
  { rotate:  35, startX:  250, endX:-250, left:'50%', top: '10%',   bottom: 'auto', right: 'auto' },
];

function pickPath(exclude) {
  const pool = exclude >= 0
    ? STRIP_PATHS.filter((_, i) => i !== exclude)
    : STRIP_PATHS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function runSingle(el, path, duration) {
  if (el._anim) el._anim.cancel();
  el.style.left = path.left;
  el.style.right = path.right;
  el.style.top = path.top;
  el.style.bottom = path.bottom;
  el.style.transform = `rotate(${path.rotate}deg) translateX(${path.startX}%)`;
  el.style.opacity = '1';
  el.offsetHeight;
  el._anim = el.animate([
    { transform: `rotate(${path.rotate}deg) translateX(${path.startX}%)` },
    { transform: `rotate(${path.rotate}deg) translateX(${path.endX}%)` },
  ], { duration, easing: 'linear', fill: 'forwards' });
}

function runStrip(mainEl) {
  const shadowEl = mainEl.nextElementSibling;
  if (!shadowEl || !shadowEl.classList.contains('bg-text-strip-shadow')) return;

  const mainPath = pickPath(-1);
  const shadowPath = pickPath(STRIP_PATHS.indexOf(mainPath));
  const mainSweep = 6000 + Math.random() * 9000;
  const shadowSweep = mainSweep * 1.3;
  const longest = shadowSweep + 500;
  const cooldown = Math.max(8000, 30000 - longest);

  runSingle(mainEl, mainPath, mainSweep);
  setTimeout(() => runSingle(shadowEl, shadowPath, shadowSweep), 500);
  setTimeout(() => runStrip(mainEl), longest + cooldown);
}

export function initBgTextStrip() {
  if (window.innerWidth <= 768) return;
  const mainEl = document.querySelector('.bg-text-strip-inner');
  if (!mainEl) return;
  setTimeout(() => runStrip(mainEl), Math.random() * 10000);
}
