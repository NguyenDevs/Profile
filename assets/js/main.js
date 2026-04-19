/* ============================================================
   NguyenDevs · Linkbio — Main JavaScript
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
        // Hàm rút gọn số (ví dụ: 110500 -> 110.5K)
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

  /* ── Dynamic background orb injector ── */
  function initDynamicBackground() {
    var container = document.querySelector('.bg-ambient');
    if (!container) return;

    var orbColors = [
      'rgba(147, 51, 234, 0.3)',  // Purple-600 (Darker)
      'rgba(192, 132, 252, 0.25)', // Purple-400 (Ligher)
      'rgba(168, 85, 247, 0.3)',  // Purple-500
      'rgba(216, 180, 254, 0.2)'   // Purple-300 (Very light)
    ];

    var isMobile = window.innerWidth <= 768;
    var orbCount = isMobile ? 4 : 8;

    for (var i = 0; i < orbCount; i++) {
      var orb = document.createElement('div');
      orb.className = 'bg-orb';
      
      var size = isMobile ? (Math.random() * 100 + 80) : (Math.random() * 150 + 100);
      orb.style.width = size + 'px';
      orb.style.height = size + 'px';
      orb.style.background = orbColors[Math.floor(Math.random() * orbColors.length)];
      
      orb.style.left = Math.random() * 90 + '%';
      if (isMobile) {
        orb.style.top = Math.random() * 80 + '%'; // Scatter them across the height on mobile
      }
      
      var duration = Math.random() * 15 + (isMobile ? 25 : 20); // Slower on mobile
      orb.style.setProperty('--dur', duration + 's');
      orb.style.setProperty('--delay', (Math.random() * -35) + 's');
      
      container.appendChild(orb);
    }
  }


  /* ── Music Player ── */
  function initMusicPlayer() {
    var music = document.getElementById('bg-music');
    var btn = document.getElementById('music-btn');
    if (!music || !btn) return;

    // Ensure it's not muted by default code
    music.muted = false;
    music.volume = 0.5;

    var updateState = function() {
      if (music.paused) {
        btn.classList.add('muted');
        btn.classList.remove('playing');
        btn.title = "Click to Play";
      } else {
        btn.classList.add('playing');
        btn.classList.remove('muted');
        btn.title = "Click to Mute";
      }
    };

    var removeListeners = function() {
      ['click', 'touchstart', 'scroll', 'mousedown', 'keydown'].forEach(function(ev) {
        document.removeEventListener(ev, runAutoplay);
      });
    };

    var toggleMusic = function (e) {
      if (e) e.stopPropagation();
      if (music.paused) {
        music.play().then(function() {
          updateState();
          removeListeners();
        }).catch(function(err) {
          console.warn('[Music] Playback blocked', err);
        });
      } else {
        music.pause();
        updateState();
      }
    };

    btn.addEventListener('click', toggleMusic);

    // Initial play attempt - triggered by ANY interaction
    var runAutoplay = function (e) {
      // If user clicked the button directly, let toggleMusic handle it to avoid double-trigger
      if (e && e.target && e.target.closest('#music-btn')) return;
      
      if (!music.paused) {
        removeListeners();
        return;
      }
      
      music.play().then(function() {
        updateState();
        removeListeners();
      }).catch(function(err) {
        // Still blocked, will try again on next interaction
        updateState();
      });
    };

    ['click', 'touchstart', 'scroll', 'mousedown', 'keydown'].forEach(function(ev) {
      document.addEventListener(ev, runAutoplay);
    });
    
    // Check state periodically
    setInterval(function() {
      if (!music.paused && btn.classList.contains('muted')) {
        updateState();
      }
    }, 1000);
  }

  /* ── DOM Ready ── */
  document.addEventListener('DOMContentLoaded', function () {
    initDynamicBackground();
    fetchTikTokStats();
    initMusicPlayer();
  });

})();
