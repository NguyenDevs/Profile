export class SettingsHandler {
  constructor() {
    this.manualSpeedFactor = 1.0;
    this.manualBrightnessFactor = 0.5;
    this.manualDistanceFactor = 1.0;
    this.initSettings3D();
  }

  initSettings3D() {
    const wrapper = document.getElementById('cyber-settings-wrap');
    if (!wrapper) return;

    const toggleBtn = wrapper.querySelector('.settings-toggle');
    const items = wrapper.querySelectorAll('.settings-item');

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.toggle('open');
      toggleBtn.classList.toggle('active', isOpen);
      if (!isOpen) {
        items.forEach(it => it.classList.remove('active'));
      }
    });

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasActive = item.classList.contains('active');
        items.forEach(it => it.classList.remove('active'));
        if (!wasActive) item.classList.add('active');
      });

      const slider = item.querySelector('.s-slider');
      const valText = item.querySelector('.s-val');
      const target = item.getAttribute('data-target');

      if (target === 'speed') slider.value = this.manualSpeedFactor;
      if (target === 'brightness') slider.value = this.manualBrightnessFactor;
      if (target === 'distance') slider.value = this.manualDistanceFactor;
      valText.textContent = parseFloat(slider.value).toFixed(1);

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        valText.textContent = val.toFixed(1);
        if (target === 'speed') this.manualSpeedFactor = val;
        if (target === 'brightness') this.manualBrightnessFactor = val;
        if (target === 'distance') this.manualDistanceFactor = val;
      });

      slider.addEventListener('click', e => e.stopPropagation());
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
        toggleBtn.classList.remove('active');
        items.forEach(it => it.classList.remove('active'));
      }
    });
  }

  update(renderer) {
    renderer.toneMappingExposure = this.manualBrightnessFactor;
  }
}
