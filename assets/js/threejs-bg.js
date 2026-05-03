
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
    
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab', background: 'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); 
    
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 18);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    
    
    scene.add(new THREE.AmbientLight(0x150b24, 0.6)); 
    
    
    const coreLight = new THREE.PointLight(0xcc00ff, 5, 25);
    coreLight.castShadow = true;
    coreLight.shadow.bias = -0.001;
    const staticGroup = new THREE.Group();
    scene.add(staticGroup);
    staticGroup.add(coreLight);

    
    const dirLight = new THREE.DirectionalLight(0xdab3ff, 2.2);
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

    
    const fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
    fillLight.position.set(-15, -10, -15);
    scene.add(fillLight);

    
    


    const coreGroup = new THREE.Group();
    staticGroup.add(coreGroup);
    
    
    coreGroup.rotation.x = 0.15; 
    coreGroup.rotation.y = -0.25;

    const CORE_RADIUS = 1.4;
    const coreGeo = new THREE.IcosahedronGeometry(CORE_RADIUS, 5);
    const basePos = new Float32Array(coreGeo.attributes.position.array);
    const N = basePos.length / 3;
    const thetaArr = new Float32Array(N);
    const phiArr = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
        const x = basePos[i*3] / CORE_RADIUS, y = basePos[i*3+1] / CORE_RADIUS, z = basePos[i*3+2] / CORE_RADIUS;
        thetaArr[i] = Math.atan2(y, x);
        phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z))); 
    }

    function getGlowTex(color = 'rgba(170,0,255,1)', r = 128) {
        const c = document.createElement('canvas'); c.width = c.height = r * 2;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
        return new THREE.CanvasTexture(c);
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8800ff, emissive: 0x4400aa, emissiveIntensity: 0.8, wireframe: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending
    });
    
    const solidCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x110022, emissive: 0x110022, metalness: 0.6, roughness: 0.2, clearcoat: 1.0, transparent: true, opacity: 0.25
    });

    const coreMeshSolid = new THREE.Mesh(coreGeo, solidCoreMat);
    const coreMeshWire = new THREE.Mesh(coreGeo, coreMat);
    
    
    const filamentGroup = new THREE.Group();
    coreGroup.add(filamentGroup);
    const filaments = [];
    const filamentCount = 20;
    for(let i=0; i<filamentCount; i++) {
        const segs = 48;
        const pts = [];
        for(let j=0; j<=segs; j++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ 
            color: i % 2 === 0 ? 0xff0088 : 0xaa00ff, 
            transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false 
        });
        const line = new THREE.Line(geo, mat);
        line.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        filamentGroup.add(line);
        filaments.push({
            line, 
            r: 0.4 + Math.random() * 0.5, 
            phase: Math.random() * 10,
            speed: 0.8 + Math.random() * 1.5,
            noiseScale: 0.15 + Math.random() * 0.25
        });
    }

    const corePointsMat = new THREE.PointsMaterial({
        size: 0.05, color: 0xdd88ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, map: getGlowTex('rgba(200,100,255,1)', 16), depthWrite: false
    });
    const corePoints = new THREE.Points(coreGeo, corePointsMat);

    coreMeshSolid.scale.setScalar(0.98); 
    coreMeshSolid.castShadow = true;
    coreGroup.add(coreMeshSolid);
    coreGroup.add(coreMeshWire);
    coreGroup.add(corePoints);

    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeo, bhMat);
    coreGroup.add(blackHole);

    const diskCount = 4000;
    const diskGeo = new THREE.BufferGeometry();
    const diskPos = new Float32Array(diskCount * 3);
    const diskParams = [];
    for(let i=0; i<diskCount; i++) {
        const r = 0.35 + Math.pow(Math.random(), 1.5) * 0.85;
        const th = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 0.04;
        const speed = 0.03 + Math.random() * 0.07;
        diskParams.push({ r, th, y, speed });
        diskPos[i*3] = r * Math.cos(th);
        diskPos[i*3+1] = y;
        diskPos[i*3+2] = r * Math.sin(th);
    }
    diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPos, 3));
    const diskMat = new THREE.PointsMaterial({
        size: 0.12, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, map: getGlowTex('rgba(200,50,255,1)', 16)
    });
    const diskSystem = new THREE.Points(diskGeo, diskMat);
    
    
    diskSystem.rotation.x = 0.05; 
    coreGroup.add(diskSystem);

    const bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(200,150,255,0.9)', 64), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    bhGlow.scale.setScalar(1.2);
    coreGroup.add(bhGlow);

    const glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(180,50,255,0.8)', 128), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    glowOrb.scale.setScalar(6.5);
    coreGroup.add(glowOrb);

    
    function createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null) {
      const group = new THREE.Group();
      
      const stoneMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a0b3a, 
        emissive: 0x110522,
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        flatShading: true
      });

      const bevelMat = new THREE.MeshPhysicalMaterial({
        color: 0x140528,
        emissive: 0x0a0011,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.3,
        clearcoat: 0.5,
        flatShading: true
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
        mesh.receiveShadow = true; 
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

    
    const debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    const debrisMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x110522, roughness: 0.2, metalness: 0.9, clearcoat: 0.8, flatShading: true
    });

    for(let i=0; i<20; i++) {
        const size = 0.10 + Math.random()*0.20; 
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

    
    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let velocity = { x: 0, y: 0 };
    let zoom = 22.0, autoRotate = true; 
    let autoRotateTimeout = null;
    let introProgress = 0; 

    canvas.addEventListener('mousedown', e => { 
        drag.active = true; drag.px = e.clientX; drag.py = e.clientY; 
        canvas.style.cursor = 'grabbing'; 
        autoRotate = false; clearTimeout(autoRotateTimeout);
    });
    window.addEventListener('mouseup', () => { 
        drag.active = false; canvas.style.cursor = 'grab'; 
        autoRotateTimeout = setTimeout(() => autoRotate = true, 3000); 
    });
    window.addEventListener('mousemove', e => {
      if (drag.active) {
        const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
        velocity.x = dx; velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        if (speed > 0) rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed*0.005));
        drag.px = e.clientX; drag.py = e.clientY; 
      }
    });
    window.addEventListener('wheel', e => zoom = Math.max(8, Math.min(35, zoom + e.deltaY*0.015)), {passive:true});

    
    let lastT = null;
    let initialPinchDist = null;

    canvas.addEventListener('touchstart', e => { 
        if (e.touches.length === 2) {
            initialPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            drag.active = false; 
        } else {
            lastT = e.touches[0]; 
            drag.active = true; 
        }
        autoRotate = false; 
        clearTimeout(autoRotateTimeout);
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && initialPinchDist !== null) {
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = dist - initialPinchDist;
        zoom = Math.max(8, Math.min(35, zoom - delta * 0.05));
        initialPinchDist = dist;
      } else if (e.touches.length === 1 && lastT) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - lastT.clientX, dy = t.clientY - lastT.clientY;
        velocity.x = dx; velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        if (speed > 0) rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed*0.005));
        lastT = t;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', e => { 
        if (e.touches.length < 2) initialPinchDist = null;
        if (e.touches.length === 0) {
            drag.active = false; 
            lastT = null; 
            autoRotateTimeout = setTimeout(() => autoRotate = true, 3000); 
        }
    });

    
    let t = 0; const _q = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;
      camera.position.z += (zoom - camera.position.z) * 0.05;
      const currentZf = Math.max(0, Math.min(1, (35 - camera.position.z) / 27));
      camera.position.y = 2.0 - currentZf * 2.0;

      if (!drag.active) {
          const speed = Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y);
          if (speed > 0.1) {
              rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(velocity.y, velocity.x, 0).normalize(), speed*0.005));
              velocity.x *= 0.95;
              velocity.y *= 0.95;
          }
      } else {
          velocity.x *= 0.5;
          velocity.y *= 0.5;
      }

      if (autoRotate) { _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015); rotQ.premultiply(_q); }
      mainGroup.quaternion.copy(rotQ);

      introProgress = Math.min(1, introProgress + 0.004);
      const ringIntro = smoothstep(Math.min(1, introProgress / 0.75));
      const coreIntro = smoothstep(Math.max(0, (introProgress - 0.7) / 0.3));
      const speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;

      
      const morphCycle = (t * 0.6) % 4;
      const positions = coreGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
          const idx = i * 3, bx = basePos[idx], by = basePos[idx+1], bz = basePos[idx+2];
          const theta = thetaArr[i], phi = phiArr[i];
          
          const r1 = 1.0 + 0.3 * Math.sin(6 * theta + t * 3) * Math.sin(5 * phi - t * 2);
          const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
          
          const r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
          const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
          
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
          
          positions[idx] = bx + (tx - bx) * coreIntro; 
          positions[idx+1] = by + (ty - by) * coreIntro; 
          positions[idx+2] = bz + (tz - bz) * coreIntro;
      }
      coreGeo.attributes.position.needsUpdate = true;
      coreGeo.computeVertexNormals();

      coreGroup.rotation.y = t * (0.1 + 0.3 * coreIntro);
      coreGroup.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
      const zf = Math.max(0, Math.min(1, (35 - zoom) / 27));
      
      coreGroup.scale.setScalar((1 + zf * 0.2) * (0.5 + 0.5 * ringIntro));

      const dPos = diskSystem.geometry.attributes.position.array;
      for(let i=0; i<diskCount; i++) {
          let p = diskParams[i];
          p.th -= p.speed * (1 + zf * 2) * coreIntro;
          p.r -= 0.005 * coreIntro; 
          if (p.r < 0.35) { 
              p.r = 1.1; 
              p.th = Math.random() * Math.PI * 2;
          }
          
          let bx = p.r * Math.cos(p.th);
          let bz = p.r * Math.sin(p.th);
          let by = p.y;
          
          
          if (bz < 0) {
              const r_val = p.r;
              
              const bendFactor = Math.pow((2.2 - r_val), 2.5) * 1.5;
              
              const falloff = Math.exp(-Math.pow(bx * 0.8, 2));
              let bendY = bendFactor * falloff;
              
              if (i % 2 === 0) bendY = -bendY;
              by += bendY;
          }

          dPos[i*3] = bx;
          dPos[i*3+1] = by;
          dPos[i*3+2] = bz;
      }
      diskSystem.geometry.attributes.position.needsUpdate = true;
      diskSystem.material.opacity = 0.4 + coreIntro * 0.6;

      coreLight.intensity = (4 + Math.sin(t * 2) * 2) * coreIntro;
      glowOrb.scale.setScalar((6.5 + Math.sin(t * 3) * 0.8) * (0.2 + 0.8 * coreIntro));

      
      filaments.forEach((f, idx) => {
          const pos = f.line.geometry.attributes.position.array;
          const segs = 64;
          const time = t * f.speed;
          for(let j=0; j<=segs; j++) {
              const ang = (j/segs) * Math.PI * 2;
              const n = Math.sin(ang * 3 + time + f.phase) * f.noiseScale;
              const r = f.r * (1 + n * coreIntro);
              pos[j*3] = Math.cos(ang) * r;
              pos[j*3+1] = Math.sin(ang) * r;
              pos[j*3+2] = Math.sin(time * 0.5 + ang * 2) * f.noiseScale * coreIntro;
          }
          f.line.geometry.attributes.position.needsUpdate = true;
          f.line.rotation.y += 0.01 * coreIntro;
          f.line.rotation.z += 0.005 * coreIntro;
          f.line.material.opacity = (0.2 + Math.sin(t + f.phase) * 0.1) * coreIntro;
      });

      rings.forEach((r, i) => {
          r.obj.rotateOnAxis(r.axis, r.speed * (1 + zf * 3.0) * (0.2 + 0.8 * ringIntro) * speedBoost);
          r.obj.scale.setScalar((1 + zf * (0.15 + i * 0.08)) * ringIntro);
      });

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
