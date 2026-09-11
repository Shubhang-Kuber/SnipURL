/* SnipURL — frontend behaviour.
 *
 * Talks to the SnipURL API served from the same origin:
 *   POST /shorten            -> create a short link
 *   GET  /api/resolve/:code  -> resolve a short link to its destination
 *   GET  /api/recent         -> list the most recently created links */

(function () {
  "use strict";

  // Render the Lucide icon set (single set, uniform stroke width via CSS).
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  // Extract a bare short code from "snipurl.io/abc", "http://host/abc", or "abc".
  function codeFromInput(value) {
    var text = value.trim().replace(/^https?:\/\//i, "");
    var slash = text.indexOf("/");
    if (slash >= 0) {
      text = text.slice(slash + 1);
    }
    return text.replace(/^\/+|\/+$/g, "").split(/[/?#]/)[0];
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function clearError(el) {
    el.textContent = "";
    el.hidden = true;
  }

  // Read a fetch Response as JSON, returning { ok, data } so callers can branch
  // on status without a second await.
  function readJson(res) {
    return res
      .json()
      .catch(function () {
        return {};
      })
      .then(function (data) {
        return { ok: res.ok, data: data };
      });
  }

  // --- Shorten URL -------------------------------------------------------
  var shortenForm = document.getElementById("create-form");
  if (shortenForm) {
    var longInput = document.getElementById("long-url");
    var shortenError = document.getElementById("create-error");
    var shortenResult = document.getElementById("result");
    var resultShort = document.getElementById("result-short");
    var resultOrigin = document.getElementById("result-origin");
    var shortenButton = shortenForm.querySelector("button[type='submit']");

    shortenForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError(shortenError);

      var value = (longInput.value || "").trim();
      if (!value) {
        showError(shortenError, "Enter a URL to shorten.");
        longInput.focus();
        return;
      }

      shortenButton.disabled = true;
      fetch("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value })
      })
        .then(readJson)
        .then(function (payload) {
          if (!payload.ok) {
            showError(
              shortenError,
              payload.data.error || "Could not shorten that URL."
            );
            return;
          }
          var shortUrl = payload.data.shortUrl;
          resultShort.textContent = shortUrl;
          resultOrigin.textContent = value;

          var copyButton = shortenResult.querySelector(".copy-button");
          if (copyButton) {
            copyButton.setAttribute("data-copy", shortUrl);
          }
          shortenResult.hidden = false;
          shortenResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

          // Clear the input only now that a 2xx response is in hand; the result
          // card above stays visible.
          longInput.value = "";

          // Pull the new link into the Recent links table without a refresh.
          loadRecent();
        })
        .catch(function () {
          showError(
            shortenError,
            "Network error — is the SnipURL server running?"
          );
        })
        .finally(function () {
          shortenButton.disabled = false;
        });
    });
  }

  // --- Retrieve long URL ----------------------------------------------
  var retrieveForm = document.getElementById("retrieve-form");
  if (retrieveForm) {
    var shortInput = document.getElementById("short-url");
    var retrieveError = document.getElementById("retrieve-error");
    var retrieveResult = document.getElementById("retrieve-result");
    var retrieveLong = document.getElementById("retrieve-long");
    var retrieveSource = document.getElementById("retrieve-source");
    var retrieveButton = retrieveForm.querySelector("button[type='submit']");
    var popupFallback = document.getElementById("retrieve-popup-fallback");
    var openLink = document.getElementById("retrieve-open-link");

    // Bumped on every submit so a response from an older request — one that
    // arrives after a newer request has already run — can't open a second tab.
    var retrieveRequestId = 0;

    retrieveForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError(retrieveError);
      popupFallback.hidden = true;

      var raw = (shortInput.value || "").trim();
      if (!raw) {
        showError(retrieveError, "Enter a short link or code to resolve.");
        shortInput.focus();
        return;
      }

      var code = codeFromInput(raw);
      if (!code) {
        showError(retrieveError, "That does not look like a SnipURL short link.");
        return;
      }

      var thisRequestId = ++retrieveRequestId;

      retrieveButton.disabled = true;
      fetch("/api/resolve/" + encodeURIComponent(code))
        .then(readJson)
        .then(function (payload) {
          // A newer submit has already taken over this result card — don't
          // act on this stale response (and don't open a stray tab for it).
          if (thisRequestId !== retrieveRequestId) {
            return;
          }

          if (!payload.ok) {
            showError(
              retrieveError,
              payload.data.error || "Could not resolve that code."
            );
            return;
          }
          var longUrl = payload.data.longUrl;
          retrieveLong.textContent = longUrl;
          retrieveSource.textContent = code + " points to this destination";

          var copyButton = retrieveResult.querySelector(".copy-button");
          if (copyButton) {
            copyButton.setAttribute("data-copy", longUrl);
          }
          retrieveResult.hidden = false;
          retrieveResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

          // Clear the input only now that a 2xx response is in hand; the result
          // card above stays visible.
          shortInput.value = "";

          // Open the destination automatically. Some browsers treat a tab
          // opened from an async response (rather than directly inside the
          // click handler) as a popup and block it — window.open then
          // returns null/undefined instead of throwing, so fall back to a
          // manual link the user can click.
          var opened = window.open(longUrl, "_blank");
          if (!opened) {
            openLink.setAttribute("href", longUrl);
            popupFallback.hidden = false;
          }
        })
        .catch(function () {
          if (thisRequestId !== retrieveRequestId) {
            return;
          }
          showError(
            retrieveError,
            "Network error — is the SnipURL server running?"
          );
        })
        .finally(function () {
          if (thisRequestId === retrieveRequestId) {
            retrieveButton.disabled = false;
          }
        });
    });
  }

  // --- Recent links -------------------------------------------------
  var recentBody = document.getElementById("recent-body");
  var recentTableWrap = document.getElementById("recent-table-wrap");
  var recentMessage = document.getElementById("recent-message");

  // ISO timestamp -> "YYYY-MM-DD", matching the date format used elsewhere.
  function formatDate(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) {
      return "";
    }
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + month + "-" + day;
  }

  function showRecentMessage(text) {
    recentTableWrap.hidden = true;
    recentMessage.textContent = text;
    recentMessage.hidden = false;
  }

  // Build the table rows with the DOM API (never innerHTML) so a destination
  // URL can never inject markup.
  function renderRecentRows(links) {
    var host = window.location.host;
    var origin = window.location.origin;

    recentBody.textContent = "";

    links.forEach(function (link) {
      var displayShort = host + "/" + link.shortCode;
      var fullShort = origin + "/" + link.shortCode;
      var row = document.createElement("tr");

      var shortCell = document.createElement("td");
      var shortText = document.createElement("span");
      shortText.className = "mono";
      shortText.textContent = displayShort;
      shortCell.appendChild(shortText);

      var destCell = document.createElement("td");
      destCell.className = "col-origin";
      var destText = document.createElement("span");
      destText.className = "truncate";
      destText.title = link.longUrl;
      destText.textContent = link.longUrl;
      destCell.appendChild(destText);

      var createdCell = document.createElement("td");
      createdCell.className = "col-numeric";
      createdCell.textContent = formatDate(link.createdAt);

      var actionCell = document.createElement("td");
      actionCell.className = "col-action";
      var copyBtn = document.createElement("button");
      copyBtn.className = "button button--ghost button--icon copy-button";
      copyBtn.type = "button";
      copyBtn.setAttribute("data-copy", fullShort);
      copyBtn.setAttribute("aria-label", "Copy " + displayShort);
      var copyIcon = document.createElement("i");
      copyIcon.setAttribute("data-lucide", "copy");
      copyBtn.appendChild(copyIcon);
      actionCell.appendChild(copyBtn);

      row.appendChild(shortCell);
      row.appendChild(destCell);
      row.appendChild(createdCell);
      row.appendChild(actionCell);
      recentBody.appendChild(row);
    });

    // Render the copy icons that were just added.
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function loadRecent() {
    if (!recentBody) {
      return;
    }
    fetch("/api/recent")
      .then(readJson)
      .then(function (payload) {
        var data = payload.data || {};
        if (!payload.ok || !Array.isArray(data.links)) {
          showRecentMessage("Couldn't load recent links.");
          return;
        }
        if (data.links.length === 0) {
          showRecentMessage(
            "No links yet — shorten a URL above and it will appear here."
          );
          return;
        }
        renderRecentRows(data.links);
        recentMessage.hidden = true;
        recentTableWrap.hidden = false;
      })
      .catch(function () {
        showRecentMessage("Couldn't load recent links.");
      });
  }

  loadRecent();

  // --- Copy buttons --------------------------------------------------
  function flashCopied(button) {
    button.classList.add("is-copied");
    var textEl = button.querySelector(".copy-button__text");
    var original = textEl ? textEl.textContent : null;
    if (textEl) {
      textEl.textContent = "Copied";
    }
    window.setTimeout(function () {
      button.classList.remove("is-copied");
      if (textEl && original !== null) {
        textEl.textContent = original;
      }
    }, 1600);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".copy-button");
    if (!button) {
      return;
    }
    var text = button.getAttribute("data-copy");
    if (!text) {
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          flashCopied(button);
        },
        function () {
          /* Clipboard permission denied; nothing else to do. */
        }
      );
    }
  });
})();
