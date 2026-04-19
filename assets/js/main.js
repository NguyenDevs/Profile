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

    if (!isMobile) {
      // Inject multiple small orbs for desktop (Lava Lamp effect)
      var orbColors = [
        'rgba(178, 137, 239, 0.4)', 
        'rgba(150, 97, 255, 0.35)', 
        'rgba(212, 168, 255, 0.3)',
        'rgba(100, 50, 200, 0.4)',
        'rgba(180, 130, 255, 0.35)'
      ];

      for (var i = 0; i < 15; i++) {
        var orb = document.createElement('div');
        orb.className = 'bg-orb';
        
        var size = Math.random() * 200 + 150; // Random small/medium sizes
        orb.style.width = size + 'px';
        orb.style.height = size + 'px';
        orb.style.background = orbColors[Math.floor(Math.random() * orbColors.length)];
        
        orb.style.left = Math.random() * 95 + '%';
        
        var duration = Math.random() * 15 + 25; // 25s to 40s (Slow drift)
        orb.style.setProperty('--dur', duration + 's');
        orb.style.setProperty('--delay', (Math.random() * -40) + 's');
        
        container.appendChild(orb);
      }

      // Interactive mouse follow
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

    var toggleMusic = function (e) {
      if (e) e.stopPropagation();
      if (music.paused) {
        music.play().then(function() {
          updateState();
        }).catch(function(err) {
          console.warn('[Music] Playback blocked', err);
        });
      } else {
        music.pause();
        updateState();
      }
    };

    btn.addEventListener('click', toggleMusic);
    
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
