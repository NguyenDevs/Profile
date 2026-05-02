/**
 * Mystical Armillary Sphere — Fragmented Stone & Purple Glow
 * Inspired by Genshin Impact ancient mechanisms
 * Features: Fragmented rotating rings, runic glowing core, floating debris, god rays
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
      transition: 'opacity 2s ease', cursor: 'grab',
      background: 'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); 
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 2, 10);

    // ── Main Group ──────────────────────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ── Lights ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x220033, 1.5);
    scene.add(ambient);

    const mainLight = new THREE.PointLight(0xaa00ff, 4, 20);
    mainLight.position.set(0, 0, 0);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x4400aa, 1);
    rimLight.position.set(5, 10, 5);
    scene.add(rimLight);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function getGlowTex(color = 'rgba(160,60,255,1)', r = 64) {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }

    // ── Central Runic Core ──────────────────────────────────────────────────
    const coreGroup = new THREE.Group();
    mainGroup.add(coreGroup);

    // Inner Glowing Cube
    const innerCubeGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const innerCubeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xaa00ff,
      emissiveIntensity: 2,
    });
    const innerCube = new THREE.Mesh(innerCubeGeo, innerCubeMat);
    coreGroup.add(innerCube);

    // Outer "Stone" Frame for Cube
    const frameGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x110022,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: true,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    coreGroup.add(frame);

    // Runic Planes (hovering on faces)
    const runeTex = getGlowTex('rgba(200,100,255,0.8)', 64);
    for (let i = 0; i < 6; i++) {
        const rune = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.8),
            new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
        );
        const dist = 0.66;
        if (i === 0) rune.position.z = dist;
        if (i === 1) { rune.position.z = -dist; rune.rotation.y = Math.PI; }
        if (i === 2) { rune.position.x = dist; rune.rotation.y = Math.PI/2; }
        if (i === 3) { rune.position.x = -dist; rune.rotation.y = -Math.PI/2; }
        if (i === 4) { rune.position.y = dist; rune.rotation.x = -Math.PI/2; }
        if (i === 5) { rune.position.y = -dist; rune.rotation.x = Math.PI/2; }
        coreGroup.add(rune);
    }

    // ── Fragmented Rings ────────────────────────────────────────────────────
    function createFragmentedRing(radius, thickness, color, fragments = 12) {
      const ringGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        emissive: 0x220044,
        roughness: 0.9,
        metalness: 0.1,
      });

      const arc = (Math.PI * 2) / fragments;
      for (let i = 0; i < fragments; i++) {
        // Skip some fragments to make it look "broken"
        if (Math.random() > 0.85) continue;

        const size = thickness + (Math.random() * 0.2);
        const segmentGeo = new THREE.BoxGeometry(radius * arc * 0.8, size, size);
        const segment = new THREE.Mesh(segmentGeo, stoneMat);

        const angle = i * arc;
        segment.position.x = Math.cos(angle) * radius;
        segment.position.y = Math.sin(angle) * radius;
        segment.rotation.z = angle + (Math.random() - 0.5) * 0.2;
        
        // Random slight offsets for "shattered" look
        segment.position.z = (Math.random() - 0.5) * 0.2;
        segment.rotation.x = (Math.random() - 0.5) * 0.3;

        ringGroup.add(segment);

        // Cracks Glow
        const glowSeg = new THREE.Mesh(
            new THREE.BoxGeometry(radius * arc * 0.4, size * 0.2, size * 1.1),
            new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
        );
        glowSeg.position.copy(segment.position);
        glowSeg.rotation.copy(segment.rotation);
        ringGroup.add(glowSeg);
      }
      return ringGroup;
    }

    const rings = [
      { obj: createFragmentedRing(3.0, 0.4, 0x330066, 16), axis: new THREE.Vector3(1, 0.5, 0).normalize(), speed: 0.005 },
      { obj: createFragmentedRing(4.5, 0.5, 0x330066, 20), axis: new THREE.Vector3(0, 1, 0.5).normalize(), speed: -0.003 },
      { obj: createFragmentedRing(6.0, 0.6, 0x330066, 24), axis: new THREE.Vector3(0.5, 0, 1).normalize(), speed: 0.002 },
    ];

    rings.forEach(r => mainGroup.add(r.obj));

    // ── Floating Debris ─────────────────────────────────────────────────────
    const debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    for (let i = 0; i < 40; i++) {
        const size = 0.1 + Math.random() * 0.3;
        const deb = new THREE.Mesh(
            new THREE.DodecahedronGeometry(size, 0),
            new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 1 })
        );
        const r = 5 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI;
        deb.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
        deb.userData.rotSpeed = (Math.random() - 0.5) * 0.02;
        debrisGroup.add(deb);
    }

    // ── Volumetric Rays (God Rays) ──────────────────────────────────────────
    const rayGroup = new THREE.Group();
    scene.add(rayGroup);
    const rayTex = getGlowTex('rgba(150,50,255,0.15)', 256);
    for (let i = 0; i < 5; i++) {
        const ray = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 60),
            new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
        );
        ray.position.set((Math.random()-0.5)*20, 0, -15 - Math.random()*10);
        ray.rotation.z = (Math.random()-0.5) * 0.2;
        rayGroup.add(ray);
    }

    // ── Particles ───────────────────────────────────────────────────────────
    const pCount = 1000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for(let i=0; i<pCount*3; i++) pPos[i] = (Math.random()-0.5) * 30;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.05, map: getGlowTex('rgba(200,150,255,1)', 16),
        transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Arcball Controls ────────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let zoom = 10.0;
    let autoRotate = true;

    function applyDrag(dx, dy) {
      const axis = new THREE.Vector3(dy, dx, 0).normalize();
      const angle = Math.sqrt(dx * dx + dy * dy) * 0.005;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      rotQ.premultiply(q);
      autoRotate = false;
    }

    canvas.addEventListener('mousedown', e => { drag.active = true; drag.px = e.clientX; drag.py = e.clientY; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { drag.active = false; canvas.style.cursor = 'grab'; setTimeout(() => autoRotate = true, 2000); });
    window.addEventListener('mousemove', e => { if (drag.active) { applyDrag(e.clientX - drag.px, e.clientY - drag.py); drag.px = e.clientX; drag.py = e.clientY; } });
    window.addEventListener('wheel', e => { zoom = Math.max(5, Math.min(25, zoom + e.deltaY * 0.01)); }, { passive: true });

    // ── Animation Loop ──────────────────────────────────────────────────────
    let t = 0;
    const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;

      camera.position.z += (zoom - camera.position.z) * 0.05;

      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0.1, 1, 0).normalize(), 0.002);
        rotQ.premultiply(_q);
      }
      mainGroup.quaternion.copy(rotQ);

      // Core animation
      coreGroup.rotation.y += 0.01;
      coreGroup.rotation.z += 0.005;
      innerCube.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
      innerCubeMat.emissiveIntensity = 2 + Math.sin(t * 4);

      // Rings rotation
      rings.forEach(r => {
        r.obj.rotateOnAxis(r.axis, r.speed);
      });

      // Debris
      debrisGroup.children.forEach(d => {
          d.rotation.x += d.userData.rotSpeed;
          d.rotation.y += d.userData.rotSpeed;
          d.position.y += Math.sin(t + d.position.x) * 0.005;
      });

      // God rays drift
      rayGroup.children.forEach((r, i) => {
          r.position.x += Math.sin(t * 0.5 + i) * 0.01;
          r.material.opacity = 0.2 + Math.sin(t * 0.8 + i) * 0.1;
      });

      // Particles
      particles.rotation.y += 0.001;
      const pArr = pGeo.attributes.position.array;
      for(let i=0; i<pCount; i++) {
          pArr[i*3+1] += Math.sin(t + i) * 0.002;
      }
      pGeo.attributes.position.needsUpdate = true;

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
