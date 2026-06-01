/**
 * On browser refresh: return guests to index.html and reset background music / intro state.
 */
(function () {
  "use strict";

  const MUSIC_KEYS = [
    "wedding-music-muted",
    "wedding-music-started",
    "wedding-music-time",
    "wedding-music-was-playing",
  ];
  const INTRO_KEYS = ["wedding-intro-seen", "wedding-intro-handoff"];

  function isPageReload() {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav?.type === "reload") return true;
    return performance.navigation?.type === 1;
  }

  function isIndexPage() {
    const segment = window.location.pathname.split("/").filter(Boolean).pop() || "";
    const name = segment.toLowerCase();
    return !name || name === "index.html";
  }

  function resetMusicAndIntro() {
    MUSIC_KEYS.concat(INTRO_KEYS).forEach((key) => sessionStorage.removeItem(key));
    sessionStorage.removeItem("page-turn-enter-direction");

    const audio = document.getElementById("wedding-music");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  function handleRefresh() {
    if (!isPageReload()) return false;
    resetMusicAndIntro();
    if (!isIndexPage()) {
      const indexUrl = new URL("./index.html", window.location.href);
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (invite) indexUrl.searchParams.set("invite", invite);
      window.__WEDDING_RELOAD_REDIRECTING__ = true;
      window.location.replace(indexUrl.pathname + indexUrl.search);
      return true;
    }
    return false;
  }

  window.WeddingInvitationReload = {
    isPageReload,
    isIndexPage,
    resetMusicAndIntro,
    handleRefresh,
  };

  handleRefresh();
})();
