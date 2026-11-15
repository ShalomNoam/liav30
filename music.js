(function () {
  "use strict";

  var urls = (window.ALBUM && window.ALBUM.music) || [];
  function toId(u) {
    var m = String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  var ids = urls.map(toId).filter(Boolean);
  var root = document.getElementById("music");
  if (!ids.length) { root.hidden = true; return; }

  var cd = document.getElementById("cd");
  var panel = document.getElementById("music-panel");
  var titleEl = document.getElementById("music-title");
  var countEl = document.getElementById("music-count");
  var playBtn = document.getElementById("m-play");
  var hint = document.getElementById("sound-hint");
  var mutedStart = false;   // התחלנו בלי צליל כי הדפדפן חסם

  function unmute() {
    if (!mutedStart || !ready) return;
    mutedStart = false;
    player.unMute();
    player.setVolume(60);
    if (!userPaused) player.playVideo();
    hint.hidden = true;
  }
  hint.addEventListener("click", function (e) { e.stopPropagation(); unmute(); });

  var player = null;
  var ready = false;
  var index = 0;
  var playing = false;
  var userPaused = false;   // אם המשתמש עצר, לא מפעילים מחדש לבד
  var wantPlay = false;     // בקשה לנגן לפני שהנגן נטען

  // ---------- פתיחה/סגירה של הפאנל ----------
  function setOpen(open) {
    root.classList.toggle("open", open);
    cd.setAttribute("aria-expanded", String(open));
    cd.setAttribute("aria-label", open ? "סגירת נגן המוזיקה" : "פתיחת נגן המוזיקה");
  }
  cd.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!root.classList.contains("open"));
    if (!playing && !userPaused) play();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("open")) setOpen(false);
  });

  // ---------- מצב ----------
  function render() {
    root.classList.toggle("playing", playing);
    playBtn.setAttribute("aria-label", playing ? "השהיה" : "נגן");
    countEl.textContent = "שיר " + (index + 1) + " מתוך " + ids.length;
  }
  function updateTitle() {
    var t = "";
    try { t = player.getVideoData().title; } catch (e) {}
    titleEl.textContent = t || "שיר " + (index + 1);
  }

  function play() {
    userPaused = false;
    if (!ready) { wantPlay = true; return; }
    player.playVideo();
  }
  function pause() {
    userPaused = true;
    if (ready) player.pauseVideo();
  }
  function go(i) {
    index = (i + ids.length) % ids.length;
    userPaused = false;
    if (ready) player.loadVideoById(ids[index]);
    else wantPlay = true;
    render();
  }

  playBtn.addEventListener("click", function () { playing ? pause() : play(); });
  document.getElementById("m-next").addEventListener("click", function () { go(index + 1); });
  document.getElementById("m-prev").addEventListener("click", function () { go(index - 1); });

  // הדפדפנים לא מאפשרים צליל לפני אינטראקציה, לכן המוזיקה מתחילה בלחיצה/מגע הראשונים באתר
  // אם הדפדפן חסם צליל, ההפעלה מתחילה מושתקת והצליל נדלק בנגיעה הראשונה באתר
  function firstGesture() {
    document.removeEventListener("pointerdown", firstGesture, true);
    document.removeEventListener("touchstart", firstGesture, true);
    document.removeEventListener("keydown", firstGesture, true);
    if (mutedStart) unmute();
    else if (!userPaused && !playing) play();
  }
  document.addEventListener("pointerdown", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);

  // ---------- YouTube IFrame API ----------
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("yt-player", {
      width: "100%",
      height: "100%",
      videoId: ids[0],
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, controls: 1 },
      events: {
        onReady: function () {
          ready = true;
          player.setVolume(60);
          updateTitle();
          if (wantPlay) { wantPlay = false; player.loadVideoById(ids[index]); }
          else player.playVideo();
          // ניגון אוטומטי עם צליל; אם נחסם, מנגנים מושתק עד הנגיעה הראשונה
          setTimeout(function () {
            var st = player.getPlayerState();
            if (playing || userPaused || st === 1 || st === 3) return;
            mutedStart = true;
            player.mute();
            player.playVideo();
            hint.hidden = false;
          }, 1500);
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) { playing = true; updateTitle(); }
          else if (e.data === YT.PlayerState.PAUSED) { playing = false; }
          else if (e.data === YT.PlayerState.ENDED) { playing = false; go(index + 1); return; }
          render();
        },
        onError: function () { go(index + 1); }
      }
    });
  };

  var s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
  render();
})();
