export class InteractionHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.rotQ = new THREE.Quaternion();
    this.drag = { active: false, px: 0, py: 0 };
    this.velocity = { x: 0, y: 0 };
    this.zoom = 10.0;
    this.autoRotate = true;
    this.autoRotateTimeout = null;
    this.lastT = null;
    this.initialPinchDist = null;

    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this.drag.active = true; this.drag.px = e.clientX; this.drag.py = e.clientY;
      this.canvas.style.cursor = 'grabbing';
      this.autoRotate = false; clearTimeout(this.autoRotateTimeout);
    });

    window.addEventListener('mouseup', () => {
      this.drag.active = false; this.canvas.style.cursor = 'grab';
      this.autoRotateTimeout = setTimeout(() => this.autoRotate = true, 3000);
    });

    window.addEventListener('mousemove', e => {
      if (this.drag.active) {
        const dx = e.clientX - this.drag.px, dy = e.clientY - this.drag.py;
        this.velocity.x = dx; this.velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        if (speed > 0) this.rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed*0.005));
        this.drag.px = e.clientX; this.drag.py = e.clientY;
      }
    }, { passive: true });

    window.addEventListener('wheel', e => this.zoom = Math.max(8, Math.min(35, this.zoom + e.deltaY*0.015)), {passive:true});

    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        this.initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.drag.active = false;
      } else {
        this.lastT = e.touches[0];
        this.drag.active = true;
      }
      this.autoRotate = false;
      clearTimeout(this.autoRotateTimeout);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && this.initialPinchDist !== null) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = dist - this.initialPinchDist;
        this.zoom = Math.max(8, Math.min(35, this.zoom - delta * 0.05));
        this.initialPinchDist = dist;
      } else if (e.touches.length === 1 && this.lastT) {
        const t = e.touches[0];
        const dx = t.clientX - this.lastT.clientX, dy = t.clientY - this.lastT.clientY;
        this.velocity.x = dx; this.velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        if (speed > 0) this.rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed*0.005));
        this.lastT = t;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', e => {
      if (e.touches.length < 2) this.initialPinchDist = null;
      if (e.touches.length === 0) {
        this.drag.active = false;
        this.lastT = null;
        this.autoRotateTimeout = setTimeout(() => this.autoRotate = true, 3000);
      }
    });
  }

  update(mainGroup, camera) {
    if (!this.drag.active) {
      const speed = Math.sqrt(this.velocity.x*this.velocity.x + this.velocity.y*this.velocity.y);
      if (speed > 0.08) {
        this.rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(this.velocity.y, this.velocity.x, 0).normalize(), speed*0.005));
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
      }
    } else {
      this.velocity.x *= 0.5;
      this.velocity.y *= 0.5;
    }

    if (this.autoRotate) {
      const _q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015);
      this.rotQ.premultiply(_q);
    }
    this.rotQ.normalize();
    mainGroup.quaternion.copy(this.rotQ);
    window._threejsRotQ = this.rotQ;

    camera.position.z += (this.zoom - camera.position.z) * 0.05;
    const currentZf = Math.max(0, Math.min(1, (35 - camera.position.z) / 27));
    camera.position.y = 2.0 - currentZf * 2.0;

    return currentZf;
  }
}
