/**
 * Alive invitation theme — petals, page ready state, inner-page chrome
 */
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileNavMq = window.matchMedia("(max-width: 767px)");
  let motionRevealObserver = null;

  function initPetals() {
    const hasPetals =
      document.body.classList.contains("invite-alive") ||
      document.body.classList.contains("intro-page");
    if (reducedMotion || !hasPetals) return;
    const host = document.querySelector(".invite-bg__petals");
    if (!host || host.childElementCount > 0) return;
    const isIntro = document.body.classList.contains("intro-page");
    const petalCount = isIntro
      ? mobileNavMq.matches
        ? 20
        : 16
      : mobileNavMq.matches
        ? 14
        : 10;
    for (let i = 0; i < petalCount; i += 1) {
      const p = document.createElement("span");
      p.className = "invite-petal";
      p.style.left = `${6 + Math.random() * 88}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 10}s`;
      p.style.animationDuration = `${14 + Math.random() * 10}s`;
      host.appendChild(p);
    }
  }

  function createSectionOrnament() {
    const el = document.createElement("div");
    el.className = "section-ornament";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<span class="section-ornament__line"></span>' +
      '<span class="section-ornament__gem"></span>' +
      '<span class="section-ornament__line"></span>';
    return el;
  }

  function createSignoff() {
    const footer = document.createElement("footer");
    footer.className = "inner-signoff";
    footer.innerHTML =
      '<div class="inner-signoff-ornament" aria-hidden="true"></div>' +
      '<p class="inner-signoff-eyebrow">With love,</p>' +
      '<p class="inner-signoff-names">Jason &amp; Rhona Mae</p>' +
      '<p class="inner-signoff-date">November 11, 2026</p>';
    return footer;
  }

  function ensurePageIntroOrnament(intro) {
    if (!intro || intro.querySelector(".section-ornament")) return;
    intro.insertBefore(createSectionOrnament(), intro.firstChild);
  }

  function initStoryPageIntro(shell) {
    if (!document.body.classList.contains("story-page")) return;
    if (shell.querySelector(".page-intro")) return;

    const main = shell.querySelector(".page-shell");
    if (!main) return;

    const intro = document.createElement("header");
    intro.className = "page-intro";
    intro.appendChild(createSectionOrnament());
    const eyebrow = document.createElement("p");
    eyebrow.className = "page-intro-eyebrow";
    eyebrow.textContent = "Our Story";
    const title = document.createElement("h1");
    title.className = "page-intro-title";
    title.textContent = "Jason & Rhona Mae";
    const lead = document.createElement("p");
    lead.className = "page-intro-lead";
    lead.textContent = "From a quiet beginning to a joyful yes — and the celebration ahead.";
    intro.append(eyebrow, title, lead);

    main.insertBefore(intro, main.firstChild);
  }

  function initInnerChrome() {
    if (!document.body.classList.contains("inner-page")) return;

    const shell = document.querySelector(".book-shell");
    if (!shell || shell.dataset.innerChrome === "1") return;
    shell.dataset.innerChrome = "1";

    shell.classList.add("inner-shell", "invite-card");

    if (!shell.querySelector(".inner-card-accent")) {
      const accent = document.createElement("div");
      accent.className = "inner-card-accent";
      accent.setAttribute("aria-hidden", "true");
      shell.insertBefore(accent, shell.firstChild);
    }

    shell.querySelector(".inner-quick-nav")?.remove();
    shell.querySelectorAll(".home-quick-nav").forEach((el) => el.remove());

    shell.querySelectorAll(".page-intro").forEach(ensurePageIntroOrnament);
    initStoryPageIntro(shell);

    if (!shell.querySelector(".inner-signoff")) {
      shell.appendChild(createSignoff());
    }
  }

  function markPageReady() {
    if (!document.body.classList.contains("invite-alive")) return;
    const homeWaitingIntro =
      document.body.classList.contains("home-page") &&
      document.body.classList.contains("home-intro-enter") &&
      !document.body.classList.contains("home-intro-ready");
    if (homeWaitingIntro) return;

    requestAnimationFrame(() => {
      document.body.classList.add("invite-alive-ready");
      if (document.body.classList.contains("inner-page")) {
        document.body.classList.add("is-ready");
      }
    });
  }

  function teardownLegacyMobileNav() {
    document.getElementById("invite-nav-overlay")?.remove();
    document.querySelector(".invite-nav-bar")?.remove();
    document.body.classList.remove("invite-nav-open");
  }

  function ensureNavDockAnchor(siteNav) {
    if (siteNav._dockAnchor?.parentNode) return siteNav._dockAnchor;
    const anchor = document.createComment("invite-site-nav-anchor");
    siteNav.parentNode?.insertBefore(anchor, siteNav);
    siteNav._dockAnchor = anchor;
    return anchor;
  }

  function dockSiteNav(siteNav) {
    ensureNavDockAnchor(siteNav);
    siteNav.classList.add("site-nav--dock");
    document.body.appendChild(siteNav);
  }

  function undockSiteNav(siteNav) {
    const anchor = siteNav._dockAnchor;
    siteNav.classList.remove("site-nav--dock");
    if (anchor?.parentNode) {
      anchor.parentNode.insertBefore(siteNav, anchor.nextSibling);
    }
  }

  function scrollNavToCurrent() {
    const nav = document.querySelector(".invite-alive .site-nav, .site-nav--dock");
    const current = nav?.querySelector(".site-nav-link[aria-current='page']");
    if (!nav || !current) return;

    const target =
      current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    nav.scrollTo({
      left: Math.max(0, target),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function initMobileBottomNav() {
    if (!document.body.classList.contains("invite-alive")) return;

    const siteNav = document.querySelector(".site-nav");
    if (!siteNav) return;

    teardownLegacyMobileNav();

    if (mobileNavMq.matches) {
      dockSiteNav(siteNav);
      requestAnimationFrame(() => scrollNavToCurrent());
    } else {
      undockSiteNav(siteNav);
    }

    if (!document.body.dataset.inviteNavDockBound) {
      document.body.dataset.inviteNavDockBound = "1";
      mobileNavMq.addEventListener("change", () => {
        const nav = document.querySelector(".site-nav");
        if (!nav) return;
        if (mobileNavMq.matches) {
          dockSiteNav(nav);
          requestAnimationFrame(() => scrollNavToCurrent());
        } else {
          undockSiteNav(nav);
          requestAnimationFrame(() => scrollNavToCurrent());
        }
      });
    }
  }

  function initMotionReveal() {
    if (reducedMotion || !document.body.classList.contains("invite-alive")) return;

    motionRevealObserver?.disconnect();
    motionRevealObserver = null;

    const mobile = mobileNavMq.matches;
    const seen = new Set();
    let motionIndex = 0;
    const staggerStep = mobile ? 0.08 : 0.06;

    const selectors = [
      ".invite-alive .page-intro",
      ".invite-alive .home-countdown-panel",
      ".invite-alive .home-section-ornament",
      ".invite-alive .page-shell .card",
      ".invite-alive .story-slide-card",
      ".invite-alive .story-gallery",
      ".invite-alive .venue-card",
      ".invite-alive .faq-list > details",
      ".invite-alive .detail-icon-card",
      ".invite-alive .attire-page .card",
      ".invite-alive .inner-signoff",
      ".invite-alive .story-pagination",
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        if (seen.has(element)) return;
        if (
          element.classList.contains("scroll-reveal") ||
          element.classList.contains("home-scroll-reveal") ||
          element.classList.contains("home-enter") ||
          element.classList.contains("inner-enter")
        ) {
          return;
        }
        seen.add(element);
        element.classList.add("motion-reveal");
        element.style.setProperty(
          "--motion-i",
          `${(motionIndex % 6) * staggerStep}s`
        );
        motionIndex += 1;
      });
    });

    const targets = Array.from(document.querySelectorAll(".invite-alive .motion-reveal"));
    if (!targets.length) return;

    motionRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: mobile ? 0.04 : 0.14,
        rootMargin: mobile ? "0px 0px -2% 0px" : "0px 0px -10% 0px",
      }
    );

    targets.forEach((element) => motionRevealObserver.observe(element));

    function revealInView() {
      targets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const visible =
          rect.top < window.innerHeight * 0.94 && rect.bottom > window.innerHeight * 0.04;
        element.classList.toggle("is-visible", visible);
      });
    }

    requestAnimationFrame(revealInView);
    window.setTimeout(revealInView, mobile ? 220 : 160);
  }

  function onReady() {
    initPetals();
    initInnerChrome();
    initMobileBottomNav();
    initMotionReveal();
    markPageReady();
    requestAnimationFrame(scrollNavToCurrent);
  }

  document.addEventListener("DOMContentLoaded", onReady);
  document.addEventListener("turbo:load", onReady);
  document.addEventListener("turbo:before-visit", teardownLegacyMobileNav);
})();
