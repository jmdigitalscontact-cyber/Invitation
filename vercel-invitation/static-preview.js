/**
 * Static client preview â€” no PHP/database. Intercepts RSVP API calls with demo data.
 */
(function () {
  "use strict";

  window.__WEDDING_STATIC_PREVIEW__ = true;
  document.documentElement.classList.add("wedding-static-preview");

  function removeMusicToggleUi() {
    document.querySelectorAll(".music-toggle").forEach((el) => el.remove());
  }

  function removeMobileNavUi() {
    document.querySelectorAll(".mobile-nav").forEach((el) => el.remove());
  }

  function applyPreviewChromeFixes() {
    removeMusicToggleUi();
    removeMobileNavUi();
  }

  applyPreviewChromeFixes();
  document.addEventListener("turbo:load", applyPreviewChromeFixes);
  document.addEventListener("DOMContentLoaded", applyPreviewChromeFixes);

  if (sessionStorage.getItem("wedding-music-muted") !== "1") {
    sessionStorage.setItem("wedding-music-was-playing", "1");
  }

  const PREVIEW_INVITE_ID = "PREVIEW";
  const PREVIEW_TOKEN = "preview-static-token";

  const previewInvitation = {
    invitation_id: PREVIEW_INVITE_ID,
    guest_name: "Alex & Sam Guest",
    max_guests: 2,
    invited_guest_names: ["Alex Guest", "Sam Guest"],
  };

  function jsonResponse(payload, status) {
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: status || 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      })
    );
  }

  function parseAction(url) {
    try {
      return new URL(url, window.location.href).searchParams.get("action");
    } catch {
      return null;
    }
  }

  function mockRsvpApi(url, init) {
    const action = parseAction(url);
    let body = {};
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = {};
      }
    }

    switch (action) {
      case "verify-invitation-qr":
        return jsonResponse({
          success: true,
          data: {
            token: PREVIEW_TOKEN,
            ...previewInvitation,
          },
        });

      case "get-invitation-details":
        return jsonResponse({
          success: true,
          data: previewInvitation,
        });

      case "get-rsvp-status":
        return jsonResponse({
          success: true,
          data: null,
        });

      case "submit-rsvp":
        return jsonResponse({
          success: true,
          message: "Preview only â€” your response was not saved to a server.",
        });

      default:
        return jsonResponse(
          { success: false, error: "This preview does not support that action." },
          400
        );
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("api.php")) {
      return mockRsvpApi(url, init);
    }
    return nativeFetch(input, init);
  };

  if (/rsvp\.html$/i.test(window.location.pathname)) {
    if (!new URLSearchParams(window.location.search).get("invite")) {
      sessionStorage.setItem("wedding-qr-invite-id", PREVIEW_INVITE_ID);
    }
  }

  function mountBanner() {
    if (document.getElementById("static-preview-banner")) return;

    const bar = document.createElement("div");
    bar.id = "static-preview-banner";
    bar.setAttribute("role", "status");
    bar.innerHTML =
      '<p><strong>Client preview</strong> â€” Design &amp; flow only. RSVP is simulated (nothing is saved). Full site needs PHP + PostgreSQL hosting.</p>' +
      '<a href="./rsvp.html?invite=PREVIEW">Try RSVP demo</a>';

    const style = document.createElement("style");
    style.textContent = `
      #static-preview-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 500;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 0.65rem 1rem;
        padding: 0.5rem 0.75rem;
        padding-top: max(0.5rem, env(safe-area-inset-top, 0px));
        background: rgba(47, 61, 49, 0.94);
        color: #f4f7f4;
        font: 500 0.78rem/1.4 Inter, system-ui, sans-serif;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      #static-preview-banner p { margin: 0; max-width: 42rem; }
      #static-preview-banner a {
        color: #fff;
        background: rgba(154, 182, 157, 0.35);
        border: 1px solid rgba(255,255,255,0.35);
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        text-decoration: none;
        white-space: nowrap;
      }
      #static-preview-banner a:hover { background: rgba(154, 182, 157, 0.5); }
      body.has-static-preview-banner { padding-top: 3.25rem !important; }
      body.has-static-preview-banner .site-nav { margin-top: 0; }
      html.wedding-static-preview .mobile-nav {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      html.wedding-static-preview .site-nav {
        display: flex !important;
      }
    `;

    document.head.appendChild(style);
    document.body.classList.add("has-static-preview-banner");
    document.body.prepend(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBanner);
  } else {
    mountBanner();
  }
})();
