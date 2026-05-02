/**
 * Purple Crystal Core — Advanced Orbital System
 * 360° arcball rotation | Purple neon palette | Crystal Icosahedron
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
    renderer.setClearColor(0x000000, 0); 

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
    scene.add(new THREE.AmbientLight(0x220033, 1.2));
    const pointLight = new THREE.PointLight(0xaa00ff, 2, 15);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // ── Central Crystal Core (Icosahedron) ──────────────────────────────────
    const coreGroup = new THREE.Group();
    pivotGroup.add(coreGroup);

    const icosaGeo = new THREE.IcosahedronGeometry(1.2, 0); // 0 detail = sharp facets

    // 1. Faceted Core
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x220044,
      emissive: 0x5500aa,
      emissiveIntensity: 0.5,
      shininess: 100,
      flatShading: true,
      transparent: true,
      opacity: 0.9
    });
    const coreMesh = new THREE.Mesh(icosaGeo, coreMat);
    coreGroup.add(coreMesh);

    // 2. Wireframe Inner (Purple Neon)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xcc00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const wireMesh = new THREE.Mesh(icosaGeo, wireMat);
    wireMesh.scale.setScalar(1.02);
    coreGroup.add(wireMesh);

    // 3. Outer Crystalline Shell (Subdivided)
    const outerGeo = new THREE.IcosahedronGeometry(1.4, 1); // More detail
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x8800ff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerMesh);

    // ── Satellite Spheres (Same logic as Cosmos) ─────────────────────────────
    const satellites = [
      { r: 0.22, orbitR: 2.5, speed: 0.9,  color: 0xcc00ff, emissive: 0x8800cc, phase: 0,           tiltX: 0.4, tiltZ: 0 },
      { r: 0.16, orbitR: 3.0, speed: 0.65, color: 0xff44cc, emissive: 0xcc0088, phase: Math.PI*0.66, tiltX: -0.7,tiltZ: 0.3 },
      { r: 0.13, orbitR: 3.5, speed: 1.2,  color: 0x8844ff, emissive: 0x4400bb, phase: Math.PI*1.33, tiltX: 0.2, tiltZ: -0.5 },
    ].map(cfg => {
      const geo = new THREE.SphereGeometry(cfg.r, 24, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: cfg.color, emissive: cfg.emissive,
        emissiveIntensity: 0.8, shininess: 200,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow(24, `rgba(${[(cfg.color>>16)&255,(cfg.color>>8)&255,cfg.color&255].join(',')},1)`),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6,
      }));
      sprite.scale.setScalar(cfg.r * 4);
      mesh.add(sprite);

      const ringGeo = new THREE.TorusGeometry(cfg.orbitR, 0.005, 8, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = cfg.tiltX;
      ring.rotation.z = cfg.tiltZ;
      pivotGroup.add(ring);
      pivotGroup.add(mesh);

      return { mesh, ring, ...cfg };
    });

    // ── Swarm Particles ─────────────────────────────────────────────────────
    const N_PARTICLES = 1200;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(N_PARTICLES * 3);
    const pVel = new Float32Array(N_PARTICLES * 3);

    for (let i = 0; i < N_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 2.5;
      pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i*3+2] = r * Math.cos(phi);
      pVel[i*3] = (Math.random() - 0.5) * 0.002;
      pVel[i*3+1] = (Math.random() - 0.5) * 0.002;
      pVel[i*3+2] = (Math.random() - 0.5) * 0.002;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      map: glow(16, 'rgba(180,100,255,1)'),
      size: 0.05, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    pivotGroup.add(particles);

    // ── Arcball 360° Controls ────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
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

    canvas.addEventListener('mousedown', e => { drag.active = true; drag.px = e.clientX; drag.py = e.clientY; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { drag.active = false; canvas.style.cursor = 'grab'; setTimeout(() => autoRotate = true, 2000); });
    window.addEventListener('mousemove', e => { if (drag.active) { applyDrag(e.clientX - drag.px, e.clientY - drag.py); drag.px = e.clientX; drag.py = e.clientY; } });
    window.addEventListener('wheel', e => { zoom = Math.max(4, Math.min(12, zoom + e.deltaY * 0.006)); }, { passive: true });

    // ── Animation ────────────────────────────────────────────────────────────
    let t = 0;
    const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      camera.position.z += (zoom - camera.position.z) * 0.08;

      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0.2, 1, 0.1).normalize(), 0.003);
        rotQ.premultiply(_q);
      }
      pivotGroup.quaternion.copy(rotQ);

      // Core rotation
      coreMesh.rotation.y = t * 0.3;
      wireMesh.rotation.y = -t * 0.5;
      outerMesh.rotation.z = t * 0.2;

      // Satellites
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

      // Particles
      const positions = pGeo.attributes.position.array;
      for (let i = 0; i < N_PARTICLES; i++) {
        positions[i*3] += pVel[i*3] + Math.sin(t + i)*0.001;
        positions[i*3+1] += pVel[i*3+1] + Math.cos(t + i)*0.001;
        positions[i*3+2] += pVel[i*3+2];
        const d = Math.sqrt(positions[i*3]**2 + positions[i*3+1]**2 + positions[i*3+2]**2);
        if (d > 5 || d < 1.5) { positions[i*3]*=0.99; positions[i*3+1]*=0.99; positions[i*3+2]*=0.99; }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Pulse emissive
      coreMat.emissiveIntensity = 0.4 + 0.3 * Math.sin(t * 1.5);

      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  boot();
})();
