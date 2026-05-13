import { BackgroundEngine } from '../threejs/Core/BackgroundEngine.js';

function boot() {
  if (typeof THREE === 'undefined') {
    setTimeout(boot, 50);
    return;
  }
  new BackgroundEngine();
}

boot();
