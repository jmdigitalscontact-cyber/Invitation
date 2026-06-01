const targetDate = new Date("2026-11-11T14:00:00+08:00").getTime();
const pageTransitionMs = 520;
const pageFlipMs = 760;
const introTransitionMs = 980;
const envelopeFallbackMs = 4200;
const envelopeLetterPhaseMs = 420;
const introContinueMs = 450;
let envelopeNavigateScheduled = false;
let indexEnvelopeFlowBound = false;
const introScreen = document.getElementById("intro-screen");
const openInvitationButton = document.getElementById("open-invitation");
const viewInvitationButton = document.getElementById("view-invitation");
const envelopeActions = document.getElementById("envelope-actions");
const skipIntroLink = document.getElementById("skip-intro");
const envelopeElement = document.getElementById("envelope");
const envelopeHitTarget = document.getElementById("envelope-hit-target");
const envelopeLiveRegion = document.getElementById("envelope-live");

const ENVELOPE_ANIMATIONS = {
  LETTER: "letterRevealModern",
};

let envelopeFallbackTimer = null;
let envelopeListenersAttached = false;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const qrInviteStorageKey = "wedding-qr-invite-id";
const introSeenKey = "wedding-intro-seen";
const introHandoffKey = "wedding-intro-handoff";
const handoffVeilInMs = 560;
const handoffVeilOutMs = 620;
const handoffShellReadyDelayMs = 120;
const musicMutedKey = "wedding-music-muted";
const musicStartedKey = "wedding-music-started";
const musicTimeKey = "wedding-music-time";
const musicWasPlayingKey = "wedding-music-was-playing";
const bookPageOrder = [
  "/story.html",
  "/venues.html",
  "/attire.html",
  "/details.html",
  "/faq.html",
  "/rsvp.html",
];

function trapModalFocus(modal, onClose) {
  if (!modal) return () => {};

  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(
      (element) => element.offsetParent !== null
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  modal.addEventListener("keydown", handleKeydown);
  const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(
    (element) => element.offsetParent !== null
  );
  focusable[0]?.focus();

  return () => modal.removeEventListener("keydown", handleKeydown);
}

window.trapModalFocus = trapModalFocus;

function getTransitionVeil() {
  return document.getElementById("page-transition-veil");
}

function ensureTransitionVeil() {
  let veil = getTransitionVeil();
  if (veil) return veil;

  veil = document.createElement("div");
  veil.id = "page-transition-veil";
  veil.className = "page-transition-veil";
  veil.hidden = true;
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);
  return veil;
}

function activateTransitionVeil() {
  const veil = ensureTransitionVeil();
  veil.hidden = false;
  veil.setAttribute("aria-hidden", "false");
  veil.classList.remove("is-releasing");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      veil.classList.add("is-active");
    });
  });
  return veil;
}

function waitForVeilCover(veil, callback) {
  const timeoutMs = reducedMotionQuery.matches ? 100 : handoffVeilInMs + 60;
  let finished = false;

  const done = () => {
    if (finished) return;
    finished = true;
    veil.removeEventListener("transitionend", onTransitionEnd);
    callback();
  };

  const onTransitionEnd = (event) => {
    if (event.target !== veil || event.propertyName !== "opacity") return;
    done();
  };

  veil.addEventListener("transitionend", onTransitionEnd);
  setTimeout(done, timeoutMs);
}

function releaseTransitionVeil(callback) {
  const veil = getTransitionVeil();
  if (!veil || !veil.classList.contains("is-active")) {
    callback?.();
    return;
  }

  const timeoutMs = reducedMotionQuery.matches ? 140 : handoffVeilOutMs + 60;
  let finished = false;

  const done = () => {
    if (finished) return;
    finished = true;
    veil.removeEventListener("transitionend", onTransitionEnd);
    veil.classList.remove("is-active", "is-releasing");
    veil.hidden = true;
    veil.setAttribute("aria-hidden", "true");
    callback?.();
  };

  const onTransitionEnd = (event) => {
    if (event.target !== veil || event.propertyName !== "opacity") return;
    done();
  };

  veil.classList.add("is-releasing");
  veil.addEventListener("transitionend", onTransitionEnd);
  setTimeout(done, timeoutMs);
}

function cleanIntroUrlParam() {
  if (!window.history?.replaceState) return;
  const cleanUrl = new URL(window.location.href);
  if (!cleanUrl.searchParams.has("intro")) return;
  cleanUrl.searchParams.delete("intro");
  window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
}

function maybeShowQrRsvpBanner() {
  const inviteId = getActiveQrInviteId();
  if (!inviteId || sessionStorage.getItem("rsvp-hint-shown")) return;

  sessionStorage.setItem("rsvp-hint-shown", "1");

  const banner = document.createElement("div");
  banner.className = "rsvp-invite-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML =
    "<p>Your invitation is linked. Tap <strong>RSVP</strong> when you&rsquo;re ready.</p>";
  document.body.appendChild(banner);

  requestAnimationFrame(() => banner.classList.add("is-visible"));
  setTimeout(() => banner.classList.remove("is-visible"), 5500);
  setTimeout(() => banner.remove(), 6000);
}

function resetIndexEnvelopeState() {
  if (!document.body.classList.contains("index-envelope-page")) return;
  envelopeNavigateScheduled = false;
  indexEnvelopeFlowBound = false;
  document.body.classList.remove("is-leaving");
  const envelope = document.getElementById("index-envelope");
  envelope?.classList.remove("is-opening", "note-only");
  envelope?.classList.add("index-envelope-idle");
  const openBtn = document.getElementById("index-open-btn");
  if (openBtn) {
    openBtn.disabled = false;
  }
  const indexLive = document.getElementById("index-live");
  if (indexLive) {
    indexLive.textContent = "";
  }
  const veil = getTransitionVeil();
  if (veil) {
    veil.classList.remove("is-active", "is-releasing");
    veil.hidden = true;
    veil.setAttribute("aria-hidden", "true");
  }
}

function initIndexEnvelopeFlow() {
  if (!document.body.classList.contains("index-envelope-page")) return;
  if (indexEnvelopeFlowBound) return;

  const envelope = document.getElementById("index-envelope");
  const openBtn = document.getElementById("index-open-btn");
  const letter = envelope?.querySelector(".index-letter");
  if (!envelope || !openBtn || !letter) return;

  indexEnvelopeFlowBound = true;

  const indexLive = document.getElementById("index-live");
  if (indexLive) {
    indexLive.textContent = "Wedding invitation for Jason and Rhona Mae. Tap the seal to open.";
  }

  openBtn.addEventListener("click", () => {
    if (envelope.classList.contains("is-opening")) return;
    envelope.classList.remove("index-envelope-idle");
    envelope.classList.add("is-opening");
    openBtn.disabled = true;
    openBtn.blur();
    if (indexLive) {
      indexLive.textContent = "Opening your invitation.";
    }
    tryPlayWeddingMusic();
  });

  letter.addEventListener("animationend", (event) => {
    if (event.animationName !== "indexLetterLift") return;
    if (envelope.classList.contains("note-only")) return;
    if (envelopeNavigateScheduled) return;
    envelopeNavigateScheduled = true;

    envelope.classList.add("note-only");
    document.body.classList.add("is-leaving");

    const veil = activateTransitionVeil();
    waitForVeilCover(veil, () => {
      markIntroSeen();
      sessionStorage.setItem(introHandoffKey, "1");
      persistMusicPlaybackState();

      const destination = getInvitationDestinationUrl();
      const url = new URL(destination, window.location.href);
      url.searchParams.set("intro", "1");
      navigateToUrl(url.href);
    });
  });
}

function navigateToUrl(url, options = {}) {
  const { forceReload = false } = options;
  const absoluteUrl = new URL(url, window.location.href).href;

  if (!forceReload && window.Turbo?.visit) {
    window.Turbo.visit(absoluteUrl);
    return;
  }

  window.location.href = absoluteUrl;
}

const parts = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/index.html";
  const normalized = pathname.replace(/\\/g, "/").toLowerCase();
  const htmlMatch = normalized.match(/\/[^/]+\.html$/);
  return htmlMatch ? htmlMatch[0] : normalized;
}

function inferPageTurnDirection(destinationPathname) {
  const currentPath = normalizePath(window.location.pathname);
  const destinationPath = normalizePath(destinationPathname);
  const currentIndex = bookPageOrder.indexOf(currentPath);
  const destinationIndex = bookPageOrder.indexOf(destinationPath);

  if (currentIndex === -1 || destinationIndex === -1 || currentIndex === destinationIndex) {
    return null;
  }

  return destinationIndex > currentIndex ? "next" : "back";
}

function getInvitationDestinationUrl() {
  const destinationUrl = new URL("./home.html", window.location.href);
  const qrInviteId = getActiveQrInviteId();
  if (qrInviteId) {
    destinationUrl.searchParams.set("invite", qrInviteId);
  }
  return destinationUrl.href;
}

function clearEnvelopeFallback() {
  if (envelopeFallbackTimer) {
    clearTimeout(envelopeFallbackTimer);
    envelopeFallbackTimer = null;
  }
}

let envelopeLetterPhaseTimer = null;

function attachEnvelopeListeners() {
  if (!envelopeElement || envelopeListenersAttached) return;
  const invitation = envelopeElement.querySelector(".invitation");
  invitation?.addEventListener("animationend", onEnvelopeAnimationEnd);
  envelopeListenersAttached = true;
}

function detachEnvelopeListeners() {
  if (!envelopeElement) return;
  const invitation = envelopeElement.querySelector(".invitation");
  invitation?.removeEventListener("animationend", onEnvelopeAnimationEnd);
  envelopeListenersAttached = false;
}

function clearEnvelopeLetterPhaseTimer() {
  if (envelopeLetterPhaseTimer) {
    clearTimeout(envelopeLetterPhaseTimer);
    envelopeLetterPhaseTimer = null;
  }
}

function onEnvelopeAnimationEnd(event) {
  if (!introScreen?.classList.contains("is-opening")) return;
  if (envelopeNavigateScheduled) return;

  if (
    event.animationName === ENVELOPE_ANIMATIONS.LETTER &&
    event.target.classList.contains("invitation")
  ) {
    finishEnvelopeReveal();
  }
}

function finishEnvelopeReveal() {
  if (!introScreen || envelopeNavigateScheduled) return;
  envelopeNavigateScheduled = true;

  clearEnvelopeFallback();
  clearEnvelopeLetterPhaseTimer();
  detachEnvelopeListeners();

  introScreen.classList.remove("phase-letter", "phase-shell");
  envelopeElement?.classList.remove("envelope-idle", "phase-letter", "phase-shell");

  if (envelopeLiveRegion) {
    envelopeLiveRegion.textContent = "Opening your invitation.";
  }

  const holdMs = reducedMotionQuery.matches ? 0 : introContinueMs;
  setTimeout(() => navigateToInvitationHome(), holdMs);
}

function startEnvelopeOpen() {
  if (!introScreen || introScreen.classList.contains("is-opening")) return;

  if (openInvitationButton) {
    openInvitationButton.disabled = true;
    openInvitationButton.hidden = true;
    openInvitationButton.style.pointerEvents = "none";
  }
  if (envelopeHitTarget) {
    envelopeHitTarget.disabled = true;
  }

  tryPlayWeddingMusic();

  if (reducedMotionQuery.matches) {
    introScreen.classList.add("is-opening", "phase-letter", "phase-shell");
    envelopeElement?.classList.remove("envelope-idle");
    finishEnvelopeReveal();
    return;
  }

  introScreen.classList.add("is-opening");
  envelopeElement?.classList.remove("envelope-idle");
  attachEnvelopeListeners();
  clearEnvelopeFallback();
  clearEnvelopeLetterPhaseTimer();
  envelopeLetterPhaseTimer = setTimeout(() => {
    introScreen.classList.add("phase-letter");
    envelopeElement?.classList.add("phase-letter");
  }, envelopeLetterPhaseMs);
  envelopeFallbackTimer = setTimeout(finishEnvelopeReveal, envelopeFallbackMs);
}

function markIntroSeen() {
  sessionStorage.setItem(introSeenKey, "1");
}

function shouldSkipIntroOnLoad() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("replay") === "1") return false;
  return sessionStorage.getItem(introSeenKey) === "1";
}

function navigateToInvitationHome(options = {}) {
  const { instant = false } = options;
  markIntroSeen();
  persistMusicPlaybackState();

  const destination = getInvitationDestinationUrl();
  if (instant) {
    navigateToUrl(destination);
    return;
  }

  document.body.classList.remove("intro-active");
  introScreen?.classList.add("is-leaving");
  document.body.classList.add("page-exit");

  setTimeout(() => {
    navigateToUrl(destination);
  }, pageTransitionMs);
}

function resetIndexIntroState() {
  if (!introScreen) return;
  envelopeNavigateScheduled = false;
  clearEnvelopeFallback();
  clearEnvelopeLetterPhaseTimer();
  detachEnvelopeListeners();
  introScreen.classList.remove(
    "hidden",
    "opening",
    "is-opening",
    "is-revealed",
    "is-leaving",
    "phase-letter",
    "phase-shell"
  );
  document.body.classList.add("intro-active");
  envelopeElement?.classList.remove("is-revealed", "phase-letter", "phase-shell");
  envelopeElement?.classList.add("envelope-idle");
  if (openInvitationButton) {
    openInvitationButton.disabled = false;
    openInvitationButton.hidden = false;
    openInvitationButton.style.pointerEvents = "auto";
  }
  if (envelopeHitTarget) {
    envelopeHitTarget.disabled = false;
  }
  if (envelopeActions) {
    envelopeActions.classList.add("hidden");
  }
  if (viewInvitationButton) {
    viewInvitationButton.href = getInvitationDestinationUrl();
  }
  if (envelopeLiveRegion) {
    envelopeLiveRegion.textContent = "";
  }
}

function syncQrInviteContext() {
  const params = new URLSearchParams(window.location.search);
  const invite = (params.get("invite") || "").trim();
  if (invite) {
    sessionStorage.setItem(qrInviteStorageKey, invite);
    return invite;
  }

  const storedInvite = (sessionStorage.getItem(qrInviteStorageKey) || "").trim();
  return storedInvite || "";
}

function getActiveQrInviteId() {
  const fromUrl = (new URLSearchParams(window.location.search).get("invite") || "").trim();
  if (fromUrl) {
    sessionStorage.setItem(qrInviteStorageKey, fromUrl);
    return fromUrl;
  }
  return (sessionStorage.getItem(qrInviteStorageKey) || "").trim();
}

function buildGoogleCalendarUrl({ title, start, end, location, details }) {
  const format = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${format(start)}/${format(end)}`,
    location,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcsFile({ title, start, end, location, details, filename }) {
  const format = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JasonRhonaMae//Wedding//EN",
    "BEGIN:VEVENT",
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${details}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const weddingEvents = {
  ceremony: {
    title: "Jason & Rhona Mae — Wedding Ceremony",
    start: new Date("2026-11-11T06:00:00.000Z"),
    end: new Date("2026-11-11T08:00:00.000Z"),
    location: "St. John Marie Vianney Parish Church, Lalaan II, Silang, Cavite",
    details: "Ceremony begins at 2:00 PM. Please arrive early.",
    filename: "jason-rhona-mae-ceremony.ics",
  },
  reception: {
    title: "Jason & Rhona Mae — Wedding Reception",
    start: new Date("2026-11-11T09:00:00.000Z"),
    end: new Date("2026-11-11T14:00:00.000Z"),
    location: "Alta Terra Tagaytay, Tagaytay, Cavite",
    details: "Reception begins at 5:00 PM.",
    filename: "jason-rhona-mae-reception.ics",
  },
};

let calendarButtonsBound = false;

function initCalendarButtons() {
  if (calendarButtonsBound) return;
  calendarButtonsBound = true;

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-calendar]");
    if (!button) return;

    const key = button.getAttribute("data-calendar");
    const eventData = weddingEvents[key];
    if (!eventData) return;

    if (button.dataset.calendarType === "ics") {
      downloadIcsFile(eventData);
    } else {
      window.open(buildGoogleCalendarUrl(eventData), "_blank", "noopener,noreferrer");
    }
  });
}

let weddingAudio = null;
let musicToggleButton = null;
let musicPersistenceInitialized = false;
let musicInteractionFallbackAttached = false;

function getMusicSourcePath() {
  const path = window.location.pathname.replace(/\\/g, "/");
  if (path.includes("/rsvp/")) {
    return "../audio/ambient.mp3";
  }
  return "./audio/ambient.mp3";
}

function syncWeddingAudioRef() {
  const domAudio = document.getElementById("wedding-music");
  if (domAudio) {
    weddingAudio = domAudio;
    return true;
  }
  return false;
}

function getWeddingAudio() {
  const domAudio = document.getElementById("wedding-music");
  if (domAudio) {
    weddingAudio = domAudio;
  } else if (!weddingAudio || !weddingAudio.isConnected) {
    weddingAudio = null;
  }

  const shouldPreload =
    window.__WEDDING_STATIC_PREVIEW__ === true ||
    sessionStorage.getItem(musicWasPlayingKey) === "1" ||
    sessionStorage.getItem(musicStartedKey) === "1";

  if (!weddingAudio) {
    const playerRoot = document.getElementById("wedding-audio-player");
    weddingAudio = document.createElement("audio");
    weddingAudio.id = "wedding-music";
    weddingAudio.loop = true;
    weddingAudio.preload = shouldPreload ? "auto" : "none";
    weddingAudio.innerHTML = `<source src="${getMusicSourcePath()}" type="audio/mpeg" />`;
    if (playerRoot) {
      playerRoot.appendChild(weddingAudio);
    } else {
      document.body.appendChild(weddingAudio);
    }
  } else if (
    shouldPreload &&
    weddingAudio.preload === "none" &&
    weddingAudio.paused &&
    weddingAudio.readyState < 2
  ) {
    weddingAudio.preload = "auto";
    weddingAudio.load();
  }

  const savedTime = Number(sessionStorage.getItem(musicTimeKey) || "0");
  if (Number.isFinite(savedTime) && savedTime > 0 && weddingAudio.paused) {
    const restorePlaybackPosition = () => {
      if (!Number.isFinite(weddingAudio.duration) || savedTime < weddingAudio.duration - 0.25) {
        try {
          weddingAudio.currentTime = savedTime;
        } catch {
          // Ignore browsers that block seeks before metadata is ready.
        }
      }
    };

    if (weddingAudio.readyState >= 1) {
      restorePlaybackPosition();
    } else {
      weddingAudio.addEventListener("loadedmetadata", restorePlaybackPosition, { once: true });
    }
  }

  return weddingAudio;
}

function isMusicMuted() {
  return sessionStorage.getItem(musicMutedKey) === "1";
}

function updateMusicToggleUi() {
  if (!musicToggleButton) return;
  const playing = !getWeddingAudio().paused && !getWeddingAudio().ended;
  musicToggleButton.setAttribute("aria-pressed", playing ? "true" : "false");
  musicToggleButton.setAttribute("aria-label", playing ? "Mute background music" : "Play background music");
  musicToggleButton.textContent = playing ? "♪" : "♫";
}

function persistMusicPlaybackState() {
  if (!syncWeddingAudioRef() && !weddingAudio) return;
  const audio = getWeddingAudio();
  const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  sessionStorage.setItem(musicTimeKey, String(Math.max(0, currentTime)));
  const isPlaying = !audio.paused && !audio.ended;
  sessionStorage.setItem(musicWasPlayingKey, isPlaying ? "1" : "0");
}

function initMusicPersistence() {
  if (musicPersistenceInitialized) return;
  musicPersistenceInitialized = true;

  window.addEventListener("pagehide", persistMusicPlaybackState);
  window.addEventListener("beforeunload", persistMusicPlaybackState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persistMusicPlaybackState();
    }
  });
}

async function tryPlayWeddingMusic() {
  if (isMusicMuted()) return false;
  const audio = getWeddingAudio();
  if (!audio.paused && !audio.ended) {
    updateMusicToggleUi();
    return true;
  }
  try {
    audio.volume = 0.35;
    await audio.play();
    sessionStorage.setItem(musicStartedKey, "1");
    sessionStorage.setItem(musicWasPlayingKey, "1");
    if (musicToggleButton) musicToggleButton.hidden = false;
    updateMusicToggleUi();
    return true;
  } catch {
    updateMusicToggleUi();
    return false;
  }
}

async function resumeMusicIfNeeded() {
  if (isMusicMuted()) return false;
  if (sessionStorage.getItem(musicWasPlayingKey) !== "1") return false;
  syncWeddingAudioRef();
  const audio = getWeddingAudio();
  if (!audio.paused && !audio.ended) {
    updateMusicToggleUi();
    return true;
  }
  return tryPlayWeddingMusic();
}

function attachMusicInteractionFallback() {
  if (musicInteractionFallbackAttached) return;
  musicInteractionFallbackAttached = true;

  const resumeOnInteraction = () => {
    if (isMusicMuted()) return;
    if (sessionStorage.getItem(musicWasPlayingKey) !== "1") return;
    resumeMusicIfNeeded();
  };

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, resumeOnInteraction, {
      once: true,
      passive: true,
      capture: true,
    });
  });
}

function initMusicToggle() {
  if (window.__WEDDING_STATIC_PREVIEW__ === true) {
    document.querySelectorAll(".music-toggle").forEach((el) => el.remove());
    musicToggleButton = null;
    return;
  }

  const playerRoot = document.getElementById("wedding-audio-player");
  if (playerRoot?.querySelector(".music-toggle")) {
    musicToggleButton = playerRoot.querySelector(".music-toggle");
    updateMusicToggleUi();
    return;
  }
  if (document.querySelector(".music-toggle")) {
    musicToggleButton = document.querySelector(".music-toggle");
    updateMusicToggleUi();
    return;
  }

  musicToggleButton = document.createElement("button");
  musicToggleButton.type = "button";
  musicToggleButton.className = "music-toggle";
  musicToggleButton.setAttribute("aria-pressed", "false");
  musicToggleButton.setAttribute("aria-label", "Play background music");
  musicToggleButton.textContent = "♫";
  if (playerRoot) {
    playerRoot.appendChild(musicToggleButton);
  } else {
    document.body.appendChild(musicToggleButton);
  }

  if (
    introScreen &&
    sessionStorage.getItem(musicStartedKey) !== "1" &&
    window.__WEDDING_STATIC_PREVIEW__ !== true
  ) {
    musicToggleButton.hidden = true;
  }

  musicToggleButton.addEventListener("click", async () => {
    const audio = getWeddingAudio();
    if (audio.paused) {
      sessionStorage.setItem(musicMutedKey, "0");
      await tryPlayWeddingMusic();
    } else {
      audio.pause();
      sessionStorage.setItem(musicMutedKey, "1");
      sessionStorage.setItem(musicWasPlayingKey, "0");
      persistMusicPlaybackState();
      updateMusicToggleUi();
    }
  });

  if (sessionStorage.getItem(musicWasPlayingKey) === "1" && !isMusicMuted()) {
    tryPlayWeddingMusic();
  } else {
    updateMusicToggleUi();
  }
}

function initGlobalMusicAutoplay() {
  const startMusicOnFirstInteraction = () => {
    if (isMusicMuted()) return;
    tryPlayWeddingMusic();
  };

  const attemptAutoplayNow = () => {
    if (isMusicMuted()) return;
    tryPlayWeddingMusic().then((started) => {
      if (!started) attachMusicInteractionFallback();
    });
  };

  if (window.__WEDDING_STATIC_PREVIEW__ === true) {
    sessionStorage.setItem(musicWasPlayingKey, "1");
    attemptAutoplayNow();
  } else if (sessionStorage.getItem(musicWasPlayingKey) === "1" && !isMusicMuted()) {
    resumeMusicIfNeeded().then((started) => {
      if (!started) attachMusicInteractionFallback();
    });
  }

  const interactionEvents = ["pointerdown", "keydown", "touchstart"];
  interactionEvents.forEach((eventName) => {
    document.addEventListener(eventName, startMusicOnFirstInteraction, {
      once: true,
      passive: true,
      capture: true,
    });
  });
}

function initWeddingMusic() {
  initMusicPersistence();
  initGlobalMusicAutoplay();
  initMusicToggle();

  resumeMusicIfNeeded().then((started) => {
    if (!started && sessionStorage.getItem(musicWasPlayingKey) === "1") {
      attachMusicInteractionFallback();
    }
  });
}

function initMobileNav() {
  if (window.__WEDDING_STATIC_PREVIEW__ === true) return;
  if (introScreen || document.querySelector(".mobile-nav")) return;

  const currentPath = normalizePath(window.location.pathname);
  const links = [
    { href: "./home.html", label: "Home", icon: "⌂", match: "/home.html" },
    { href: "./story.html", label: "Story", icon: "♡", match: "/story.html" },
    { href: "./venues.html", label: "Venues", icon: "📍", match: "/venues.html" },
    { href: "./details.html", label: "Details", icon: "✦", match: "/details.html" },
    { href: "./rsvp.html", label: "RSVP", icon: "✓", match: "/rsvp.html" },
    { href: "./faq.html", label: "FAQ", icon: "?", match: "/faq.html" },
  ];

  const nav = document.createElement("nav");
  nav.className = "mobile-nav";
  nav.setAttribute("aria-label", "Quick navigation");
  nav.innerHTML = links
    .map(({ href, label, icon, match }) => {
      const current = currentPath === match ? ' aria-current="page"' : "";
      return `<a href="${href}" class="mobile-nav-link"${current}><span class="nav-icon">${icon}</span>${label}</a>`;
    })
    .join("");
  document.body.appendChild(nav);
}

function updateMobileNavActivePage() {
  const nav = document.querySelector(".mobile-nav");
  if (!nav) return;
  const currentPath = normalizePath(window.location.pathname);
  nav.querySelectorAll(".mobile-nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const linkPath = normalizePath(new URL(href, window.location.href).pathname);
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function markRsvpLinksTurboOptOut() {
  document.querySelectorAll('.site-nav-link-rsvp, a[href$="rsvp.html"]').forEach((link) => {
    link.removeAttribute("data-turbo");
  });
}

function pressLinkFeedback(anchor) {
  anchor.classList.add("is-pressed");
  setTimeout(() => anchor.classList.remove("is-pressed"), 160);
}

function markHomePhotoMissing(img) {
  const frame = img.closest(".home-photo-frame");
  if (frame) frame.classList.add("is-photo-missing");
}

function markVenuePhotoMissing(img) {
  const media = img.closest(".venue-card-media");
  if (media) media.classList.add("is-photo-missing");
}

function initPhotoPlaceholders() {
  document.querySelectorAll(".home-photo-img").forEach((img) => {
    const onMissing = () => markHomePhotoMissing(img);
    img.addEventListener("error", onMissing, { once: true });
    if (img.complete && img.naturalWidth === 0) onMissing();
  });

  document.querySelectorAll(".venue-card-media img").forEach((img) => {
    const onMissing = () => markVenuePhotoMissing(img);
    img.addEventListener("error", onMissing, { once: true });
    if (img.complete && img.naturalWidth === 0) onMissing();
  });

  document.querySelectorAll(".story-photo img").forEach((img) => {
    img.addEventListener("error", () => {
      const figure = img.closest(".story-photo");
      if (!figure || figure.querySelector(".photo-placeholder")) return;
      img.remove();
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = "Photo coming soon";
      figure.insertBefore(placeholder, figure.firstChild);
    }, { once: true });
  });
}

function initHomeEnter() {
  if (!document.body.classList.contains("home-page")) return;

  const targets = [
    document.querySelector(".home-page .site-nav"),
    document.querySelector(".home-page .hero"),
    document.querySelector(".home-page main"),
    document.querySelector(".home-page .home-signoff"),
  ].filter(Boolean);

  targets.forEach((element, index) => {
    element.classList.add("home-enter");
    element.style.setProperty("--enter-i", String(index));
  });

  const hero = document.querySelector(".home-page .hero");
  if (hero) {
    const heroParts = hero.querySelectorAll(
      ".eyebrow, .home-welcome, .couple-name, .home-photo, .home-monogram-divider, .date, .home-location, .home-invite-line, .home-hero-actions, .countdown-label, .countdown"
    );
    heroParts.forEach((element, index) => {
      element.classList.add("home-enter-child");
      element.style.setProperty("--enter-child-i", String(index));
    });
  }
}

function initInnerPageEnter() {
  if (!document.body.classList.contains("inner-page")) return;

  const pageIntro = document.querySelector(".inner-page .page-intro");
  const pageShell = document.querySelector(".inner-page .page-shell");
  const introInsideShell = Boolean(pageIntro && pageShell?.contains(pageIntro));

  const targets = [
    document.querySelector(".inner-page .site-nav"),
    introInsideShell ? null : pageIntro,
    pageShell,
    document.querySelector(".inner-page .venues-main"),
  ].filter(Boolean);

  targets.forEach((element, index) => {
    element.classList.add("inner-enter");
    element.style.setProperty("--enter-i", String(index));
  });

  if (reducedMotionQuery.matches) {
    document.body.classList.add("is-ready");
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add("is-ready");
    });
  });
}

function initHomeWelcome() {
  if (!document.body.classList.contains("home-page")) return;

  const welcome = document.getElementById("home-welcome");
  if (!welcome) return;

  const inviteId = getActiveQrInviteId();
  if (!inviteId) {
    welcome.hidden = true;
    welcome.textContent = "";
    return;
  }

  welcome.textContent = "Your invitation is linked — we can't wait to celebrate with you.";
  welcome.hidden = false;
}

function initHomeScrollCards() {
  if (!document.body.classList.contains("home-page")) return;

  const cards = Array.from(document.querySelectorAll(".home-page .home-info-grid .info-card"));
  if (!cards.length) return;

  cards.forEach((card, index) => {
    card.classList.add("home-scroll-reveal");
    card.style.setProperty("--home-scroll-delay", `${(index % 2) * 0.08}s`);
  });

  const cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    {
      threshold: 0.22,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  cards.forEach((card) => cardObserver.observe(card));
}

function revealHomeEnter() {
  if (!document.body.classList.contains("home-page")) return;
  if (reducedMotionQuery.matches) {
    document.body.classList.add("is-ready");
    return;
  }
  document.body.classList.add("is-ready");
}

function hasHomeIntroHandoff() {
  return (
    document.body.classList.contains("home-intro-enter") ||
    document.body.classList.contains("intro-handoff-active") ||
    sessionStorage.getItem(introHandoffKey) === "1"
  );
}

function bootstrapHomeIntroFromSession() {
  if (!document.body.classList.contains("home-page")) return;

  const hasIntroParam = new URLSearchParams(window.location.search).get("intro") === "1";
  const handoffActive = sessionStorage.getItem(introHandoffKey) === "1";

  if (handoffActive) {
    document.body.classList.add("intro-handoff-active", "home-intro-enter");
    const veil = getTransitionVeil();
    if (veil) {
      veil.hidden = false;
      veil.classList.add("is-active");
      veil.setAttribute("aria-hidden", "false");
    }
  } else if (hasIntroParam) {
    document.body.classList.add("home-intro-enter");
  }
}

function initIntroHandoffEnter() {
  if (!document.body.classList.contains("home-page")) return;

  bootstrapHomeIntroFromSession();

  const handoffActive =
    document.body.classList.contains("intro-handoff-active") ||
    sessionStorage.getItem(introHandoffKey) === "1";

  if (!handoffActive) {
    if (!document.body.classList.contains("home-intro-enter")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => revealHomeEnter());
      });
      return;
    }

    cleanIntroUrlParam();
    const introReadyDelay = reducedMotionQuery.matches ? 0 : 360;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!document.body.classList.contains("home-intro-ready")) {
          document.body.classList.add("home-intro-ready");
        }
        setTimeout(revealHomeEnter, introReadyDelay);
      });
    });
    return;
  }

  document.body.classList.add("intro-handoff-active", "home-intro-enter");

  const veil = ensureTransitionVeil();
  if (!veil.classList.contains("is-active")) {
    veil.hidden = false;
    veil.setAttribute("aria-hidden", "false");
    veil.classList.add("is-active");
  }

  const shellReadyDelay = reducedMotionQuery.matches ? 40 : handoffShellReadyDelayMs;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add("home-intro-ready");

      setTimeout(() => {
        releaseTransitionVeil(() => {
          sessionStorage.removeItem(introHandoffKey);
          cleanIntroUrlParam();
          revealHomeEnter();
        });
      }, shellReadyDelay);
    });
  });
}

function initScrollReveal() {
  if (introScreen) return;

  const seen = new Set();
  let revealIndex = 0;
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;

  function shouldSkipReveal(element) {
    if (!(element instanceof HTMLElement)) return true;
    if (seen.has(element)) return true;
    if (element.classList.contains("scroll-reveal")) return true;
    if (element.classList.contains("home-scroll-reveal")) return true;
    if (element.classList.contains("home-enter")) return true;
    if (element.classList.contains("home-enter-child")) return true;
    if (element.matches("[data-no-scroll-reveal], .no-scroll-reveal")) return true;
    if (element.closest(".mobile-nav, .site-nav")) return true;
    if (element.closest(".index-envelope-stage, .index-envelope-wrapper")) return true;
    return false;
  }

  function markForReveal(element) {
    if (shouldSkipReveal(element)) return;
    seen.add(element);
    const delayStep = revealIndex % 4;
    element.style.setProperty("--scroll-reveal-delay", `${delayStep * 0.06}s`);
    revealIndex += 1;
    element.classList.add("scroll-reveal");
  }

  const selectors = [
    ".cards > *",
    ".home-info-grid > *",
    ".home-notes > *",
    ".story-slide-card",
    ".story-gallery",
    ".story-slide-photos > *",
    ".story-gallery-grid > *",
    ".story-gallery-side > *",
    ".story-photo",
    ".faq-list > details",
    ".venue-card",
    ".detail-icon-card",
    ".attire-page .card",
    ".page-shell .motif-swatch-wrap",
    ".page-shell .sub-nav",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => markForReveal(element));
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    {
      threshold: isMobileViewport ? 0.03 : 0.2,
      rootMargin: isMobileViewport
        ? "0px 0px -4% 0px"
        : "0px 0px -12% 0px",
    }
  );

  const revealTargets = Array.from(document.querySelectorAll(".scroll-reveal"));
  revealTargets.forEach((element) => revealObserver.observe(element));

  // Mobile browsers can occasionally miss observer callbacks for initially in-view nodes.
  function fallbackRevealVisibleTargets() {
    revealTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight * 0.96 && rect.bottom > window.innerHeight * 0.05;
      element.classList.toggle("is-visible", isInViewport);
    });
  }

  requestAnimationFrame(fallbackRevealVisibleTargets);
  window.setTimeout(fallbackRevealVisibleTargets, 180);
}

let smoothScrollInitialized = false;

function initSmoothScrollEffect() {
  if (smoothScrollInitialized) return;
  if (reducedMotionQuery.matches) return;
  if (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) return;

  smoothScrollInitialized = true;
  document.documentElement.classList.add("smooth-scroll-active");

  const scrollRoot = document.scrollingElement || document.documentElement;
  let currentY = window.scrollY;
  let targetY = window.scrollY;
  let frameId = null;
  let programmaticScroll = false;
  let wheelIdleTimer = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getEaseFactor(delta) {
    return Math.min(0.18, 0.09 + Math.abs(delta) * 0.00035);
  }

  function animateScroll() {
    const delta = targetY - currentY;
    if (Math.abs(delta) < 0.35) {
      currentY = targetY;
      programmaticScroll = true;
      window.scrollTo({ top: currentY, behavior: "auto" });
      programmaticScroll = false;
      frameId = null;
      return;
    }

    currentY += delta * getEaseFactor(delta);
    programmaticScroll = true;
    window.scrollTo({ top: currentY, behavior: "auto" });
    programmaticScroll = false;
    frameId = window.requestAnimationFrame(animateScroll);
  }

  function queueScrollAnimation() {
    if (!frameId) {
      frameId = window.requestAnimationFrame(animateScroll);
    }
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      if (event.target instanceof Element) {
        const skipElement = event.target.closest(
          "textarea, select, [contenteditable='true'], [data-no-smooth-scroll]"
        );
        if (skipElement) return;
      }

      const maxScroll = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
      if (maxScroll === 0) return;

      event.preventDefault();
      targetY = clamp(targetY + event.deltaY * 0.92, 0, maxScroll);
      queueScrollAnimation();

      window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = window.setTimeout(() => {
        if (Math.abs(targetY - currentY) > 1) queueScrollAnimation();
      }, 90);
    },
    { passive: false }
  );

  window.addEventListener("scroll", () => {
    if (programmaticScroll) return;
    currentY = window.scrollY;
    targetY = currentY;
  });
}

let lastCountdownSecond = null;

function updateCountdown() {
  if (!parts.days || !parts.hours || !parts.minutes || !parts.seconds) return;
  const now = Date.now();
  const gap = Math.max(0, targetDate - now);

  const day = Math.floor(gap / (1000 * 60 * 60 * 24));
  const hour = Math.floor((gap / (1000 * 60 * 60)) % 24);
  const minute = Math.floor((gap / (1000 * 60)) % 60);
  const second = Math.floor((gap / 1000) % 60);

  parts.days.textContent = String(day).padStart(2, "0");
  parts.hours.textContent = String(hour).padStart(2, "0");
  parts.minutes.textContent = String(minute).padStart(2, "0");
  parts.seconds.textContent = String(second).padStart(2, "0");

  const secondsTile = parts.seconds.closest(".countdown-seconds");
  if (secondsTile && lastCountdownSecond !== null && second !== lastCountdownSecond) {
    secondsTile.classList.remove("is-ticking");
    void secondsTile.offsetWidth;
    secondsTile.classList.add("is-ticking");
  }
  lastCountdownSecond = second;
}

updateCountdown();
setInterval(updateCountdown, 1000);
syncQrInviteContext();

if (introScreen && shouldSkipIntroOnLoad()) {
  navigateToInvitationHome({ instant: true });
}

skipIntroLink?.addEventListener("click", (event) => {
  event.preventDefault();
  navigateToInvitationHome();
});

openInvitationButton?.addEventListener("click", startEnvelopeOpen);
envelopeHitTarget?.addEventListener("click", startEnvelopeOpen);

viewInvitationButton?.addEventListener("click", (event) => {
  event.preventDefault();
  navigateToInvitationHome();
});

function onTurboPageLoad() {
  syncWeddingAudioRef();
  initAppShell();
  syncQrInviteContext();
  initCurrentPage();
  if (!isMusicMuted() && sessionStorage.getItem(musicWasPlayingKey) === "1") {
    resumeMusicIfNeeded();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  resetIndexIntroState();
  initAppShell();
  if (!window.Turbo) {
    syncQrInviteContext();
    initCurrentPage();
  }
});

window.addEventListener("pageshow", (event) => {
  const pageCard = document.querySelector(".page");
  const enterDirection = sessionStorage.getItem("page-turn-enter-direction");
  sessionStorage.removeItem("page-turn-enter-direction");

  if (pageCard && !reducedMotionQuery.matches && enterDirection) {
    pageCard.classList.add(
      enterDirection === "back" ? "is-entering-backward" : "is-entering-forward"
    );
    setTimeout(() => {
      pageCard.classList.remove("is-entering-forward", "is-entering-backward");
    }, pageFlipMs);
  }

  if (introScreen) {
    const replayIntro = new URLSearchParams(window.location.search).get("replay") === "1";
    if (sessionStorage.getItem(introSeenKey) === "1" && !replayIntro) {
      navigateToInvitationHome({ instant: true });
      return;
    }
    resetIndexIntroState();
  } else {
    document.body.classList.remove("intro-active");
  }
  document.body.classList.remove("page-exit");

  if (event.persisted) {
    if (!pageCard && !hasHomeIntroHandoff()) {
      document.body.classList.add("page-enter");
      setTimeout(() => document.body.classList.remove("page-enter"), pageTransitionMs);
    }

    resumeMusicIfNeeded().then((started) => {
      if (!started && sessionStorage.getItem(musicWasPlayingKey) === "1" && !isMusicMuted()) {
        attachMusicInteractionFallback();
      }
    });
  }
});

function initInternalNavigation() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href]");
    if (!anchor) return;
    if (anchor.classList.contains("intro-open-link")) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (anchor.target === "_blank") return;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    const destinationPath = normalizePath(destination.pathname);
    const qrInviteId = getActiveQrInviteId();

    if (qrInviteId && destinationPath.endsWith(".html") && !destination.searchParams.get("invite")) {
      destination.searchParams.set("invite", qrInviteId);
    }

    if (destinationPath === "/rsvp.html" && qrInviteId && !destination.searchParams.get("invite")) {
      destination.searchParams.set("invite", qrInviteId);
    }

    pressLinkFeedback(anchor);
    event.preventDefault();
    persistMusicPlaybackState();

    const pageTurnDirection = anchor.dataset.pageTurn || inferPageTurnDirection(destination.pathname);
    const pageCard = document.querySelector(".page");
    const canPageFlip = pageCard && !reducedMotionQuery.matches && pageTurnDirection;

    const forceReload = anchor.getAttribute("data-turbo") === "false";

    if (canPageFlip) {
      sessionStorage.setItem("page-turn-enter-direction", pageTurnDirection);
      pageCard.classList.remove("is-entering-forward", "is-entering-backward");
      pageCard.classList.add(
        pageTurnDirection === "back" ? "is-flipping-backward" : "is-flipping-forward"
      );
      setTimeout(() => {
        navigateToUrl(destination.href, { forceReload });
      }, pageFlipMs);
      return;
    }

    if (reducedMotionQuery.matches) {
      navigateToUrl(destination.href, { forceReload });
      return;
    }

    document.body.classList.remove("page-enter");
    document.body.classList.add("page-exit");
    setTimeout(() => {
      navigateToUrl(destination.href, { forceReload });
    }, pageTransitionMs);
  });
}

let internalNavigationBound = false;

function bindInternalNavigation() {
  if (internalNavigationBound) return;
  internalNavigationBound = true;
  initInternalNavigation();
}

function initStoryPagination() {
  const storyPagination = document.querySelector("[data-story-pagination]");
  if (!storyPagination || storyPagination.dataset.storyBound === "1") return;
  storyPagination.dataset.storyBound = "1";

  const storyPanels = Array.from(storyPagination.querySelectorAll("[data-story-panel]"));
  const prevButton = storyPagination.querySelector("[data-story-prev]");
  const nextButton = storyPagination.querySelector("[data-story-next]");
  const pageLabel = storyPagination.querySelector("[data-story-page-label]");
  const pageCount = storyPagination.querySelector("[data-story-page-count]");

  if (!storyPanels.length || !prevButton || !nextButton || !pageLabel || !pageCount) return;

  let activeIndex = storyPanels.findIndex((panel) => panel.classList.contains("is-active"));
  if (activeIndex < 0) activeIndex = 0;

  function renderStoryPanel() {
    storyPanels.forEach((panel, index) => {
      const isActive = index === activeIndex;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    const heading = storyPanels[activeIndex].querySelector("h2");
    pageLabel.textContent = heading ? heading.textContent : `Story ${activeIndex + 1}`;
    pageCount.textContent = `${activeIndex + 1} of ${storyPanels.length}`;
    prevButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === storyPanels.length - 1;
  }

  prevButton.addEventListener("click", () => {
    if (activeIndex === 0) return;
    activeIndex -= 1;
    renderStoryPanel();
  });

  nextButton.addEventListener("click", () => {
    if (activeIndex >= storyPanels.length - 1) return;
    activeIndex += 1;
    renderStoryPanel();
  });

  renderStoryPanel();
}

let storyLightboxState = null;

function destroyStoryLightbox() {
  storyLightboxState?.close?.();
  storyLightboxState?.lightbox?.remove();
  storyLightboxState = null;
}

function initStoryPhotoLightbox() {
  const root = document.querySelector(".story-page [data-story-pagination]");
  if (!root || root.dataset.storyLightboxBound === "1") return;
  root.dataset.storyLightboxBound = "1";

  const figures = Array.from(root.querySelectorAll(".story-photo")).filter(
    (figure) => figure.querySelector("img")?.getAttribute("src")
  );
  if (!figures.length) return;

  const slides = figures.map((figure) => {
    const img = figure.querySelector("img");
    const caption = figure.querySelector(".story-caption");
    return {
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || "",
      caption: caption?.textContent?.trim() || "",
    };
  });

  destroyStoryLightbox();

  const lightbox = document.createElement("div");
  lightbox.className = "story-lightbox";
  lightbox.id = "story-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Story photo gallery");
  lightbox.innerHTML = `
    <div class="story-lightbox__backdrop" data-story-lightbox-close tabindex="-1" aria-hidden="true"></div>
    <div class="story-lightbox__panel">
      <button type="button" class="story-lightbox__close" data-story-lightbox-close aria-label="Close gallery">&times;</button>
      <button type="button" class="story-lightbox__nav story-lightbox__nav--prev" data-story-lightbox-prev aria-label="Previous photo">
        <span aria-hidden="true">&#8249;</span>
      </button>
      <button type="button" class="story-lightbox__nav story-lightbox__nav--next" data-story-lightbox-next aria-label="Next photo">
        <span aria-hidden="true">&#8250;</span>
      </button>
      <figure class="story-lightbox__figure">
        <img class="story-lightbox__img" alt="" decoding="async" />
        <figcaption class="story-lightbox__caption"></figcaption>
      </figure>
      <p class="story-lightbox__count" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(lightbox);

  const imageEl = lightbox.querySelector(".story-lightbox__img");
  const captionEl = lightbox.querySelector(".story-lightbox__caption");
  const countEl = lightbox.querySelector(".story-lightbox__count");
  const prevBtn = lightbox.querySelector("[data-story-lightbox-prev]");
  const nextBtn = lightbox.querySelector("[data-story-lightbox-next]");
  let activeIndex = 0;
  let releaseFocus = null;
  let lastTrigger = null;

  function renderSlide() {
    const slide = slides[activeIndex];
    imageEl.src = slide.src;
    imageEl.alt = slide.alt;
    if (slide.caption) {
      captionEl.textContent = slide.caption;
      captionEl.hidden = false;
    } else {
      captionEl.textContent = "";
      captionEl.hidden = true;
    }
    countEl.textContent = `${activeIndex + 1} of ${slides.length}`;
    prevBtn.disabled = activeIndex === 0;
    nextBtn.disabled = activeIndex >= slides.length - 1;
  }

  function close() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    releaseFocus?.();
    releaseFocus = null;
    setTimeout(() => {
      if (!lightbox.classList.contains("is-open")) {
        lightbox.hidden = true;
        imageEl.removeAttribute("src");
      }
      lastTrigger?.focus({ preventScroll: true });
      lastTrigger = null;
    }, 220);
  }

  function open(index, trigger) {
    activeIndex = index;
    lastTrigger = trigger || null;
    renderSlide();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.classList.add("modal-open");
    releaseFocus?.();
    releaseFocus = trapModalFocus(lightbox, close);
  }

  function step(delta) {
    const nextIndex = activeIndex + delta;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    activeIndex = nextIndex;
    renderSlide();
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("[data-story-lightbox-close]")) close();
  });

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  });

  figures.forEach((figure, index) => {
    figure.classList.add("story-photo--zoomable");
    figure.setAttribute("role", "button");
    figure.setAttribute("tabindex", "0");
    const img = figure.querySelector("img");
    const label = img?.getAttribute("alt") || `Story photo ${index + 1}`;
    figure.setAttribute("aria-label", `View larger: ${label}`);

    function openFromFigure() {
      open(index, figure);
    }

    figure.addEventListener("click", openFromFigure);
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFromFigure();
      }
    });
  });

  storyLightboxState = { lightbox, close };
}

let attireLightboxState = null;

function destroyAttireLightbox() {
  attireLightboxState?.close?.();
  attireLightboxState?.lightbox?.remove();
  attireLightboxState = null;
}

function initAttirePhotoLightbox() {
  const root = document.querySelector(".attire-page .attire-guide-grid");
  if (!root || root.dataset.attireLightboxBound === "1") return;
  root.dataset.attireLightboxBound = "1";

  const cards = Array.from(root.querySelectorAll(".attire-guide-card"));
  const slides = cards
    .map((card) => {
      const img = card.querySelector(".attire-guide-media img");
      const title = card.querySelector(".attire-guide-body h3");
      const src = img?.getAttribute("src");
      if (!src) return null;
      return {
        src,
        alt: img.getAttribute("alt") || "",
        caption: title?.textContent?.trim() || "",
      };
    })
    .filter(Boolean);

  if (!slides.length) return;

  destroyAttireLightbox();

  const lightbox = document.createElement("div");
  lightbox.className = "story-lightbox";
  lightbox.id = "attire-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Dress code photos");
  lightbox.innerHTML = `
    <div class="story-lightbox__backdrop" data-attire-lightbox-close tabindex="-1" aria-hidden="true"></div>
    <div class="story-lightbox__panel">
      <button type="button" class="story-lightbox__close" data-attire-lightbox-close aria-label="Close">&times;</button>
      <button type="button" class="story-lightbox__nav story-lightbox__nav--prev" data-attire-lightbox-prev aria-label="Previous photo">
        <span aria-hidden="true">&#8249;</span>
      </button>
      <button type="button" class="story-lightbox__nav story-lightbox__nav--next" data-attire-lightbox-next aria-label="Next photo">
        <span aria-hidden="true">&#8250;</span>
      </button>
      <figure class="story-lightbox__figure">
        <img class="story-lightbox__img" alt="" decoding="async" />
        <figcaption class="story-lightbox__caption"></figcaption>
      </figure>
      <p class="story-lightbox__count" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(lightbox);

  const imageEl = lightbox.querySelector(".story-lightbox__img");
  const captionEl = lightbox.querySelector(".story-lightbox__caption");
  const countEl = lightbox.querySelector(".story-lightbox__count");
  const prevBtn = lightbox.querySelector("[data-attire-lightbox-prev]");
  const nextBtn = lightbox.querySelector("[data-attire-lightbox-next]");
  let activeIndex = 0;
  let releaseFocus = null;
  let lastTrigger = null;

  function renderSlide() {
    const slide = slides[activeIndex];
    imageEl.src = slide.src;
    imageEl.alt = slide.alt;
    if (slide.caption) {
      captionEl.textContent = slide.caption;
      captionEl.hidden = false;
    } else {
      captionEl.textContent = "";
      captionEl.hidden = true;
    }
    countEl.textContent = `${activeIndex + 1} of ${slides.length}`;
    const single = slides.length <= 1;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
  }

  function close() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    releaseFocus?.();
    releaseFocus = null;
    setTimeout(() => {
      if (!lightbox.classList.contains("is-open")) {
        lightbox.hidden = true;
        imageEl.removeAttribute("src");
      }
      lastTrigger?.focus({ preventScroll: true });
      lastTrigger = null;
    }, 220);
  }

  function open(index, trigger) {
    activeIndex = index;
    lastTrigger = trigger || null;
    renderSlide();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.classList.add("modal-open");
    releaseFocus?.();
    releaseFocus = trapModalFocus(lightbox, close);
  }

  function step(delta) {
    if (slides.length <= 1) return;
    activeIndex = (activeIndex + delta + slides.length) % slides.length;
    renderSlide();
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("[data-attire-lightbox-close]")) close();
  });

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(+1);
    }
  });

  cards.forEach((card, index) => {
    const media = card.querySelector(".attire-guide-media");
    const img = card.querySelector(".attire-guide-media img");
    if (!media || !img?.getAttribute("src")) return;

    media.classList.add("attire-guide-media--zoomable");
    media.setAttribute("role", "button");
    media.setAttribute("tabindex", "0");
    const label = img.getAttribute("alt") || slides[index]?.caption || `Dress code photo ${index + 1}`;
    media.setAttribute("aria-label", `View larger: ${label}`);

    function openFromMedia() {
      open(index, media);
    }

    media.addEventListener("click", openFromMedia);
    media.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFromMedia();
      }
    });
  });

  attireLightboxState = { lightbox, close };
}

function initCurrentPage() {
  document.body.classList.remove("page-exit");

  if (document.body.classList.contains("index-envelope-page")) {
    resetIndexEnvelopeState();
    initIndexEnvelopeFlow();
    return;
  }

  initPhotoPlaceholders();
  initHomeEnter();
  initInnerPageEnter();
  initHomeWelcome();
  initHomeScrollCards();
  initScrollReveal();
  initSmoothScrollEffect();
  maybeShowQrRsvpBanner();
  initIntroHandoffEnter();
  initStoryPagination();
  initStoryPhotoLightbox();
  initAttirePhotoLightbox();
  updateMobileNavActivePage();
  markRsvpLinksTurboOptOut();

  if (!hasHomeIntroHandoff()) {
    document.body.classList.add("page-enter");
    setTimeout(() => document.body.classList.remove("page-enter"), pageTransitionMs);
  }
}

let appShellInitialized = false;

function initAppShell() {
  if (!appShellInitialized) {
    initCalendarButtons();
    initWeddingMusic();
    bindInternalNavigation();
    appShellInitialized = true;
  }

  initMobileNav();
  updateMobileNavActivePage();
  markRsvpLinksTurboOptOut();
}

if (!window.__weddingTurboLifecycleBound) {
  window.__weddingTurboLifecycleBound = true;

  document.addEventListener("turbo:before-visit", () => {
    persistMusicPlaybackState();
  });

  document.addEventListener("turbo:before-render", () => {
    syncWeddingAudioRef();
    destroyStoryLightbox();
    destroyAttireLightbox();
    document.querySelector("[data-story-pagination]")?.removeAttribute("data-story-lightbox-bound");
    document.querySelector(".attire-page .attire-guide-grid")?.removeAttribute("data-attire-lightbox-bound");
  });

  document.addEventListener("turbo:load", onTurboPageLoad);
}

const scrollTopButton = document.getElementById("scroll-top");
scrollTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
