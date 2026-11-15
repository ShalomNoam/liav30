(function () {
  "use strict";

  // בכל לחיצה/נגיעה במסך קופצות צ'יטות מנומרות מנקודת הלחיצה
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var layer = document.createElement("div");
  layer.className = "cheetah-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  var lightbox = document.getElementById("lightbox");

  function rand(a, b) { return a + Math.random() * (b - a); }

  function burst(x, y) {
    var count = reduce ? 1 : 5 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var img = document.createElement("img");
      img.src = "cheetah.svg";
      img.alt = "";
      img.className = "cheetah";
      var angle = (Math.PI * 2 * i) / count + rand(-0.4, 0.4);
      var dist = reduce ? 0 : rand(70, 150);
      var size = rand(38, 64);
      img.style.left = x + "px";
      img.style.top = y + "px";
      img.style.width = size + "px";
      img.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      img.style.setProperty("--dy", Math.sin(angle) * dist - (reduce ? 0 : 40) + "px");
      img.style.setProperty("--rot", rand(-50, 50) + "deg");
      img.style.animationDuration = (reduce ? 700 : rand(850, 1200)) + "ms";
      img.addEventListener("animationend", function () { this.remove(); });
      layer.appendChild(img);
    }
  }

  document.addEventListener("pointerdown", function (e) {
    if (lightbox && lightbox.open) return;
    if (layer.childElementCount > 60) return;
    burst(e.clientX, e.clientY);
  }, { passive: true });
})();
