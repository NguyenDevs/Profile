/**
 * Morphing Particle Mesh — Physics-based Interactive 3D
 * Morphing: Sphere → Torus → Cube → Blob
 * Physics: spring forces, mouse repulsion/attraction
 * Purple palette | 360° arcball | Scroll zoom
 */
(function () {
  'use strict';
  function boot() { if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; } init(); }

  function init() {
    // Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position:'fixed',inset:'0',width:'100%',height:'100%',
      pointerEvents:'auto',zIndex:'2',opacity:'0',
      transition:'opacity 1.8s ease',cursor:'crosshair',background:'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => canvas.style.opacity = '1');

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 200);
    camera.position.z = 5.5;

    // ── Build sphere topology ──────────────────────────────────────────────
    const WS = 26, HS = 18;
    const tmpGeo = new THREE.SphereGeometry(1, WS, HS);
    const idxArr = tmpGeo.index.array;
    const srcPos = tmpGeo.getAttribute('position');
    const N = srcPos.count;

    // Store spherical coords per vertex
    const theta = new Float32Array(N);
    const phi   = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = srcPos.getX(i), y = srcPos.getY(i), z = srcPos.getZ(i);
      theta[i] = Math.atan2(y, x);
      phi[i]   = Math.acos(Math.max(-1, Math.min(1, z)));
    }

    // Extract unique edges from index
    const edgeSet = new Set();
    for (let i = 0; i < idxArr.length; i += 3) {
      const a = idxArr[i], b = idxArr[i+1], c = idxArr[i+2];
      [[a,b],[b,c],[a,c]].forEach(([u,v]) => edgeSet.add(u<v?`${u},${v}`:`${v},${u}`));
    }
    const edges = [...edgeSet].map(s => s.split(',').map(Number));
    tmpGeo.dispose();

    // ── Physics arrays ─────────────────────────────────────────────────────
    const pos    = new Float32Array(N * 3);
    const vel    = new Float32Array(N * 3);
    const target = new Float32Array(N * 3);
    const speed  = new Float32Array(N);

    // ── Shape functions (map spherical coords → 3D pos) ────────────────────
    const R = 1.6;
    const shapes = [
      // 0: Sphere
      (i) => {
        const t = theta[i], p = phi[i];
        return [R*Math.sin(p)*Math.cos(t), R*Math.sin(p)*Math.sin(t), R*Math.cos(p)];
      },
      // 1: Torus
      (i) => {
        const u = theta[i], v = phi[i] - Math.PI/2;
        const Rm = 1.1, rm = 0.5;
        return [(Rm+rm*Math.cos(v))*Math.cos(u),(Rm+rm*Math.cos(v))*Math.sin(u),rm*Math.sin(v)];
      },
      // 2: Cube (normalize to cube surface)
      (i) => {
        const t = theta[i], p = phi[i];
        const x = Math.sin(p)*Math.cos(t), y = Math.sin(p)*Math.sin(t), z = Math.cos(p);
        const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1;
        return [x/m*R*0.9, y/m*R*0.9, z/m*R*0.9];
      },
      // 3: Blob (spherical harmonics noise)
      (i, t) => {
        const th = theta[i], ph = phi[i];
        const r = R + 0.35*Math.sin(3*th + t)*Math.sin(2*ph)
                    + 0.25*Math.cos(5*ph + t*0.7)
                    + 0.2 *Math.sin(4*th - t*0.5)*Math.cos(ph);
        return [r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph)];
      },
    ];

    // Init positions on sphere
    for (let i = 0; i < N; i++) {
      const [x,y,z] = shapes[0](i);
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
    }

    // ── Particle rendering ─────────────────────────────────────────────────
    const pGeo = new THREE.BufferGeometry();
    const pPosAttr = new THREE.BufferAttribute(pos.slice(), 3);
    const pColAttr = new THREE.BufferAttribute(new Float32Array(N*3), 3);
    pGeo.setAttribute('position', pPosAttr);
    pGeo.setAttribute('color',    pColAttr);

    function makeSprite(r, col) {
      const c = document.createElement('canvas'); c.width = c.height = r*2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r,r,0,r,r,r);
      g.addColorStop(0, col); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,r*2,r*2);
      return new THREE.CanvasTexture(c);
    }

    const pMat = new THREE.PointsMaterial({
      size: 0.055, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      map: makeSprite(16, 'rgba(200,100,255,1)'),
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ── Edge line rendering ────────────────────────────────────────────────
    const linePos = new Float32Array(edges.length * 6);
    const lGeo = new THREE.BufferGeometry();
    const lPosAttr = new THREE.BufferAttribute(linePos, 3);
    lGeo.setAttribute('position', lPosAttr);
    const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
      color: 0x9933ff, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(lines);

    // ── Arcball rotation ───────────────────────────────────────────────────
    const rotQ = new THREE.Quaternion();
    const drag = { on: false, px: 0, py: 0 };
    let zoom = 5.5, autoRot = true;

    function doDrag(dx, dy) {
      const ax = new THREE.Vector3(dy, dx, 0).normalize();
      const angle = Math.hypot(dx, dy) * 0.006;
      rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, angle));
      autoRot = false;
    }

    canvas.addEventListener('mousedown', e => { drag.on=true; drag.px=e.clientX; drag.py=e.clientY; canvas.style.cursor='grabbing'; });
    window.addEventListener('mouseup', () => { drag.on=false; canvas.style.cursor='crosshair'; setTimeout(()=>autoRot=true, 2500); });
    window.addEventListener('mousemove', e => {
      if (drag.on) { doDrag(e.clientX-drag.px, e.clientY-drag.py); drag.px=e.clientX; drag.py=e.clientY; }
      mouse2D.x = (e.clientX/innerWidth)*2-1;
      mouse2D.y = -(e.clientY/innerHeight)*2+1;
    });
    window.addEventListener('wheel', e => zoom = Math.max(3, Math.min(12, zoom + e.deltaY*0.005)), {passive:true});
    canvas.addEventListener('click', () => attract = !attract);

    let lastT = null;
    canvas.addEventListener('touchstart', e=>{lastT=e.touches[0];drag.on=true;autoRot=false;},{passive:true});
    canvas.addEventListener('touchmove', e=>{
      e.preventDefault();
      const t=e.touches[0];
      if(lastT){doDrag(t.clientX-lastT.clientX, t.clientY-lastT.clientY);}
      lastT=t;
    },{passive:false});
    canvas.addEventListener('touchend',()=>{drag.on=false;setTimeout(()=>autoRot=true,2500);});

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ── Mouse 3D projection ────────────────────────────────────────────────
    const mouse2D   = new THREE.Vector2(9999, 9999);
    const mouseWorld = new THREE.Vector3();
    const raycaster  = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
    let attract = false;

    // ── Ambient light ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x110022, 1));

    // ── Morph state ────────────────────────────────────────────────────────
    const MORPH_DUR = 5.0; // seconds per shape
    let morphFrom = 0, morphTo = 1, morphT = 0;
    const fromPos = new Float32Array(N*3);
    const toPos   = new Float32Array(N*3);

    function buildShape(shapeIdx, out, t=0) {
      for (let i=0;i<N;i++) {
        const [x,y,z] = shapes[shapeIdx](i, t);
        out[i*3]=x; out[i*3+1]=y; out[i*3+2]=z;
      }
    }

    buildShape(0, fromPos);
    buildShape(1, toPos);

    // Smooth step
    function smoothstep(x) { x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); }

    // ── Animate ────────────────────────────────────────────────────────────
    let t = 0;
    const _autoAxis = new THREE.Vector3(0.15, 1, 0.08).normalize();
    const _autoQ    = new THREE.Quaternion();

    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      // Zoom
      camera.position.z += (zoom - camera.position.z) * 0.07;

      // Auto rotate
      if (autoRot) { _autoQ.setFromAxisAngle(_autoAxis, 0.003); rotQ.premultiply(_autoQ); }
      points.quaternion.copy(rotQ);
      lines.quaternion.copy(rotQ);

      // Mouse world pos (transform into object local space)
      raycaster.setFromCamera(mouse2D, camera);
      raycaster.ray.intersectPlane(mousePlane, mouseWorld);
      const mouseLocal = mouseWorld.clone().applyQuaternion(rotQ.clone().invert());

      // Morph timer
      morphT += 0.016 / MORPH_DUR;
      if (morphT >= 1.0) {
        morphT = 0;
        morphFrom = morphTo;
        morphTo = (morphTo + 1) % shapes.length;
        fromPos.set(toPos);
        buildShape(morphTo, toPos, t);
      }
      // Rebuild blob target each frame (it's time-varying)
      if (morphTo === 3) buildShape(3, toPos, t);
      if (morphFrom === 3) buildShape(3, fromPos, t);

      const sp = smoothstep(morphT);

      // Physics + color update
      const SPRING = 0.07, DAMP = 0.88, MOUSE_R = 1.4, MOUSE_F = 0.22;
      const col = pColAttr.array;

      for (let i=0;i<N;i++) {
        const ii = i*3;
        // Target = morph lerp
        target[ii]   = fromPos[ii]   + (toPos[ii]   - fromPos[ii])   * sp;
        target[ii+1] = fromPos[ii+1] + (toPos[ii+1] - fromPos[ii+1]) * sp;
        target[ii+2] = fromPos[ii+2] + (toPos[ii+2] - fromPos[ii+2]) * sp;

        // Spring force
        vel[ii]   += (target[ii]   - pos[ii])   * SPRING;
        vel[ii+1] += (target[ii+1] - pos[ii+1]) * SPRING;
        vel[ii+2] += (target[ii+2] - pos[ii+2]) * SPRING;

        // Mouse force
        const mx = pos[ii]-mouseLocal.x, my=pos[ii+1]-mouseLocal.y, mz=pos[ii+2]-mouseLocal.z;
        const md = Math.sqrt(mx*mx+my*my+mz*mz);
        if (md < MOUSE_R && md > 0.01) {
          const f = MOUSE_F * (1 - md/MOUSE_R) / md * (attract ? -1 : 1);
          vel[ii]   += mx * f;
          vel[ii+1] += my * f;
          vel[ii+2] += mz * f;
        }

        // Damping + integrate
        vel[ii]*=DAMP; vel[ii+1]*=DAMP; vel[ii+2]*=DAMP;
        pos[ii]+=vel[ii]; pos[ii+1]+=vel[ii+1]; pos[ii+2]+=vel[ii+2];

        // Velocity-based color (purple → bright violet/white)
        const spd = Math.min(1, Math.sqrt(vel[ii]**2+vel[ii+1]**2+vel[ii+2]**2) * 30);
        speed[i] = spd;
        col[ii]   = 0.55 + 0.45*spd;  // R
        col[ii+1] = 0.05 + 0.55*spd;  // G
        col[ii+2] = 1.0;               // B
      }

      // Update point geometry
      pPosAttr.array.set(pos);
      pPosAttr.needsUpdate = true;
      pColAttr.needsUpdate = true;

      // Update line geometry
      edges.forEach(([a,b],i) => {
        const ii=i*6, ai=a*3, bi=b*3;
        linePos[ii]=pos[ai]; linePos[ii+1]=pos[ai+1]; linePos[ii+2]=pos[ai+2];
        linePos[ii+3]=pos[bi]; linePos[ii+4]=pos[bi+1]; linePos[ii+5]=pos[bi+2];
      });
      lPosAttr.needsUpdate = true;

      // Line opacity pulse
      lines.material.opacity = 0.08 + 0.06 * Math.sin(t * 1.5);

      // Point size breathe
      pMat.size = 0.048 + 0.012 * Math.sin(t * 0.9);

      renderer.render(scene, camera);
    }

    animate();

    // ── HUD indicator for attract mode ────────────────────────────────────
    const hud = document.createElement('div');
    Object.assign(hud.style, {
      position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
      zIndex:'10', fontFamily:'Syne,sans-serif', fontSize:'11px', letterSpacing:'0.2em',
      color:'rgba(200,100,255,0.6)', pointerEvents:'none', textTransform:'uppercase',
      transition:'color 0.3s',
    });
    hud.textContent = '⊕ drag to rotate  ·  scroll to zoom  ·  click to attract/repel';
    document.body.appendChild(hud);
    canvas.addEventListener('click', () => {
      hud.textContent = attract
        ? '◉ attract mode  ·  click to toggle'
        : '◎ repel mode  ·  click to toggle';
      hud.style.color = attract ? 'rgba(255,100,200,0.8)' : 'rgba(150,100,255,0.7)';
    });
  }

  if (typeof THREE !== 'undefined') boot();
  else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
  }
})();
