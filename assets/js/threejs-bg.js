/**
 * Purple Cosmos — Torus Knot + Orbital System
 * 360° arcball rotation | Purple palette | Scroll to zoom
 */
(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    init();
  }

  function init() {
    // ── Canvas ─────────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 1.8s ease', cursor: 'grab',
      background: 'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // fully transparent — gradient-bg shows through
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 7);

    // ── Main group (rotated by arcball) ─────────────────────────────────────
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function glow(r = 32, color = 'rgba(160,60,255,1)') {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }

    // ── Lighting ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x220033, 0.8));

    const lights = [
      { color: 0xaa00ff, intensity: 3.5, dist: 12, r: 4, speed: 0.8, phase: 0 },
      { color: 0xff00cc, intensity: 2.5, dist: 10, r: 3.5, speed: 0.6, phase: Math.PI },
      { color: 0x6600ff, intensity: 2.0, dist: 8,  r: 5, speed: 1.0, phase: Math.PI / 2 },
    ].map(cfg => {
      const light = new THREE.PointLight(cfg.color, cfg.intensity, cfg.dist);
      scene.add(light); // lights in world space, not pivot group
      return { light, ...cfg };
    });

    // ── Central Torus Knot ───────────────────────────────────────────────────
    const knotGeo = new THREE.TorusKnotGeometry(1.2, 0.32, 200, 20, 3, 7);

    // Solid
    const knotMat = new THREE.MeshPhongMaterial({
      color: 0x3a006f,
      emissive: 0x6600aa,
      emissiveIntensity: 0.6,
      shininess: 120,
      transparent: true,
      opacity: 0.82,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    pivotGroup.add(knot);

    // Wireframe overlay (glow)
    const knotWire = new THREE.Mesh(knotGeo, new THREE.MeshBasicMaterial({
      color: 0xcc44ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    knotWire.scale.setScalar(1.01);
    pivotGroup.add(knotWire);

    // Outer glow shell
    const shellGeo = new THREE.TorusKnotGeometry(1.22, 0.36, 120, 16, 3, 7);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xbb33ff,
      transparent: true, opacity: 0.06,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    pivotGroup.add(new THREE.Mesh(shellGeo, shellMat));

    // ── Satellite Spheres ────────────────────────────────────────────────────
    const satellites = [
      { r: 0.22, orbitR: 2.4, speed: 0.9,  color: 0xcc00ff, emissive: 0x8800cc, phase: 0,           tiltX: 0.4, tiltZ: 0 },
      { r: 0.16, orbitR: 2.9, speed: 0.65, color: 0xff44cc, emissive: 0xcc0088, phase: Math.PI*0.66, tiltX: -0.7,tiltZ: 0.3 },
      { r: 0.13, orbitR: 3.4, speed: 1.2,  color: 0x8844ff, emissive: 0x4400bb, phase: Math.PI*1.33, tiltX: 0.2, tiltZ: -0.5 },
      { r: 0.10, orbitR: 3.8, speed: 0.45, color: 0xee88ff, emissive: 0xaa44dd, phase: Math.PI*0.4,  tiltX: 1.0, tiltZ: 0.6 },
    ].map(cfg => {
      const geo = new THREE.SphereGeometry(cfg.r, 24, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: cfg.color, emissive: cfg.emissive,
        emissiveIntensity: 0.8, shininess: 200,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Glow sprite for each satellite
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow(24, `rgba(${[(cfg.color>>16)&255,(cfg.color>>8)&255,cfg.color&255].join(',')},1)`),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        opacity: 0.6,
      }));
      sprite.scale.setScalar(cfg.r * 4);
      mesh.add(sprite);

      // Trail ring for orbit path
      const ringGeo = new THREE.TorusGeometry(cfg.orbitR, 0.005, 8, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.08,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = cfg.tiltX;
      ring.rotation.z = cfg.tiltZ;
      pivotGroup.add(ring);
      pivotGroup.add(mesh);

      return { mesh, ring, ...cfg };
    });

    // ── Particle Swarm ───────────────────────────────────────────────────────
    const N_PARTICLES = 1400;
    const pGeo = new THREE.BufferGeometry();
    const pPos   = new Float32Array(N_PARTICLES * 3);
    const pVel   = new Float32Array(N_PARTICLES * 3);
    const pPhase = new Float32Array(N_PARTICLES);

    for (let i = 0; i < N_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 1.8 + Math.random() * 3.0;
      pPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i*3+2] = r * Math.cos(phi);
      pVel[i*3]   = (Math.random() - 0.5) * 0.002;
      pVel[i*3+1] = (Math.random() - 0.5) * 0.002;
      pVel[i*3+2] = (Math.random() - 0.5) * 0.002;
      pPhase[i]   = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      map: glow(12, 'rgba(180,80,255,1)'),
      size: 0.045, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    pivotGroup.add(particles);

    // ── Central Glow Sprite ──────────────────────────────────────────────────
    const centerSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow(128, 'rgba(130,0,255,0.5)'),
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.5,
    }));
    centerSprite.scale.setScalar(5);
    pivotGroup.add(centerSprite);

    // Energy ring bursts
    const rings = [0, 1, 2].map(i => {
      const geo = new THREE.RingGeometry(0.01, 0.03, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: [0xcc00ff, 0xff44dd, 0x8833ff][i],
        transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = [0, Math.PI/3, Math.PI*2/3][i];
      mesh.rotation.z = [0, Math.PI/4, Math.PI*5/6][i];
      pivotGroup.add(mesh);
      return { mesh, mat, phase: i * 2.1 };
    });

    // ── Arcball 360° Controls ────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion(); // accumulated rotation
    const drag = { active: false, px: 0, py: 0 };
    let zoom = 7.0;
    let autoRotate = true;

    function applyDrag(dx, dy) {
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
      const axis = new THREE.Vector3(dy, dx, 0).normalize();
      const angle = Math.sqrt(dx * dx + dy * dy) * 0.006;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      rotQ.premultiply(q);
      autoRotate = false;
    }

    canvas.addEventListener('mousedown', e => {
      drag.active = true; drag.px = e.clientX; drag.py = e.clientY;
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      drag.active = false;
      canvas.style.cursor = 'grab';
      setTimeout(() => autoRotate = true, 2000);
    });
    window.addEventListener('mousemove', e => {
      if (!drag.active) return;
      applyDrag(e.clientX - drag.px, e.clientY - drag.py);
      drag.px = e.clientX; drag.py = e.clientY;
    });

    // Touch
    let lastTouches = null;
    canvas.addEventListener('touchstart', e => {
      lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      drag.active = true; autoRotate = false;
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      if (cur.length === 1 && lastTouches.length === 1) {
        applyDrag(cur[0].x - lastTouches[0].x, cur[0].y - lastTouches[0].y);
      } else if (cur.length === 2 && lastTouches.length === 2) {
        const d0 = Math.hypot(lastTouches[1].x-lastTouches[0].x, lastTouches[1].y-lastTouches[0].y);
        const d1 = Math.hypot(cur[1].x-cur[0].x, cur[1].y-cur[0].y);
        zoom = Math.max(3, Math.min(14, zoom * (d0 / d1)));
      }
      lastTouches = cur;
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
      drag.active = false;
      setTimeout(() => autoRotate = true, 2000);
    });

    // Scroll to zoom
    window.addEventListener('wheel', e => {
      zoom = Math.max(3, Math.min(14, zoom + e.deltaY * 0.006));
    }, { passive: true });

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation ────────────────────────────────────────────────────────────
    let t = 0;
    const autoQ = new THREE.Quaternion();
    const _q    = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      // Smooth zoom
      camera.position.z += (zoom - camera.position.z) * 0.08;

      // Auto-rotate drift
      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0.2, 1, 0.1).normalize(), 0.003);
        rotQ.premultiply(_q);
      }
      pivotGroup.quaternion.copy(rotQ);

      // Knot self-spin (inside pivot)
      knot.rotation.z    = t * 0.12;
      knotWire.rotation.z = t * 0.12;

      // Satellite orbits
      satellites.forEach(s => {
        const a = t * s.speed + s.phase;
        const cx = Math.cos(s.tiltX), sx = Math.sin(s.tiltX);
        const cz = Math.cos(s.tiltZ), sz = Math.sin(s.tiltZ);
        const x0 = s.orbitR * Math.cos(a);
        const y0 = s.orbitR * Math.sin(a);
        s.mesh.position.set(
          x0 * cz - y0 * sz * cx,
          y0 * cx + x0 * sx * sz,
          y0 * sx - x0 * sx * cx * 0.3
        );
        s.mesh.rotation.y = t * 2;
      });

      // Orbiting lights
      lights.forEach(l => {
        const a = t * l.speed + l.phase;
        l.light.position.set(
          l.r * Math.cos(a),
          l.r * Math.sin(a * 0.7),
          l.r * Math.sin(a)
        );
      });

      // Particles: gentle drift + orbit
      for (let i = 0; i < N_PARTICLES; i++) {
        const px = pPos[i*3], py = pPos[i*3+1], pz = pPos[i*3+2];
        const r = Math.sqrt(px*px + py*py + pz*pz);
        // Tangential push (orbit effect)
        const tx = -py / r * 0.003;
        const ty =  px / r * 0.003;
        pPos[i*3]   += pVel[i*3]   + tx;
        pPos[i*3+1] += pVel[i*3+1] + ty;
        pPos[i*3+2] += pVel[i*3+2];
        // Soft boundary
        const nr = Math.sqrt(pPos[i*3]**2 + pPos[i*3+1]**2 + pPos[i*3+2]**2);
        if (nr > 4.8 || nr < 1.4) {
          pPos[i*3]   *= 0.985;
          pPos[i*3+1] *= 0.985;
          pPos[i*3+2] *= 0.985;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = 0.55 + 0.15 * Math.sin(t * 0.7);

      // Energy rings pulse
      rings.forEach(ring => {
        const progress = ((t * 0.5 + ring.phase) % (Math.PI * 2)) / (Math.PI * 2);
        const s = progress * 5.5;
        ring.mesh.scale.setScalar(s + 0.01);
        ring.mat.opacity = Math.max(0, (1 - progress) * 0.55);
      });

      // Center glow breathe
      centerSprite.scale.setScalar(4.5 + 0.8 * Math.sin(t * 1.3));
      centerSprite.material.opacity = 0.3 + 0.15 * Math.sin(t * 0.9);

      // Knot color cycle (purple → magenta → violet)
      const hue = (t * 0.04) % 1;
      knotMat.emissive.setHSL(0.75 + hue * 0.15, 1.0, 0.25);
      knotMat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 1.1);

      renderer.render(scene, camera);
    }

    animate();
  }

  if (typeof THREE !== 'undefined') boot();
  else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
  }
})();
