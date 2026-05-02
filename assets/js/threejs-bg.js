/**
 * High-Fidelity Mystical Armillary Sphere (Dainichi Mikoshi / Enkanomiya style)
 * Theme: Deep Purple / Void Energy
 * Techniques: Thick carved stone fragments, Energy pillar, God rays, Runic core
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
      transition: 'opacity 2.5s ease', cursor: 'grab', background: 'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); 

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    // ── Main Pivot ──────────────────────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a0033, 1.2));
    
    const coreLight = new THREE.PointLight(0xaa00ff, 5, 25);
    scene.add(coreLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 20, 0);
    scene.add(topLight);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function getGlowTex(color = 'rgba(160,60,255,1)', r = 128) {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }

    // ── Energy Pillar (Vertical God Ray) ────────────────────────────────────
    const pillarGeo = new THREE.CylinderGeometry(1.5, 2.5, 80, 32, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x6600ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    scene.add(pillar);

    const pillarCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 80, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xaa55ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(pillarCore);

    // ── Central Runic Core ──────────────────────────────────────────────────
    const coreGroup = new THREE.Group();
    mainGroup.add(coreGroup);

    // Internal Glowing Cube
    const cubeInner = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.0, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xaa00ff, emissiveIntensity: 4 })
    );
    coreGroup.add(cubeInner);

    // Floating Frame Fragments for the Cube
    for(let i=0; i<8; i++) {
        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.9 })
        );
        frame.position.set((i&1?1:-1)*0.6, (i&2?1:-1)*0.6, (i&4?1:-1)*0.6);
        coreGroup.add(frame);
    }

    // Core Glow Sphere
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlowTex('rgba(160,60,255,0.4)', 256),
        blending: THREE.AdditiveBlending, transparent: true
    }));
    coreGlow.scale.setScalar(6);
    coreGroup.add(coreGlow);

    // ── Thick Carved Stone Rings ────────────────────────────────────────────
    function createStoneRing(radius, thickness, segments) {
      const group = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.85,
        metalness: 0.1,
      });

      const arc = (Math.PI * 2) / segments;
      for (let i = 0; i < segments; i++) {
        if (Math.random() > 0.8) continue; // broken gaps

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(i*arc)*radius, Math.sin(i*arc)*radius, 0),
            new THREE.Vector3(Math.cos((i+0.5)*arc)*radius, Math.sin((i+0.5)*arc)*radius, (Math.random()-0.5)*0.2),
            new THREE.Vector3(Math.cos((i+1)*arc)*radius, Math.sin((i+1)*arc)*radius, 0),
        ]);
        
        const tubeGeo = new THREE.TubeGeometry(curve, 8, thickness, 6, false);
        const segment = new THREE.Mesh(tubeGeo, stoneMat);
        group.add(segment);

        // Cracks/Emissive for each segment
        const emissiveGeo = new THREE.TubeGeometry(curve, 8, thickness * 1.05, 6, false);
        const emissiveSeg = new THREE.Mesh(emissiveGeo, new THREE.MeshBasicMaterial({
            color: 0xaa00ff, wireframe: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending
        }));
        group.add(emissiveSeg);
      }
      return group;
    }

    const ring1 = createStoneRing(3.5, 0.45, 12);
    const ring2 = createStoneRing(5.0, 0.55, 16);
    const ring3 = createStoneRing(6.8, 0.65, 20);

    const ringSet = [
        { obj: ring1, axis: new THREE.Vector3(1, 0.2, 0.1).normalize(), speed: 0.006 },
        { obj: ring2, axis: new THREE.Vector3(-0.2, 1, 0.3).normalize(), speed: 0.004 },
        { obj: ring3, axis: new THREE.Vector3(0.1, -0.3, 1).normalize(), speed: 0.003 },
    ];
    ringSet.forEach(r => mainGroup.add(r.obj));

    // ── Floating Rocks / Debris ─────────────────────────────────────────────
    const debris = [];
    for(let i=0; i<30; i++) {
        const geo = new THREE.DodecahedronGeometry(0.1 + Math.random()*0.3, 0);
        const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 1 }));
        const r = 4 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI;
        rock.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
        rock.userData.v = new THREE.Vector3((Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01);
        mainGroup.add(rock);
        debris.push(rock);
    }

    // ── Atmosphere / Particles ──────────────────────────────────────────────
    const pCount = 1500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for(let i=0; i<pCount*3; i++) pPos[i] = (Math.random()-0.5) * 40;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.06, map: getGlowTex('rgba(180,120,255,1)', 16),
        transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    scene.add(pSystem);

    // ── Interaction ─────────────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let zoom = 12.0;
    let autoRotate = true;

    canvas.addEventListener('mousedown', e => { drag.active = true; drag.px = e.clientX; drag.py = e.clientY; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { drag.active = false; canvas.style.cursor = 'grab'; setTimeout(() => autoRotate = true, 3000); });
    window.addEventListener('mousemove', e => {
      if (drag.active) {
        const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
        const axis = new THREE.Vector3(dy, dx, 0).normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(axis, Math.sqrt(dx*dx+dy*dy)*0.005);
        rotQ.premultiply(q);
        drag.px = e.clientX; drag.py = e.clientY;
        autoRotate = false;
      }
    });
    window.addEventListener('wheel', e => zoom = Math.max(6, Math.min(30, zoom + e.deltaY*0.01)), {passive:true});

    // ── Animation ────────────────────────────────────────────────────────────
    let t = 0;
    const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;

      camera.position.z += (zoom - camera.position.z) * 0.05;

      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.002);
        rotQ.premultiply(_q);
      }
      mainGroup.quaternion.copy(rotQ);

      // Core
      cubeInner.rotation.x += 0.02;
      cubeInner.rotation.y += 0.01;
      coreLight.intensity = 4 + Math.sin(t * 3) * 2;
      coreGlow.scale.setScalar(6 + Math.sin(t * 2) * 0.5);

      // Rings
      ringSet.forEach(r => {
        r.obj.rotateOnAxis(r.axis, r.speed);
      });

      // Pillar effect
      pillar.rotation.y += 0.005;
      pillarMat.opacity = 0.12 + Math.sin(t * 1.5) * 0.05;

      // Debris
      debris.forEach(d => {
        d.rotation.x += 0.01;
        d.position.add(d.userData.v);
        if(d.position.length() > 15) d.position.setLength(4);
      });

      // Particles
      pSystem.rotation.y += 0.001;

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
