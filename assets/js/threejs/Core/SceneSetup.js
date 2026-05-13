export class SceneSetup {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const cameraX = window.innerWidth <= 768 ? 0 : -4.5;
    this.camera.position.set(cameraX, 2, 18);

    this.initLights();
    
    window.addEventListener('resize', () => this.onResize());
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0x150b24, 0.6));

    this.coreLight = new THREE.PointLight(0xcc00ff, 5, 25);
    this.coreLight.castShadow = true;
    this.coreLight.shadow.bias = -0.001;

    this.dirLight = new THREE.DirectionalLight(0xdab3ff, 2.2);
    this.dirLight.position.set(10, 20, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 15;
    this.dirLight.shadow.camera.bottom = -15;
    this.dirLight.shadow.bias = -0.001;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
    this.fillLight.position.set(-15, -10, -15);
    this.scene.add(this.fillLight);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    const cameraX = window.innerWidth <= 768 ? 0 : -4.5;
    this.camera.position.x = cameraX;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(t, coreIntro) {
    this.coreLight.intensity = (4 + Math.sin(t * 2) * 2) * coreIntro;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
