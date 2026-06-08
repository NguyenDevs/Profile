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

function runStrip(el) {
  const path = STRIP_PATHS[Math.floor(Math.random() * STRIP_PATHS.length)];
  const sweep = 6000 + Math.random() * 9000;
  const cooldown = Math.max(15000, 30000 - sweep);

  el.style.left = path.left;
  el.style.right = path.right;
  el.style.top = path.top;
  el.style.bottom = path.bottom;
  el.style.transform = `rotate(${path.rotate}deg) translateX(${path.startX}%)`;
  el.style.opacity = '1';

  el.offsetHeight;

  const anim = el.animate([
    { transform: `rotate(${path.rotate}deg) translateX(${path.startX}%)` },
    { transform: `rotate(${path.rotate}deg) translateX(${path.endX}%)` },
  ], { duration: sweep, easing: 'linear', fill: 'forwards' });

  anim.onfinish = () => setTimeout(() => runStrip(el), cooldown);
}

export function initBgTextStrip() {
  if (window.innerWidth <= 768) return;
  const el = document.querySelector('.bg-text-strip-inner');
  if (!el) return;
  setTimeout(() => runStrip(el), Math.random() * 10000);
}
