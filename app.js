(function () {
  "use strict";

  var data = window.ALBUM || { years: [], closing: {} };
  var album = document.getElementById("album");
  var navList = document.getElementById("year-nav-list");
  var CAMERA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  // כל התמונות ברצף אחד, בשביל הלייטבוקס
  var allPhotos = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  data.years.forEach(function (y, i) {
    var id = "year-" + (i + 1);
    var photos = y.photos || [];

    // ניווט
    var li = el("li");
    var a = el("a", null, y.year);
    a.href = "#" + id;
    li.appendChild(a);
    navList.appendChild(li);

    // כרטיס שנה
    var card = el("section", "year-card");
    card.id = id;
    card.setAttribute("aria-labelledby", id + "-title");

    var head = el("div", "year-head");
    var titles = el("div", "titles");
    var h2 = el("h2", null, y.year);
    h2.id = id + "-title";
    titles.appendChild(h2);
    if (y.title) titles.appendChild(el("p", null, y.title));
    head.appendChild(titles);
    head.appendChild(el("span", "count", photos.length ? photos.length + " תמונות" : "בקרוב"));
    card.appendChild(head);

    var grid = el("div", "grid");
    if (photos.length) {
      photos.forEach(function (p) {
        var index = allPhotos.length;
        allPhotos.push({ src: p.src, caption: p.caption || "", year: y.year });
        var btn = el("button", "photo-btn");
        btn.type = "button";
        btn.setAttribute("aria-label", "הגדלת תמונה" + (p.caption ? ": " + p.caption : "") + " (" + y.year + ")");
        var img = el("img");
        img.src = p.src;
        img.alt = p.caption || "תמונה משנת " + y.year;
        img.loading = "lazy";
        img.decoding = "async";
        btn.appendChild(img);
        btn.addEventListener("click", function () { openLightbox(index); });
        grid.appendChild(btn);
      });
    } else {
      for (var s = 0; s < 3; s++) {
        var slot = el("div", "slot");
        slot.innerHTML = CAMERA + "<span>מקום לתמונה</span>";
        grid.appendChild(slot);
      }
    }
    card.appendChild(grid);
    album.appendChild(card);
  });

  // סיום
  var closing = data.closing || {};
  document.getElementById("closing-message").textContent = closing.message || "";
  document.getElementById("closing-signature").textContent = closing.signature || "";

  // הדגשת השנה הנוכחית בניווט
  if ("IntersectionObserver" in window) {
    var links = navList.querySelectorAll("a");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) {
          var on = l.getAttribute("href") === "#" + e.target.id;
          l.classList.toggle("active", on);
          if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(".year-card").forEach(function (c) { io.observe(c); });
  }

  // ---------- לייטבוקס ----------
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCap = document.getElementById("lb-caption");
  var current = 0;

  function show(i) {
    if (!allPhotos.length) return;
    current = (i + allPhotos.length) % allPhotos.length;
    var p = allPhotos[current];
    lbImg.src = p.src;
    lbImg.alt = p.caption || "תמונה משנת " + p.year;
    lbCap.textContent = p.year + (p.caption ? " · " + p.caption : "");
  }

  function openLightbox(i) {
    show(i);
    if (typeof lb.showModal === "function") lb.showModal();
    else lb.setAttribute("open", "");
  }

  function closeLightbox() {
    if (typeof lb.close === "function") lb.close();
    else lb.removeAttribute("open");
  }

  lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
  // RTL: "הבאה" בצד שמאל
  lb.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
  lb.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(current + 1);
    if (e.key === "ArrowRight") show(current - 1);
  });

  // החלקה בנייד
  var startX = null;
  lb.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (startX == null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(dx > 0 ? current + 1 : current - 1);
    startX = null;
  });
})();
