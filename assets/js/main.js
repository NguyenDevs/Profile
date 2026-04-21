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

        if (displayFollowers && followerEl) followerEl.textContent = displayFollowers;
        if (displayLikes && likesEl)         likesEl.textContent    = displayLikes;
        
        if (data.display_name && nameEl) nameEl.textContent = data.display_name;
        if (data.avatar_url && avatarEl) avatarEl.src = data.avatar_url;
      })
      .catch(function (e) {
        console.warn('[TikTok stats] Service temporarily unavailable');
      });
  }

  // --- SPA ROUTER & MUSIC PERSISTENCE ---
  var isTransitioning = false;

  function initRouting() {
    window.addEventListener('popstate', function() {
      loadPage(window.location.pathname, false);
    });

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href) return;

      var isInternal = !href.includes('://') && !href.startsWith('mailto:') && !href.startsWith('tel:');
      var isLocalFile = href.endsWith('.html') || href.startsWith('./') || href.startsWith('/') || !href.includes('.');

      if (isInternal && isLocalFile && !link.target && !link.hasAttribute('download') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        var targetUrl = link.href;
        // Normalize URL for comparison
        var cleanTarget = targetUrl.replace(/\/index\.html$/, '/');
        var cleanCurrent = window.location.href.replace(/\/index\.html$/, '/');
        if (cleanTarget === cleanCurrent) return;
        
        loadPage(targetUrl, true);
      }
    }, true); 

    document.addEventListener('forceMusicPlay', function(e) {
      var music = document.getElementById('bg-music');
      if (music && e.detail.wasPlaying && music.paused) {
        music.play().catch(function(err) {});
      }
      // Re-sync UI after page content swap
      if (typeof updateUI === 'function') updateUI();
    });
  }

  function loadPage(url, push) {
    if (isTransitioning) return;
    isTransitioning = true;

    var music = document.getElementById('bg-music');
    var wasPlaying = music ? !music.paused : false;
    
    // Save current state before transition
    if (music) {
      localStorage.setItem('music_current_time', music.currentTime);
      localStorage.setItem('music_paused', music.paused);
    }

    // Show Loader
    var loader = document.getElementById('page-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'page-loader';
      loader.className = 'page-loader';
      document.body.appendChild(loader);
    }
    loader.className = 'page-loader loading';
    loader.style.opacity = '1';
    loader.style.width = '0%';
    setTimeout(function() { loader.style.width = '70%'; }, 10);

    var content = document.querySelector('.wrapper') || document.querySelector('.projects-container') || document.querySelector('.coming-soon');
    if (content) content.style.opacity = '0';

    fetch(url)
      .then(function(res) { return res.text(); })
      .then(function(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        document.title = doc.title;

        var newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        newLinks.forEach(function(link) {
          var href = link.getAttribute('href');
          if (!document.querySelector('link[href="' + href + '"]')) {
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = href;
            document.head.appendChild(l);
          }
        });

        var newContent = doc.querySelector('.wrapper') || doc.querySelector('.projects-container') || doc.querySelector('.coming-soon');
        if (!newContent) {
           window.location.href = url;
           return;
        }

        if (push) {
          // Normalize URL for history: replace /index.html with /
          var displayUrl = url.replace(/\/index\.html$/, '/');
          history.pushState(null, '', displayUrl);
        }

        if (content) {
          content.parentElement.replaceChild(newContent, content);
          newContent.style.opacity = '0';
          newContent.offsetHeight;
          newContent.style.transition = 'opacity 0.4s ease';
          newContent.style.opacity = '1';
          window.scrollTo(0, 0);
        }

        if (newContent.classList.contains('projects-grid') || newContent.querySelector('.projects-grid')) {
          initProjectSlider();
        }
        
        var mPlayer = document.getElementById('mobile-music-player');
        if (mPlayer) {
          if (newContent.classList.contains('projects-container') || newContent.classList.contains('coming-soon')) {
            mPlayer.classList.add('mini-player-mode');
          } else {
            mPlayer.classList.remove('mini-player-mode');
          }
        }

        updateNavActiveState();
        
        if (typeof syncPlayerElements === 'function') syncPlayerElements(false);

        // Finish Loader
        if (loader) {
          loader.className = 'page-loader finished';
          setTimeout(function() { 
            loader.className = 'page-loader'; 
            loader.style.opacity = '0';
            loader.style.width = '0%';
          }, 500);
        }

        var event = new CustomEvent('forceMusicPlay', { detail: { wasPlaying: wasPlaying, url: url } });
        document.dispatchEvent(event);

        isTransitioning = false;
      })
      .catch(function(err) {
        console.error('[SPA] Navigation Error:', err);
        window.location.href = url;
      });
  }

  function updateNavActiveState() {
    var path = window.location.pathname;
    var filename = path.split('/').pop() || 'index.html';
    if (filename === '') filename = 'index.html';
    
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
       var href = item.getAttribute('href');
       if (href === filename || (filename === 'index.html' && (href === './' || href === 'index.html'))) {
         item.classList.add('active');
       } else {
         item.classList.remove('active');
       }
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
    var lastVolume = parseFloat(localStorage.getItem('music_volume')) || 0.5; 

    var elements = {};
    function syncPlayerElements(isInitialLoad) {
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
      elements.dMuteBtn = document.getElementById('player-mute');
      elements.dTogglePlaylist = document.getElementById('player-toggle-playlist');
      elements.mModal = document.getElementById('mobile-playlist-modal');
      elements.mModalList = document.getElementById('mobile-playlist-list');
      elements.mModalClose = document.getElementById('close-playlist-modal');
      elements.mModalOverlay = document.getElementById('modal-overlay');

      setupPlaylist(isInitialLoad);
      updateUI();
    }
    window.syncPlayerElements = syncPlayerElements;

    // Build playlist UI for desktop and mobile
    function setupPlaylist(isInitialLoad) {
      if (elements.dPlaylistInner) {
        elements.dPlaylistInner.innerHTML = ''; 
        playlist.forEach(function(track, index) {
          var item = document.createElement('div');
          item.className = 'playlist-item';
          item.textContent = track.name;
          item.addEventListener('click', function() {
            loadTrack(index);
            music.play().then(updateUI);
          });
          elements.dPlaylistInner.appendChild(item);
        });
      }

      if (elements.mModalList) {
        elements.mModalList.innerHTML = '';
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
          elements.mModalList.appendChild(item);
        });
      }

      // ONLY set track and time if it's the initial page load or if music is currently empty
      var hasSource = music.src && music.src !== '' && music.src !== window.location.href;
      if (isInitialLoad || !hasSource) {
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
      } else {
        // Just sync currentTrackIndex from existing src if possible
        var currentFile = music.src.split('/').pop();
        playlist.forEach(function(track, idx) {
          if (decodeURIComponent(currentFile) === track.file) {
            currentTrackIndex = idx;
          }
        });
        // Still need to update display texts
        var track = playlist[currentTrackIndex];
        if (track && elements.dTrackName) {
           elements.dTrackName.textContent = track.name + " — " + track.artist;
        }
        // Update active class in lists
        updatePlaylistActiveStates();
      }
    }

    fetch('/api/music')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && Array.isArray(data) && data.length > 0) {
          playlist = data;
        }
        setupPlaylist();
      })
      .catch(function(err) {
        console.warn('[Music API] Using fallback:', err);
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
      localStorage.setItem('music_track_index', index);
      var track = playlist[index];
      if (!track) return;
      
      // Only change src if it's different to avoid re-load flash
      var newSrc = 'assets/music/' + track.file;
      var currentFile = music.src.split('/').pop();
      if (decodeURIComponent(currentFile) !== track.file) {
         music.src = newSrc;
      }
      
      if (elements.dTrackName) elements.dTrackName.textContent = track.name + " — " + track.artist;
      updatePlaylistActiveStates();
    }

    function updatePlaylistActiveStates() {
      var items = document.querySelectorAll('.playlist-item');
      items.forEach(function(item, i) {
        if (i === currentTrackIndex) item.classList.add('active');
        else item.classList.remove('active');
      });

      var mItems = document.querySelectorAll('.m-playlist-item');
      mItems.forEach(function(item, i) {
        if (i === currentTrackIndex) item.classList.add('active');
        else item.classList.remove('active');
      });
    }

    function updateUI() {
      var isPaused = music.paused;
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
        var mPlayIcon = elements.mPlayPauseBtn.querySelector('.icon-play');
        var mPauseIcon = elements.mPlayPauseBtn.querySelector('.icon-pause');
        if (isPaused) {
          if (mPlayIcon) mPlayIcon.style.display = 'block';
          if (mPauseIcon) mPauseIcon.style.display = 'none';
        } else {
          if (mPlayIcon) mPlayIcon.style.display = 'none';
          if (mPauseIcon) mPauseIcon.style.display = 'block';
        }
      }

      if (elements.dPlayPauseBtn) {
        var playIcon = elements.dPlayPauseBtn.querySelector('.icon-play');
        var pauseIcon = elements.dPlayPauseBtn.querySelector('.icon-pause');
        if (isPaused) {
          if (playIcon) playIcon.style.display = 'block';
          if (pauseIcon) pauseIcon.style.display = 'none';
        } else {
          if (playIcon) playIcon.style.display = 'none';
          if (pauseIcon) pauseIcon.style.display = 'block';
        }
      }

      // Progress sync
      if (music.duration) {
        var perc = (music.currentTime / music.duration) * 100;
        var progressBars = document.querySelectorAll('#player-progress-bar');
        progressBars.forEach(function(bar) { bar.style.width = perc + '%' });
        
        var currentTimes = document.querySelectorAll('#player-current-time');
        currentTimes.forEach(function(el) { el.textContent = formatTime(music.currentTime) });
        
        var durations = document.querySelectorAll('#player-duration');
        durations.forEach(function(el) { el.textContent = formatTime(music.duration) });
        
        var trackNames = document.querySelectorAll('#player-track-name');
        var track = playlist[currentTrackIndex];
        if (track) {
          trackNames.forEach(function(el) { el.textContent = track.name + " — " + track.artist });
        }
      }

      // Volume UI Sync
      var vol = music.volume;
      var volSliders = document.querySelectorAll('#player-volume');
      volSliders.forEach(function(slider) { slider.value = vol; });

      var volIcons = document.querySelectorAll('#vol-icon');
      volIcons.forEach(function(icon) {
        if (vol === 0) {
          icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else if (vol < 0.5) {
          icon.innerHTML = '<path d="M7 9v6h4l5 5V4L11 9H7zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
        } else {
          icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        }
      });
    }
    window.updateUI = updateUI;

    function playPause() {
      if (music.paused) {
        music.play().then(updateUI).catch(function(err) {});
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

    function openMobilePlaylist() {
      if (elements.mModal) {
        elements.mModal.classList.add('active');
        elements.mModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeMobilePlaylist() {
      if (elements.mModal) {
        elements.mModal.classList.remove('active');
        elements.mModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    document.addEventListener('click', function(e) {
      if (e.target.closest('#music-btn')) {
        e.stopPropagation();
        stopAutoCollapse(); 
        if (elements.mobilePlayer) {
          elements.mobilePlayer.classList.toggle('expanded');
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
            document.querySelector('.sidebar-wrapper')?.classList.toggle('playlist-is-expanded');
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
        var container = e.target.closest('.player-progress');
        var rect = container.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        music.currentTime = (clickX / container.clientWidth) * music.duration;
        return;
      }

      if (elements.mobilePlayer && elements.mobilePlayer.classList.contains('expanded') && !e.target.closest('#mobile-music-player')) {
        if (elements.dPlaylistContainer?.classList.contains('expanded')) {
          elements.dPlaylistContainer.classList.remove('expanded');
          document.querySelector('.sidebar-wrapper')?.classList.remove('playlist-is-expanded');
          setTimeout(function() {
            elements.mobilePlayer.classList.remove('expanded');
          }, 800);
        } else {
          elements.mobilePlayer.classList.remove('expanded');
        }
      }
    });

    document.addEventListener('input', function(e) {
      if (e.target.closest('#player-volume')) {
        music.volume = e.target.value;
        localStorage.setItem('music_volume', music.volume);
        if (music.volume > 0) lastVolume = music.volume;
        updateUI();
      }
    });

    music.addEventListener('timeupdate', function() {
      updateUI();
      localStorage.setItem('music_current_time', music.currentTime);
    });

    music.addEventListener('loadedmetadata', function() {
      if (elements.dDuration) elements.dDuration.textContent = formatTime(music.duration);
    });

    music.addEventListener('ended', nextTrack);

    syncPlayerElements(true);

    var sidebarWrapper = document.querySelector('.sidebar-wrapper');
    var autoCollapseTimer = null;

    function startAutoCollapse(delay = 2500) {
      if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
      autoCollapseTimer = setTimeout(function() {
        var isHovering = (elements.mobilePlayer && elements.mobilePlayer.matches(':hover')) || 
                         (elements.dFullPlayer && elements.dFullPlayer.matches(':hover'));
        
        if (isHovering) {
           startAutoCollapse();
           return;
        }

        if (elements.dPlaylistContainer?.classList.contains('expanded')) {
          elements.dPlaylistContainer.classList.remove('expanded');
          document.querySelector('.sidebar-wrapper')?.classList.remove('playlist-is-expanded');
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
      }).catch(function() {});
    };
    window.addEventListener('click', tryAutoPlay);
    window.addEventListener('touchstart', tryAutoPlay);

    var savedVol = localStorage.getItem('music_volume');
    music.volume = (savedVol !== null) ? parseFloat(savedVol) : 0.5;
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
    initRouting();
    initDynamicBackground();
    fetchTikTokStats();
    initProjectSlider();
    updateNavActiveState();
  });

})();