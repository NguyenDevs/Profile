/**
 * Ultimate Armillary Sphere
 * Theme: Tech-Stone, Shadows, Electric Board / Cracks, Morphing Core
 */
(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    init();
  }

  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
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
    
    // Enable shadows for realistic depth
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 18);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ── Lighting ────────────────────────────────────────────────────────────
    // Very dim ambient to force strong shadows
    scene.add(new THREE.AmbientLight(0x150b24, 0.6)); 
    
    // Core glow (illuminates the stone from inside)
    const coreLight = new THREE.PointLight(0xcc00ff, 5, 25);
    coreLight.castShadow = true;
    coreLight.shadow.bias = -0.001;
    mainGroup.add(coreLight);

    // Key Light (Top-Right-Front)
    const dirLight = new THREE.DirectionalLight(0xdab3ff, 1.5);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Fill light (Bottom-Left-Back)
    const fillLight = new THREE.DirectionalLight(0x4400aa, 1.0);
    fillLight.position.set(-15, -10, -15);
    scene.add(fillLight);

    // ── Procedural Textures ─────────────────────────────────────────────────
    // 1. Stone Bump Map for rough surface
    function genStoneBump() {
      const size = 256;
      const cvs = document.createElement('canvas');
      cvs.width = size; cvs.height = size;
      const ctx = cvs.getContext('2d');
      const imgData = ctx.createImageData(size, size);
      for(let i=0; i<imgData.data.length; i+=4) {
          let val = Math.random() * 255;
          imgData.data[i] = val; imgData.data[i+1] = val; imgData.data[i+2] = val; imgData.data[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(cvs);
      tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    const bumpTex = genStoneBump();
    const bumpTex = genStoneBump();

    // ── Morphing Core Element ───────────────────────────────────────────────
    const coreGroup = new THREE.Group();
    mainGroup.add(coreGroup);

    const CORE_RADIUS = 1.4;
    // Icosahedron has an evenly distributed mesh without poles
    const coreGeo = new THREE.IcosahedronGeometry(CORE_RADIUS, 5); // High detail for smooth morphing
    const basePos = new Float32Array(coreGeo.attributes.position.array);
    const N = basePos.length / 3;
    const thetaArr = new Float32Array(N);
    const phiArr = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
        const x = basePos[i*3] / CORE_RADIUS, y = basePos[i*3+1] / CORE_RADIUS, z = basePos[i*3+2] / CORE_RADIUS;
        thetaArr[i] = Math.atan2(y, x);
        phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z))); // Clamped to avoid NaN
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xaa00ff, emissive: 0x5500aa, emissiveIntensity: 1.5, wireframe: true, transparent: true, opacity: 0.9
    });
    
    const solidCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x110022, emissive: 0x220044, metalness: 0.6, roughness: 0.2, clearcoat: 1.0, transparent: true, opacity: 0.7
    });

    const coreMeshSolid = new THREE.Mesh(coreGeo, solidCoreMat);
    const coreMeshWire = new THREE.Mesh(coreGeo, coreMat);
    coreMeshSolid.scale.setScalar(0.98); 
    coreMeshSolid.castShadow = true;
    coreGroup.add(coreMeshSolid);
    coreGroup.add(coreMeshWire);

    function getGlowTex(color = 'rgba(170,0,255,1)', r = 128) {
        const c = document.createElement('canvas'); c.width = c.height = r * 2;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
        return new THREE.CanvasTexture(c);
    }
    
    const glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(180,50,255,0.8)', 128), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    glowOrb.scale.setScalar(6.5);
    coreGroup.add(glowOrb);

    // ── Fragmented Rings ────────────────────────────────────────────────────
    function createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null) {
      const group = new THREE.Group();
      
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x3a304a, // Darker stone to let emissive pop
        metalness: 0.3,
        roughness: 0.8,
        bumpMap: bumpTex,
        bumpScale: 0.015, // Rough stone feel
        emissive: 0x9900ff,
        emissiveIntensity: 1.5,
      });

      const bevelMat = new THREE.MeshStandardMaterial({
        color: 0x2a203a,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0x9900ff,
        emissiveIntensity: 1.5,
      });

      const materials = [stoneMat, bevelMat];
      const gap = 0.3; 
      const totalArc = Math.PI * 2;
      const arcLength = (totalArc / fragmentsCount) - gap;
      
      let skipArr = hiddenIndices;
      if (!skipArr) {
          skipArr = [];
          const maxSkip = fragmentsCount <= 3 ? 1 : 2;
          const numSkip = 1 + Math.floor(Math.random() * maxSkip);
          for (let i = 0; i < numSkip; i++) {
              let idx;
              do { idx = Math.floor(Math.random() * fragmentsCount); } while (skipArr.includes(idx));
              skipArr.push(idx);
          }
      }
      
      for (let i = 0; i < fragmentsCount; i++) {
        if (skipArr.includes(i)) continue;
        const start = i * (totalArc / fragmentsCount);
        
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerR, start, start + arcLength, false);
        shape.lineTo(Math.cos(start + arcLength) * innerR, Math.sin(start + arcLength) * innerR);
        shape.absarc(0, 0, innerR, start + arcLength, start, true);
        shape.lineTo(Math.cos(start) * outerR, Math.sin(start) * outerR);
        
        const extrudeSettings = {
          depth: depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 48
        };
        
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        geo.translate(0, 0, -depth / 2);
        
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true; // Enables self-shadowing and deep shadows
        group.add(mesh);
      }

      return { obj: group, axis: axis.normalize(), speed: rotSpeed };
    }

    const validPairs = [[0,2], [0,3], [0,4], [1,3], [1,4], [1,5], [2,4], [2,5], [3,5]];
    const ring4Skip = validPairs[Math.floor(Math.random() * validPairs.length)];

    const rings = [
      createFragmentedRing(3.0, 3.6, 0.6, 3, 0.007, new THREE.Vector3(1, 0.5, 0.2)),
      createFragmentedRing(4.2, 5.0, 0.8, 4, -0.004, new THREE.Vector3(-0.5, 1, 0.5)),
      createFragmentedRing(5.6, 6.6, 1.2, 5, 0.003, new THREE.Vector3(0.2, -0.5, 1)),
      createFragmentedRing(7.2, 8.4, 1.4, 6, -0.002, new THREE.Vector3(0.5, 0.8, -0.3), ring4Skip),
    ];
    rings.forEach(r => mainGroup.add(r.obj));

    // ── Floating Debris ─────────────────────────────────────────────────────
    const debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    const debrisMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a304a, roughness: 0.9, metalness: 0.2, bumpMap: bumpTex, bumpScale: 0.02,
        emissive: 0x6600aa, emissiveIntensity: 0.8
    });

    for(let i=0; i<20; i++) {
        const size = 0.10 + Math.random()*0.20; // Reduced debris size
        const randGeo = Math.floor(Math.random() * 5);
        let geo;
        switch(randGeo) {
            case 0: geo = new THREE.TetrahedronGeometry(size, 0); break;
            case 1: geo = new THREE.BoxGeometry(size*1.3, size*1.3, size*1.3); break;
            case 2: geo = new THREE.OctahedronGeometry(size, 0); break;
            case 3: geo = new THREE.DodecahedronGeometry(size, 0); break;
            case 4: geo = new THREE.IcosahedronGeometry(size, 0); break;
        }


        const rock = new THREE.Mesh(geo, debrisMat);
        rock.castShadow = true; rock.receiveShadow = true;
        const r = 7 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        rock.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
        rock.userData.rotAxis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
        rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
        debrisGroup.add(rock);
    }

    // ── Magical Particles ───────────────────────────────────────────────────
    const pCount = 4500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for(let i=0; i<pCount; i++) {
        const r = 2.0 + Math.pow(Math.random(), 1.5) * 20.0;
        const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
        pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i*3+2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.06, map: getGlowTex('rgba(190,100,255,1)', 16),
        transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    scene.add(pSystem);

    // ── Controls ────────────────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let zoom = 22.0, autoRotate = true; // Increased zoom out to reduce overall size

    canvas.addEventListener('mousedown', e => { drag.active = true; drag.px = e.clientX; drag.py = e.clientY; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { drag.active = false; canvas.style.cursor = 'grab'; setTimeout(() => autoRotate = true, 3000); });
    window.addEventListener('mousemove', e => {
      if (drag.active) {
        const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
        rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), Math.sqrt(dx*dx+dy*dy)*0.005));
        drag.px = e.clientX; drag.py = e.clientY; autoRotate = false;
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
    let t = 0; const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;
      camera.position.z += (zoom - camera.position.z) * 0.05;

      if (autoRotate) { _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015); rotQ.premultiply(_q); }
      mainGroup.quaternion.copy(rotQ);

      // Morphing Core
      const morphCycle = (t * 0.6) % 4;
      const positions = coreGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
          const idx = i * 3, bx = basePos[idx], by = basePos[idx+1], bz = basePos[idx+2];
          const theta = thetaArr[i], phi = phiArr[i];
          
          // Target 0: Base Sphere (bx, by, bz)
          
          // Target 1: Spiky Energy Core
          const r1 = 1.0 + 0.3 * Math.sin(6 * theta + t * 3) * Math.sin(5 * phi - t * 2);
          const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
          
          // Target 2: Organic Blob
          const r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
          const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
          
          // Target 3: Pulsing Ripple
          const r3 = 1.0 + 0.15 * Math.sin(10 * phi - t * 6) + 0.1 * Math.sin(8 * theta + t * 4);
          const tx3 = bx * r3, ty3 = by * r3, tz3 = bz * r3;

          let tx, ty, tz;
          if (morphCycle < 1) {
              const lerp = smoothstep(morphCycle);
              tx = bx + (tx1 - bx) * lerp; ty = by + (ty1 - by) * lerp; tz = bz + (tz1 - bz) * lerp;
          } else if (morphCycle < 2) {
              const lerp = smoothstep(morphCycle - 1);
              tx = tx1 + (tx2 - tx1) * lerp; ty = ty1 + (ty2 - ty1) * lerp; tz = tz1 + (tz2 - tz1) * lerp;
          } else if (morphCycle < 3) {
              const lerp = smoothstep(morphCycle - 2);
              tx = tx2 + (tx3 - tx2) * lerp; ty = ty2 + (ty3 - ty2) * lerp; tz = tz2 + (tz3 - tz2) * lerp;
          } else {
              const lerp = smoothstep(morphCycle - 3);
              tx = tx3 + (bx - tx3) * lerp; ty = ty3 + (by - ty3) * lerp; tz = tz3 + (bz - tz3) * lerp;
          }
          positions[idx] = tx; positions[idx+1] = ty; positions[idx+2] = tz;
      }
      coreGeo.attributes.position.needsUpdate = true;
      coreGeo.computeVertexNormals();

      coreGroup.rotation.y = t * 0.4;
      coreGroup.rotation.z = Math.sin(t * 0.5) * 0.2;
      coreLight.intensity = 4 + Math.sin(t * 2) * 2;
      glowOrb.scale.setScalar(5.5 + Math.sin(t * 3) * 0.8);

      rings.forEach(r => r.obj.rotateOnAxis(r.axis, r.speed));
      debrisGroup.children.forEach((rock, i) => {
        rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed);
        rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed);
        rock.position.y += Math.sin(t * 2 + i) * 0.005;
      });

      pSystem.rotation.y = t * 0.05;
      pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
      pSystem.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  boot();
})();
