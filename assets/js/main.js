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
    var btn = document.getElementById('music-btn');
    if (!music || !btn) return;

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
        music.play().then(updateState).catch(function(err) {
          console.warn('[Music] Playback blocked', err);
        });
      } else {
        music.pause();
        updateState();
      }
    };

    var startMusic = function() {
      if (music.paused) {
        music.play().then(function() {
          updateState();
        }).catch(function() {
          var resume = function() {
            music.play().then(function() {
              updateState();
              window.removeEventListener('click', resume);
              window.removeEventListener('touchstart', resume);
            });
          };
          window.addEventListener('click', resume);
          window.addEventListener('touchstart', resume);
        });
      }
    };

    btn.addEventListener('click', toggleMusic);
    startMusic();
    
    setInterval(function() {
      if (!music.paused && btn.classList.contains('muted')) {
        updateState();
      }
    }, 1000);
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
