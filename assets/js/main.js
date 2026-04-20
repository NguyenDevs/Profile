/* ============================================================
   NguyenDevs · Profile — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ── TikTok Worker endpoint ──────────────────────────────── */
  var TIKTOK_WORKER_URL = '/api/tiktok-stats';

  /* ── Fetch live TikTok stats ── */
  function fetchTikTokStats() {
    var followerEl = document.getElementById('tt-followers');
    var likesEl    = document.getElementById('tt-likes');
    var avatarEl   = document.querySelector('.tiktok-card__avatar');
    var nameEl     = document.querySelector('.tiktok-card__name');

    if (!followerEl || !likesEl) return;

    fetch(TIKTOK_WORKER_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var formatNum = function (num) {
          if (!num || isNaN(num)) return '0';
          if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
          if (num >= 1000)    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
          return num.toString();
        };

        var displayFollowers = data.followers_raw ? formatNum(data.followers_raw) : (data.followers_fmt || '0');
        var displayLikes     = data.likes_raw ? formatNum(data.likes_raw) : (data.likes_fmt || '0');

        if (displayFollowers) followerEl.textContent = displayFollowers;
        if (displayLikes)     likesEl.textContent    = displayLikes;
        
        if (data.display_name && nameEl) nameEl.textContent = data.display_name;
        if (data.avatar_url && avatarEl) avatarEl.src = data.avatar_url;
      })
      .catch(function (e) {
        console.warn('[TikTok stats] Service temporarily unavailable');
      });
  }

  /* ── Enhanced device detection ── */
  var checkMobile = function() {
    return (window.innerWidth <= 1024) || (navigator.maxTouchPoints > 0);
  };
  var isMobile = checkMobile();
  if (isMobile) document.body.classList.add('is-mobile');

  /* ── Dynamic background (Lava Mesh) ── */
  function initDynamicBackground() {
    var container = document.querySelector('.gradients-container');
    if (!container) return;

    var orbCount = isMobile ? 8 : 15;
    var orbColors = [
      'rgba(76, 29, 149, 0.3)',   // Deep violet
      'rgba(88, 28, 135, 0.35)',  // Deep purple
      'rgba(59, 7, 100, 0.4)',    // Darkest purple
      'rgba(107, 33, 168, 0.25)', // Muted purple 
      'rgba(46, 16, 101, 0.3)'    // Deep indigo
    ];

    for (var i = 0; i < orbCount; i++) {
      var orb = document.createElement('div');
      orb.className = 'bg-orb';
      
      var size = Math.random() * (isMobile ? 150 : 200) + (isMobile ? 100 : 150);
      orb.style.width = size + 'px';
      orb.style.height = size + 'px';
      orb.style.background = orbColors[Math.floor(Math.random() * orbColors.length)];
      
      orb.style.left = Math.random() * 95 + '%';
      
      var duration = Math.random() * 15 + 25;
      orb.style.setProperty('--dur', duration + 's');
      orb.style.setProperty('--delay', (Math.random() * -40) + 's');
      
      container.appendChild(orb);
    }

    if (!isMobile) {
      var interBubble = document.querySelector('.interactive');
      if (interBubble) {
        var curX = 0, curY = 0, tgX = 0, tgY = 0;
        function move() {
          curX += (tgX - curX) / 20;
          curY += (tgY - curY) / 20;
          interBubble.style.transform = 'translate(' + Math.round(curX) + 'px, ' + Math.round(curY) + 'px)';
          requestAnimationFrame(move);
        }
        window.addEventListener('mousemove', function (e) {
          tgX = e.clientX;
          tgY = e.clientY;
        });
        move();
      }
    }
  }


  /* ── Music Player ── */
  function initMusicPlayer() {
    var music = document.getElementById('bg-music');
    var btn = document.getElementById('music-btn'); // Mobile button
    
    // Desktop elements
    var dFullPlayer = document.querySelector('.player-container');
    var dPlayPauseBtn = document.getElementById('player-play-pause');
    var dPrevBtn = document.getElementById('player-prev');
    var dNextBtn = document.getElementById('player-next');
    var dTrackName = document.getElementById('player-track-name');
    var dCurrentTime = document.getElementById('player-current-time');
    var dDuration = document.getElementById('player-duration');
    var dProgressBar = document.getElementById('player-progress-bar');
    var dProgressContainer = document.getElementById('player-progress-container');
    var dPlaylistContainer = document.getElementById('player-playlist');
    var dPlaylistInner = document.getElementById('player-playlist-inner');
    var dVolumeSlider = document.getElementById('player-volume');
    var dMuteBtn = document.getElementById('player-mute');
    var dTogglePlaylist = document.getElementById('player-toggle-playlist');

    if (!music) return;

    var playlist = [
      { name: "Memory Reboot", artist: "VØJ x Narvent", file: "VØJ x Narvent - Memory Reboot.mp3" },
      { name: "Lost Road", artist: "Aurenth x Knonzzz", file: "Aurenth x Knonzzz - Lost Road.mp3" },
      { name: "Comfort Chain", artist: "Instupendo", file: "Instupendo - Comfort Chain.mp3" },
      { name: "Skins 2", artist: "KREZUS, Surreal_dvd", file: "KREZUS, Surreal_dvd - Skins 2.mp3" },
      { name: "Time To Pretend", artist: "Lazer Boomerang", file: "Lazer Boomerang - Time To Pretend.mp3" },
      { name: "Interlinked", artist: "Lonely Lies, GOLDKID", file: "Lonely Lies, GOLDKID - Interlinked.mp3" }
    ];

    var currentTrackIndex = 0;

    function setupPlaylist() {
      // Playlist UI Generation
      if (dPlaylistInner) {
        dPlaylistInner.innerHTML = ''; // Clear
        playlist.forEach(function(track, index) {
          var item = document.createElement('div');
          item.className = 'playlist-item';
          item.textContent = track.name;
          item.addEventListener('click', function() {
            loadTrack(index);
            music.play().then(updateUI);
          });
          dPlaylistInner.appendChild(item);
        });
      }
      loadTrack(0);
    }

    // Fetch dynamic playlist from API
    fetch('/api/music')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && Array.isArray(data) && data.length > 0) {
          playlist = data;
          setupPlaylist();
        } else {
          setupPlaylist();
        }
      })
      .catch(function(err) {
        console.warn('[Music API] Using hardcoded fallback:', err);
        setupPlaylist();
      });

    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      var mins = Math.floor(seconds / 60);
      var secs = Math.floor(seconds % 60);
      return mins + ":" + (secs < 10 ? "0" : "") + secs;
    }

    function loadTrack(index) {
      currentTrackIndex = index;
      var track = playlist[index];
      music.src = 'assets/music/' + track.file;
      if (dTrackName) dTrackName.textContent = track.name + " — " + track.artist;
      
      // Update active state in playlist UI
      var items = document.querySelectorAll('.playlist-item');
      items.forEach(function(item, i) {
        if (i === index) item.classList.add('active');
        else item.classList.remove('active');
      });
    }

    function updateUI() {
      var isPaused = music.paused;
      
      // Update Mobile Button
      if (btn) {
        if (isPaused) {
          btn.classList.add('muted');
          btn.classList.remove('playing');
        } else {
          btn.classList.add('playing');
          btn.classList.remove('muted');
        }
      }

      // Update Desktop Button icons
      if (dPlayPauseBtn) {
        var playIcon = dPlayPauseBtn.querySelector('.icon-play');
        var pauseIcon = dPlayPauseBtn.querySelector('.icon-pause');
        if (isPaused) {
          if (playIcon) playIcon.style.display = 'block';
          if (pauseIcon) pauseIcon.style.display = 'none';
        } else {
          if (playIcon) playIcon.style.display = 'none';
          if (pauseIcon) pauseIcon.style.display = 'block';
        }
      }
    }

    function playPause() {
      if (music.paused) {
        music.play().then(updateUI).catch(function(err) {
          console.warn('[Music] Playback blocked', err);
        });
      } else {
        music.pause();
        updateUI();
      }
    }

    function nextTrack() {
      var next = (currentTrackIndex + 1) % playlist.length;
      loadTrack(next);
      music.play().then(updateUI);
    }

    function prevTrack() {
      var prev = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      loadTrack(prev);
      music.play().then(updateUI);
    }

    // Progress bar update
    music.addEventListener('timeupdate', function() {
      var perc = (music.currentTime / music.duration) * 100;
      if (dProgressBar) dProgressBar.style.width = perc + '%';
      if (dCurrentTime) dCurrentTime.textContent = formatTime(music.currentTime);
    });

    music.addEventListener('loadedmetadata', function() {
      if (dDuration) dDuration.textContent = formatTime(music.duration);
    });

    music.addEventListener('ended', function() {
      nextTrack();
    });

    // Click on progress bar to seek
    if (dProgressContainer) {
      dProgressContainer.addEventListener('click', function(e) {
        var scrollWidth = dProgressContainer.clientWidth;
        var clickX = e.offsetX;
        var duration = music.duration;
        music.currentTime = (clickX / scrollWidth) * duration;
      });
    }

    // Event Listeners
    if (btn) btn.addEventListener('click', playPause);
    if (dPlayPauseBtn) dPlayPauseBtn.addEventListener('click', playPause);
    if (dNextBtn) dNextBtn.addEventListener('click', nextTrack);
    if (dPrevBtn) dPrevBtn.addEventListener('click', prevTrack);

    // Volume & Mute logic
    if (dVolumeSlider) {
      dVolumeSlider.addEventListener('input', function() {
        music.volume = this.value;
        if (music.volume > 0) music.muted = false;
      });
    }

    if (dMuteBtn) {
      var lastVolume = 0.5;
      dMuteBtn.addEventListener('click', function() {
        if (music.volume > 0) {
          lastVolume = music.volume;
          music.volume = 0;
          if (dVolumeSlider) dVolumeSlider.value = 0;
        } else {
          music.volume = lastVolume;
          if (dVolumeSlider) dVolumeSlider.value = lastVolume;
        }
      });
    }

    // Playlist Toggle logic
    var sidebarWrapper = document.querySelector('.sidebar-wrapper');
    if (dTogglePlaylist && dPlaylistContainer) {
      dTogglePlaylist.addEventListener('click', function() {
        dPlaylistContainer.classList.toggle('expanded');
        if (sidebarWrapper) {
          sidebarWrapper.classList.toggle('playlist-is-expanded');
        }
      });
    }

    // Auto-start logic (user interaction)
    var tryAutoPlay = function() {
      music.play().then(function() {
        updateUI();
        window.removeEventListener('click', tryAutoPlay);
        window.removeEventListener('touchstart', tryAutoPlay);
      }).catch(function() {
        // Keep waiting for interaction
      });
    };
    window.addEventListener('click', tryAutoPlay);
    window.addEventListener('touchstart', tryAutoPlay);

    // Initial sync
    music.volume = 0.5;
    updateUI();
  }

  /* ── Bottom Navigation ── */
  function initNavigation() {
    var nav = document.getElementById('bottom-nav');
    var toggle = document.getElementById('nav-toggle');
    if (!nav || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('expanded');
    });

    // Close when clicking anywhere outside
    document.addEventListener('click', function () {
      nav.classList.remove('expanded');
    });

    // Close when a nav item is clicked
    var navItems = nav.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        nav.classList.remove('expanded');
      });
    });

    // Prevent closing when clicking inside the nav container (except items)
    nav.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  /* ── Project Slider (Mobile) ── */
  function initProjectSlider() {
    var grid = document.querySelector('.projects-grid');
    var prevBtn = document.getElementById('project-prev');
    var nextBtn = document.getElementById('project-next');
    var dotsContainer = document.getElementById('project-dots');

    if (!grid || !prevBtn || !nextBtn || !dotsContainer || window.innerWidth > 768) return;

    var cards = Array.from(grid.children);
    var dots = Array.from(dotsContainer.children);
    var currentIndex = 0;

    function updateSlider(index) {
      if (index < 0) index = 0;
      if (index >= cards.length) index = cards.length - 1;

      currentIndex = index;

      // Scroll the grid
      grid.scrollTo({
        left: currentIndex * window.innerWidth,
        behavior: 'smooth'
      });

      // Update dots
      dots.forEach(function(dot, i) {
        if (i === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      // Update button states (optional: disable/opacity)
      prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
      prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
      nextBtn.style.opacity = currentIndex === cards.length - 1 ? '0.3' : '1';
      nextBtn.style.pointerEvents = currentIndex === cards.length - 1 ? 'none' : 'auto';
    }

    prevBtn.addEventListener('click', function() {
      updateSlider(currentIndex - 1);
    });

    nextBtn.addEventListener('click', function() {
      updateSlider(currentIndex + 1);
    });

    // Optional: click dots to jump
    dots.forEach(function(dot, i) {
      dot.addEventListener('click', function() {
        updateSlider(i);
      });
    });

    // Handle resize to keep current card centered
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth <= 768) {
          grid.scrollTo({ left: currentIndex * window.innerWidth });
        }
      }, 250);
    });

    // Initial state
    updateSlider(0);
  }

  /* ── Initializations ── */
  initMusicPlayer();
  initNavigation();

  /* ── DOM Ready ── */
  document.addEventListener('DOMContentLoaded', function () {
    initDynamicBackground();
    fetchTikTokStats();
    initProjectSlider();
  });


})();
