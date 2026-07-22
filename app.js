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

  // Stable small hash so a given name always gets the same placeholder shape.
  function hashOf(s) {
    var h = 0, i;
    s = String(s || "");
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return h;
  }

  // Illustrated placeholder portrait, generated from the name so a given
  // entry always gets the same face. Sample content only - replaced the
  // moment a real photo path is added to data.json.
  var SKIN = [
    ["#F4D9C0", "#E3BE9F"], ["#EDC7A4", "#D8A87E"], ["#DCA97C", "#C08A5C"],
    ["#C4885A", "#A66B41"], ["#A2683E", "#84502C"], ["#7A4A2B", "#5E361C"],
    ["#5A3520", "#432414"]
  ];
  var HAIRC = ["#241C15", "#3E2E20", "#6B4A2C", "#A8752F", "#C9A227", "#8E8E8E", "#E4E0D8", "#5B3A46"];
  var SHIRT = ["#1B3A5C", "#E0522C", "#2E6E6A", "#6B3A5B", "#47566B", "#B4552C", "#3C5E3A"];
  var BG = ["#DCE6EF", "#EFE3D5", "#E2EBE1", "#EEE0E6", "#E6E4F0", "#E9E9E2"];

  function personAvatar(name) {
    var h = hashOf(name);
    var pick = function (arr, shift) { return arr[(h >> shift) % arr.length]; };

    var skin = pick(SKIN, 0);
    var hair = pick(HAIRC, 3);
    var shirt = pick(SHIRT, 6);
    var bg = pick(BG, 9);
    var style = (h >> 12) % 6;
    var glasses = ((h >> 15) % 4) === 0;
    var beard = ((h >> 17) % 5) === 0;

    var s = [];
    s.push('<rect x="0" y="0" width="80" height="100" fill="' + bg + '"/>');

    // hair drawn behind the head for the longer styles
    if (style === 2) s.push('<path d="M18 44 a22 22 0 0 1 44 0 l0 30 l-9 0 l0 -26 a13 13 0 0 0 -26 0 l0 26 l-9 0 z" fill="' + hair + '"/>');
    if (style === 4) s.push('<path d="M17 46 a23 23 0 0 1 46 0 l2 22 l-12 -4 l-24 0 l-12 4 z" fill="' + hair + '"/>');

    // shoulders and collar
    s.push('<path d="M4 100 C4 78 20 68 40 68 C60 68 76 78 76 100 Z" fill="' + shirt + '"/>');
    s.push('<path d="M33 69 L40 79 L47 69 L43 67 L40 72 L37 67 Z" fill="#FFFFFF" fill-opacity="0.35"/>');

    // neck, head, ears
    s.push('<rect x="34" y="54" width="12" height="16" rx="5" fill="' + skin[1] + '"/>');
    s.push('<circle cx="23" cy="45" r="3.6" fill="' + skin[1] + '"/><circle cx="57" cy="45" r="3.6" fill="' + skin[1] + '"/>');
    s.push('<ellipse cx="40" cy="42" rx="17" ry="19" fill="' + skin[0] + '"/>');

    // hair on top
    if (style === 0) s.push('<path d="M23 40 a17 17 0 0 1 34 0 l0 -4 a17 17 0 0 0 -34 0 z M23 40 a17 17 0 0 1 34 0 l-2 -6 a15 15 0 0 0 -30 0 z" fill="' + hair + '"/><path d="M23 38 a17 17 0 0 1 34 0 a17 13 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 1) s.push('<path d="M23 40 a17 17 0 0 1 34 0 c-4 -8 -12 -6 -22 -10 c-6 -2 -10 4 -12 10 z" fill="' + hair + '"/>');
    if (style === 2) s.push('<path d="M23 39 a17 17 0 0 1 34 0 a17 12 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 3) s.push('<circle cx="40" cy="20" r="7" fill="' + hair + '"/><path d="M23 40 a17 17 0 0 1 34 0 a17 14 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 4) s.push('<path d="M23 40 a17 17 0 0 1 34 0 a17 13 0 0 0 -34 0 z" fill="' + hair + '"/><circle cx="27" cy="31" r="6" fill="' + hair + '"/><circle cx="40" cy="26" r="7" fill="' + hair + '"/><circle cx="53" cy="31" r="6" fill="' + hair + '"/>');
    if (style === 5) s.push('<path d="M25 38 a15 15 0 0 1 30 0 a15 7 0 0 0 -30 0 z" fill="' + hair + '" fill-opacity="0.85"/>');

    // face
    s.push('<ellipse cx="33.5" cy="43" rx="1.7" ry="2.3" fill="#2A2018"/>');
    s.push('<ellipse cx="46.5" cy="43" rx="1.7" ry="2.3" fill="#2A2018"/>');
    s.push('<path d="M30 38.2 q3.5 -2 7 -0.2" stroke="' + hair + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    s.push('<path d="M43 38 q3.5 -1.8 7 0.2" stroke="' + hair + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');

    if (beard) s.push('<path d="M25 45 c0 12 7 18 15 18 c8 0 15 -6 15 -18 c0 9 -6 12 -15 12 c-9 0 -15 -3 -15 -12 z" fill="' + hair + '" fill-opacity="0.9"/>');

    s.push('<path d="M36 51.5 q4 3 8 0" stroke="#8A5541" stroke-width="1.5" fill="none" stroke-linecap="round"/>');

    if (glasses) {
      s.push('<g fill="none" stroke="#2F3A45" stroke-width="1.4" stroke-opacity="0.85">' +
        '<circle cx="33.5" cy="43" r="5.5"/><circle cx="46.5" cy="43" r="5.5"/>' +
        '<path d="M39 43 h2"/><path d="M28 42 l-4 1"/><path d="M52 42 l4 1"/></g>');
    }

    return '<svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" role="presentation">' + s.join("") + "</svg>";
  }

  // Organizations get an abstract mark rather than a body.
  function orgMark(name) {
    var h = hashOf(name);
    var lift = (h % 5) - 2;
    return (
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="presentation">' +
        '<g fill="var(--gold)" fill-opacity="0.42">' +
          '<path d="M20 ' + (66 + lift) + " L50 " + (44 + lift) + " L80 " + (66 + lift) + " L80 " + (76 + lift) + " L50 " + (54 + lift) + " L20 " + (76 + lift) + ' Z"/>' +
          '<path d="M20 ' + (48 + lift) + " L50 " + (26 + lift) + " L80 " + (48 + lift) + " L80 " + (58 + lift) + " L50 " + (36 + lift) + " L20 " + (58 + lift) + ' Z" fill-opacity="0.55"/>' +
        "</g>" +
      "</svg>"
    );
  }

  function placeholderTile(item, isOrg) {
    return '<div class="entry-placeholder" aria-hidden="true">' +
      (isOrg ? orgMark(item.name) : personAvatar(item.name)) + "</div>";
  }

  // Photo paths are relative to the site root, e.g. "images/name.jpg".
  function portrait(item, isOrg) {
    var src = (item.photo || "").trim();
    if (!src) return '<div class="entry-portrait">' + placeholderTile(item, isOrg) + "</div>";
    return (
      '<div class="entry-portrait">' +
        '<img src="' + esc(src) + '" alt="' + esc(item.name) + '" loading="lazy" ' +
        "onerror=\"this.style.display='none'\">" +
      "</div>"
    );
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
    var label = [s.state, s.cycle].filter(Boolean).join(" \u00B7 ");
    if (s.demo_notice) {
      cycle.innerHTML = '<span class="proto-flag">Prototype \u00B7 sample data only</span>' + esc(label);
    } else {
      cycle.textContent = label;
    }

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

  // Prototype behaviour: everything shows. Entries still carry a visible
  // Draft badge until their status is set to "published", so the partner
  // can see at a glance what is finished. Flip this to the commented
  // version below when the guide goes live and drafts must stay private.
  function visibleStatus(item) {
    return true;
    // return state.preview || item.status === "published";
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
          portrait(org, true) +
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
    } else if (DATA.settings && DATA.settings.demo_notice) {
      showStatus("Sample content", esc(DATA.settings.demo_notice));
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
