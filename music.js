(function () {
  "use strict";

  // כל פריט ב-ALBUM.music הוא:
  //   קישור SoundCloud ("https://soundcloud.com/אמן/שיר")
  //   קובץ שמע ("music/01.mp3")
  //   או { src: "...", title: "..." } כדי לקבוע כותרת
  function isSoundCloud(src) { return /^https?:\/\/(www\.|m\.)?soundcloud\.com\//i.test(src); }
  function cleanSC(src) { return String(src).split(/[?#]/)[0].replace("//m.", "//"); }

  var list = ((window.ALBUM && window.ALBUM.music) || []).map(function (t) {
    if (typeof t === "string") t = { src: t };
    if (!t || !t.src) return null;
    t = { src: t.src, title: t.title || "", start: Math.max(0, Number(t.start) || 0) };
    t.sc = isSoundCloud(t.src);
    if (t.sc) t.src = cleanSC(t.src);
    else if (!t.title) {
      var name = decodeURIComponent(String(t.src).split("/").pop()).replace(/\.[^.]+$/, "");
      t.title = name.replace(/[_-]+/g, " ").trim();
    }
    return t;
  }).filter(Boolean);

  var root = document.getElementById("music");
  if (!list.length) { root.hidden = true; return; }

  var cd = document.getElementById("cd");
  var titleEl = document.getElementById("music-title");
  var countEl = document.getElementById("music-count");
  var playBtn = document.getElementById("m-play");
  var hint = document.getElementById("sound-hint");

  var index = 0;
  var playing = false;
  var userPaused = false;   // אם המשתמש עצר, לא מפעילים מחדש לבד
  var failures = 0;         // כמה שירים ברצף לא נטענו

  // ---------- מצב ----------
  function render() {
    root.classList.toggle("playing", playing);
    playBtn.setAttribute("aria-label", playing ? "השהיה" : "נגן");
    countEl.textContent = "שיר " + (index + 1) + " מתוך " + list.length;
    titleEl.textContent = list[index].title || "שיר " + (index + 1);
  }
  function onPlaying() { playing = true; failures = 0; hint.hidden = true; render(); }
  function onPaused() { playing = false; render(); }
  function onEnded() { go(index + 1); }
  function onError() {
    // שיר חסר או חסום: עוברים לבא; אם אף שיר לא נטען, מסתירים את הנגן
    failures++;
    if (failures >= list.length) { backend().pause(); root.hidden = true; return; }
    go(index + 1);
  }
  function onBlocked() { hint.hidden = false; }

  // ---------- נגן קבצים (MP3) ----------
  var fileBackend = (function () {
    var audio = new Audio();
    audio.preload = "auto";
    audio.volume = 0.6;
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPaused);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return {
      load: function (t) {
        audio.src = t.src;
        if (t.start) audio.addEventListener("loadedmetadata", function () { audio.currentTime = t.start; }, { once: true });
      },
      play: function () {
        var p = audio.play();
        if (p && p.catch) p.catch(function (err) { if (err && err.name === "NotAllowedError") onBlocked(); });
      },
      pause: function () { audio.pause(); },
      stop: function () { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    };
  })();

  // ---------- נגן SoundCloud ----------
  var scBackend = (function () {
    var widget = null, ready = false, pending = null, wantPlay = false, current = null, apiLoading = false;
    var iframe = null;
    var seekTo = 0;   // זמן התחלה (שניות) שמחכה לתחילת הניגון

    function widgetUrl(src, auto) {
      return "https://w.soundcloud.com/player/?url=" + encodeURIComponent(src) +
        "&auto_play=" + (auto ? "true" : "false") +
        "&visual=false&show_comments=false&show_user=false&show_reposts=false&hide_related=true&sharing=false&buying=false&download=false";
    }
    function setTitle() {
      if (!widget) return;
      widget.getCurrentSound(function (s) {
        if (s && s.title && list[index] === current && !current.title) {
          current.title = s.title;
          render();
        }
      });
    }
    function init(t) {
      iframe = document.createElement("iframe");
      iframe.className = "sc-frame";
      iframe.title = "SoundCloud";
      iframe.setAttribute("allow", "autoplay; encrypted-media");
      iframe.setAttribute("aria-hidden", "true");
      iframe.tabIndex = -1;
      iframe.src = widgetUrl(t.src, false);
      root.appendChild(iframe);
      apiLoading = true;
      var s = document.createElement("script");
      s.src = "https://w.soundcloud.com/player/api.js";
      s.onload = function () {
        widget = window.SC.Widget(iframe);
        var E = window.SC.Widget.Events;
        widget.bind(E.READY, function () {
          ready = true;
          widget.setVolume(60);
          setTitle();
          if (pending && pending !== current) { var p = pending; pending = null; doLoad(p); }
          else if (wantPlay) { wantPlay = false; widget.play(); checkBlocked(); }
        });
        widget.bind(E.PLAY, function () {
          if (seekTo) { widget.seekTo(seekTo * 1000); seekTo = 0; }
          if (backend() === api) onPlaying();
        });
        widget.bind(E.PAUSE, function () { if (backend() === api) onPaused(); });
        widget.bind(E.FINISH, function () { if (backend() === api) onEnded(); });
        widget.bind(E.ERROR, function () { if (backend() === api) onError(); });
      };
      s.onerror = onError;
      document.head.appendChild(s);
    }
    function doLoad(t) {
      current = t;
      ready = false;
      var auto = wantPlay;
      wantPlay = false;
      widget.load(t.src, {
        auto_play: auto,
        visual: false, show_comments: false, show_user: false, show_reposts: false,
        hide_related: true, sharing: false, buying: false, download: false,
        callback: function () {
          ready = true;
          widget.setVolume(60);
          setTitle();
          if (auto) checkBlocked();
        }
      });
    }
    // אם הניגון לא התחיל תוך זמן קצר, כנראה הדפדפן חסם צליל
    function checkBlocked() {
      setTimeout(function () {
        if (backend() !== api || playing || userPaused) return;
        widget.isPaused(function (paused) { if (paused) onBlocked(); });
      }, 1500);
    }

    var api = {
      load: function (t) {
        seekTo = t.start;
        if (!iframe) { current = t; init(t); return; }
        if (!widget || !ready && !current) { pending = t; return; }
        if (t === current) { if (ready && t.start) widget.seekTo(t.start * 1000); return; }
        doLoad(t);
      },
      play: function () {
        if (!ready) { wantPlay = true; return; }
        widget.play();
        checkBlocked();
      },
      pause: function () { wantPlay = false; if (widget) widget.pause(); },
      stop: function () { wantPlay = false; if (widget && ready) widget.pause(); }
    };
    return api;
  })();

  function backend() { return list[index].sc ? scBackend : fileBackend; }

  // ---------- פעולות ----------
  function load(i) {
    var prev = backend();
    index = (i + list.length) % list.length;
    var next = backend();
    if (prev !== next) { prev.stop(); playing = false; }
    next.load(list[index]);
    render();
  }
  function play() { userPaused = false; backend().play(); }
  function pause() { userPaused = true; backend().pause(); }
  function go(i) { load(i); userPaused = false; play(); }

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

  playBtn.addEventListener("click", function () { playing ? pause() : play(); });
  document.getElementById("m-next").addEventListener("click", function () { go(index + 1); });
  document.getElementById("m-prev").addEventListener("click", function () { go(index - 1); });
  hint.addEventListener("click", function (e) { e.stopPropagation(); play(); });

  // הדפדפנים לא מאפשרים צליל לפני אינטראקציה, לכן אם הניגון האוטומטי נחסם
  // המוזיקה מתחילה בלחיצה/מגע הראשונים באתר
  function firstGesture() {
    document.removeEventListener("pointerdown", firstGesture, true);
    document.removeEventListener("touchstart", firstGesture, true);
    document.removeEventListener("keydown", firstGesture, true);
    if (!userPaused && !playing) play();
  }
  document.addEventListener("pointerdown", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);

  load(0);
  play();
})();
