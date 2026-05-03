
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
    const randoms = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
        const x = basePos[i*3] / CORE_RADIUS, y = basePos[i*3+1] / CORE_RADIUS, z = basePos[i*3+2] / CORE_RADIUS;
        thetaArr[i] = Math.atan2(y, x);
        phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z))); 
        randoms[i] = Math.random();
    }
    coreGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    function getGlowTex(color = 'rgba(170,0,255,1)', r = 128) {
        const c = document.createElement('canvas'); c.width = c.height = r * 2;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
        return new THREE.CanvasTexture(c);
    }

    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xaa00ff, emissive: 0x4400aa, emissiveIntensity: 1.0, wireframe: true, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false
    });

    const coreMeshWire = new THREE.Mesh(coreGeo, coreMat);
    coreMeshWire.castShadow = true; 
    
    
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
        size: 0.12, color: 0xdd88ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, map: getGlowTex('rgba(200,100,255,1)', 16), depthWrite: false
    });
    corePointsMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = `
            attribute float aRandom;
            varying float vRandom;
            uniform float uTime;
            ${shader.vertexShader}
        `.replace(
            `gl_PointSize = size;`,
            `float t = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0;
             float twinkle = 0.8 + 0.2 * sin(t);
             gl_PointSize = size * twinkle;
             vRandom = aRandom;`
        );
        shader.fragmentShader = `
            varying float vRandom;
            uniform float uTime;
            ${shader.fragmentShader}
        `.replace(
            `vec4 diffuseColor = vec4( diffuse, opacity );`,
            `float t = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0;
             float twinkle = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * sin(t), 2.0);
             vec4 diffuseColor = vec4( diffuse, opacity * twinkle );`
        );
        corePointsMat.userData.shader = shader;
    };
    const corePoints = new THREE.Points(coreGeo, corePointsMat);

    coreGroup.add(coreMeshWire);
    coreGroup.add(corePoints);
    coreGroup.userData.smoothM = 0;

    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeo, bhMat);
    coreGroup.add(blackHole);

    
    
    const flareGroup = new THREE.Group();
    coreGroup.add(flareGroup);
    const flares = [];
    const maxFlares = 4;

    function createFlare() {
        const segs = 32;
        const pts = [];
        for(let i=0; i<=segs; i++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ 
            color: 0xff33aa, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false 
        });
        const line = new THREE.Line(geo, mat);
        flareGroup.add(line);
        
        
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const start = new THREE.Vector3().setFromSphericalCoords(1.4, theta, phi);
        const end = new THREE.Vector3().setFromSphericalCoords(1.4, theta + (Math.random()-0.5)*0.5, phi + (Math.random()-0.5)*0.5);
        const mid = start.clone().lerp(end, 0.5).normalize().multiplyScalar(1.4 + 0.5 + Math.random() * 0.8);

        return { line, start, mid, end, life: 0, speed: 0.005 + Math.random() * 0.01 };
    }

    for(let i=0; i<maxFlares; i++) flares.push(createFlare());

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

    });

    
    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'speed-slider-container';
    Object.assign(sliderContainer.style, {
        position: 'fixed', right: '30px', top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: '1000',
        gap: '20px', background: 'rgba(20, 10, 35, 0.4)', backdropFilter: 'blur(15px)',
        padding: '40px 15px', borderRadius: '40px', border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', transition: 'opacity 0.5s ease'
    });
    
    const sliderLabel = document.createElement('div');
    sliderLabel.innerText = 'ROTATION';
    Object.assign(sliderLabel.style, {
        color: '#fff', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase',
        opacity: '0.6', fontWeight: '800', writingMode: 'vertical-rl', transform: 'rotate(180deg)'
    });

    const speedSlider = document.createElement('input');
    speedSlider.id = 'speed-slider';
    speedSlider.type = 'range'; speedSlider.min = '0'; speedSlider.max = '5'; speedSlider.step = '0.01'; speedSlider.value = '1';
    Object.assign(speedSlider.style, {
        appearance: 'none', width: '150px', height: '4px', background: 'rgba(255,255,255,0.1)',
        outline: 'none', borderRadius: '2px', cursor: 'pointer', transform: 'rotate(-90deg)',
        margin: '70px 0'
    });

    const style = document.createElement('style');
    style.textContent = `
        #speed-slider::-webkit-slider-thumb {
            -webkit-appearance: none; width: 20px; height: 20px; 
            background: #cc00ff; border-radius: 50%; cursor: pointer;
            box-shadow: 0 0 15px #cc00ff, 0 0 30px rgba(204,0,255,0.5);
            border: 2px solid #fff;
        }
        #speed-slider::-moz-range-thumb {
            width: 20px; height: 20px; background: #cc00ff; border-radius: 50%;
            cursor: pointer; box-shadow: 0 0 15px #cc00ff; border: 2px solid #fff;
        }
    `;
    document.head.appendChild(style);

    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(speedSlider);
    document.body.appendChild(sliderContainer);

    let manualSpeedFactor = 1.0;
    speedSlider.addEventListener('input', (e) => {
        manualSpeedFactor = parseFloat(e.target.value);
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

      
      if (!coreGroup.userData.nextPickTime || t > coreGroup.userData.nextPickTime) {
          const r = Math.random();
          if (r < 0.25) coreGroup.userData.targetM = 0; // Sphere
          else if (r < 0.50) coreGroup.userData.targetM = 1; // Tectonic
          else if (r < 0.75) coreGroup.userData.targetM = 2; // Blob
          else coreGroup.userData.targetM = 3; // Gentle Wave
          coreGroup.userData.nextPickTime = t + 5 + Math.random() * 5; 
      }
      coreGroup.userData.smoothM += (coreGroup.userData.targetM - coreGroup.userData.smoothM) * 0.04;
      const morphCycle = coreGroup.userData.smoothM;

      const positions = coreGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
          const idx = i * 3, bx = basePos[idx], by = basePos[idx+1], bz = basePos[idx+2];
          const theta = thetaArr[i], phi = phiArr[i];
          
          
          const tectonic = Math.sin(6 * theta) * Math.cos(6 * phi);
          const r1 = 1.0 + (tectonic > 0.3 ? 0.15 : (tectonic < -0.3 ? -0.1 : 0));
          const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
          
          const r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
          const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
          
          const r3 = 1.0 + 0.12 * Math.sin(8 * theta + t * 2) * Math.cos(t * 1.2) + 0.05 * Math.sin(phi * 6);
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

      const zf = Math.max(0, Math.min(1, (35 - zoom) / 27));
      const coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (1 + zf * 2.0) * (0.5 + 0.5 * manualSpeedFactor);
      coreGroup.rotation.y += coreRotSpeed;
      coreGroup.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
      
      coreGroup.scale.setScalar((1 + zf * 0.2) * (0.25 + 0.75 * ringIntro));

      
      flares.forEach(f => {
          f.life += f.speed * coreIntro;
          if (f.life > 1) {
              f.life = 0;
              const phi = Math.random() * Math.PI * 2;
              const theta = Math.random() * Math.PI;
              f.start.setFromSphericalCoords(1.4, theta, phi);
              f.end.setFromSphericalCoords(1.4, theta + (Math.random()-0.5)*0.6, phi + (Math.random()-0.5)*0.6);
              f.mid.copy(f.start).lerp(f.end, 0.5).normalize().multiplyScalar(1.4 + 0.4 + Math.random() * 0.9);
          }

          const pos = f.line.geometry.attributes.position.array;
          const segs = 32;
          const alpha = Math.sin(f.life * Math.PI); 
          
          for(let i=0; i<=segs; i++) {
              const t_lerp = i / segs;
              
              const p = new THREE.Vector3();
              p.x = (1 - t_lerp) * (1 - t_lerp) * f.start.x + 2 * (1 - t_lerp) * t_lerp * f.mid.x + t_lerp * t_lerp * f.end.x;
              p.y = (1 - t_lerp) * (1 - t_lerp) * f.start.y + 2 * (1 - t_lerp) * t_lerp * f.mid.y + t_lerp * t_lerp * f.end.y;
              p.z = (1 - t_lerp) * (1 - t_lerp) * f.start.z + 2 * (1 - t_lerp) * t_lerp * f.mid.z + t_lerp * t_lerp * f.end.z;
              
              
              const noise = Math.sin(t_lerp * 10 + t * 5) * 0.05 * alpha;
              p.addScaledVector(p.clone().normalize(), noise);

              pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = p.z;
          }
          f.line.geometry.attributes.position.needsUpdate = true;
          f.line.material.opacity = alpha * 0.9 * coreIntro;
          f.line.material.color.setHSL(0.85 + Math.sin(t + f.life)*0.05, 1, 0.7);
      });

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
          r.obj.rotateOnAxis(r.axis, r.speed * (1 + zf * 3.0) * (0.2 + 0.8 * ringIntro) * speedBoost * manualSpeedFactor);
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

      if (corePointsMat.userData.shader) corePointsMat.userData.shader.uniforms.uTime.value = t;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  boot();
})();
