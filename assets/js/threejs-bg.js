/**
 * Three.js Particle Wave Background
 * Inspired by unshift.jp — noise-displaced dot grid with mouse interaction
 */

(function () {
  'use strict';

  // ── Simplex / gradient noise (Luma-style, no deps) ────────────────────────
  // A compact 2D / 3D noise implementation so we need zero external deps.
  const noise = (function () {
    const p = new Uint8Array(512);
    const perm = new Uint8Array(512);

    function seed(s) {
      let n = s | 0;
      for (let i = 0; i < 256; i++) {
        n = (n ^ (n << 13)) >>> 0;
        n = (n ^ (n >>> 17)) >>> 0;
        n = (n ^ (n << 5)) >>> 0;
        p[i] = n & 255;
      }
      for (let i = 0; i < 256; i++) {
        const j = Math.floor(Math.random() * (256 - i)) + i;
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(hash, x, y) {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    function perlin2(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X] + Y, b = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
        lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
        v
      );
    }

    seed(42);
    return { perlin2 };
  })();

  // ── Wait for THREE to load ─────────────────────────────────────────────────
  function init() {
    if (typeof THREE === 'undefined') {
      setTimeout(init, 50);
      return;
    }

    // ── Canvas container ─────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 0;
      opacity: 0;
      transition: opacity 1.2s ease;
    `;
    document.body.insertBefore(canvas, document.body.firstChild);

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;

    // ── Particle grid ─────────────────────────────────────────────────────────
    const COLS = 80;
    const ROWS = 50;
    const SPREAD_X = 120;
    const SPREAD_Y = 75;
    const TOTAL = COLS * ROWS;

    const positions = new Float32Array(TOTAL * 3);
    const colors    = new Float32Array(TOTAL * 3);
    const sizes     = new Float32Array(TOTAL);
    const basePos   = new Float32Array(TOTAL * 3); // original grid positions

    // Palette — crimson/violet to cool blue, matching the profile's dark theme
    const palette = [
      new THREE.Color(0xdc143c),   // crimson
      new THREE.Color(0x9b30ff),   // purple
      new THREE.Color(0x4040ff),   // indigo
      new THREE.Color(0x1a8cff),   // sky blue
    ];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        const x = (col / (COLS - 1) - 0.5) * SPREAD_X;
        const y = (row / (ROWS - 1) - 0.5) * SPREAD_Y;
        basePos[i * 3]     = x;
        basePos[i * 3 + 1] = y;
        basePos[i * 3 + 2] = 0;

        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;

        // Color interpolation along diagonal
        const t = ((col / COLS) + (row / ROWS)) * 0.5;
        const ci = Math.min(Math.floor(t * (palette.length - 1)), palette.length - 2);
        const cf = t * (palette.length - 1) - ci;
        const c  = palette[ci].clone().lerp(palette[ci + 1], cf);
        colors[i * 3]     = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = 1.4 + Math.random() * 1.2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    // Soft round sprite texture
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const ctx = spriteCanvas.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const material = new THREE.PointsMaterial({
      size: 1.8,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Mouse tracking ────────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('mousemove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * -2;
    });

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Fade in ────────────────────────────────────────────────────────────────
    requestAnimationFrame(() => {
      canvas.style.opacity = '1';
    });

    // ── Animation loop ────────────────────────────────────────────────────────
    let t = 0;
    const posAttr = geometry.attributes.position;

    function animate() {
      requestAnimationFrame(animate);
      t += 0.0035;

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const i = row * COLS + col;
          const bx = basePos[i * 3];
          const by = basePos[i * 3 + 1];

          // Noise layers
          const nx  = col / COLS * 2.5 + t;
          const ny  = row / ROWS * 2.5 + t * 0.7;
          const n1  = noise.perlin2(nx, ny);
          const n2  = noise.perlin2(nx * 2.1 + 10, ny * 2.1 + 10) * 0.5;
          const n   = (n1 + n2) / 1.5;

          // Mouse influence — pulls nearby dots
          const dx = mouse.x * 30 - bx;
          const dy = mouse.y * 20 - by;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / 35) * 6;

          posAttr.array[i * 3]     = bx + n * 4.5 + (dx / (dist + 1)) * influence;
          posAttr.array[i * 3 + 1] = by + n * 4.5 + (dy / (dist + 1)) * influence;
          posAttr.array[i * 3 + 2] = n * 3;
        }
      }

      posAttr.needsUpdate = true;

      // Gentle camera drift following mouse
      camera.position.x += (mouse.x * 4 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 2 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    animate();
  }

  // ── Load Three.js from CDN then boot ──────────────────────────────────────
  if (typeof THREE !== 'undefined') {
    init();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = init;
    document.head.appendChild(script);
  }
})();
