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

  let burgerLastFocus = null;

  function staggerBurgerLinks(menu) {
    menu?.querySelectorAll(".site-nav-link").forEach((link, index) => {
      link.style.setProperty("--nav-stagger", `${index * 0.055}s`);
    });
  }

  function closeBurgerMenu() {
    const overlay = document.getElementById("invite-nav-overlay");
    const burger = document.querySelector(".invite-nav-burger");
    if (!overlay) return;

    overlay.hidden = true;
    overlay.classList.remove("is-open", "is-animating");
    document.body.classList.remove("invite-nav-open");
    burger?.setAttribute("aria-expanded", "false");

    const restore = burgerLastFocus;
    burgerLastFocus = null;
    if (restore && typeof restore.focus === "function") {
      restore.focus({ preventScroll: true });
    } else {
      burger?.focus({ preventScroll: true });
    }
  }

  function openBurgerMenu() {
    const overlay = document.getElementById("invite-nav-overlay");
    const burger = document.querySelector(".invite-nav-burger");
    if (!overlay || !burger) return;

    burgerLastFocus = document.activeElement;
    overlay.hidden = false;
    overlay.classList.remove("is-animating");
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      requestAnimationFrame(() => overlay.classList.add("is-animating"));
    });
    document.body.classList.add("invite-nav-open");
    burger.setAttribute("aria-expanded", "true");
    const first = overlay.querySelector(".invite-nav-menu .site-nav-link");
    first?.focus({ preventScroll: true });
  }

  function syncBurgerMenuLinks(siteNav, menu) {
    if (!siteNav || !menu) return;
    menu.innerHTML = "";
    siteNav.querySelectorAll(".site-nav-link").forEach((link) => {
      menu.appendChild(link.cloneNode(true));
    });
  }

  function teardownBurgerNav() {
    closeBurgerMenu();
    document.getElementById("invite-nav-overlay")?.remove();
    document.querySelector(".invite-nav-bar")?.remove();
  }

  function bindBurgerNavEvents(overlay, burger) {
    if (overlay.dataset.bound === "1") return;
    overlay.dataset.bound = "1";

    overlay.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.classList.contains("invite-nav-overlay__backdrop")) {
        closeBurgerMenu();
      }
    });

    overlay.querySelector(".invite-nav-close")?.addEventListener("click", closeBurgerMenu);

    overlay.querySelector(".invite-nav-menu")?.addEventListener("click", (event) => {
      if (event.target.closest(".site-nav-link")) {
        closeBurgerMenu();
      }
    });

    burger.addEventListener("click", () => {
      if (overlay.classList.contains("is-open")) {
        closeBurgerMenu();
      } else {
        openBurgerMenu();
      }
    });

    if (!document.body.dataset.inviteBurgerKeybound) {
      document.body.dataset.inviteBurgerKeybound = "1";
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeBurgerMenu();
        }
      });
      mobileNavMq.addEventListener("change", () => {
        if (!mobileNavMq.matches) {
          closeBurgerMenu();
        }
      });
    }
  }

  function initBurgerNav() {
    if (!document.body.classList.contains("invite-alive")) return;

    const siteNav = document.querySelector(".site-nav");
    if (!siteNav) return;

    teardownBurgerNav();

    const bar = document.createElement("div");
    bar.className = "invite-nav-bar";

    const currentLabel = document.createElement("p");
    currentLabel.className = "invite-nav-bar__current";
    currentLabel.textContent =
      siteNav.querySelector(".site-nav-link[aria-current='page']")?.textContent?.trim() ||
      "Invitation";

    const burger = document.createElement("button");
    burger.type = "button";
    burger.className = "invite-nav-burger";
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "invite-nav-menu");
    burger.setAttribute("aria-label", "Open menu");
    burger.innerHTML =
      '<span class="invite-nav-burger__bars" aria-hidden="true">' +
      "<span></span><span></span><span></span></span>" +
      '<span class="invite-nav-burger__label">Menu</span>';

    bar.classList.add("motion-enter");
    bar.append(currentLabel, burger);
    siteNav.insertAdjacentElement("beforebegin", bar);

    const overlay = document.createElement("div");
    overlay.className = "invite-nav-overlay";
    overlay.id = "invite-nav-overlay";
    overlay.hidden = true;

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "invite-nav-overlay__backdrop";
    backdrop.setAttribute("aria-label", "Close menu");
    backdrop.tabIndex = -1;

    const panel = document.createElement("div");
    panel.className = "invite-nav-overlay__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Site menu");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "invite-nav-close";
    closeBtn.setAttribute("aria-label", "Close menu");
    closeBtn.innerHTML = "<span aria-hidden=\"true\">&times;</span>";

    const menu = document.createElement("nav");
    menu.className = "invite-nav-menu";
    menu.id = "invite-nav-menu";
    menu.setAttribute("aria-label", "Primary");

    syncBurgerMenuLinks(siteNav, menu);
    staggerBurgerLinks(menu);
    panel.append(closeBtn, menu);
    overlay.append(backdrop, panel);
    document.body.appendChild(overlay);

    bindBurgerNavEvents(overlay, burger);
  }

  function scrollNavToCurrent() {
    if (mobileNavMq.matches) return;
    const nav = document.querySelector(".invite-alive .site-nav");
    const current = nav?.querySelector(".site-nav-link[aria-current='page']");
    if (!nav || !current) return;

    const target =
      current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    nav.scrollTo({
      left: Math.max(0, target),
      behavior: reducedMotion ? "auto" : "smooth",
    });
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
    initBurgerNav();
    initMotionReveal();
    markPageReady();
    requestAnimationFrame(scrollNavToCurrent);
  }

  document.addEventListener("DOMContentLoaded", onReady);
  document.addEventListener("turbo:load", onReady);
  document.addEventListener("turbo:before-visit", closeBurgerMenu);
})();
