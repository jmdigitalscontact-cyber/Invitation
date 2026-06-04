/**
 * index.html — staged entrance, open CTA, veil handoff to home
 */
(function () {
  "use strict";

  const HANDOFF_KEY = "wedding-intro-handoff";
  const INTRO_SEEN_KEY = "wedding-intro-seen";
  const QR_KEY = "wedding-qr-invite-id";
  const MUSIC_PLAYING_KEY = "wedding-music-was-playing";
  const MUSIC_MUTED_KEY = "wedding-music-muted";
  const MUSIC_STARTED_KEY = "wedding-music-started";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const EXIT_MS = reducedMotion ? 160 : 720;
  const PHASE = {
    photo: reducedMotion ? 0 : isMobile ? 480 : 620,
    revealed: reducedMotion ? 0 : isMobile ? 780 : 920,
    cta: reducedMotion ? 0 : isMobile ? 1500 : 1750,
  };

  const openBtn = document.getElementById("intro-open-btn");
  const veil = document.getElementById("page-transition-veil");
  const qrHint = document.getElementById("intro-qr-hint");
  let isLeaving = false;

  function syncInviteFromUrl() {
    const invite = (new URLSearchParams(window.location.search).get("invite") || "").trim();
    if (invite) {
      sessionStorage.setItem(QR_KEY, invite);
      if (qrHint) qrHint.hidden = false;
    }
  }

  function lockMusicSession() {
    sessionStorage.setItem(MUSIC_MUTED_KEY, "0");
    sessionStorage.setItem(MUSIC_PLAYING_KEY, "1");
    sessionStorage.setItem(MUSIC_STARTED_KEY, "1");
    window.__weddingMusic?.lockContinuous?.();
    window.__weddingMusic?.persist?.();
  }

  function initSparkles() {
    if (reducedMotion) return;
    const host = document.querySelector(".intro-sparkles");
    if (!host || host.childElementCount > 0) return;

    const count = isMobile ? 22 : 34;
    for (let i = 0; i < count; i += 1) {
      const sparkle = document.createElement("span");
      sparkle.className = "intro-sparkle";
      sparkle.style.left = `${4 + Math.random() * 92}%`;
      sparkle.style.top = `${6 + Math.random() * 100}%`;
      sparkle.style.animationDelay = `${Math.random() * 3.5}s`;
      sparkle.style.animationDuration = `${2.2 + Math.random() * 2.8}s`;
      const size = 2 + Math.random() * 4;
      sparkle.style.width = `${size}px`;
      sparkle.style.height = `${size}px`;
      host.appendChild(sparkle);
    }
  }

  function runEntrance() {
    initSparkles();

    if (reducedMotion) {
      document.body.classList.add(
        "intro-page--ambient",
        "intro-page--ready",
        "intro-page--photo",
        "intro-page--revealed",
        "intro-page--cta-ready"
      );
      return;
    }

    requestAnimationFrame(() => {
      document.body.classList.add("intro-page--ambient");
      requestAnimationFrame(() => {
        document.body.classList.add("intro-page--ready");
        window.setTimeout(() => {
          document.body.classList.add("intro-page--photo");
        }, PHASE.photo);
        window.setTimeout(() => {
          document.body.classList.add("intro-page--revealed");
        }, PHASE.revealed);
        window.setTimeout(() => {
          document.body.classList.add("intro-page--cta-ready");
        }, PHASE.cta);
      });
    });
  }

  async function ensureMusicContinues() {
    lockMusicSession();

    if (window.__weddingMusic?.isPlaying?.()) {
      return;
    }

    if (window.__weddingMusic?.ensurePlaying) {
      const started = await window.__weddingMusic.ensurePlaying();
      if (started) {
        lockMusicSession();
        return;
      }
    }

    const audio = document.getElementById("wedding-music");
    if (!audio || (!audio.paused && !audio.ended)) {
      lockMusicSession();
      return;
    }

    audio.volume = 0.35;
    try {
      await audio.play();
      lockMusicSession();
    } catch {
      /* script.js gesture listeners will start on next tap */
    }
  }

  function activateExitVeil() {
    if (!veil) return;
    veil.hidden = false;
    veil.setAttribute("aria-hidden", "false");
    veil.classList.remove("is-releasing");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        veil.classList.add("is-active", "is-bloom");
      });
    });
  }

  function navigateToHome(url) {
    lockMusicSession();
    if (typeof window.Turbo !== "undefined" && typeof window.Turbo.visit === "function") {
      window.Turbo.visit(url.href, { action: "advance" });
      return;
    }
    window.location.href = url.href;
  }

  async function openInvitation() {
    if (isLeaving || openBtn?.disabled) return;
    isLeaving = true;
    if (openBtn) openBtn.disabled = true;

    await ensureMusicContinues();
    lockMusicSession();

    sessionStorage.setItem(HANDOFF_KEY, "1");
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");

    document.body.classList.add("intro-page--leaving");
    activateExitVeil();

    await new Promise((resolve) => window.setTimeout(resolve, EXIT_MS));

    lockMusicSession();

    const url = new URL("./home.html", window.location.href);
    url.searchParams.set("intro", "1");
    const invite = (new URLSearchParams(window.location.search).get("invite") || "").trim();
    if (invite) url.searchParams.set("invite", invite);
    navigateToHome(url);
  }

  syncInviteFromUrl();
  openBtn?.addEventListener("click", openInvitation);
  runEntrance();
})();
