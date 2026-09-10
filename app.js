/* SnipURL — interface interactions only.
 * No links are generated, validated, stored, or resolved here.
 * The "Shorten URL" and "Resolve URL" actions reveal fixed sample results;
 * neither calls any service or runs real short-code logic. */

(function () {
  "use strict";

  // Render the Lucide icon set (single set, uniform stroke width via CSS).
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  // Sample destination <-> short code pairs, kept consistent in both directions.
  // Presentation only — not a lookup table backed by any store.
  var SAMPLES = {
    "https://blog.example.com/posts/why-302-not-301-for-link-redirects": "Zc8Nk1",
    "https://docs.example.com/engineering/system-design/url-shortener-capacity-estimation": "7Qk2mB",
    "https://github.com/acme/platform/pull/4821/files": "aF3xR9",
    "https://analytics.example.com/dashboards/redirect-latency?range=30d": "Lp0Wq4"
  };

  var REVERSE = {};
  Object.keys(SAMPLES).forEach(function (longUrl) {
    REVERSE[SAMPLES[longUrl]] = longUrl;
  });

  var ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Deterministic, non-cryptographic display code so repeated submits of the
  // same input show a stable value. Not a real short-code algorithm.
  function sampleCodeFor(url) {
    if (Object.prototype.hasOwnProperty.call(SAMPLES, url)) {
      return SAMPLES[url];
    }
    var acc = 0;
    for (var i = 0; i < url.length; i++) {
      acc = (acc * 31 + url.charCodeAt(i)) % 2176782336;
    }
    var code = "";
    for (var j = 0; j < 6; j++) {
      code = ALPHABET[acc % 62] + code;
      acc = Math.floor(acc / 62);
    }
    return code;
  }

  // Pull the bare code out of "snipurl.io/xxxx", "https://snipurl.io/xxxx", or "xxxx".
  function codeFromInput(value) {
    var trimmed = value.replace(/^https?:\/\//i, "").replace(/^snipurl\.io\//i, "");
    return trimmed.replace(/^\/+|\/+$/g, "").split(/[/?#]/)[0];
  }

  function sampleLongUrlFor(code) {
    if (Object.prototype.hasOwnProperty.call(REVERSE, code)) {
      return REVERSE[code];
    }
    return "https://example.com/r/" + code;
  }

  // --- Shorten URL --------------------------------------------------------
  var shortenForm = document.getElementById("create-form");
  if (shortenForm) {
    var longInput = document.getElementById("long-url");
    var shortenResult = document.getElementById("result");
    var resultShort = document.getElementById("result-short");
    var resultOrigin = document.getElementById("result-origin");

    shortenForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = (longInput.value || "").trim();
      if (!value) {
        longInput.focus();
        return;
      }
      var code = sampleCodeFor(value);
      var shortUrl = "https://snipurl.io/" + code;

      resultShort.textContent = "snipurl.io/" + code;
      resultOrigin.textContent = value;

      var copyBtn = shortenResult.querySelector(".copy-button");
      if (copyBtn) {
        copyBtn.setAttribute("data-copy", shortUrl);
      }
      shortenResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // --- Retrieve long URL -------------------------------------------------
  var retrieveForm = document.getElementById("retrieve-form");
  if (retrieveForm) {
    var shortInput = document.getElementById("short-url");
    var retrieveResult = document.getElementById("retrieve-result");
    var retrieveLong = document.getElementById("retrieve-long");
    var retrieveSource = document.getElementById("retrieve-source");

    retrieveForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = (shortInput.value || "").trim();
      if (!value) {
        shortInput.focus();
        return;
      }
      var code = codeFromInput(value);
      var longUrl = sampleLongUrlFor(code);

      retrieveLong.textContent = longUrl;
      retrieveSource.textContent =
        "snipurl.io/" + code + " resolves via a 302 temporary redirect";

      var copyBtn = retrieveResult.querySelector(".copy-button");
      if (copyBtn) {
        copyBtn.setAttribute("data-copy", longUrl);
      }
      retrieveResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // --- Copy buttons ----------------------------------------------------
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
          /* Clipboard permission denied; nothing else to do in a preview. */
        }
      );
    }
  });
})();
