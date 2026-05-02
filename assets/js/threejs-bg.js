/**
 * Premium Armillary Sphere — High-Fidelity 3D
 * Theme: Mystical Purple / Ancient Mechanism
 */
(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    init();
  }

  function init() {
    // ── Canvas Setup ───────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab', background: 'transparent',
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
    camera.position.set(0, 2, 18);

    // ── Main Group ──────────────────────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ── Lighting ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x110822, 1.5));
    
    // Core glow
    const coreLight = new THREE.PointLight(0xd400ff, 4, 30);
    mainGroup.add(coreLight);

    // Edge highlight (Top-Right-Front)
    const dirLight = new THREE.DirectionalLight(0xcba4ff, 1.2);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    // Fill light (Bottom-Left-Back)
    const fillLight = new THREE.DirectionalLight(0x5500aa, 0.8);
    fillLight.position.set(-10, -10, -10);
    scene.add(fillLight);

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

    // ── Core Element ────────────────────────────────────────────────────────
    const coreGroup = new THREE.Group();
    mainGroup.add(coreGroup);

    // Floating Crystal (Octahedron)
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x220044,
      emissive: 0x5500aa,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    coreGroup.add(crystal);

    // Crystal Wireframe
    const crystalWire = new THREE.Mesh(
      crystalGeo,
      new THREE.MeshBasicMaterial({ color: 0xeebbff, wireframe: true, transparent: true, opacity: 0.3 })
    );
    crystalWire.scale.setScalar(1.05);
    coreGroup.add(crystalWire);

    // Glowing energy orb inside crystal
    const glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(210,0,255,0.8)', 128),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    glowOrb.scale.setScalar(5);
    coreGroup.add(glowOrb);

    // ── Fragmented Rings ────────────────────────────────────────────────────
    function createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis) {
      const group = new THREE.Group();
      
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x1f1930, // Dark slate purple
        metalness: 0.3,
        roughness: 0.7,
      });

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Gold/Brass accent for bevels
        metalness: 0.9,
        roughness: 0.3,
      });

      // We use materials array: [side/face material, bevel/extrusion material]
      const materials = [stoneMat, goldMat];

      const gap = 0.25; // radians
      const totalArc = Math.PI * 2;
      const arcLength = (totalArc / fragmentsCount) - gap;
      
      for (let i = 0; i < fragmentsCount; i++) {
        // Skip occasional fragments to make it look ancient/broken
        if (fragmentsCount > 3 && Math.random() > 0.8) continue;

        const start = i * (totalArc / fragmentsCount) + (Math.random() * 0.1); // slight irregularity
        
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerR, start, start + arcLength, false);
        shape.lineTo(Math.cos(start + arcLength) * innerR, Math.sin(start + arcLength) * innerR);
        shape.absarc(0, 0, innerR, start + arcLength, start, true);
        shape.lineTo(Math.cos(start) * outerR, Math.sin(start) * outerR);
        
        const extrudeSettings = {
          depth: depth,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.08,
          bevelThickness: 0.08,
          curveSegments: 48 // Very smooth curves
        };
        
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -depth / 2);
        
        const mesh = new THREE.Mesh(geo, materials);
        group.add(mesh);
      }

      // Inner glowing energy ring
      const innerGlowGeo = new THREE.CylinderGeometry(innerR - 0.1, innerR - 0.1, depth * 0.5, 64, 1, true);
      const innerGlowMat = new THREE.MeshBasicMaterial({
        color: 0xbb00ff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
      innerGlow.rotation.x = Math.PI / 2;
      group.add(innerGlow);

      return { obj: group, axis: axis.normalize(), speed: rotSpeed };
    }

    const rings = [
      createFragmentedRing(2.8, 3.4, 0.6, 3, 0.008, new THREE.Vector3(1, 0.5, 0.2)),
      createFragmentedRing(4.0, 4.8, 0.8, 4, -0.005, new THREE.Vector3(-0.5, 1, 0.5)),
      createFragmentedRing(5.4, 6.4, 1.2, 5, 0.003, new THREE.Vector3(0.2, -0.5, 1)),
    ];

    rings.forEach(r => mainGroup.add(r.obj));

    // ── Floating Debris (Polyhedrons) ───────────────────────────────────────
    const debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    const debrisMats = [
      new THREE.MeshStandardMaterial({ color: 0x1f1930, roughness: 0.8, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0x2a1540, roughness: 0.6, metalness: 0.4 })
    ];

    for(let i=0; i<35; i++) {
        const size = 0.15 + Math.random()*0.35;
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const rock = new THREE.Mesh(geo, debrisMats[i % 2]);
        const r = 7 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1); // uniform spherical distribution
        rock.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
        
        // Random rotation axis and speed
        rock.userData.rotAxis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
        // Orbit speed
        rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
        
        debrisGroup.add(rock);
    }

    // ── Magical Particles ───────────────────────────────────────────────────
    const pCount = 800;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for(let i=0; i<pCount*3; i++) pPos[i] = (Math.random()-0.5) * 35;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.08, map: getGlowTex('rgba(210,100,255,1)', 16),
        transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    scene.add(pSystem);

    // ── Arcball Controls ────────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let zoom = 18.0;
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
    window.addEventListener('wheel', e => zoom = Math.max(8, Math.min(35, zoom + e.deltaY*0.015)), {passive:true});

    // Touch support
    let lastT = null;
    canvas.addEventListener('touchstart', e => { lastT = e.touches[0]; drag.active = true; autoRotate = false; }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!lastT) return;
      const t = e.touches[0];
      const dx = t.clientX - lastT.clientX, dy = t.clientY - lastT.clientY;
      const axis = new THREE.Vector3(dy, dx, 0).normalize();
      rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, Math.sqrt(dx*dx+dy*dy)*0.005));
      lastT = t;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { drag.active = false; lastT = null; setTimeout(() => autoRotate = true, 3000); });

    // ── Animation Loop ──────────────────────────────────────────────────────
    let t = 0;
    const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;

      // Smooth zoom
      camera.position.z += (zoom - camera.position.z) * 0.05;

      // Auto rotation
      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015);
        rotQ.premultiply(_q);
      }
      mainGroup.quaternion.copy(rotQ);

      // Core animation
      crystal.rotation.x = Math.sin(t * 0.5) * 0.2;
      crystal.rotation.y = t * 0.5;
      crystalWire.rotation.copy(crystal.rotation);
      
      coreLight.intensity = 3 + Math.sin(t * 2) * 1.5;
      glowOrb.scale.setScalar(4 + Math.sin(t * 3) * 0.5);

      // Rings rotation
      rings.forEach(r => {
        r.obj.rotateOnAxis(r.axis, r.speed);
      });

      // Debris animation
      debrisGroup.children.forEach((rock, i) => {
        rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed);
        // Orbit around center
        rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed);
        // Slight bobbing
        rock.position.y += Math.sin(t * 2 + i) * 0.005;
      });

      // Particles swirl
      pSystem.rotation.y = t * 0.05;
      pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
      
      // Twinkle particles
      const pMatOpacity = 0.4 + Math.sin(t * 4) * 0.2;
      pSystem.material.opacity = pMatOpacity;

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
