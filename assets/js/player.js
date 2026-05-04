let playlist = [
  { name: "Comfort Chain", artist: "Instupendo", file: "Instupendo - Comfort Chain.mp3" },
  { name: "Skins 2", artist: "KREZUS, Surreal_dvd", file: "KREZUS, Surreal_dvd - Skins 2.mp3" },
  { name: "Time To Pretend", artist: "Lazer Boomerang", file: "Lazer Boomerang - Time To Pretend.mp3" },
  { name: "Interlinked", artist: "Lonely Lies, GOLDKID", file: "Lonely Lies, GOLDKID - Interlinked.mp3" },
  { name: "Deep Focus for Study", artist: "Relaxing Medieval", file: "Relaxing Medieval - Deep Focus for Study.mp3" },
  { name: "Deep Healing Relaxing Music", artist: "Tranquility", file: "Tranquility - Deep Healing Relaxing Music.mp3" },
  { name: "Study Ambience", artist: "Valley of Dreams", file: "Valley of Dreams - Study Ambience.mp3" },
  { name: "Memory Reboot", artist: "VØJ x Narvent", file: "VØJ x Narvent - Memory Reboot.mp3" }
];

let currentTrackIndex = 0;
let isManuallyPaused = localStorage.getItem('music_paused') === 'true';
let lastVolume = parseFloat(localStorage.getItem('music_volume')) || 0.5;
let autoCollapseTimer = null;
const elements = {};

export function initMusicPlayer() {
  const music = document.getElementById('bg-music');
  if (!music) return;

  syncPlayerElements(true);

  fetch('/api/music')
    .then(res => res.json())
    .then(data => {
      if (data && Array.isArray(data) && data.length > 0) {
        playlist = data;
      }
      setupPlaylist();
    })
    .catch(err => {
      console.warn('[Music API] Using fallback:', err);
      setupPlaylist();
    });

  // Attach event listeners
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('input', handleGlobalInput);
  
  music.addEventListener('timeupdate', () => {
    updateUI();
    localStorage.setItem('music_current_time', music.currentTime);
  });

  music.addEventListener('loadedmetadata', () => {
    if (elements.dDuration) elements.dDuration.textContent = formatTime(music.duration);
  });

  music.addEventListener('ended', nextTrack);

  const tryAutoPlay = () => {
    if (isManuallyPaused) {
      window.removeEventListener('click', tryAutoPlay);
      window.removeEventListener('touchstart', tryAutoPlay);
      return;
    }
    music.play().then(() => {
      updateUI();
      window.removeEventListener('click', tryAutoPlay);
      window.removeEventListener('touchstart', tryAutoPlay);
    }).catch(() => { });
  };
  window.addEventListener('click', tryAutoPlay);
  window.addEventListener('touchstart', tryAutoPlay);

  const savedVol = localStorage.getItem('music_volume');
  music.volume = (savedVol !== null) ? parseFloat(savedVol) : 0.5;
}

export function syncPlayerElements(isInitialLoad) {
  elements.music = document.getElementById('bg-music');
  elements.btn = document.getElementById('music-btn');
  elements.mobilePlayer = document.getElementById('mobile-music-player');
  elements.mPlayPauseBtn = document.getElementById('mobile-play-pause');
  elements.mNextBtn = document.getElementById('mobile-next');
  elements.mPrevBtn = document.getElementById('mobile-prev');
  elements.mPlaylistBtn = document.getElementById('mobile-playlist');
  elements.dFullPlayer = document.querySelector('.player-container');
  elements.dPlayPauseBtn = document.getElementById('player-play-pause');
  elements.dNextBtn = document.getElementById('player-next');
  elements.dPrevBtn = document.getElementById('player-prev');
  elements.dTrackName = document.getElementById('player-track-name');
  elements.dCurrentTime = document.getElementById('player-current-time');
  elements.dDuration = document.getElementById('player-duration');
  elements.dProgressBar = document.getElementById('player-progress-bar');
  elements.dProgressContainer = document.getElementById('player-progress-container');
  elements.dPlaylistContainer = document.getElementById('player-playlist');
  elements.dPlaylistInner = document.getElementById('player-playlist-inner');
  elements.dVolumeSlider = document.getElementById('player-volume');
  elements.dMuteBtn = document.getElementById('player-mute');
  elements.dTogglePlaylist = document.getElementById('player-toggle-playlist');
  elements.mModal = document.getElementById('mobile-playlist-modal');
  elements.mModalList = document.getElementById('mobile-playlist-list');
  elements.mModalClose = document.getElementById('close-playlist-modal');
  elements.mModalOverlay = document.getElementById('modal-overlay');

  setupPlaylist(isInitialLoad);
  updateUI();
}

function setupPlaylist(isInitialLoad) {
  const music = elements.music || document.getElementById('bg-music');
  if (!music) return;

  if (elements.dPlaylistInner) {
    elements.dPlaylistInner.innerHTML = '';
    playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.textContent = track.name;
      item.addEventListener('click', () => {
        loadTrack(index);
        music.play().then(updateUI);
      });
      elements.dPlaylistInner.appendChild(item);
    });
  }

  if (elements.mModalList) {
    elements.mModalList.innerHTML = '';
    playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = 'm-playlist-item';
      item.innerHTML = `
        <div class="m-item-index">${(index + 1).toString().padStart(2, '0')}</div>
        <div class="m-item-info">
          <div class="m-item-name">${track.name}</div>
          <div class="m-item-artist">${track.artist}</div>
        </div>
        <div class="m-item-playing">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>
        </div>
      `;
      item.addEventListener('click', () => {
        loadTrack(index);
        music.play().then(updateUI);
        closeMobilePlaylist();
      });
      elements.mModalList.appendChild(item);
    });
  }

  const hasSource = music.src && music.src !== '' && music.src !== window.location.href;
  if (isInitialLoad || !hasSource) {
    const savedTrack = localStorage.getItem('music_track_index');
    const savedFile = localStorage.getItem('music_track_file');
    if (savedFile !== null) {
      const fileIndex = playlist.findIndex(t => t.file === savedFile);
      if (fileIndex !== -1) {
        currentTrackIndex = fileIndex;
      } else if (savedTrack !== null) {
        currentTrackIndex = parseInt(savedTrack, 10);
        if (currentTrackIndex >= playlist.length) currentTrackIndex = 0;
      }
    } else if (savedTrack !== null) {
      currentTrackIndex = parseInt(savedTrack, 10);
      if (currentTrackIndex >= playlist.length) currentTrackIndex = 0;
    } else {
      const defaultIndex = playlist.findIndex(t => t.file === 'Relaxing Medieval - Deep Focus for Study.mp3');
      currentTrackIndex = defaultIndex !== -1 ? defaultIndex : 0;
    }
    loadTrack(currentTrackIndex);

    const savedTime = localStorage.getItem('music_current_time');
    if (savedTime !== null) {
      music.currentTime = parseFloat(savedTime);
    }
  } else {
    const currentFile = music.src.split('/').pop();
    playlist.forEach((track, idx) => {
      if (decodeURIComponent(currentFile) === track.file) {
        currentTrackIndex = idx;
      }
    });
    const track = playlist[currentTrackIndex];
    if (track && elements.dTrackName) {
      elements.dTrackName.textContent = `${track.name} — ${track.artist}`;
    }
    updatePlaylistActiveStates();
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function loadTrack(index) {
  const music = elements.music || document.getElementById('bg-music');
  currentTrackIndex = index;
  localStorage.setItem('music_track_index', index);
  const track = playlist[index];
  if (!track) return;
  localStorage.setItem('music_track_file', track.file);

  const newSrc = `assets/music/${track.file}`;
  const currentFile = music.src.split('/').pop();
  if (decodeURIComponent(currentFile) !== track.file) {
    music.src = newSrc;
  }

  if (elements.dTrackName) elements.dTrackName.textContent = `${track.name} — ${track.artist}`;
  updatePlaylistActiveStates();
}

function updatePlaylistActiveStates() {
  const items = document.querySelectorAll('.playlist-item');
  items.forEach((item, i) => {
    if (i === currentTrackIndex) item.classList.add('active');
    else item.classList.remove('active');
  });

  const mItems = document.querySelectorAll('.m-playlist-item');
  mItems.forEach((item, i) => {
    if (i === currentTrackIndex) item.classList.add('active');
    else item.classList.remove('active');
  });
}

export function updateUI() {
  const music = elements.music || document.getElementById('bg-music');
  if (!music) return;

  const isPaused = music.paused;
  localStorage.setItem('music_paused', isPaused);

  if (elements.btn) {
    if (isPaused) {
      elements.btn.classList.add('muted');
      elements.btn.classList.remove('playing');
    } else {
      elements.btn.classList.add('playing');
      elements.btn.classList.remove('muted');
    }
  }

  if (elements.mPlayPauseBtn) {
    const mPlayIcon = elements.mPlayPauseBtn.querySelector('.icon-play');
    const mPauseIcon = elements.mPlayPauseBtn.querySelector('.icon-pause');
    if (isPaused) {
      if (mPlayIcon) mPlayIcon.style.display = 'block';
      if (mPauseIcon) mPauseIcon.style.display = 'none';
    } else {
      if (mPlayIcon) mPlayIcon.style.display = 'none';
      if (mPauseIcon) mPauseIcon.style.display = 'block';
    }
  }

  if (elements.dPlayPauseBtn) {
    const playIcon = elements.dPlayPauseBtn.querySelector('.icon-play');
    const pauseIcon = elements.dPlayPauseBtn.querySelector('.icon-pause');
    if (isPaused) {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
    } else {
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
    }
  }

  if (music.duration) {
    const perc = (music.currentTime / music.duration) * 100;
    const progressBars = document.querySelectorAll('#player-progress-bar');
    progressBars.forEach(bar => { bar.style.width = `${perc}%` });

    const currentTimes = document.querySelectorAll('#player-current-time');
    currentTimes.forEach(el => { el.textContent = formatTime(music.currentTime) });

    const durations = document.querySelectorAll('#player-duration');
    durations.forEach(el => { el.textContent = formatTime(music.duration) });

    const trackNames = document.querySelectorAll('#player-track-name');
    const track = playlist[currentTrackIndex];
    if (track) {
      trackNames.forEach(el => { el.textContent = `${track.name} — ${track.artist}` });
    }
  }

  const vol = music.volume;
  const volSliders = document.querySelectorAll('#player-volume');
  volSliders.forEach(slider => { slider.value = vol; });

  const volIcons = document.querySelectorAll('#vol-icon');
  volIcons.forEach(icon => {
    if (vol === 0) {
      icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else if (vol < 0.5) {
      icon.innerHTML = '<path d="M7 9v6h4l5 5V4L11 9H7zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    } else {
      icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  });
}

function playPause() {
  const music = elements.music || document.getElementById('bg-music');
  if (music.paused) {
    music.play().then(updateUI).catch(() => { });
  } else {
    music.pause();
    updateUI();
  }
}

function nextTrack() {
  const music = elements.music || document.getElementById('bg-music');
  const next = (currentTrackIndex + 1) % playlist.length;
  loadTrack(next);
  music.play().then(updateUI);
}

function prevTrack() {
  const music = elements.music || document.getElementById('bg-music');
  const prev = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  music.play().then(updateUI);
}

function openMobilePlaylist() {
  if (elements.mModal) {
    elements.mModal.classList.add('active');
    elements.mModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-is-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobilePlaylist() {
  if (elements.mModal) {
    elements.mModal.classList.remove('active');
    elements.mModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-is-open');
    document.body.style.overflow = '';
  }
}

function startAutoCollapse(delay = 2500) {
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
  autoCollapseTimer = setTimeout(() => {
    const isHovering = (elements.mobilePlayer && elements.mobilePlayer.matches(':hover')) ||
      (elements.dFullPlayer && elements.dFullPlayer.matches(':hover'));

    if (isHovering) {
      startAutoCollapse();
      return;
    }

    if (elements.dPlaylistContainer?.classList.contains('expanded')) {
      elements.dPlaylistContainer.classList.remove('expanded');
      document.body.classList.remove('playlist-is-expanded');
      startAutoCollapse(800);
      return;
    }

    if (elements.mobilePlayer?.classList.contains('expanded')) {
      elements.mobilePlayer.classList.remove('expanded');
    }
  }, delay);
}

function stopAutoCollapse() {
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
}

function handleGlobalClick(e) {
  const music = elements.music || document.getElementById('bg-music');
  if (!music) return;

  if (e.target.closest('#music-btn')) {
    e.stopPropagation();
    stopAutoCollapse();
    if (elements.mobilePlayer) {
      elements.mobilePlayer.classList.toggle('expanded');
      document.body.classList.toggle('mobile-player-expanded', elements.mobilePlayer.classList.contains('expanded'));
      if (elements.mobilePlayer.classList.contains('expanded')) startAutoCollapse();
    }
    return;
  }

  if (e.target.closest('#mobile-play-pause') || e.target.closest('#player-play-pause')) {
    e.stopPropagation();
    playPause();
    return;
  }

  if (e.target.closest('#mobile-next') || e.target.closest('#player-next')) {
    e.stopPropagation();
    nextTrack();
    return;
  }

  if (e.target.closest('#mobile-prev') || e.target.closest('#player-prev')) {
    e.stopPropagation();
    prevTrack();
    return;
  }

  if (e.target.closest('#mobile-playlist') || e.target.closest('#player-toggle-playlist')) {
    e.stopPropagation();
    if (e.target.closest('#mobile-playlist')) {
      openMobilePlaylist();
      if (elements.mobilePlayer) elements.mobilePlayer.classList.remove('expanded');
    } else {
      if (elements.dPlaylistContainer) {
        elements.dPlaylistContainer.classList.toggle('expanded');
        document.body.classList.toggle('playlist-is-expanded');
        if (elements.dPlaylistContainer.classList.contains('expanded') ||
          (elements.mobilePlayer && elements.mobilePlayer.classList.contains('expanded'))) {
          startAutoCollapse();
        }
      }
    }
    return;
  }

  if (e.target.closest('#close-playlist-modal') || e.target.closest('#modal-overlay')) {
    closeMobilePlaylist();
    return;
  }

  if (e.target.closest('#player-mute')) {
    e.stopPropagation();
    if (music.volume > 0) {
      lastVolume = music.volume;
      music.volume = 0;
    } else {
      music.volume = lastVolume || 0.5;
    }
    localStorage.setItem('music_volume', music.volume);
    updateUI();
    return;
  }

  if (e.target.closest('.player-progress') || e.target.closest('#player-progress-container')) {
    const container = e.target.closest('.player-progress');
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    music.currentTime = (clickX / container.clientWidth) * music.duration;
    return;
  }

    if (elements.mobilePlayer && elements.mobilePlayer.classList.contains('expanded') && !e.target.closest('#mobile-music-player')) {
      if (elements.dPlaylistContainer?.classList.contains('expanded')) {
        elements.dPlaylistContainer.classList.remove('expanded');
        document.body.classList.remove('playlist-is-expanded');
        setTimeout(() => {
          elements.mobilePlayer.classList.remove('expanded');
          document.body.classList.remove('mobile-player-expanded');
        }, 800);
      } else {
        elements.mobilePlayer.classList.remove('expanded');
        document.body.classList.remove('mobile-player-expanded');
      }
    }
}

function handleGlobalInput(e) {
  const music = elements.music || document.getElementById('bg-music');
  if (e.target.closest('#player-volume')) {
    music.volume = e.target.value;
    localStorage.setItem('music_volume', music.volume);
    if (music.volume > 0) lastVolume = music.volume;
    updateUI();
  }
}

// Expose some functions to window for the router and global access
window.updateUI = updateUI;
window.syncPlayerElements = syncPlayerElements;
