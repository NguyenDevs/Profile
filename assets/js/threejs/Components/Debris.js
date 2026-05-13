export class DebrisSystem {
  constructor(parent) {
    this.debrisGroup = new THREE.Group();
    parent.add(this.debrisGroup);
    
    const debrisMat = new THREE.MeshPhysicalMaterial({
      color: 0x110522, roughness: 0.2, metalness: 0.9, clearcoat: 0.8, flatShading: true
    });

    for (let i = 0; i < 30; i++) {
      const size = 0.10 + Math.random()*0.30;
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
      this.debrisGroup.add(rock);
    }
  }

  update(t) {
    this.debrisGroup.children.forEach((rock, i) => {
      rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed);
      rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed);
      rock.position.y += Math.sin(t * 2 + i) * 0.005;
    });
  }
}
