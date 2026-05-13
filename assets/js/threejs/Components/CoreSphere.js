import { smoothstep, getGlowTex } from '../Utils/Helpers.js';

export class CoreSphere {
  constructor(parent) {
    this.group = new THREE.Group();
    parent.add(this.group);

    this.group.rotation.x = 0.15;
    this.group.rotation.y = -0.25;

    this.CORE_RADIUS = 1.4;
    this.coreGeo = new THREE.IcosahedronGeometry(this.CORE_RADIUS, 5);
    this.basePos = new Float32Array(this.coreGeo.attributes.position.array);
    this.N = this.basePos.length / 3;
    
    this.thetaArr = new Float32Array(this.N);
    this.phiArr = new Float32Array(this.N);
    this.randoms = new Float32Array(this.N);

    for (let i = 0; i < this.N; i++) {
      const x = this.basePos[i*3] / this.CORE_RADIUS;
      const y = this.basePos[i*3+1] / this.CORE_RADIUS;
      const z = this.basePos[i*3+2] / this.CORE_RADIUS;
      this.thetaArr[i] = Math.atan2(y, x);
      this.phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z)));
      this.randoms[i] = Math.random();
    }
    this.coreGeo.setAttribute('aRandom', new THREE.BufferAttribute(this.randoms, 1));

    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xaa00ff, emissive: 0x4400aa, emissiveIntensity: 1.0,
      wireframe: true, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false
    });

    this.corePointsMat = new THREE.PointsMaterial({
      size: 0.12, color: 0xdd88ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, map: getGlowTex('rgba(200,100,255,1)', 16), depthWrite: false
    });

    this.corePoints = new THREE.Points(this.coreGeo, this.corePointsMat);
    this.coreMeshWire = new THREE.Mesh(this.coreGeo, coreMat);
    this.initShaders();
    this.coreMeshWire.castShadow = true;

    this.group.add(this.coreMeshWire);
    this.group.add(this.corePoints);
    this.group.userData.smoothM = 0;

    // Black Hole
    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.group.add(this.blackHole);

    // Glow effects
    this.bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(200,150,255,0.9)', 64),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    this.bhGlow.scale.setScalar(1.2);
    this.group.add(this.bhGlow);

    this.glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(180,50,255,0.8)', 128),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    this.glowOrb.scale.setScalar(6.5);
    this.group.add(this.glowOrb);
  }

  initShaders() {
    this.corePointsMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `
        attribute float aRandom;
        varying float vRandom;
        varying float vNormalZ;
        uniform float uTime;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { 
          vRandom = aRandom;
          vNormalZ = (normalMatrix * normalize(position)).z;`
      ).replace(
        `gl_PointSize = size;`,
        `float t = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0;
         float twinkle = 0.8 + 0.2 * sin(t);
         gl_PointSize = size * twinkle;`
      );
      shader.fragmentShader = `
        varying float vRandom;
        varying float vNormalZ;
        uniform float uTime;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `float t = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0;
         float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t), 2.0);
         float depthFade = smoothstep(-0.2, 0.8, vNormalZ);
         vec4 diffuseColor = vec4( diffuse, opacity * twinkle * depthFade );`
      );
      this.corePointsMat.userData.shader = shader;
    };

    this.coreMeshWire.material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying float vNormalZ;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { vNormalZ = (normalMatrix * normal).z;`
      );
      shader.fragmentShader = `
        varying float vNormalZ;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float depthFade = smoothstep(-0.2, 0.8, vNormalZ);
        vec4 diffuseColor = vec4( diffuse, opacity * depthFade );
        `
      );
    };
  }

  update(t, coreIntro, ringIntro, zf, manualSpeedFactor) {
    if (!this.group.userData.nextPickTime || t > this.group.userData.nextPickTime) {
      const r = Math.random();
      if (r < 0.25) this.group.userData.targetM = 0;
      else if (r < 0.50) this.group.userData.targetM = 1;
      else if (r < 0.75) this.group.userData.targetM = 2;
      else this.group.userData.targetM = 3;
      this.group.userData.nextPickTime = t + 5 + Math.random() * 5;
    }
    this.group.userData.smoothM += (this.group.userData.targetM - this.group.userData.smoothM) * 0.04;
    const morphCycle = this.group.userData.smoothM;

    const positions = this.coreGeo.attributes.position.array;
    for (let i = 0; i < this.N; i++) {
      const idx = i * 3, bx = this.basePos[idx], by = this.basePos[idx+1], bz = this.basePos[idx+2];
      const theta = this.thetaArr[i], phi = this.phiArr[i];
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
      positions[idx]   = bx + (tx - bx) * coreIntro;
      positions[idx+1] = by + (ty - by) * coreIntro;
      positions[idx+2] = bz + (tz - bz) * coreIntro;
    }
    this.coreGeo.attributes.position.needsUpdate = true;
    this.coreGeo.computeVertexNormals();

    const coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (1 + zf * 2.0) * (0.5 + 0.5 * manualSpeedFactor);
    this.group.rotation.y += coreRotSpeed;
    this.group.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
    this.group.scale.setScalar((1 + zf * 0.2) * (0.25 + 0.75 * ringIntro));

    this.glowOrb.scale.setScalar((6.5 + Math.sin(t * 3) * 0.8) * (0.2 + 0.8 * coreIntro));
    if (this.corePointsMat.userData.shader) this.corePointsMat.userData.shader.uniforms.uTime.value = t;
  }
}
