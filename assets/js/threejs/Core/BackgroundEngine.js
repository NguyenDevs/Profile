import { SceneSetup } from './SceneSetup.js';
import { CoreSphere } from '../Components/CoreSphere.js';
import { FilamentSystem } from '../Components/Filaments.js';
import { FlareSystem } from '../Components/Flares.js';
import { RingSystem } from '../Components/Rings.js';
import { DebrisSystem } from '../Components/Debris.js';
import { ParticleSystem } from '../Components/Particles.js';
import { InteractionHandler } from '../Handlers/InteractionHandler.js';
import { SettingsHandler } from '../Handlers/SettingsHandler.js';
import { smoothstep } from '../Utils/Helpers.js';

export class BackgroundEngine {
  constructor() {
    this.initCanvas();
    this.sceneSetup = new SceneSetup(this.canvas);
    
    this.mainGroup = new THREE.Group();
    this.sceneSetup.scene.add(this.mainGroup);

    this.isLowPower = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.frameInterval = this.isLowPower ? 2 : 1;
    this.frameCount = 0;

    this.coreSphere = new CoreSphere(this.mainGroup, this.isLowPower);
    this.filaments = new FilamentSystem(this.coreSphere.group);
    this.flares = new FlareSystem(this.coreSphere.group);
    this.rings = new RingSystem(this.mainGroup);
    this.debris = new DebrisSystem(this.mainGroup);
    this.particles = new ParticleSystem(this.sceneSetup.scene, this.isLowPower);
    
    this.interaction = new InteractionHandler(this.canvas);
    this.settings = new SettingsHandler();

    this.t = 0;
    this.introProgress = 0;
    this.lastDispatchedZoom = this.interaction.zoom;
    this.lastDispatchedQ = { x: 0, y: 0, z: 0, w: 1 };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(window._threejsRafId);
      } else {
        this.animate();
      }
    });

    this.animate();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'threejs-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab', background: 'transparent',
      touchAction: 'none'
    });
    document.body.insertBefore(this.canvas, document.body.firstChild);
    requestAnimationFrame(() => { this.canvas.style.opacity = '1'; });
  }

  quatChanged(a, b) {
    return Math.abs(a.x-b.x)>0.0001 || Math.abs(a.y-b.y)>0.0001 ||
           Math.abs(a.z-b.z)>0.0001 || Math.abs(a.w-b.w)>0.0001;
  }

  animate() {
    if (document.hidden) return;
    window._threejsRafId = requestAnimationFrame(() => this.animate());
    this.frameCount++;
    if (this.frameCount % this.frameInterval !== 0) return;
    this.t += 0.01 * this.frameInterval;

    // Dispatch camera events
    if (Math.abs(this.interaction.zoom - this.lastDispatchedZoom) > 0.01 || this.quatChanged(this.interaction.rotQ, this.lastDispatchedQ)) {
      window.dispatchEvent(new CustomEvent('threejs-camera', { detail: {
        zoom: this.interaction.zoom,
        quaternion: { x: this.interaction.rotQ.x, y: this.interaction.rotQ.y, z: this.interaction.rotQ.z, w: this.interaction.rotQ.w },
        dragging: this.interaction.drag.active
      }}));
      this.lastDispatchedZoom = this.interaction.zoom;
      this.lastDispatchedQ = { x: this.interaction.rotQ.x, y: this.interaction.rotQ.y, z: this.interaction.rotQ.z, w: this.interaction.rotQ.w };
    }

    const zf = this.interaction.update(this.mainGroup, this.sceneSetup.camera);

    this.introProgress = Math.min(1, this.introProgress + 0.004);
    const ringIntro = smoothstep(Math.min(1, this.introProgress / 0.75));
    const coreIntro = smoothstep(Math.max(0, (this.introProgress - 0.7) / 0.3));
    const speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;

    this.sceneSetup.update(this.t, coreIntro);
    this.coreSphere.update(this.t, coreIntro, ringIntro, zf, this.settings.manualSpeedFactor);
    this.filaments.update(this.t, coreIntro);
    this.flares.update(this.t, coreIntro);
    this.rings.update(zf, ringIntro, speedBoost, this.settings.manualSpeedFactor, this.settings.manualDistanceFactor);
    this.debris.update(this.t);
    this.particles.update(this.t);
    
    this.settings.update(this.sceneSetup.renderer);
    this.sceneSetup.render();
  }
}
