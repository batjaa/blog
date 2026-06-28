(function () {
  var API_URL = "/api/theme-votes";
  var VISITOR_KEY = "batjaa-theme-vote-visitor";

  function getVisitorId() {
    try {
      var existing = window.localStorage.getItem(VISITOR_KEY);
      if (existing) {
        return existing;
      }

      var generated = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
      window.localStorage.setItem(VISITOR_KEY, generated);
      return generated;
    } catch (error) {
      return "session-" + String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function setStatus(widget, message, isError) {
    var status = widget.querySelector("[data-theme-vote-status]");
    if (!status) {
      return;
    }
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function normalizeCounts(payload) {
    var counts = {};
    (payload.themes || []).forEach(function (theme) {
      counts[theme.id] = {
        up: Number(theme.upVotes || 0),
        down: Number(theme.downVotes || 0),
        userVote: Number(theme.userVote || 0),
      };
    });
    return counts;
  }

  function render(widget, payload) {
    var counts = normalizeCounts(payload);
    widget.querySelectorAll("[data-theme-id]").forEach(function (card) {
      var themeId = card.getAttribute("data-theme-id");
      var theme = counts[themeId] || { up: 0, down: 0, userVote: 0 };
      var upCount = card.querySelector("[data-theme-vote-up]");
      var downCount = card.querySelector("[data-theme-vote-down]");
      if (upCount) {
        upCount.textContent = String(theme.up);
      }
      if (downCount) {
        downCount.textContent = String(theme.down);
      }
      card.querySelectorAll("[data-theme-vote-action]").forEach(function (button) {
        var vote = Number(button.getAttribute("data-theme-vote-action"));
        button.setAttribute("aria-pressed", String(theme.userVote === vote));
      });
    });
  }

  function setPending(widget, pending) {
    widget.querySelectorAll("[data-theme-vote-action]").forEach(function (button) {
      button.disabled = pending;
    });
  }

  async function loadVotes(widget, visitorId) {
    var response = await fetch(API_URL + "?visitorId=" + encodeURIComponent(visitorId), {
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Failed to load votes");
    }
    var payload = await response.json();
    render(widget, payload);
  }

  async function submitVote(widget, visitorId, themeId, vote, currentPressed) {
    setPending(widget, true);
    setStatus(widget, "", false);

    var response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        themeId: themeId,
        voterId: visitorId,
        vote: currentPressed ? 0 : vote,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save vote");
    }

    var payload = await response.json();
    render(widget, payload);
    setStatus(widget, "Vote saved.", false);
  }

  function openPanel(widget) {
    var overlay = widget.querySelector("[data-theme-vote-overlay]");
    var panel = widget.querySelector("#theme-vote-panel");
    if (!overlay || !panel) {
      return;
    }
    overlay.hidden = false;
    widget.classList.add("is-open");
    window.setTimeout(function () {
      overlay.classList.add("is-open");
      panel.focus();
    }, 0);
  }

  function closePanel(widget) {
    var overlay = widget.querySelector("[data-theme-vote-overlay]");
    if (!overlay) {
      return;
    }
    overlay.classList.remove("is-open");
    widget.classList.remove("is-open");
    window.setTimeout(function () {
      overlay.hidden = true;
    }, 180);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var widget = document.querySelector("[data-theme-vote-widget]");
    if (!widget) {
      return;
    }

    var visitorId = getVisitorId();

    widget.querySelector("[data-theme-vote-open]").addEventListener("click", function () {
      openPanel(widget);
    });

    widget.querySelector("[data-theme-vote-close]").addEventListener("click", function () {
      closePanel(widget);
    });

    widget.querySelector("[data-theme-vote-overlay]").addEventListener("click", function (event) {
      if (event.target === event.currentTarget) {
        closePanel(widget);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePanel(widget);
      }
    });

    widget.querySelectorAll("[data-theme-vote-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var card = button.closest("[data-theme-id]");
        if (!card) {
          return;
        }

        var themeId = card.getAttribute("data-theme-id");
        var vote = Number(button.getAttribute("data-theme-vote-action"));
        var currentPressed = button.getAttribute("aria-pressed") === "true";

        submitVote(widget, visitorId, themeId, vote, currentPressed)
          .catch(function () {
            setStatus(widget, "Could not save the vote.", true);
          })
          .finally(function () {
            setPending(widget, false);
          });
      });
    });

    loadVotes(widget, visitorId).catch(function () {
      setStatus(widget, "Vote counts are unavailable.", true);
    });

    if (window.location.hash === "#theme-vote") {
      openPanel(widget);
    }
  });
})();
