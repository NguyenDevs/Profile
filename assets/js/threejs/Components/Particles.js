import { getGlowTex } from '../Utils/Helpers.js';

export class ParticleSystem {
  constructor(parent, isLowPower) {
    const pCount = isLowPower ? 1500 : 4000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 2.0 + Math.pow(Math.random(), 1.5) * 20.0;
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i*3+2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.pMat = new THREE.PointsMaterial({
      size: 0.08, map: getGlowTex('rgba(190,100,255,1)', 16),
      transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.pSystem = new THREE.Points(pGeo, this.pMat);
    parent.add(this.pSystem);
  }

  update(t) {
    this.pSystem.rotation.y = t * 0.05;
    this.pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
    this.pMat.opacity = 0.4 + Math.sin(t * 4) * 0.2;
  }
}
