(function () {
  'use strict';

  var TIKTOK_WORKER_URL = '/api/tiktok-stats';

  // Fetch live TikTok stats
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

  var checkMobile = function() {
    return (window.innerWidth <= 1024) || (navigator.maxTouchPoints > 0);
  };
  var isMobile = checkMobile();
  if (isMobile) document.body.classList.add('is-mobile');

  // Initialize dynamic background (Lava Mesh)
  function initDynamicBackground() {
    var container = document.querySelector('.gradients-container');
    if (!container) return;

    var orbCount = isMobile ? 8 : 15;
    var orbColors = [
      'rgba(76, 29, 149, 0.3)',
      'rgba(88, 28, 135, 0.35)',
      'rgba(59, 7, 100, 0.4)',
      'rgba(107, 33, 168, 0.25)',
      'rgba(46, 16, 101, 0.3)'
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

  // Initialize music player
  function initMusicPlayer() {
    var music = document.getElementById('bg-music');
    var mobilePlayer = document.getElementById('mobile-music-player');
    var btn = document.getElementById('music-btn');
    
    var mPlayPauseBtn = document.getElementById('mobile-play-pause');
    var mPrevBtn = document.getElementById('mobile-prev');
    var mNextBtn = document.getElementById('mobile-next');
    var mPlaylistBtn = document.getElementById('mobile-playlist');

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

    var mModal = document.getElementById('mobile-playlist-modal');
    var mModalList = document.getElementById('mobile-playlist-list');
    var mModalClose = document.getElementById('close-playlist-modal');
    var mModalOverlay = document.getElementById('modal-overlay');

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
    var isManuallyPaused = localStorage.getItem('music_paused') === 'true';

    // Build playlist UI for desktop and mobile
    function setupPlaylist() {
      if (dPlaylistInner) {
        dPlaylistInner.innerHTML = ''; 
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

      if (mModalList) {
        mModalList.innerHTML = '';
        playlist.forEach(function(track, index) {
          var item = document.createElement('div');
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
          item.addEventListener('click', function() {
            loadTrack(index);
            music.play().then(updateUI);
            closeMobilePlaylist();
          });
          mModalList.appendChild(item);
        });
      }

      var savedTrack = localStorage.getItem('music_track_index');
      if (savedTrack !== null) {
        currentTrackIndex = parseInt(savedTrack, 10);
        if (currentTrackIndex >= playlist.length) currentTrackIndex = 0;
      }

      loadTrack(currentTrackIndex);

      var savedTime = localStorage.getItem('music_current_time');
      if (savedTime !== null) {
        music.currentTime = parseFloat(savedTime);
      }
    }

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

    // Format seconds to m:ss
    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      var mins = Math.floor(seconds / 60);
      var secs = Math.floor(seconds % 60);
      return mins + ":" + (secs < 10 ? "0" : "") + secs;
    }

    // Load track by index
    function loadTrack(index) {
      currentTrackIndex = index;
      localStorage.setItem('music_track_index', index);
      var track = playlist[index];
      music.src = 'assets/music/' + track.file;
      if (dTrackName) dTrackName.textContent = track.name + " — " + track.artist;
      
      var items = document.querySelectorAll('.playlist-item');
      items.forEach(function(item, i) {
        if (i === index) item.classList.add('active');
        else item.classList.remove('active');
      });

      var mItems = document.querySelectorAll('.m-playlist-item');
      mItems.forEach(function(item, i) {
        if (i === index) item.classList.add('active');
        else item.classList.remove('active');
      });
    }

    // Sync all play/pause UI elements
    function updateUI() {
      var isPaused = music.paused;
      localStorage.setItem('music_paused', isPaused);
      
      if (btn) {
        if (isPaused) {
          btn.classList.add('muted');
          btn.classList.remove('playing');
        } else {
          btn.classList.add('playing');
          btn.classList.remove('muted');
        }
      }

      if (mPlayPauseBtn) {
        var mPlayIcon = mPlayPauseBtn.querySelector('.icon-play');
        var mPauseIcon = mPlayPauseBtn.querySelector('.icon-pause');
        if (isPaused) {
          if (mPlayIcon) mPlayIcon.style.display = 'block';
          if (mPauseIcon) mPauseIcon.style.display = 'none';
        } else {
          if (mPlayIcon) mPlayIcon.style.display = 'none';
          if (mPauseIcon) mPauseIcon.style.display = 'block';
        }
      }

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

    // Toggle play/pause
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

    // Advance to next track
    function nextTrack() {
      var next = (currentTrackIndex + 1) % playlist.length;
      loadTrack(next);
      music.play().then(updateUI);
    }

    // Go to previous track
    function prevTrack() {
      var prev = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      loadTrack(prev);
      music.play().then(updateUI);
    }

    if (btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        stopAutoCollapse(); 
        if (mobilePlayer) {
          mobilePlayer.classList.toggle('expanded');
        }
      });
    }

    document.addEventListener('click', function() {
      if (mobilePlayer) mobilePlayer.classList.remove('expanded');
    });

    if (mobilePlayer) {
      mobilePlayer.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    // Open mobile playlist modal
    function openMobilePlaylist() {
      if (mModal) {
        mModal.classList.add('active');
        mModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    // Close mobile playlist modal
    function closeMobilePlaylist() {
      if (mModal) {
        mModal.classList.remove('active');
        mModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    if (mModalClose) mModalClose.addEventListener('click', closeMobilePlaylist);
    if (mModalOverlay) mModalOverlay.addEventListener('click', closeMobilePlaylist);

    music.addEventListener('timeupdate', function() {
      var perc = (music.currentTime / music.duration) * 100;
      if (dProgressBar) dProgressBar.style.width = perc + '%';
      if (dCurrentTime) dCurrentTime.textContent = formatTime(music.currentTime);
      localStorage.setItem('music_current_time', music.currentTime);
    });

    music.addEventListener('loadedmetadata', function() {
      if (dDuration) dDuration.textContent = formatTime(music.duration);
    });

    music.addEventListener('ended', function() {
      nextTrack();
    });

    if (dProgressContainer) {
      dProgressContainer.addEventListener('click', function(e) {
        var scrollWidth = dProgressContainer.clientWidth;
        var clickX = e.offsetX;
        var duration = music.duration;
        music.currentTime = (clickX / scrollWidth) * duration;
      });
    }

    if (mPlayPauseBtn) {
      mPlayPauseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        playPause();
      });
    }
    if (mNextBtn) {
      mNextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        nextTrack();
      });
    }
    if (mPrevBtn) {
      mPrevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        prevTrack();
      });
    }
    if (mPlaylistBtn) {
      mPlaylistBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openMobilePlaylist();
        if (mobilePlayer) mobilePlayer.classList.remove('expanded');
      });
    }

    if (dPlayPauseBtn) dPlayPauseBtn.addEventListener('click', playPause);
    if (dNextBtn) dNextBtn.addEventListener('click', nextTrack);
    if (dPrevBtn) dPrevBtn.addEventListener('click', prevTrack);

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

    var sidebarWrapper = document.querySelector('.sidebar-wrapper');
    var autoCollapseTimer = null;

    function startAutoCollapse() {
      if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
      
      autoCollapseTimer = setTimeout(function() {
        // Step 1: Close playlist first if it's open
        if (dPlaylistContainer && dPlaylistContainer.classList.contains('expanded')) {
          dPlaylistContainer.classList.remove('expanded');
          if (sidebarWrapper) sidebarWrapper.classList.remove('playlist-is-expanded');
          
          // IMPORTANT: Only start the next timer if we are NOT hovering
          if (mobilePlayer && !mobilePlayer.matches(':hover')) {
            startAutoCollapse();
          }
          return;
        }
        
        // Step 2: Close expanded player back to button
        if (mobilePlayer && mobilePlayer.classList.contains('expanded')) {
          mobilePlayer.classList.remove('expanded');
        }
      }, 2500);
    }

    function stopAutoCollapse() {
      if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
    }

    if (dTogglePlaylist && dPlaylistContainer) {
      dTogglePlaylist.addEventListener('click', function(e) {
        e.stopPropagation();
        dPlaylistContainer.classList.toggle('expanded');
        if (sidebarWrapper) {
          sidebarWrapper.classList.toggle('playlist-is-expanded');
        }
        
        // If we just expanded it, start the timer if not hovering
        if (dPlaylistContainer.classList.contains('expanded')) {
          startAutoCollapse();
        }
      });
    }

    if (mobilePlayer) {
      mobilePlayer.addEventListener('mouseenter', stopAutoCollapse);
      mobilePlayer.addEventListener('mousemove', stopAutoCollapse);
      mobilePlayer.addEventListener('mouseleave', startAutoCollapse);
    }

    // Attempt autoplay on first user interaction
    var tryAutoPlay = function() {
      if (isManuallyPaused) {
        window.removeEventListener('click', tryAutoPlay);
        window.removeEventListener('touchstart', tryAutoPlay);
        return;
      }
      music.play().then(function() {
        updateUI();
        window.removeEventListener('click', tryAutoPlay);
        window.removeEventListener('touchstart', tryAutoPlay);
      }).catch(function() {
      });
    };
    window.addEventListener('click', tryAutoPlay);
    window.addEventListener('touchstart', tryAutoPlay);

    music.volume = 0.5;
    updateUI();
  }

  // Initialize bottom navigation
  function initNavigation() {
    var nav = document.getElementById('bottom-nav');
    var toggle = document.getElementById('nav-toggle');
    if (!nav || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('expanded');
    });

    document.addEventListener('click', function () {
      nav.classList.remove('expanded');
    });

    var navItems = nav.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        nav.classList.remove('expanded');
      });
    });

    nav.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // Initialize project slider for mobile
  function initProjectSlider() {
    var grid = document.querySelector('.projects-grid');
    var prevBtn = document.getElementById('project-prev');
    var nextBtn = document.getElementById('project-next');
    var dotsContainer = document.getElementById('project-dots');

    if (!grid || !prevBtn || !nextBtn || !dotsContainer || window.innerWidth > 768) return;

    var cards = Array.from(grid.children);
    var dots = Array.from(dotsContainer.children);
    var currentIndex = 0;

    // Scroll to card by index and update dots
    function updateSlider(index) {
      if (index < 0) index = 0;
      if (index >= cards.length) index = cards.length - 1;

      currentIndex = index;

      grid.scrollTo({
        left: currentIndex * window.innerWidth,
        behavior: 'smooth'
      });

      dots.forEach(function(dot, i) {
        if (i === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

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

    dots.forEach(function(dot, i) {
      dot.addEventListener('click', function() {
        updateSlider(i);
      });
    });

    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth <= 768) {
          grid.scrollTo({ left: currentIndex * window.innerWidth });
        }
      }, 250);
    });

    updateSlider(0);
  }

  initMusicPlayer();
  initNavigation();

  document.addEventListener('DOMContentLoaded', function () {
    initDynamicBackground();
    fetchTikTokStats();
    initProjectSlider();
  });

})();