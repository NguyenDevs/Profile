/**
 * Interstellar Tesseract — Advanced 4D Hypercube Scene
 * Features: triple tesseract system, particle trails, hyperspace grid,
 * energy pulses, shooting stars, nebula, 4D rotation, mouse drag
 */
(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    init();
  }

  function init() {
    // ── Canvas ────────────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '0', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5.5);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function rotate4D(v, i, j, a) {
      const r = [...v], c = Math.cos(a), s = Math.sin(a);
      r[i] = v[i] * c - v[j] * s;
      r[j] = v[i] * s + v[j] * c;
      return r;
    }
    function project(v, w = 2.8) {
      const f = 1 / (w - v[3]);
      return new THREE.Vector3(v[0] * f, v[1] * f, v[2] * f);
    }
    function spriteTexture(r = 32, inner = 'rgba(255,255,255,1)', outer = 'rgba(0,0,0,0)') {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, inner); g.addColorStop(1, outer);
      ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }
    function lineMat(color, opacity) {
      return new THREE.LineBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
    }

    // ── 4D Tesseract definition ───────────────────────────────────────────────
    const V4 = [];
    for (let i = 0; i < 16; i++)
      V4.push([(i&1)?1:-1, (i&2)?1:-1, (i&4)?1:-1, (i&8)?1:-1]);
    const EDGES = [];
    for (let i = 0; i < 16; i++)
      for (let j = i+1; j < 16; j++) {
        let d = 0; for (let k = 0; k < 4; k++) if (V4[i][k] !== V4[j][k]) d++;
        if (d === 1) EDGES.push([i, j]);
      }

    // ── Build one tesseract object ────────────────────────────────────────────
    function makeTesseract(scale, glowColor, coreColor, glowOpacity) {
      const group = new THREE.Group();
      const layers = [
        { op: glowOpacity * 0.08, col: 0xffffff, sc: 1.05 },
        { op: glowOpacity * 0.18, col: glowColor, sc: 1.03 },
        { op: glowOpacity * 0.40, col: glowColor, sc: 1.01 },
        { op: glowOpacity,        col: coreColor, sc: 1.00 },
      ];
      const lineSets = layers.map(l => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(EDGES.length * 6);
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const ls = new THREE.LineSegments(geo, lineMat(l.col, l.op));
        ls.scale.setScalar(l.sc * scale);
        group.add(ls);
        return { geo, pos };
      });
      const dotGeo = new THREE.BufferGeometry();
      const dotPos = new Float32Array(48);
      dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
      const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
        color: glowColor, size: 0.04 * scale, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        map: spriteTexture(16),
      }));
      group.add(dots);
      scene.add(group);
      return { group, lineSets, dotPos, dotGeo };
    }

    const T1 = makeTesseract(1.0,  0xff8800, 0xffaa22, 0.85); // main — gold
    const T2 = makeTesseract(0.45, 0xff2266, 0xff4488, 0.70); // inner — crimson
    const T3 = makeTesseract(0.28, 0x4488ff, 0x66aaff, 0.60); // ghost — blue

    // ── Update tesseract geometry ─────────────────────────────────────────────
    function updateTesseract({ lineSets, dotPos, dotGeo }, angles, wDist) {
      const proj = V4.map(v => {
        let r = rotate4D(v, 0, 3, angles.xw);
        r = rotate4D(r, 1, 3, angles.yw);
        r = rotate4D(r, 2, 3, angles.zw);
        r = rotate4D(r, 0, 1, angles.xy);
        r = rotate4D(r, 0, 2, angles.xz);
        return project(r, wDist);
      });
      lineSets.forEach(({ geo, pos }) => {
        EDGES.forEach(([a, b], i) => {
          pos[i*6]   = proj[a].x; pos[i*6+1] = proj[a].y; pos[i*6+2] = proj[a].z;
          pos[i*6+3] = proj[b].x; pos[i*6+4] = proj[b].y; pos[i*6+5] = proj[b].z;
        });
        geo.attributes.position.needsUpdate = true;
      });
      for (let i = 0; i < 16; i++) {
        dotPos[i*3] = proj[i].x; dotPos[i*3+1] = proj[i].y; dotPos[i*3+2] = proj[i].z;
      }
      dotGeo.attributes.position.needsUpdate = true;
      return proj;
    }

    // ── Particle Trails ───────────────────────────────────────────────────────
    const TRAIL_LEN = 28;
    const trailCount = 16;
    const trailHistory = Array.from({ length: trailCount }, () =>
      Array.from({ length: TRAIL_LEN }, () => new THREE.Vector3())
    );
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(trailCount * TRAIL_LEN * 3);
    const trailOpacities = new Float32Array(trailCount * TRAIL_LEN);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xffcc44, size: 0.025, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      map: spriteTexture(8, 'rgba(255,200,80,1)'),
    });
    scene.add(new THREE.Points(trailGeo, trailMat));

    // ── Starfield ─────────────────────────────────────────────────────────────
    const N_STARS = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(N_STARS * 3);
    const starSz  = new Float32Array(N_STARS);
    for (let i = 0; i < N_STARS; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2*Math.random()-1);
      const r  = 22 + Math.random() * 35;
      starPos[i*3]   = r*Math.sin(ph)*Math.cos(th);
      starPos[i*3+1] = r*Math.sin(ph)*Math.sin(th);
      starPos[i*3+2] = r*Math.cos(ph);
      starSz[i] = 0.4 + Math.random() * 3;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size',     new THREE.BufferAttribute(starSz, 1));
    const starMat = new THREE.PointsMaterial({
      size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
      map: spriteTexture(16, 'rgba(200,215,255,1)'),
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Shooting Stars ────────────────────────────────────────────────────────
    const shooters = Array.from({ length: 6 }, () => ({
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      life: 0, maxLife: 0, active: false,
    }));
    function spawnShooter(s) {
      const angle = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 8;
      s.pos.set(Math.cos(angle)*r, (Math.random()-0.5)*10, Math.sin(angle)*r);
      const speed = 0.12 + Math.random() * 0.15;
      s.vel.set(-s.pos.x, (Math.random()-0.5)*2, -s.pos.z).normalize().multiplyScalar(speed);
      s.maxLife = 40 + Math.random() * 60;
      s.life = 0; s.active = true;
    }
    const shooterGeo = new THREE.BufferGeometry();
    const shooterPos = new Float32Array(6 * 3);
    shooterGeo.setAttribute('position', new THREE.BufferAttribute(shooterPos, 3));
    const shooterMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.18, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      map: spriteTexture(16),
    });
    scene.add(new THREE.Points(shooterGeo, shooterMat));

    // ── Hyperspace radial lines ───────────────────────────────────────────────
    const hyper_n = 64;
    const hyperGeo = new THREE.BufferGeometry();
    const hyperPos = new Float32Array(hyper_n * 6);
    hyperGeo.setAttribute('position', new THREE.BufferAttribute(hyperPos, 3));
    const hyperMat = new THREE.LineSegments(hyperGeo, lineMat(0x220033, 0.18));
    scene.add(hyperMat);
    for (let i = 0; i < hyper_n; i++) {
      const a = (i / hyper_n) * Math.PI * 2;
      const x = Math.cos(a), y = Math.sin(a);
      hyperPos[i*6]   = x*0.01; hyperPos[i*6+1] = y*0.01; hyperPos[i*6+2] = 0;
      hyperPos[i*6+3] = x*28;   hyperPos[i*6+4] = y*28;   hyperPos[i*6+5] = (Math.random()-0.5)*4;
    }
    hyperGeo.attributes.position.needsUpdate = true;

    // ── Energy Pulse Rings ────────────────────────────────────────────────────
    const pulses = Array.from({ length: 4 }, (_, i) => {
      const geo = new THREE.RingGeometry(0.01, 0.02, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: [0xff8800, 0xff2266, 0x4488ff, 0xaa44ff][i],
        transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;
      scene.add(mesh);
      return { mesh, mat, phase: i * 1.5, r: 0 };
    });

    // ── Nebula planes ─────────────────────────────────────────────────────────
    [
      { col: '100,30,160', x: -7,  y:  2, z: -10, sz: 18, op: 0.14 },
      { col: '20, 50,140', x:  6,  y: -3, z:  -8, sz: 14, op: 0.12 },
      { col: '140,60,20',  x:  1,  y:  5, z: -12, sz: 12, op: 0.09 },
      { col: '10,100,80',  x: -4,  y: -5, z:  -9, sz: 10, op: 0.07 },
    ].forEach(({ col, x, y, z, sz, op }) => {
      const nc = document.createElement('canvas');
      nc.width = nc.height = 256;
      const nctx = nc.getContext('2d');
      const ng = nctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      ng.addColorStop(0, `rgba(${col},${op})`);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = ng; nctx.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(sz, sz),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(nc),
          transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        })
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 5);
      scene.add(m);
    });

    // ── Central wormhole glow ─────────────────────────────────────────────────
    const wormMat = new THREE.MeshBasicMaterial({
      map: spriteTexture(64, 'rgba(255,120,30,0.35)', 'rgba(0,0,0,0)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const worm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), wormMat);
    scene.add(worm);

    // ── Mouse ─────────────────────────────────────────────────────────────────
    const drag = { x: 0, y: 0, lx: 0, ly: 0, down: false };
    canvas.addEventListener('mousedown', e => {
      drag.down = true; drag.lx = e.clientX; drag.ly = e.clientY;
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => { drag.down = false; canvas.style.cursor = 'grab'; });
    window.addEventListener('mousemove', e => {
      if (!drag.down) return;
      drag.x += (e.clientX - drag.lx) * 0.007; drag.y += (e.clientY - drag.ly) * 0.007;
      drag.lx = e.clientX; drag.ly = e.clientY;
    });
    let lastT = null;
    canvas.addEventListener('touchstart', e => { lastT = e.touches[0]; }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      drag.x += (t.clientX - lastT.clientX) * 0.007;
      drag.y += (t.clientY - lastT.clientY) * 0.007;
      lastT = t;
    }, { passive: false });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation ─────────────────────────────────────────────────────────────
    let t = 0, frame = 0;
    const ang1 = { xw: 0, yw: 0, zw: 0, xy: 0, xz: 0 };
    const ang2 = { xw: 0, yw: 0, zw: 0, xy: 0, xz: 0 };
    const ang3 = { xw: 0, yw: 0, zw: 0, xy: 0, xz: 0 };

    function animate() {
      requestAnimationFrame(animate);
      t += 0.016; frame++;

      // ── Angle updates ──
      ang1.xw += 0.0042; ang1.yw += 0.0028; ang1.zw += 0.0019;
      ang1.xy  += 0.0009; ang1.xz += 0.0007;
      ang2.xw -= 0.0055; ang2.yw += 0.0038; ang2.zw -= 0.0025;
      ang2.xy  += 0.0015; ang2.xz -= 0.0011;
      ang3.xw += 0.0033; ang3.yw -= 0.0047; ang3.zw += 0.0031;
      ang3.xy  -= 0.0013; ang3.xz += 0.0017;

      // ── Camera drag ──
      drag.x *= 0.93; drag.y *= 0.93;
      const camR = 5.5;
      camera.position.x = Math.sin(drag.x) * camR;
      camera.position.z = Math.cos(drag.x) * camR;
      camera.position.y = Math.sin(drag.y) * 3;
      camera.lookAt(0, 0, 0);

      // ── Tesseract updates ──
      const proj1 = updateTesseract(T1, ang1, 2.8);
      updateTesseract(T2, ang2, 2.5);
      updateTesseract(T3, ang3, 3.2);

      // Counter-rotate T2/T3 groups
      T2.group.rotation.y = t * 0.08;
      T3.group.rotation.x = t * 0.05;
      T3.group.rotation.z = t * 0.03;

      // ── Trails: record vertex paths of main tesseract ──
      for (let vi = 0; vi < 16; vi++) {
        const h = trailHistory[vi];
        h.pop();
        h.unshift(proj1[vi].clone());
        for (let ti = 0; ti < TRAIL_LEN; ti++) {
          const idx = (vi * TRAIL_LEN + ti) * 3;
          trailPos[idx]   = h[ti].x;
          trailPos[idx+1] = h[ti].y;
          trailPos[idx+2] = h[ti].z;
        }
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailMat.opacity = 0.4 + 0.15 * Math.sin(t * 1.1);

      // ── Shooting stars ──
      if (frame % 40 === 0) {
        const s = shooters.find(s => !s.active);
        if (s) spawnShooter(s);
      }
      shooters.forEach((s, i) => {
        if (!s.active) { shooterPos[i*3] = 999; shooterPos[i*3+1] = 999; shooterPos[i*3+2] = 999; return; }
        s.pos.add(s.vel);
        s.life++;
        shooterPos[i*3] = s.pos.x; shooterPos[i*3+1] = s.pos.y; shooterPos[i*3+2] = s.pos.z;
        if (s.life >= s.maxLife) s.active = false;
      });
      shooterGeo.attributes.position.needsUpdate = true;
      shooterMat.opacity = 0.6 + 0.4 * Math.sin(t * 2);

      // ── Pulse rings ──
      pulses.forEach(p => {
        p.r = ((t * 0.5 + p.phase) % 3) / 3;
        const s = p.r * 4.0;
        p.mesh.scale.setScalar(s + 0.01);
        p.mat.opacity = Math.max(0, (1 - p.r) * 0.5);
        p.mesh.rotation.x += 0.003;
        p.mesh.rotation.y += 0.005;
      });

      // ── Wormhole glow pulse ──
      worm.scale.setScalar(1 + 0.18 * Math.sin(t * 1.7));
      worm.material.opacity = 0.4 + 0.2 * Math.sin(t * 0.8);
      worm.lookAt(camera.position);

      // ── Starfield twinkle + slow rotation ──
      starMat.opacity = 0.6 + 0.15 * Math.sin(t * 0.3);

      // ── Hyperspace lines subtle pulse ──
      hyperMat.material.opacity = 0.06 + 0.05 * Math.sin(t * 0.6);

      renderer.render(scene, camera);
    }

    animate();
  }

  if (typeof THREE !== 'undefined') { boot(); }
  else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
  }
})();
