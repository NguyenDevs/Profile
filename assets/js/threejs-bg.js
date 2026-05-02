/**
 * Interstellar Tesseract — 4D Hypercube projected to 3D
 * Rotating in 4D planes (XW, YW, ZW) + mouse drag interaction
 * Aesthetic: deep space, glowing amber/gold edges, starfield
 */

(function () {
  'use strict';

  // ─── Wait for THREE ────────────────────────────────────────────────────────
  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    initScene();
  }

  function initScene() {

    // ── Canvas ────────────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '0', opacity: '0',
      transition: 'opacity 1.8s ease',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // ─────────────────────────────────────────────────────────────────────────
    //  4-D HYPERCUBE (TESSERACT)
    //  16 vertices: all (±1, ±1, ±1, ±1)
    //  32 edges:    pairs differing in exactly ONE coordinate
    // ─────────────────────────────────────────────────────────────────────────
    const verts4D = [];
    for (let i = 0; i < 16; i++) {
      verts4D.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1,
      ]);
    }

    const edges = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) if (verts4D[i][k] !== verts4D[j][k]) diff++;
        if (diff === 1) edges.push([i, j]);
      }
    }

    // ── 4D → 3D perspective projection ───────────────────────────────────────
    function project4Dto3D(v, wDist = 3) {
      const w = 1 / (wDist - v[3]);
      return new THREE.Vector3(v[0] * w, v[1] * w, v[2] * w);
    }

    // ── 4D rotation in a plane (i,j) ─────────────────────────────────────────
    function rotate4D(v, i, j, angle) {
      const out = [...v];
      const c = Math.cos(angle), s = Math.sin(angle);
      out[i] = v[i] * c - v[j] * s;
      out[j] = v[i] * s + v[j] * c;
      return out;
    }

    // ── Line materials — stack for soft glow (additive blending) ─────────────
    function makeLineMat(opacity, color = 0xffaa22) {
      return new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    }

    const glowLayers = [
      { mat: makeLineMat(0.06, 0xffffff), scale: 1.04 },
      { mat: makeLineMat(0.12, 0xffcc55), scale: 1.02 },
      { mat: makeLineMat(0.25, 0xffaa22), scale: 1.01 },
      { mat: makeLineMat(0.75, 0xff8800), scale: 1.00 },
    ];

    // We'll hold line segment sets — rebuilt each frame from projected verts
    const lineSets = glowLayers.map(layer => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(edges.length * 2 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const lineSegs = new THREE.LineSegments(geo, layer.mat);
      lineSegs.scale.setScalar(layer.scale);
      scene.add(lineSegs);
      return { geo, pos, lineSegs };
    });

    // ── Vertex dots ───────────────────────────────────────────────────────────
    const dotGeo = new THREE.BufferGeometry();
    const dotPos = new Float32Array(16 * 3);
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0xffddaa,
      size: 0.055,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(dotGeo, dotMat));

    // ── Starfield ─────────────────────────────────────────────────────────────
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 18 + Math.random() * 30;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.5 + Math.random() * 2.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size',     new THREE.BufferAttribute(starSizes, 1));

    // Round star sprite
    const sprCanvas = document.createElement('canvas');
    sprCanvas.width = sprCanvas.height = 32;
    const ctx = sprCanvas.getContext('2d');
    const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(200,220,255,0.8)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 32, 32);
    const starSprite = new THREE.CanvasTexture(sprCanvas);

    const starMat = new THREE.PointsMaterial({
      map: starSprite, size: 0.15, sizeAttenuation: true,
      transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Nebula — subtle radial fog planes ────────────────────────────────────
    function makeNebula(color, x, y, z, radius, opacity) {
      const nCanvas = document.createElement('canvas');
      nCanvas.width = nCanvas.height = 128;
      const nc = nCanvas.getContext('2d');
      const ng = nc.createRadialGradient(64, 64, 0, 64, 64, 64);
      ng.addColorStop(0,   `rgba(${color},${opacity})`);
      ng.addColorStop(1,   'rgba(0,0,0,0)');
      nc.fillStyle = ng; nc.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(nCanvas);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(radius, radius),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        })
      );
      mesh.position.set(x, y, z);
      mesh.lookAt(camera.position);
      scene.add(mesh);
    }
    makeNebula('80,50,120', -6,  2, -8, 14, 0.12);
    makeNebula('30,60,120',  5, -3, -6, 12, 0.10);
    makeNebula('120,70,20',  0,  4, -10, 10, 0.08);

    // ── Rotation angles ───────────────────────────────────────────────────────
    const angle = { xy: 0, xz: 0, xw: 0, yw: 0, zw: 0 };

    // ── Mouse ─────────────────────────────────────────────────────────────────
    const mouse = {
      x: 0, y: 0, lx: 0, ly: 0,
      dx: 0, dy: 0, down: false
    };

    // Allow mouse interaction on the canvas
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', e => {
      mouse.down = true;
      mouse.lx = e.clientX; mouse.ly = e.clientY;
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      mouse.down = false;
      canvas.style.cursor = 'grab';
    });
    window.addEventListener('mousemove', e => {
      if (mouse.down) {
        mouse.dx += (e.clientX - mouse.lx) * 0.006;
        mouse.dy += (e.clientY - mouse.ly) * 0.006;
        mouse.lx = e.clientX; mouse.ly = e.clientY;
      }
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * -2;
    });

    // Touch
    let lastTouch = null;
    canvas.addEventListener('touchstart', e => {
      lastTouch = e.touches[0];
    });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      mouse.dx += (t.clientX - lastTouch.clientX) * 0.006;
      mouse.dy += (t.clientY - lastTouch.clientY) * 0.006;
      lastTouch = t;
    }, { passive: false });

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation loop ────────────────────────────────────────────────────────
    let t = 0;
    const autoSpeed = { xw: 0.0045, yw: 0.0030, zw: 0.0020, xy: 0.0010, xz: 0.0008 };

    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      // Auto rotation in 4D planes
      angle.xw += autoSpeed.xw;
      angle.yw += autoSpeed.yw;
      angle.zw += autoSpeed.zw;
      angle.xy += autoSpeed.xy;
      angle.xz += autoSpeed.xz;

      // Drag adds to 3D camera orbit
      mouse.dx *= 0.92;
      mouse.dy *= 0.92;

      camera.position.x = Math.sin(mouse.dx) * 5;
      camera.position.y = Math.sin(mouse.dy) * 5 + mouse.y * 0.3;
      camera.position.z = Math.cos(mouse.dx) * 5;
      camera.lookAt(0, 0, 0);

      // Project 4D → 3D
      const proj = verts4D.map(v => {
        let r = rotate4D(v, 0, 3, angle.xw); // XW
        r = rotate4D(r, 1, 3, angle.yw);     // YW
        r = rotate4D(r, 2, 3, angle.zw);     // ZW
        r = rotate4D(r, 0, 1, angle.xy);     // XY
        r = rotate4D(r, 0, 2, angle.xz);     // XZ
        return project4Dto3D(r, 2.8);
      });

      // Update edge geometry for all glow layers
      lineSets.forEach(({ geo, pos }) => {
        for (let e = 0; e < edges.length; e++) {
          const [a, b] = edges[e];
          pos[e * 6]     = proj[a].x; pos[e * 6 + 1] = proj[a].y; pos[e * 6 + 2] = proj[a].z;
          pos[e * 6 + 3] = proj[b].x; pos[e * 6 + 4] = proj[b].y; pos[e * 6 + 5] = proj[b].z;
        }
        geo.attributes.position.needsUpdate = true;
      });

      // Update dot positions
      for (let i = 0; i < 16; i++) {
        dotPos[i * 3]     = proj[i].x;
        dotPos[i * 3 + 1] = proj[i].y;
        dotPos[i * 3 + 2] = proj[i].z;
      }
      dotGeo.attributes.position.needsUpdate = true;

      // Slow star twinkle
      starMat.opacity = 0.55 + 0.15 * Math.sin(t * 0.4);

      renderer.render(scene, camera);
    }

    animate();
  }

  // ── Load Three.js ─────────────────────────────────────────────────────────
  if (typeof THREE !== 'undefined') {
    boot();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
  }
})();
