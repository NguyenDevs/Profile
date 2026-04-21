export function initDynamicBackground() {
  const container = document.querySelector('.gradients-container');
  if (!container) return;

  const checkMobile = () => (window.innerWidth <= 1024) || (navigator.maxTouchPoints > 0);
  const isMobile = checkMobile();

  const orbCount = isMobile ? 8 : 15;
  const orbColors = [
    'rgba(76, 29, 149, 0.3)',
    'rgba(88, 28, 135, 0.35)',
    'rgba(59, 7, 100, 0.4)',
    'rgba(107, 33, 168, 0.25)',
    'rgba(46, 16, 101, 0.3)'
  ];

  for (let i = 0; i < orbCount; i++) {
    const orb = document.createElement('div');
    orb.className = 'bg-orb';

    const size = Math.random() * (isMobile ? 150 : 200) + (isMobile ? 100 : 150);
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.background = orbColors[Math.floor(Math.random() * orbColors.length)];

    orb.style.left = Math.random() * 95 + '%';

    const duration = Math.random() * 15 + 25;
    orb.style.setProperty('--dur', duration + 's');
    orb.style.setProperty('--delay', (Math.random() * -40) + 's');

    container.appendChild(orb);
  }

  if (!isMobile) {
    const interBubble = document.querySelector('.interactive');
    if (interBubble) {
      let curX = 0, curY = 0, tgX = 0, tgY = 0;
      function move() {
        curX += (tgX - curX) / 20;
        curY += (tgY - curY) / 20;
        interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
        requestAnimationFrame(move);
      }
      window.addEventListener('mousemove', (e) => {
        tgX = e.clientX;
        tgY = e.clientY;
      });
      move();
    }
  }
}
