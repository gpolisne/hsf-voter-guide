/* ============================================================
   HSF VOTER GUIDE - RENDERER
   Reads data.json and paints the page. Holds no content of its own.
   To change the guide, edit data.json. Never edit this file for content.
   ============================================================ */

(function () {
  "use strict";

  var DATA = null;
  var state = {
    county: "all",
    levels: [],      // empty array means "all levels"
    preview: false
  };

  /* ---------- small helpers ---------- */

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeUrl(u) {
    if (!u) return "";
    var s = String(u).trim();
    if (/^https?:\/\//i.test(s) || /^mailto:/i.test(s)) return s;
    if (/^www\./i.test(s)) return "https://" + s;
    return "";
  }

  // Initials for the fallback tile. Skips placeholder prefixes and
  // short connecting words so "Maria de la Cruz" gives MC, not MD.
  function initials(name) {
    var skip = { de: 1, la: 1, del: 1, van: 1, von: 1, der: 1, the: 1, of: 1, and: 1, "for": 1, placeholder: 1 };
    var words = String(name || "")
      .replace(/[^A-Za-z\u00C0-\u024F\s'-]/g, " ")
      .split(/\s+/)
      .filter(function (w) { return w && !skip[w.toLowerCase()]; });
    if (!words.length) return "?";
    var out = words[0].charAt(0);
    if (words.length > 1) out += words[words.length - 1].charAt(0);
    return out.toUpperCase();
  }

  // Photo paths are relative to the site root, e.g. "images/name.jpg".
  function portrait(item) {
    var src = (item.photo || "").trim();
    var alt = src ? esc(item.name) : "";
    var inner = src
      ? '<img src="' + esc(src) + '" alt="' + alt + '" loading="lazy" ' +
        "onerror=\"this.parentNode.innerHTML='<div class=&quot;entry-monogram&quot; aria-hidden=&quot;true&quot;>" +
        esc(initials(item.name)) + "</div>'\">"
      : '<div class="entry-monogram" aria-hidden="true">' + esc(initials(item.name)) + "</div>";
    return '<div class="entry-portrait">' + inner + "</div>";
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function section(cat) { return document.getElementById("section-" + cat); }

  /* ---------- URL state ---------- */

  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    if (p.get("county")) state.county = p.get("county");
    if (p.get("preview") === "1") state.preview = true;
  }

  function writeUrl() {
    var p = new URLSearchParams(window.location.search);
    if (state.county && state.county !== "all") p.set("county", state.county);
    else p.delete("county");
    var qs = p.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState({}, "", url);
  }

  /* ---------- status messages ---------- */

  function showStatus(title, body) {
    var el = document.getElementById("status");
    el.innerHTML =
      '<div class="status-msg"><h2>' + esc(title) + "</h2><p>" + body + "</p></div>";
  }

  function clearStatus() {
    document.getElementById("status").innerHTML = "";
  }

  /* ---------- load ---------- */

  function load() {
    // cache-buster so edits to data.json appear immediately
    fetch("data.json?v=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        DATA = json;
        boot();
      })
      .catch(function (err) {
        showStatus(
          "The guide could not load",
          "The file <strong>data.json</strong> is missing or has a formatting error, " +
            "usually a missing comma or quote mark. Paste the file into " +
            '<a href="https://jsonlint.com" target="_blank" rel="noopener">jsonlint.com</a> ' +
            "to find the line. Technical detail: " + esc(err.message)
        );
      });
  }

  /* ---------- settings, tools, footer ---------- */

  function paintChrome() {
    var s = DATA.settings || {};

    var cycle = document.getElementById("cycle-line");
    cycle.textContent = [s.state, s.cycle].filter(Boolean).join(" \u00B7 ");

    var sub = document.getElementById("masthead-sub");
    var bits = [];
    if (s.election_dates && s.election_dates.general) bits.push("General election: " + s.election_dates.general);
    if (s.election_dates && s.election_dates.primary) bits.push("Primary: " + s.election_dates.primary);
    sub.textContent = bits.join("  \u2014  ");

    // voter tools
    var tools = [];
    var vt = s.voter_tools || {};
    if (safeUrl(vt.check_registration_url)) tools.push(["Check your registration", vt.check_registration_url]);
    if (safeUrl(vt.register_url)) tools.push(["Register to vote", vt.register_url]);
    if (safeUrl(vt.find_polling_place_url)) tools.push(["Find where to vote", vt.find_polling_place_url]);

    document.getElementById("voter-tools").innerHTML = tools
      .map(function (t) {
        return '<a class="toolbtn" href="' + esc(safeUrl(t[1])) + '" target="_blank" rel="noopener">' + esc(t[0]) + "</a>";
      })
      .join("");

    // footer
    document.getElementById("methodology").textContent = s.methodology_note || "";
    document.getElementById("paid-for-by").textContent = s.paid_for_by || "";

    var meta = [];
    if (s.publisher_name) meta.push(["Published by", esc(s.publisher_name)]);
    if (s.last_updated) meta.push(["Last updated", esc(s.last_updated)]);
    if (s.contact_email) meta.push(["Contact", '<a href="mailto:' + esc(s.contact_email) + '">' + esc(s.contact_email) + "</a>"]);
    if (safeUrl(s.website)) meta.push(["Website", '<a href="' + esc(safeUrl(s.website)) + '" target="_blank" rel="noopener">' + esc(s.website) + "</a>"]);

    document.getElementById("footer-meta").innerHTML = meta
      .map(function (m) { return "<dt>" + m[0] + "</dt><dd>" + m[1] + "</dd>"; })
      .join("");

    // category blurbs
    (DATA.categories || []).forEach(function (c) {
      var sec = section(c.id);
      if (!sec) return;
      var b = sec.querySelector('[data-role="blurb"]');
      if (b) b.textContent = c.blurb || "";
    });
  }

  /* ---------- filter controls ---------- */

  function buildCountySelect() {
    var sel = document.getElementById("county-select");
    var opts = ['<option value="all">All four counties</option>'];
    (DATA.counties || []).forEach(function (c) {
      opts.push('<option value="' + esc(c.id) + '">' + esc(c.name) + "</option>");
    });
    sel.innerHTML = opts.join("");
    sel.value = state.county;
    if (sel.value !== state.county) { state.county = "all"; sel.value = "all"; }

    sel.addEventListener("change", function () {
      state.county = sel.value;
      writeUrl();
      renderAll();
    });
  }

  function buildLevelChips() {
    var wrap = document.getElementById("level-chips");
    var levels = DATA.levels || [];
    wrap.innerHTML =
      '<button type="button" class="chip" data-level="all" aria-pressed="true">All</button>' +
      levels
        .map(function (l) {
          return '<button type="button" class="chip" data-level="' + esc(l.id) + '" aria-pressed="false">' + esc(l.label) + "</button>";
        })
        .join("");

    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var lv = btn.getAttribute("data-level");

      if (lv === "all") {
        state.levels = [];
      } else {
        var i = state.levels.indexOf(lv);
        if (i > -1) state.levels.splice(i, 1);
        else state.levels.push(lv);
      }
      syncChips();
      renderAll();
    });
  }

  function syncChips() {
    $$("#level-chips .chip").forEach(function (btn) {
      var lv = btn.getAttribute("data-level");
      var on = lv === "all" ? state.levels.length === 0 : state.levels.indexOf(lv) > -1;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---------- matching ---------- */

  function raceById(id) {
    return (DATA.races || []).filter(function (r) { return r.id === id; })[0] || null;
  }

  function raceMatches(race) {
    if (!race) return false;
    if (state.levels.length && state.levels.indexOf(race.level) === -1) return false;
    if (state.county !== "all") {
      var cs = race.counties || [];
      if (cs.indexOf(state.county) === -1) return false;
    }
    return true;
  }

  function orgMatches(org) {
    if (state.county === "all") return true;
    if (org.statewide) return true;
    return (org.counties || []).indexOf(state.county) > -1;
  }

  function visibleStatus(item) {
    if (state.preview) return true;
    return item.status === "published";
  }

  /* ---------- card builders ---------- */

  function linkButtons(links) {
    if (!links) return "";
    var defs = [
      ["website", "Website", false],
      ["volunteer", "Volunteer", true],
      ["donate", "Donate", false],
      ["events", "Events", false],
      ["social", "Follow", false]
    ];
    var out = defs
      .filter(function (d) { return safeUrl(links[d[0]]); })
      .map(function (d) {
        var cls = d[2] ? "linkbtn linkbtn-primary" : "linkbtn";
        return '<a class="' + cls + '" href="' + esc(safeUrl(links[d[0]])) + '" target="_blank" rel="noopener">' + d[1] + "</a>";
      })
      .join("");
    return out ? '<div class="entry-links">' + out + "</div>" : "";
  }

  function raceLabel(race) {
    if (!race) return "";
    var parts = [race.office];
    if (race.district) parts.push(race.district);
    return parts.filter(Boolean).join(" \u00B7 ");
  }

  function entryCard(entry, race) {
    var tags = [];
    if (entry.status !== "published") tags.push('<span class="tag">Draft</span>');
    if (entry.incumbent) tags.push('<span class="tag tag-incumbent">Incumbent</span>');
    if (entry.ballot_designation) tags.push('<span class="tag">' + esc(entry.ballot_designation) + "</span>");
    if (race && race.seats_open > 1) tags.push('<span class="tag">Vote for ' + esc(race.seats_open) + "</span>");

    var bullets = (entry.why_bullets || []).filter(Boolean);

    return (
      '<article class="entry">' +
        '<div class="entry-head">' +
          portrait(entry) +
          '<div class="entry-headtext">' +
            '<p class="entry-race">' + esc(raceLabel(race)) + "</p>" +
            '<h3 class="entry-name">' + esc(entry.name) + "</h3>" +
            (tags.length ? '<div class="entry-tags">' + tags.join("") + "</div>" : "") +
          "</div>" +
        "</div>" +
        (entry.headline ? '<p class="entry-headline">' + esc(entry.headline) + "</p>" : "") +
        (entry.summary ? '<p class="entry-summary">' + esc(entry.summary) + "</p>" : "") +
        (bullets.length
          ? '<ul class="entry-bullets">' + bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>"
          : "") +
        linkButtons(entry.links) +
      "</article>"
    );
  }

  function orgCard(org) {
    var tags = [];
    if (org.status !== "published") tags.push('<span class="tag">Draft</span>');
    if (org.statewide) tags.push('<span class="tag tag-incumbent">Statewide</span>');
    (org.focus_tags || []).forEach(function (t) {
      tags.push('<span class="tag">' + esc(t) + "</span>");
    });

    var ways = (org.ways_to_help || []).filter(Boolean);

    return (
      '<article class="entry' + (org.urgent ? " org-urgent" : "") + '">' +
        '<div class="entry-head">' +
          portrait(org) +
          '<div class="entry-headtext">' +
            '<h3 class="entry-name">' + esc(org.name) + "</h3>" +
            (tags.length ? '<div class="entry-tags">' + tags.join("") + "</div>" : "") +
          "</div>" +
        "</div>" +
        (org.description ? '<p class="entry-summary">' + esc(org.description) + "</p>" : "") +
        (ways.length
          ? '<p class="entry-headline">Ways to help</p><ul class="entry-bullets">' +
            ways.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>"
          : "") +
        linkButtons(org.links) +
      "</article>"
    );
  }

  /* ---------- render ---------- */

  function paintSection(cat, html, count, hiddenDrafts, emptyText) {
    var sec = section(cat);
    if (!sec) return;

    sec.querySelector('[data-role="cards"]').innerHTML = html;

    var countEl = sec.querySelector('[data-role="count"]');
    countEl.textContent = count === 1 ? "1 listing" : count + " listings";

    var emptyEl = sec.querySelector('[data-role="empty"]');
    if (count === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = hiddenDrafts
        ? hiddenDrafts + " draft " + (hiddenDrafts === 1 ? "entry is" : "entries are") +
          " hidden. Add ?preview=1 to the end of the web address to see them."
        : emptyText;
    } else {
      emptyEl.hidden = true;
    }
  }

  function renderAll() {
    var orphans = 0;

    ["hold_the_line", "seize_new_ground"].forEach(function (cat) {
      var html = [];
      var hiddenDrafts = 0;

      (DATA.entries || []).forEach(function (entry) {
        if (entry.category !== cat) return;
        var race = raceById(entry.race_id);
        if (!race) { orphans++; return; }
        if (!raceMatches(race)) return;
        if (!visibleStatus(entry)) { hiddenDrafts++; return; }
        html.push(entryCard(entry, race));
      });

      paintSection(cat, html.join(""), html.length, hiddenDrafts, "No entries yet for this county.");
    });

    var orgHtml = [];
    var orgDrafts = 0;
    (DATA.organizations || []).forEach(function (org) {
      if (!orgMatches(org)) return;
      if (!visibleStatus(org)) { orgDrafts++; return; }
      orgHtml.push(orgCard(org));
    });
    paintSection("fight_like_hell", orgHtml.join(""), orgHtml.length, orgDrafts, "No organizations listed yet for this county.");

    if (orphans > 0) {
      showStatus(
        "Some entries are not showing",
        orphans + " " + (orphans === 1 ? "entry points" : "entries point") +
          " to a race that does not exist in data.json. Check that each entry's " +
          "<strong>race_id</strong> exactly matches the <strong>id</strong> of a race."
      );
    } else if (state.preview) {
      showStatus("Preview mode", "Draft entries are visible. Remove <strong>?preview=1</strong> from the web address to see the guide as the public sees it.");
    } else {
      clearStatus();
    }
  }

  /* ---------- boot ---------- */

  function boot() {
    paintChrome();
    buildCountySelect();
    buildLevelChips();
    syncChips();
    renderAll();
  }

  readUrl();
  load();
})();
