export class RingSystem {
  constructor(parent) {
    this.parent = parent;
    this.rings = [
      this.createFragmentedRing(3.0, 3.6, 0.6, 3, 0.007, new THREE.Vector3(1, 0.5, 0.2), this.getSkipIndices(3, [{skip:1,prob:20},{skip:0,prob:80}])),
      this.createFragmentedRing(4.2, 5.0, 0.8, 4, -0.004, new THREE.Vector3(-0.5, 1, 0.5), this.getSkipIndices(4, [{skip:1,prob:30},{skip:0,prob:70}])),
      this.createFragmentedRing(5.6, 6.6, 1.2, 5, 0.003, new THREE.Vector3(0.2, -0.5, 1), this.getSkipIndices(5, [{skip:1,prob:30},{skip:2,prob:20},{skip:0,prob:50}])),
      this.createFragmentedRing(7.2, 8.4, 1.4, 6, -0.002, new THREE.Vector3(0.5, 0.8, -0.3), this.getSkipIndices(6, [{skip:1,prob:30},{skip:2,prob:20},{skip:3,prob:10},{skip:0,prob:40}])),
    ];
    this.rings.forEach(r => this.parent.add(r.obj));
  }

  createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null) {
    const group = new THREE.Group();
    const fragments = [];

    const stoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0b3a, emissive: 0x110522, emissiveIntensity: 0.4,
      metalness: 0.9, roughness: 0.1, clearcoat: 1.0, flatShading: true
    });
    const bevelMat = new THREE.MeshPhysicalMaterial({
      color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3,
      metalness: 0.8, roughness: 0.3, clearcoat: 0.5, flatShading: true
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
        depth: depth, bevelEnabled: true, bevelSegments: 3,
        steps: 1, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 48
      };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.translate(0, 0, -depth / 2);
      const mesh = new THREE.Mesh(geo, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      fragments.push({
        mesh,
        axis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
        speed: 0.01 + Math.random() * 0.02
      });
    }
    return { obj: group, axis: axis.normalize(), speed: rotSpeed, fragments };
  }

  getSkipIndices(count, probs) {
    const r = Math.random() * 100;
    let cumulative = 0;
    let numToSkip = 0;
    for (const p of probs) {
      cumulative += p.prob;
      if (r <= cumulative) { numToSkip = p.skip; break; }
    }
    const indices = [];
    const available = Array.from({ length: count }, (_, i) => i);
    for (let i = 0; i < numToSkip; i++) {
      if (available.length === 0) break;
      const idx = Math.floor(Math.random() * available.length);
      indices.push(available.splice(idx, 1)[0]);
    }
    return indices;
  }

  update(zf, ringIntro, speedBoost, manualSpeedFactor, manualDistanceFactor) {
    this.rings.forEach((r, i) => {
      const ringSpeed = r.speed * (1 + zf * 3.0) * (0.2 + 0.8 * ringIntro) * speedBoost * manualSpeedFactor;
      r.obj.rotateOnAxis(r.axis, ringSpeed);
      r.obj.rotateX(0.002 * manualSpeedFactor * ringIntro);
      r.obj.rotateZ(0.001 * manualSpeedFactor * ringIntro);
      r.obj.scale.setScalar((1 + zf * (0.15 + i * 0.08)) * ringIntro * manualDistanceFactor);
    });
  }
}
