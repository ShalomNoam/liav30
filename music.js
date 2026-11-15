(function () {
  "use strict";

  // כל פריט ב-ALBUM.music הוא שם קובץ ("music/01.mp3") או { src: "...", title: "..." }
  var list = ((window.ALBUM && window.ALBUM.music) || []).map(function (t) {
    if (typeof t === "string") t = { src: t };
    if (!t || !t.src) return null;
    if (!t.title) {
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

  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = 0.6;

  var index = 0;
  var playing = false;
  var userPaused = false;   // אם המשתמש עצר, לא מפעילים מחדש לבד
  var failures = 0;         // כמה קבצים ברצף לא נטענו
  var blocked = false;      // הדפדפן חסם ניגון עד אינטראקציה

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
    countEl.textContent = "שיר " + (index + 1) + " מתוך " + list.length;
    titleEl.textContent = list[index].title || "שיר " + (index + 1);
  }

  function load(i) {
    index = (i + list.length) % list.length;
    audio.src = list[index].src;
    render();
  }

  function play() {
    userPaused = false;
    var p = audio.play();
    if (p && p.catch) {
      p.then(function () { blocked = false; hint.hidden = true; })
       .catch(function (err) {
         if (err && err.name === "NotAllowedError") { blocked = true; hint.hidden = false; }
       });
    }
  }
  function pause() {
    userPaused = true;
    audio.pause();
  }
  function go(i) {
    load(i);
    userPaused = false;
    play();
  }

  audio.addEventListener("playing", function () { playing = true; failures = 0; render(); });
  audio.addEventListener("pause", function () { playing = false; render(); });
  audio.addEventListener("ended", function () { go(index + 1); });
  audio.addEventListener("error", function () {
    // קובץ חסר או פגום: עוברים לבא; אם אף קובץ לא נטען, מסתירים את הנגן
    failures++;
    if (failures >= list.length) { audio.pause(); root.hidden = true; return; }
    go(index + 1);
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
