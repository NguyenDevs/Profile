(function () {
  'use strict';

  if (window.__coreBlockInitialized) return;
  window.__coreBlockInitialized = true;

  if (typeof THREE === 'undefined') { setTimeout(function () { window.__coreBlockInitialized = false; }, 100); return; }

  var CFG = {
    dirLightIntensity: 2.2, fillLightIntensity: 1.5, pointLightIntensity: 5.0,
    speed: 1.0, zoom: 18, offsetX: -4.5, offsetY: 2.0,
    ringAmount: 4, particleAmount: 5500, particleSize: 0.08,
    debrisAmount: 30, debrisSize: 1.0,
    birthDate: '2004-07-04T09:00:00+07:00', yearLabelText: 'Năm thứ',
    mouseDrag: true, mouseFollow: false, mouseWeight: 50,
    musicEnable: true, musicSensitive: 50, musicStyle: 'tectonic',
    clockMode: 0, clockEnable: true, ringSpacing: 1.0,
    glowSize: 1.0, glowIntensity: 1.0,
    endskyHoleSize: 80, endskyZoom: 1.0, endskyIterations: 16, backgroundSpeed: 0.5
  };

  window.wallpaperConfig = CFG;
  if (!window._wallpaperAudioData) window._wallpaperAudioData = new Array(64).fill(0);

  /* ─── DOM ─── */
  var root = document.createElement('div');
  root.id = 'core-block';

  var canvasWrap = document.createElement('div');
  canvasWrap.id = 'core-block-canvas-wrap';

  var canvas = document.createElement('canvas');
  canvas.id = 'core-block-canvas';

  var hint = document.createElement('div');
  hint.id = 'core-block-hint';
  hint.textContent = 'drag • dbl-click';

  canvasWrap.appendChild(canvas);
  canvasWrap.appendChild(hint);
  root.appendChild(canvasWrap);

  var clock = document.createElement('div');
  clock.id = 'core-clock';
  clock.innerHTML =
    '<div class="core-clock-top" id="cb-label-top">nguyendevs \u0111\u00e3 tham gia server Tr\u00e1i \u0110\u1ea5t</div>' +
    '<div class="core-units">' +
      '<div class="core-unit"><div class="core-num" id="cb-y">--</div><div class="core-unit-label" id="cb-label-y">N\u0103m</div></div>' +
      '<div class="core-sep">:</div>' +
      '<div class="core-unit"><div class="core-num" id="cb-mo">--</div><div class="core-unit-label" id="cb-label-mo">Th\u00e1ng</div></div>' +
      '<div class="core-sep">:</div>' +
      '<div class="core-unit"><div class="core-num" id="cb-d">--</div><div class="core-unit-label" id="cb-label-d">Ng\u00e0y</div></div>' +
      '<div class="core-sep">:</div>' +
      '<div class="core-unit"><div class="core-num" id="cb-h">--</div><div class="core-unit-label" id="cb-label-h">Gi\u1edd</div></div>' +
      '<div class="core-sep">:</div>' +
      '<div class="core-unit"><div class="core-num" id="cb-m">--</div><div class="core-unit-label" id="cb-label-m">Ph\u00fat</div></div>' +
      '<div class="core-sep">:</div>' +
      '<div class="core-unit"><div class="core-num" id="cb-s">--</div><div class="core-unit-label" id="cb-label-s">Gi\u00e2y</div></div>' +
    '</div>' +
    '<div class="core-progress-wrap">' +
      '<div class="core-progress-bg"><div class="core-progress-fill" id="cb-prog" style="width:0%"></div></div>' +
      '<div class="core-progress-meta"><span id="cb-year-label">N\u0103m th\u1ee9 --</span><span id="cb-pct">0%</span></div>' +
    '</div>' +
    '<div class="core-total"><span class="core-total-num" id="cb-total-s">0</span><span class="core-total-label" id="cb-label-total">T\u1ed4NG S\u1ed0 GI\u00c2Y</span></div>' +
    '<div class="core-divider"></div>' +
    '<div class="core-current-wrap">' +
      '<div class="core-curr-header"><span class="core-curr-label" id="cb-label-current">Current Time</span><span class="core-curr-tz" id="cb-current-tz">GMT+0</span></div>' +
      '<div class="core-curr-time">' +
        '<div class="core-unit"><div class="core-curr-num" id="cb-current-h">00</div></div>' +
        '<div class="core-curr-sep">:</div>' +
        '<div class="core-unit"><div class="core-curr-num" id="cb-current-m">00</div></div>' +
        '<div class="core-curr-sep">:</div>' +
        '<div class="core-unit"><div class="core-curr-num core-num--sec" id="cb-current-s">00</div></div>' +
      '</div>' +
      '<div class="core-curr-bottom"><span class="core-curr-day" id="cb-current-day">Wed</span><span class="core-curr-date" id="cb-current-date-sub">01/01/2026</span></div>' +
      '<div class="core-day-prog">' +
        '<div class="core-day-prog-label"><span id="cb-label-dayprog">% day</span><span class="core-day-prog-pct" id="cb-day-pct">0%</span></div>' +
        '<div class="core-day-prog-bg"><div class="core-day-prog-fill" id="cb-day-prog" style="width:0%"></div></div>' +
      '</div>' +
    '</div>';

  root.appendChild(clock);
  document.body.appendChild(root);

  /* ─── THREE.JS ENGINE ─── */

  var Utils = {
    smoothstep: function (x) {
      x = Math.max(0, Math.min(1, x));
      return x * x * (3 - 2 * x);
    },
    getGlowTex: function (color, r) {
      color = color || 'rgba(170,0,255,1)'; r = r || 128;
      var c = document.createElement('canvas');
      c.width = c.height = r * 2;
      var ctx = c.getContext('2d');
      var g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color);
      g.addColorStop(0.2, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }
  };

  /* SceneManager */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, canvasWrap.clientWidth / canvasWrap.clientHeight, 0.1, 1000);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvasWrap.clientWidth, canvasWrap.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var ambientLight = new THREE.AmbientLight(0x150b24, 0.6);
  scene.add(ambientLight);

  var coreLight = new THREE.PointLight(0x8800ff, 5, 25);
  coreLight.castShadow = true;
  coreLight.shadow.mapSize.width = 1024;
  coreLight.shadow.mapSize.height = 1024;
  coreLight.shadow.camera.near = 0.1;
  coreLight.shadow.camera.far = 25;
  coreLight.shadow.bias = -0.0001;
  coreLight.shadow.normalBias = 0.05;
  coreLight.shadow.radius = 4;

  var staticGroup = new THREE.Group();
  scene.add(staticGroup);
  staticGroup.add(coreLight);

  var dirLight = new THREE.DirectionalLight(0xdab3ff, 2.2);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  dirLight.shadow.bias = -0.001;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  var fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
  fillLight.position.set(-15, -10, -15);
  scene.add(fillLight);

  /* InputController */
  var rotQ = new THREE.Quaternion();
  var drag = { active: false, px: 0, py: 0 };
  var velocity = { x: 0, y: 0 };
  var manualZoom = null;
  var autoRotate = true;
  var autoRotateTimeout = null;
  var lastT = null;
  var initialPinchDist = null;

  function onMouseDown(e) {
    if (!CFG.mouseDrag) return;
    drag.active = true;
    drag.px = e.clientX;
    drag.py = e.clientY;
    root.style.cursor = 'grabbing';
    autoRotate = false;
    clearTimeout(autoRotateTimeout);
  }
  function onMouseUp() {
    drag.active = false;
    root.style.cursor = '';
    autoRotateTimeout = setTimeout(function () { autoRotate = true; }, 3000);
  }
  function onMouseMove(e) {
    var canDrag = CFG.mouseDrag;
    var follow = CFG.mouseFollow;
    var weight = CFG.mouseWeight;
    var sens = 0.01 * (1.1 - weight / 100);
    var dx = e.clientX - (drag.px || e.clientX);
    var dy = e.clientY - (drag.py || e.clientY);
    if ((drag.active && canDrag) || follow) {
      velocity.x = dx;
      velocity.y = dy;
      var speed = Math.sqrt(dx * dx + dy * dy);
      if (drag.active && canDrag && speed > 0) {
        rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens));
      }
      if (follow) {
        autoRotate = false;
        clearTimeout(autoRotateTimeout);
        autoRotateTimeout = setTimeout(function () { autoRotate = true; }, 3000);
      }
    }
    drag.px = e.clientX;
    drag.py = e.clientY;
  }
  function onWheel(e) {
    if (manualZoom === null) manualZoom = CFG.zoom;
    manualZoom = Math.max(5, Math.min(50, manualZoom + e.deltaY * 0.015));
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      drag.active = false;
    } else if (CFG.mouseDrag) {
      lastT = e.touches[0];
      drag.active = true;
    }
    autoRotate = false;
    clearTimeout(autoRotateTimeout);
  }
  function onTouchMove(e) {
    var weight = CFG.mouseWeight;
    var sens = 0.01 * (1.1 - weight / 100);
    if (e.touches.length === 2 && initialPinchDist !== null) {
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      var delta = dist - initialPinchDist;
      if (manualZoom === null) manualZoom = CFG.zoom;
      manualZoom = Math.max(5, Math.min(50, manualZoom - delta * 0.05));
      initialPinchDist = dist;
    } else if (e.touches.length === 1 && lastT && CFG.mouseDrag) {
      var t = e.touches[0];
      var dx = t.clientX - lastT.clientX;
      var dy = t.clientY - lastT.clientY;
      velocity.x = dx;
      velocity.y = dy;
      var speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 0) {
        rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens));
      }
      lastT = t;
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) initialPinchDist = null;
    if (e.touches.length === 0) { drag.active = false; lastT = null; autoRotateTimeout = setTimeout(function () { autoRotate = true; }, 3000); }
  }

  canvasWrap.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('wheel', onWheel, { passive: true });
  canvasWrap.addEventListener('touchstart', onTouchStart, { passive: true });
  canvasWrap.addEventListener('touchmove', onTouchMove, { passive: true });
  canvasWrap.addEventListener('touchend', onTouchEnd);

  function updateInput(speedProp) {
    var weight = CFG.mouseWeight;
    var sens = 0.012 * (1.05 - weight / 100);
    var damp = 0.96 + (weight / 100) * 0.038;
    if (!drag.active) {
      var speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (speed > 0.01) {
        rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(velocity.y, velocity.x, 0).normalize(), speed * sens));
        velocity.x *= damp;
        velocity.y *= damp;
      }
    }
    if (autoRotate) {
      rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015 * speedProp));
    }
    rotQ.normalize();
    return rotQ;
  }

  /* ─── CORE 3D CLASSES ─── */

  function CoreMesh(group, radius) {
    this.group = group;
    this.RADIUS = radius;
    this._smoothAudio = new Float32Array(64).fill(0);
    this.initGeometry();
    this.initMaterial();
  }
  CoreMesh.prototype.initGeometry = function () {
    this.geo = new THREE.IcosahedronGeometry(this.RADIUS, 7);
    this.basePos = new Float32Array(this.geo.attributes.position.array);
    var N = this.basePos.length / 3;
    this.thetaArr = new Float32Array(N);
    this.phiArr = new Float32Array(N);
    var randoms = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var x = this.basePos[i * 3] / this.RADIUS, y = this.basePos[i * 3 + 1] / this.RADIUS, z = this.basePos[i * 3 + 2] / this.RADIUS;
      this.thetaArr[i] = Math.atan2(y, x);
      this.phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z)));
      randoms[i] = Math.random();
    }
    this.geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  };
  CoreMesh.prototype.initMaterial = function () {
    var self = this;
    this.wireMat = new THREE.MeshPhysicalMaterial({
      color: 0x8800ff, emissive: 0x220066, emissiveIntensity: 0.8,
      wireframe: true, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.pointsMat = new THREE.PointsMaterial({
      size: 0.08, color: 0xaa44ff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, map: Utils.getGlowTex('rgba(255,255,255,1)', 16), depthWrite: false
    });
    this.wireMat.onBeforeCompile = function (shader) {
      shader.vertexShader = 'varying float vNormalZ;' + shader.vertexShader.replace('void main() {', 'void main() { vNormalZ = (normalMatrix * normal).z;');
      shader.fragmentShader = 'varying float vNormalZ;' + shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float depthFade = smoothstep(-0.4, 0.6, vNormalZ); vec4 diffuseColor = vec4( diffuse, opacity * depthFade );');
    };
    this.pointsMat.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = 'attribute float aRandom; varying float vRandom; varying float vNormalZ; uniform float uTime;' + shader.vertexShader.replace('void main() {', 'void main() { vRandom = aRandom; vNormalZ = (normalMatrix * normalize(position)).z;').replace('gl_PointSize = size;', 'float t_ = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0; float twinkle = 0.8 + 0.2 * sin(t_); gl_PointSize = size * twinkle;');
      shader.fragmentShader = 'varying float vRandom; varying float vNormalZ; uniform float uTime;' + shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float t_ = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0; float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t_), 2.0); float depthFade = smoothstep(-0.4, 0.6, vNormalZ); vec4 diffuseColor = vec4( diffuse, opacity * twinkle * depthFade );');
      self.pointsMat.userData.shader = shader;
    };
    this.points = new THREE.Points(this.geo, this.pointsMat);
    this.wireMesh = new THREE.Mesh(this.geo, this.wireMat);
    this.wireMesh.castShadow = true;
    this.group.add(this.wireMesh);
    this.group.add(this.points);
  };
  CoreMesh.prototype.update = function (t, morphCycle, coreIntro, musicEnable, musicStyle, audioIntensity, audioData) {
    var positions = this.geo.attributes.position.array;
    var N = this.basePos.length / 3;
    var tSmooth = t * 0.6;
    if (musicEnable && audioData) {
      for (var j = 0; j < 64; j++) { this._smoothAudio[j] += (audioData[j] - this._smoothAudio[j]) * 0.15; }
    }
    for (var i = 0; i < N; i++) {
      var idx = i * 3, bx = this.basePos[idx], by = this.basePos[idx + 1], bz = this.basePos[idx + 2];
      var theta = this.thetaArr[i], phi = this.phiArr[i];
      if (musicEnable) {
        var r = 1.0, style = (musicStyle || 'tectonic').toLowerCase();
        if (style === 'tectonic') {
          var pattern = Math.sin(6 * theta) * Math.cos(6 * phi);
          var block = pattern > 0.33 ? 0.2 : pattern < -0.33 ? -0.15 : 0;
          r = 1.0 + block * audioIntensity * 1.2;
        } else if (style === 'wave') {
          var n1 = Math.sin(4 * theta + tSmooth * 0.5) * Math.cos(4 * phi - tSmooth * 0.4);
          var n2 = Math.sin(8 * theta - tSmooth) * Math.cos(8 * phi + tSmooth * 0.5);
          var plate = Utils.smoothstep(0.5 + (n1 * 0.7 + n2 * 0.3) * 0.5);
          r = 1.0 + (plate - 0.5) * 0.8 * audioIntensity;
        } else if (style === 'ripple') {
          r = 1.0 + (Math.sin(phi * 8 - tSmooth * 5) * 0.5 + 0.5) * audioIntensity * 0.5;
        }
        positions[idx] = bx * r; positions[idx + 1] = by * r; positions[idx + 2] = bz * r;
      } else {
        var tectonic = Math.sin(6 * theta) * Math.cos(6 * phi);
        var r1 = 1.0 + (tectonic > 0.3 ? 0.15 : tectonic < -0.3 ? -0.1 : 0);
        var tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
        var r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
        var tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
        var r3 = 1.0 + 0.12 * Math.sin(8 * theta + t * 2) * Math.cos(t * 1.2) + 0.05 * Math.sin(phi * 6);
        var tx3 = bx * r3, ty3 = by * r3, tz3 = bz * r3;
        var tx, ty, tz;
        if (morphCycle < 1) { var l = Utils.smoothstep(morphCycle); tx = bx + (tx1 - bx) * l; ty = by + (ty1 - by) * l; tz = bz + (tz1 - bz) * l; }
        else if (morphCycle < 2) { var l = Utils.smoothstep(morphCycle - 1); tx = tx1 + (tx2 - tx1) * l; ty = ty1 + (ty2 - ty1) * l; tz = tz1 + (tz2 - tz1) * l; }
        else if (morphCycle < 3) { var l = Utils.smoothstep(morphCycle - 2); tx = tx2 + (tx3 - tx2) * l; ty = ty2 + (ty3 - ty2) * l; tz = tz2 + (tz3 - tz2) * l; }
        else { var l = Utils.smoothstep(morphCycle - 3); tx = tx3 + (bx - tx3) * l; ty = ty3 + (by - ty3) * l; tz = bz + (tz3 - bz) * l; }
        positions[idx] = bx + (tx - bx) * coreIntro; positions[idx + 1] = by + (ty - by) * coreIntro; positions[idx + 2] = bz + (tz - bz) * coreIntro;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    if (this.pointsMat.userData.shader) this.pointsMat.userData.shader.uniforms.uTime.value = t;
  };

  function FilamentSystem(group) {
    this.group = new THREE.Group();
    group.add(this.group);
    this.filaments = [];
    this.init();
  }
  FilamentSystem.prototype.init = function () {
    var count = 20;
    for (var i = 0; i < count; i++) {
      var segs = 48, pts = [];
      for (var j = 0; j <= segs; j++) pts.push(new THREE.Vector3());
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({ color: i % 2 === 0 ? 0xff0088 : 0xaa00ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      var line = new THREE.Line(geo, mat);
      line.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(line);
      this.filaments.push({ line: line, r: 0.4 + Math.random() * 0.5, phase: Math.random() * 10, speed: 0.8 + Math.random() * 1.5, noiseScale: 0.15 + Math.random() * 0.25 });
    }
  };
  FilamentSystem.prototype.update = function (t, coreIntro) {
    for (var fi = 0; fi < this.filaments.length; fi++) {
      var f = this.filaments[fi];
      var pos = f.line.geometry.attributes.position.array;
      var segs = 64, time = t * f.speed;
      for (var j = 0; j <= segs; j++) {
        var ang = (j / segs) * Math.PI * 2;
        var n = Math.sin(ang * 3 + time + f.phase) * f.noiseScale;
        var r = f.r * (1 + n * coreIntro);
        pos[j * 3] = Math.cos(ang) * r;
        pos[j * 3 + 1] = Math.sin(ang) * r;
        pos[j * 3 + 2] = Math.sin(time * 0.5 + ang * 2) * f.noiseScale * coreIntro;
      }
      f.line.geometry.attributes.position.needsUpdate = true;
      f.line.rotation.y += 0.01 * coreIntro;
      f.line.rotation.z += 0.005 * coreIntro;
      f.line.material.opacity = (0.2 + Math.sin(t + f.phase) * 0.1) * coreIntro;
    }
  };

  function AuraSystem(group) {
    this.group = group;
    this._smoothBH = 1.0;
    this._colorLight = new THREE.Color(0x9933ff);
    this._colorDark = new THREE.Color(0x330077);
    this.init();
  }
  AuraSystem.prototype.init = function () {
    var bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    var bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.blackHole.renderOrder = 50;
    this.group.add(this.blackHole);

    var self = this;
    function createGlowMat(opacity, power) {
      return new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0x9933ff) }, uOpacity: { value: opacity }, uPower: { value: power } },
        vertexShader: 'varying vec3 vNormal; varying vec3 vViewVec; varying vec3 vLocalPos; void main() { vLocalPos = position; vNormal = normalize(normalMatrix * normal); vec4 mvPos = modelViewMatrix * vec4(position, 1.0); vViewVec = normalize(-mvPos.xyz); gl_Position = projectionMatrix * mvPos; }',
        fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; uniform float uPower; varying vec3 vNormal; varying vec3 vViewVec; varying vec3 vLocalPos; void main() { float dotNV = abs(dot(vNormal, vViewVec)); float glow = pow(dotNV, uPower); float softEdge = smoothstep(0.0, 0.15, dotNV); float zFade = 1.0; if (vLocalPos.z > -0.2) { zFade = smoothstep(0.2, -0.2, vLocalPos.z); } gl_FragColor = vec4(uColor, glow * uOpacity * softEdge * zFade); }',
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
    }

    var glowGeo = new THREE.SphereGeometry(1, 32, 32);
    this.bhGlowMat = createGlowMat(1.0, 2.5);
    this.bhGlow = new THREE.Mesh(glowGeo, this.bhGlowMat);
    this.bhGlow.scale.setScalar(0.75);
    this.bhGlow.renderOrder = 51;
    this.group.add(this.bhGlow);

    this.glowMat = createGlowMat(0.9, 1.2);
    this.glowOrb = new THREE.Mesh(glowGeo, this.glowMat);
    this.glowOrb.renderOrder = 5;
    this.group.add(this.glowOrb);
  };
  AuraSystem.prototype.update = function (t, coreIntro, audioIntensity, musicEnable, coreLight) {
    var glowSize = CFG.glowSize, glowIntensity = CFG.glowIntensity, ptIntensity = CFG.pointLightIntensity;
    var targetBH;
    if (musicEnable) {
      coreLight.intensity = (0.5 + audioIntensity * 3) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((1.8 + audioIntensity * 1.2) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar((0.55 + audioIntensity * 0.45) * (0.5 + 0.5 * coreIntro) * glowSize);
      targetBH = Math.max(0.5, 1.0 - audioIntensity * 1.1);
    } else {
      coreLight.intensity = (0.8 + Math.sin(t * 2) * 0.4) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((2.2 + Math.sin(t * 3) * 0.3) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar(0.75 * glowSize);
      targetBH = 1.0 + Math.sin(t * 1.5) * 0.05;
    }
    var lerpFactor = targetBH < this._smoothBH ? 0.35 : 0.15;
    this._smoothBH += (targetBH - this._smoothBH) * lerpFactor;
    this.blackHole.scale.setScalar(this._smoothBH);
    var cRatio = Math.max(0, Math.min(1, (this._smoothBH - 0.5) / 0.5));
    var finalColor = new THREE.Color().lerpColors(this._colorDark, this._colorLight, cRatio);
    this.glowMat.uniforms.uColor.value.copy(finalColor);
    this.glowMat.uniforms.uOpacity.value = (0.7 + (1.0 - cRatio) * 0.3) * glowIntensity * coreIntro;
    this.bhGlowMat.uniforms.uColor.value.copy(finalColor);
    this.bhGlowMat.uniforms.uOpacity.value = 0.9 * glowIntensity * coreIntro;
  };

  function CoreSystem(parentGroup) {
    this.group = new THREE.Group();
    parentGroup.add(this.group);
    this.rotGroup = new THREE.Group();
    this.rotGroup.rotation.x = 0.15;
    this.rotGroup.rotation.y = -0.25;
    this.group.add(this.rotGroup);
    this.RADIUS = 1.4;
    this.mesh = new CoreMesh(this.rotGroup, this.RADIUS);
    this.filaments = new FilamentSystem(this.rotGroup);
    this.aura = new AuraSystem(this.group);
    this.userData = { smoothM: 0, targetM: 0, nextPickTime: 0 };
  }
  CoreSystem.prototype.update = function (t, coreIntro, ringIntro, speedProp, audioIntensity, audioData, musicEnable, musicStyle, musicSensitive, coreLight) {
    if (!musicEnable) {
      if (!this.userData.nextPickTime || t > this.userData.nextPickTime) {
        var r = Math.random();
        this.userData.targetM = r < 0.25 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : 3;
        this.userData.nextPickTime = t + 5 + Math.random() * 5;
      }
      this.userData.smoothM += (this.userData.targetM - this.userData.smoothM) * 0.04;
    } else { this.userData.smoothM = 0; }
    this.mesh.update(t, this.userData.smoothM, coreIntro, musicEnable, musicStyle, audioIntensity, audioData);
    this.filaments.update(t, coreIntro);
    this.aura.update(t, coreIntro, audioIntensity, musicEnable, coreLight);
    var coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (0.5 + 0.5 * speedProp);
    this.rotGroup.rotation.y += coreRotSpeed;
    this.rotGroup.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
    this.group.scale.setScalar(0.25 + 0.75 * ringIntro);
  };

  function RingSystem(parentGroup) {
    this.parentGroup = parentGroup;
    this.rings = [];
    this.setupRings();
  }
  RingSystem.prototype.setupRings = function () {
    var self = this;
    this.rings.forEach(function (r) { self.parentGroup.remove(r.obj); });
    var amount = CFG.ringAmount;
    var spacing = CFG.ringSpacing;
    var ringConfigs = [
      { w: 0.6, d: 0.6, s: 0.007, a: new THREE.Vector3(1, 0.5, 0.2), skip: [{ skip: 1, prob: 20 }, { skip: 0, prob: 80 }] },
      { w: 0.8, d: 0.8, s: -0.004, a: new THREE.Vector3(-0.5, 1, 0.5), skip: [{ skip: 1, prob: 30 }, { skip: 0, prob: 70 }] },
      { w: 1.0, d: 1.2, s: 0.003, a: new THREE.Vector3(0.2, -0.5, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 0, prob: 50 }] },
      { w: 1.2, d: 1.4, s: -0.002, a: new THREE.Vector3(0.5, 0.8, -0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 3, prob: 10 }, { skip: 0, prob: 40 }] },
      { w: 1.4, d: 1.6, s: 0.001, a: new THREE.Vector3(0.1, 1, 0.4), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 1.6, d: 1.8, s: -0.005, a: new THREE.Vector3(0.8, 0.2, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 1.8, d: 2.0, s: 0.006, a: new THREE.Vector3(-1, -0.5, 0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 2.0, d: 2.2, s: -0.003, a: new THREE.Vector3(0.3, -1, 0.6), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] }
    ];
    this.rings = [];
    var currentR2 = 2.4;
    var fragmentGap = 0.3 / Math.sqrt(spacing);
    for (var i = 0; i < amount; i++) {
      var c = ringConfigs[i % ringConfigs.length];
      var ringGap = 0.6 * spacing;
      var r1 = currentR2 + ringGap, r2 = r1 + c.w;
      currentR2 = r2;
      var r = this.createFragmentedRing(r1, r2, c.d, 3 + (i % 4), c.s, c.a, this.getSkipIndices(3 + (i % 4), c.skip), fragmentGap);
      this.rings.push(r);
      this.parentGroup.add(r.obj);
    }
  };
  RingSystem.prototype.getSkipIndices = function (count, probs) {
    var r = Math.random() * 100, cumulative = 0, numToSkip = 0;
    for (var pi = 0; pi < probs.length; pi++) { cumulative += probs[pi].prob; if (r <= cumulative) { numToSkip = probs[pi].skip; break; } }
    var indices = [], available = [];
    for (var si = 0; si < count; si++) available.push(si);
    for (var si2 = 0; si2 < numToSkip; si2++) { if (available.length === 0) break; var idx = Math.floor(Math.random() * available.length); indices.push(available.splice(idx, 1)[0]); }
    return indices;
  };
  RingSystem.prototype.createFragmentedRing = function (innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices, gap) {
    var group = new THREE.Group();
    var stoneMat = new THREE.MeshPhysicalMaterial({ color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3, metalness: 1.0, roughness: 0.25, clearcoat: 0.5, flatShading: false });
    var materials = [stoneMat, stoneMat];
    var totalArc = Math.PI * 2, arcLength = totalArc / fragmentsCount - gap;
    var skipArr = hiddenIndices || [];
    if (!hiddenIndices) {
      var maxSkip = fragmentsCount <= 3 ? 1 : 2, numSkip = 1 + Math.floor(Math.random() * maxSkip);
      for (var si = 0; si < numSkip; si++) { var sIdx; do { sIdx = Math.floor(Math.random() * fragmentsCount); } while (skipArr.indexOf(sIdx) !== -1); skipArr.push(sIdx); }
    }
    for (var i = 0; i < fragmentsCount; i++) {
      if (skipArr.indexOf(i) !== -1) continue;
      var start = i * (totalArc / fragmentsCount), end = start + arcLength, chamfer = 0.15;
      var shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, start + chamfer / outerR, end - chamfer / outerR, false);
      shape.lineTo(Math.cos(end) * (outerR - chamfer), Math.sin(end) * (outerR - chamfer));
      shape.lineTo(Math.cos(end) * (innerR + chamfer), Math.sin(end) * (innerR + chamfer));
      shape.absarc(0, 0, innerR, end - chamfer / innerR, start + chamfer / innerR, true);
      shape.lineTo(Math.cos(start) * (innerR + chamfer), Math.sin(start) * (innerR + chamfer));
      shape.lineTo(Math.cos(start) * (outerR - chamfer), Math.sin(start) * (outerR - chamfer));
      var geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.15, bevelThickness: 0.15, curveSegments: 48 });
      geo.translate(0, 0, -depth / 2);
      var mesh = new THREE.Mesh(geo, materials);
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    var gapConnectors = [];
    for (var gi = 0; gi < fragmentsCount; gi++) {
      var nextIdx = (gi + 1) % fragmentsCount;
      if (skipArr.indexOf(gi) === -1 && skipArr.indexOf(nextIdx) === -1) {
        var midAngle = gi * (totalArc / fragmentsCount) + arcLength + gap / 2;
        var poly = new THREE.Mesh(new THREE.IcosahedronGeometry((outerR - innerR) * 0.4, 0), stoneMat);
        poly.position.set(Math.cos(midAngle) * ((innerR + outerR) / 2), Math.sin(midAngle) * ((innerR + outerR) / 2), 0);
        poly.castShadow = true; poly.receiveShadow = true;
        group.add(poly);
        gapConnectors.push(poly);
      }
    }
    return { obj: group, axis: axis.normalize(), speed: rotSpeed, gapConnectors: gapConnectors };
  };
  RingSystem.prototype.update = function (ringIntro, speedBoost, speedProp) {
    for (var ri = 0; ri < this.rings.length; ri++) {
      var r = this.rings[ri];
      var ringSpeed = r.speed * (0.2 + 0.8 * ringIntro) * speedBoost * speedProp;
      r.obj.rotateOnAxis(r.axis, ringSpeed);
      r.obj.rotateX(0.002 * speedProp * ringIntro);
      r.obj.rotateZ(0.001 * speedProp * ringIntro);
      r.obj.scale.setScalar(ringIntro);
      if (r.gapConnectors) {
        for (var ci = 0; ci < r.gapConnectors.length; ci++) { var c = r.gapConnectors[ci]; c.rotateX(0.015); c.rotateZ(0.01); }
      }
    }
  };

  function DebrisSystem(parentGroup) {
    this.parentGroup = parentGroup;
    this.group = new THREE.Group();
    this.parentGroup.add(this.group);
    this.setupDebris();
  }
  DebrisSystem.prototype.setupDebris = function () {
    var self = this;
    self.parentGroup.remove(self.group);
    self.group = new THREE.Group();
    self.parentGroup.add(self.group);
    var amount = CFG.debrisAmount, scale = CFG.debrisSize;
    var debrisMat = new THREE.MeshPhysicalMaterial({ color: 0x110522, roughness: 0.2, metalness: 0.9, clearcoat: 0.8, flatShading: true });
    for (var i = 0; i < amount; i++) {
      var size = (0.1 + Math.random() * 0.3) * scale;
      var randGeo = Math.floor(Math.random() * 5);
      var geo;
      switch (randGeo) { case 0: geo = new THREE.TetrahedronGeometry(size, 0); break; case 1: geo = new THREE.BoxGeometry(size * 1.3, size * 1.3, size * 1.3); break; case 2: geo = new THREE.OctahedronGeometry(size, 0); break; case 3: geo = new THREE.DodecahedronGeometry(size, 0); break; default: geo = new THREE.IcosahedronGeometry(size, 0); break; }
      var rock = new THREE.Mesh(geo, debrisMat);
      rock.castShadow = true; rock.receiveShadow = true;
      var r = 7 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      rock.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      rock.userData.rotAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
      rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
      self.group.add(rock);
    }
  };
  DebrisSystem.prototype.update = function (t, speedProp) {
    var children = this.group.children;
    for (var i = 0; i < children.length; i++) {
      var rock = children[i];
      rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed * speedProp);
      rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed * speedProp);
      rock.position.y += Math.sin(t * 2 + i) * 0.005;
    }
  };

  function ParticleSystem(scene) {
    this.scene = scene;
    this.pSystem = null;
    this.setupParticles();
  }
  ParticleSystem.prototype.setupParticles = function () {
    if (this.pSystem) this.scene.remove(this.pSystem);
    var amount = CFG.particleAmount, size = CFG.particleSize;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(amount * 3);
    var randoms = new Float32Array(amount);
    var distances = new Float32Array(amount);
    for (var i = 0; i < amount; i++) {
      var r = 2.0 + Math.pow(Math.random(), 1.5) * 22.0;
      var theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      randoms[i] = Math.random();
      distances[i] = r;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    pGeo.setAttribute('aDist', new THREE.BufferAttribute(distances, 1));
    var self = this;
    var pMat = new THREE.PointsMaterial({ size: size, map: Utils.getGlowTex('rgba(190,100,255,1)', 16), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    pMat.onBeforeCompile = function (shader) {
      shader.uniforms.uAudioIntensity = { value: 0 };
      shader.uniforms.uMusicEnable = { value: 0 };
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = 'attribute float aRandom; attribute float aDist; varying float vRandom; varying float vDist;' + shader.vertexShader.replace('void main() {', 'void main() { vRandom = aRandom; vDist = aDist;');
      shader.fragmentShader = 'varying float vRandom; varying float vDist; uniform float uAudioIntensity; uniform float uMusicEnable; uniform float uTime;' + shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        'float proximity = smoothstep(24.0, 2.0, vDist); float baseOpacity = 0.15 + proximity * 0.12; float finalOpacity = baseOpacity;' +
        'if (uMusicEnable > 0.5) { float distOffset = vDist * 0.015; float pulse = smoothstep(vRandom * 0.3 + distOffset, vRandom * 0.3 + 0.6 + distOffset, uAudioIntensity); float sparkle = pow(0.5 + 0.5 * sin(uTime * (3.0 + vRandom * 5.0) + vDist * 0.3), 2.0) * 0.4; finalOpacity = baseOpacity + pulse * 1.1 + sparkle * (1.0 + uAudioIntensity); }' +
        'else { float idleTwinkle = pow(0.5 + 0.5 * sin(uTime * 1.2 + vRandom * 20.0 + vDist * 0.1), 2.0) * 0.2; finalOpacity = baseOpacity + idleTwinkle; }' +
        'vec4 diffuseColor = vec4( diffuse, finalOpacity );');
      pMat.userData.shader = shader;
    };
    this.pSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(this.pSystem);
  };
  ParticleSystem.prototype.update = function (t, speedProp, audioIntensity, musicEnable) {
    this.pSystem.rotation.y = t * 0.04 * speedProp;
    this.pSystem.rotation.z = Math.sin(t * 0.08) * 0.08;
    if (this.pSystem.material.userData.shader) {
      var s = this.pSystem.material.userData.shader;
      s.uniforms.uAudioIntensity.value = audioIntensity;
      s.uniforms.uMusicEnable.value = musicEnable ? 1 : 0;
      s.uniforms.uTime.value = t;
    }
  };

  /* ─── WALLPAPER ENGINE ─── */
  var mainGroup = new THREE.Group();
  scene.add(mainGroup);

  var core = new CoreSystem(staticGroup);
  var rings = new RingSystem(mainGroup);
  var debris = new DebrisSystem(mainGroup);
  var particles = new ParticleSystem(scene);

  var engineT = 0, introProgress = 0, smoothAudioIntensity = 0;
  var _envPeak = 0, _envAvg = 0, _envRelative = 0;

  camera.position.set(CFG.offsetX, CFG.offsetY, CFG.zoom);

  function updateAudioIntensity() {
    var audio = window._wallpaperAudioData;
    if (CFG.musicEnable && audio && audio.length > 0) {
      var bass = 0, mid = 0, high = 0, j;
      for (j = 0; j < 12; j++) bass += audio[j]; bass /= 12;
      for (j = 12; j < 48; j++) mid += audio[j]; mid /= 36;
      for (j = 48; j < 64; j++) high += audio[j]; high /= 16;
      var sens = (CFG.musicSensitive) / 50;
      var raw = (bass * 0.6 + mid * 0.3 + high * 0.1) * sens;
      raw = Math.pow(raw, 0.85);
      if (raw > _envPeak) _envPeak += (raw - _envPeak) * 0.85; else _envPeak += (raw - _envPeak) * 0.1;
      _envAvg += (raw - _envAvg) * 0.01;
      var delta = Math.max(0, _envPeak - _envAvg);
      var boost = 1.0 + (1.0 - Math.min(1.0, delta * 2.0)) * 0.5;
      var scaled = delta * sens * 4.0 * boost;
      var attack = 0.7, decay = 0.1;
      if (scaled > _envRelative) _envRelative += (scaled - _envRelative) * attack; else _envRelative += (scaled - _envRelative) * decay;
      smoothAudioIntensity = Math.min(1.5, _envRelative);
    } else {
      _envPeak *= 0.85; _envAvg *= 0.95; _envRelative *= 0.88;
      smoothAudioIntensity = _envRelative;
    }
    return smoothAudioIntensity;
  }

  function animate() {
    window.__coreBlockRaf = requestAnimationFrame(animate);
    engineT += 0.01;
    var speedProp = CFG.speed;
    var targetZoom = manualZoom !== null ? manualZoom : CFG.zoom;
    camera.position.z += (targetZoom - camera.position.z) * 0.05;
    camera.position.y += (CFG.offsetY - camera.position.y) * 0.05;
    camera.updateProjectionMatrix();
    var rot = updateInput(speedProp);
    mainGroup.quaternion.copy(rot);
    window._threejsRotQ = rot;
    introProgress = Math.min(1, introProgress + 0.004);
    var ringIntro = Utils.smoothstep(Math.min(1, introProgress / 0.75));
    var coreIntro = Utils.smoothstep(Math.max(0, (introProgress - 0.7) / 0.3));
    var speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;
    var audioIntensity = updateAudioIntensity();
    var audioData = window._wallpaperAudioData;
    core.update(engineT, coreIntro, ringIntro, speedProp, audioIntensity, audioData, CFG.musicEnable, CFG.musicStyle, CFG.musicSensitive, coreLight);
    rings.update(ringIntro, speedBoost, speedProp);
    debris.update(engineT, speedProp);
    particles.update(engineT, speedProp, audioIntensity, CFG.musicEnable);
    ambientLight.intensity = 0.6;
    dirLight.intensity = CFG.dirLightIntensity;
    fillLight.intensity = CFG.fillLightIntensity;
    renderer.render(scene, camera);
  }

  /* ─── CLOCK UPDATE ─── */
  var prevS = -1, prevM = -1, prevH = -1, prevD = -1;
  var prevSH = -1, prevSM = -1, prevSS = -1;

  function fmt(n) { return String(n).padStart(2, '0'); }
  function flash(id) { var el = document.getElementById(id); if (!el) return; el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 300); }

  function updateClock() {
    var now = new Date();
    var birthDate = new Date(CFG.birthDate);
    if (!isNaN(birthDate.getTime())) {
      var diffMs = now - birthDate, totalSecs = Math.floor(diffMs / 1000);
      var years = now.getFullYear() - birthDate.getFullYear(), months = now.getMonth() - birthDate.getMonth(), days = now.getDate() - birthDate.getDate(), hours = now.getHours() - birthDate.getHours(), minutes = now.getMinutes() - birthDate.getMinutes(), seconds = now.getSeconds() - birthDate.getSeconds();
      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) { days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); months--; }
      if (months < 0) { months += 12; years--; }
      document.getElementById('cb-y').textContent = years;
      document.getElementById('cb-mo').textContent = fmt(months);
      document.getElementById('cb-d').textContent = fmt(days);
      document.getElementById('cb-h').textContent = fmt(hours);
      document.getElementById('cb-m').textContent = fmt(minutes);
      document.getElementById('cb-s').textContent = fmt(seconds);
      document.getElementById('cb-total-s').textContent = totalSecs.toLocaleString();
      document.getElementById('cb-year-label').textContent = CFG.yearLabelText + ' ' + (years + 1);
      if (seconds !== prevS) { flash('cb-s'); prevS = seconds; }
      if (minutes !== prevM) { flash('cb-m'); prevM = minutes; }
      if (hours !== prevH) { flash('cb-h'); prevH = hours; }
      if (days !== prevD) { flash('cb-d'); prevD = days; }
      var daysInYear = (years % 4 === 0 && (years % 100 !== 0 || years % 400 === 0)) ? 366 : 365;
      var startOfYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate(), birthDate.getHours(), birthDate.getMinutes(), birthDate.getSeconds());
      if (now < startOfYear) startOfYear.setFullYear(now.getFullYear() - 1);
      var yearPct = Math.min(100, ((now - startOfYear) / (daysInYear * 86400000)) * 100).toFixed(1);
      document.getElementById('cb-prog').style.width = yearPct + '%';
      document.getElementById('cb-pct').textContent = yearPct + '%';
    }
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
    document.getElementById('cb-current-h').textContent = fmt(hh);
    document.getElementById('cb-current-m').textContent = fmt(mm);
    document.getElementById('cb-current-s').textContent = fmt(ss);
    if (ss !== prevSS) { flash('cb-current-s'); prevSS = ss; }
    if (mm !== prevSM) { flash('cb-current-m'); prevSM = mm; }
    if (hh !== prevSH) { flash('cb-current-h'); prevSH = hh; }
    var daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('cb-current-day').textContent = daysEN[now.getDay()];
    document.getElementById('cb-current-date-sub').textContent = fmt(now.getDate()) + '/' + fmt(now.getMonth() + 1) + '/' + now.getFullYear();
    var offset = -now.getTimezoneOffset() / 60;
    document.getElementById('cb-current-tz').textContent = 'GMT' + (offset >= 0 ? '+' : '') + offset;
    var secOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    var dayPctValue = (secOfDay / 86400 * 100).toFixed(1);
    var dpEl = document.getElementById('cb-day-prog'), dpPct = document.getElementById('cb-day-pct');
    if (dpEl) dpEl.style.width = dayPctValue + '%';
    if (dpPct) dpPct.textContent = dayPctValue + '%';
  }

  setInterval(updateClock, 1000);
  updateClock();

  /* ─── DOUBLE CLICK WAVE ─── */
  canvasWrap.addEventListener('dblclick', function (e) {
    var wave = document.createElement('div');
    wave.className = 'core-wave';
    wave.style.left = e.clientX + 'px';
    wave.style.top = e.clientY + 'px';
    document.body.appendChild(wave);
    setTimeout(function () { wave.remove(); }, 600);
    CFG.clockMode = CFG.clockMode === 0 ? 1 : 0;
    if (CFG.clockMode === 1) { clock.classList.add('mode-current'); } else { clock.classList.remove('mode-current'); }
  });

  /* ─── DRAG TO REPOSITION ─── */
  (function () {
    var isDragging = false, startX, startY, origX, origY;
    var header = canvasWrap;
    header.addEventListener('mousedown', function (e) {
      if (e.target !== canvas && e.target !== hint && e.target !== canvasWrap) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      var rect = root.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      root.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      root.style.left = (origX + dx) + 'px';
      root.style.top = (origY + dy) + 'px';
      root.style.right = 'auto';
    });
    window.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      root.classList.remove('dragging');
    });
  })();

  /* ─── RESIZE ─── */
  function onResize() {
    var w = canvasWrap.clientWidth;
    var h = canvasWrap.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }
  window.addEventListener('resize', onResize);
  setTimeout(onResize, 100);

  /* ─── START ─── */
  animate();
})();
