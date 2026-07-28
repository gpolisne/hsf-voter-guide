(function () {
  "use strict";

  var LS = "hsf-builder-v1";
  var base = null;
  var state = { volunteer: "", entries: [], races: [], orgs: [], photos: {}, editing: null };
  var pendingPhoto = null;

  /* ---------- avatar (verbatim from app.js) ---------- */
  function hashOf(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return h;
  }
  var SKIN = [["#F4D9C0","#E3BE9F"],["#EDC7A4","#D8A87E"],["#DCA97C","#C08A5C"],
    ["#C4885A","#A66B41"],["#A2683E","#84502C"],["#7A4A2B","#5E361C"],["#5A3520","#432414"]];
  var HAIRC = ["#241C15","#3E2E20","#6B4A2C","#A8752F","#C9A227","#8E8E8E","#E4E0D8","#5B3A46"];
  var SHIRT = ["#1B3A5C","#E0522C","#2E6E6A","#6B3A5B","#47566B","#B4552C","#3C5E3A"];
  var BG = ["#DCE6EF","#EFE3D5","#E2EBE1","#EEE0E6","#E6E4F0","#E9E9E2"];

  function personAvatar(name) {
    var h = hashOf(name);
    var pick = function (a, sh) { return a[(h >> sh) % a.length]; };
    var skin = pick(SKIN,0), hair = pick(HAIRC,3), shirt = pick(SHIRT,6), bg = pick(BG,9);
    var style = (h >> 12) % 6, glasses = ((h >> 15) % 4) === 0, beard = ((h >> 17) % 5) === 0;
    var s = [];
    s.push('<rect x="0" y="0" width="80" height="100" fill="' + bg + '"/>');
    if (style === 2) s.push('<path d="M18 44 a22 22 0 0 1 44 0 l0 30 l-9 0 l0 -26 a13 13 0 0 0 -26 0 l0 26 l-9 0 z" fill="' + hair + '"/>');
    if (style === 4) s.push('<path d="M17 46 a23 23 0 0 1 46 0 l2 22 l-12 -4 l-24 0 l-12 4 z" fill="' + hair + '"/>');
    s.push('<path d="M4 100 C4 78 20 68 40 68 C60 68 76 78 76 100 Z" fill="' + shirt + '"/>');
    s.push('<path d="M33 69 L40 79 L47 69 L43 67 L40 72 L37 67 Z" fill="#FFFFFF" fill-opacity="0.35"/>');
    s.push('<rect x="34" y="54" width="12" height="16" rx="5" fill="' + skin[1] + '"/>');
    s.push('<circle cx="23" cy="45" r="3.6" fill="' + skin[1] + '"/><circle cx="57" cy="45" r="3.6" fill="' + skin[1] + '"/>');
    s.push('<ellipse cx="40" cy="42" rx="17" ry="19" fill="' + skin[0] + '"/>');
    if (style === 0) s.push('<path d="M23 40 a17 17 0 0 1 34 0 l0 -4 a17 17 0 0 0 -34 0 z M23 40 a17 17 0 0 1 34 0 l-2 -6 a15 15 0 0 0 -30 0 z" fill="' + hair + '"/><path d="M23 38 a17 17 0 0 1 34 0 a17 13 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 1) s.push('<path d="M23 40 a17 17 0 0 1 34 0 c-4 -8 -12 -6 -22 -10 c-6 -2 -10 4 -12 10 z" fill="' + hair + '"/>');
    if (style === 2) s.push('<path d="M23 39 a17 17 0 0 1 34 0 a17 12 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 3) s.push('<circle cx="40" cy="20" r="7" fill="' + hair + '"/><path d="M23 40 a17 17 0 0 1 34 0 a17 14 0 0 0 -34 0 z" fill="' + hair + '"/>');
    if (style === 4) s.push('<path d="M23 40 a17 17 0 0 1 34 0 a17 13 0 0 0 -34 0 z" fill="' + hair + '"/><circle cx="27" cy="31" r="6" fill="' + hair + '"/><circle cx="40" cy="26" r="7" fill="' + hair + '"/><circle cx="53" cy="31" r="6" fill="' + hair + '"/>');
    if (style === 5) s.push('<path d="M25 38 a15 15 0 0 1 30 0 a15 7 0 0 0 -30 0 z" fill="' + hair + '" fill-opacity="0.85"/>');
    s.push('<ellipse cx="33.5" cy="43" rx="1.7" ry="2.3" fill="#2A2018"/>');
    s.push('<ellipse cx="46.5" cy="43" rx="1.7" ry="2.3" fill="#2A2018"/>');
    s.push('<path d="M30 38.2 q3.5 -2 7 -0.2" stroke="' + hair + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    s.push('<path d="M43 38 q3.5 -1.8 7 0.2" stroke="' + hair + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    if (beard) s.push('<path d="M25 45 c0 12 7 18 15 18 c8 0 15 -6 15 -18 c0 9 -6 12 -15 12 c-9 0 -15 -3 -15 -12 z" fill="' + hair + '" fill-opacity="0.9"/>');
    s.push('<path d="M36 51.5 q4 3 8 0" stroke="#8A5541" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    if (glasses) s.push('<g fill="none" stroke="#2F3A45" stroke-width="1.4" stroke-opacity="0.85">' +
      '<circle cx="33.5" cy="43" r="5.5"/><circle cx="46.5" cy="43" r="5.5"/>' +
      '<path d="M39 43 h2"/><path d="M28 42 l-4 1"/><path d="M52 42 l4 1"/></g>');
    return '<svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" role="presentation">' + s.join("") + "</svg>";
  }

  /* ---------- helpers ---------- */
  function el(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
    });
  }
  function slug(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify(state));
      return true;
    } catch (e) {
      alert("Your browser storage is full, so this was NOT saved.\n\n" +
            "Export your work now, then use Delete all my work to make room.");
      return false;
    }
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS);
      if (raw) {
        var p = JSON.parse(raw);
        state.volunteer = p.volunteer || "";
        state.entries = p.entries || [];
        state.races = p.races || [];
        state.orgs = p.orgs || [];
        state.photos = p.photos || {};
      }
    } catch (e) {}
  }
  function msg(target, kind, text) {
    el(target).innerHTML = text ? '<div class="msg ' + kind + '">' + esc(text) + "</div>" : "";
  }
  function allRaces() { return (base.races || []).concat(state.races); }
  function raceById(id) {
    var r = allRaces().filter(function (x) { return x.id === id; });
    return r.length ? r[0] : null;
  }
  function raceLabel(r) { return r.office + (r.district ? " \u2014 " + r.district : ""); }
  function kb(dataUrl) { return Math.round(dataUrl.length * 0.75 / 1024); }

  /* ---------- photo pipeline ---------- */
  function resizeImage(file, mode, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb(null, "Could not read that file."); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { cb(null, "That file is not an image the browser can open."); };
      img.onload = function () {
        var TW = mode === "org" ? 400 : 400;
        var TH = mode === "org" ? 400 : 500;
        var cv = document.createElement("canvas");
        cv.width = TW; cv.height = TH;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, TW, TH);

        var sw = img.naturalWidth, sh = img.naturalHeight;
        if (!sw || !sh) { return cb(null, "That image has no dimensions."); }

        if (mode === "org") {
          var sc = Math.min(TW / sw, TH / sh);
          var dw = sw * sc, dh = sh * sc;
          ctx.drawImage(img, (TW - dw) / 2, (TH - dh) / 2, dw, dh);
        } else {
          var targetRatio = TW / TH;
          var srcRatio = sw / sh;
          var cx, cy, cw, ch;
          if (srcRatio > targetRatio) {
            ch = sh; cw = sh * targetRatio;
            cx = (sw - cw) / 2; cy = 0;
          } else {
            cw = sw; ch = sw / targetRatio;
            cx = 0; cy = (sh - ch) * 0.20;
          }
          ctx.drawImage(img, cx, cy, cw, ch, 0, 0, TW, TH);
        }
        cb(cv.toDataURL("image/jpeg", 0.82), null);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function showPhoto(dataUrl) {
    if (!dataUrl) {
      el("photoRow").hidden = true;
      el("photoThumb").innerHTML = "";
      el("photoInfo").textContent = "";
      return;
    }
    el("photoRow").hidden = false;
    el("photoThumb").innerHTML = '<img src="' + dataUrl + '" alt="">';
    el("photoInfo").textContent = "Resized to 400 \u00d7 500, about " + kb(dataUrl) + " KB.";
  }

  /* ---------- form ---------- */
  function bulletRow(val) {
    var d = document.createElement("div");
    d.className = "bullet";
    var i = document.createElement("input");
    i.type = "text"; i.value = val || "";
    i.placeholder = "A specific, checkable fact";
    i.addEventListener("input", preview);
    var b = document.createElement("button");
    b.type = "button"; b.className = "ghost sm"; b.textContent = "\u00d7";
    b.addEventListener("click", function () { d.remove(); preview(); });
    d.appendChild(i); d.appendChild(b);
    return d;
  }
  function getBullets() {
    var out = [];
    Array.prototype.forEach.call(el("bullets").querySelectorAll("input"), function (i) {
      if (i.value.trim()) out.push(i.value.trim());
    });
    return out;
  }
  function setBullets(arr) {
    el("bullets").innerHTML = "";
    (arr && arr.length ? arr : ["", "", ""]).forEach(function (v) {
      el("bullets").appendChild(bulletRow(v));
    });
  }

  function fillRaceSelect(sel) {
    var s = el("f_race");
    s.innerHTML = '<option value="">Choose a race\u2026</option>';
    var levels = {};
    allRaces().forEach(function (r) { (levels[r.level] = levels[r.level] || []).push(r); });
    (base.levels || []).forEach(function (lv) {
      if (!levels[lv.id]) return;
      var g = document.createElement("optgroup");
      g.label = lv.label;
      levels[lv.id].forEach(function (r) {
        var o = document.createElement("option");
        o.value = r.id; o.textContent = raceLabel(r);
        if (r._new) o.textContent += "  (new)";
        g.appendChild(o);
      });
      s.appendChild(g);
    });
    var o2 = document.createElement("option");
    o2.value = "__new__"; o2.textContent = "+ Add a race that is not listed";
    s.appendChild(o2);
    if (sel) s.value = sel;
  }

  function clearForm() {
    state.editing = null;
    pendingPhoto = null;
    el("modeNote").textContent = "new";
    ["f_name","f_designation","f_headline","f_summary","f_website","f_volunteer","f_donate","f_credit"]
      .forEach(function (id) { el(id).value = ""; });
    el("f_photo").value = "";
    showPhoto(null);
    el("f_incumbent").checked = false;
    el("f_category").value = "seize_new_ground";
    el("f_status").value = "draft";
    fillRaceSelect("");
    el("newRace").hidden = true;
    ["r_office","r_district"].forEach(function (id) { el(id).value = ""; });
    el("r_seats").value = 1;
    Array.prototype.forEach.call(el("r_counties").querySelectorAll("input"), function (i) { i.checked = false; });
    setBullets(null);
    msg("formMsg", "ok", "");
    counter("f_headline", "c_headline", 70);
    counter("f_summary", "c_summary", 400);
    preview();
  }

  function loadCard(id) {
    var c = state.entries.filter(function (e) { return e.id === id; })[0];
    if (!c) return;
    state.editing = id;
    el("modeNote").textContent = "editing";
    el("f_name").value = c.name;
    fillRaceSelect(c.race_id);
    el("f_incumbent").checked = !!c.incumbent;
    el("f_category").value = c.category;
    el("f_designation").value = c.ballot_designation || "";
    el("f_headline").value = c.headline || "";
    el("f_summary").value = c.summary || "";
    el("f_website").value = (c.links && c.links.website) || "";
    el("f_volunteer").value = (c.links && c.links.volunteer) || "";
    el("f_donate").value = (c.links && c.links.donate) || "";
    el("f_credit").value = c.photo_credit || "";
    el("f_status").value = c.status || "draft";
    setBullets(c.why_bullets);
    el("f_photo").value = "";
    pendingPhoto = state.photos[id] || null;
    showPhoto(pendingPhoto);
    el("newRace").hidden = true;
    counter("f_headline", "c_headline", 70);
    counter("f_summary", "c_summary", 400);
    window.scrollTo(0, 0);
    preview();
  }

  function commitNewRace() {
    var office = el("r_office").value.trim();
    if (!office) return { err: "New race needs an office name." };
    var counties = [];
    Array.prototype.forEach.call(el("r_counties").querySelectorAll("input:checked"),
      function (i) { counties.push(i.value); });
    if (!counties.length) return { err: "Pick at least one county for the new race." };
    var district = el("r_district").value.trim();
    var id = "race-" + slug(office + (district ? "-" + district : ""));
    if (raceById(id)) return { id: id };
    state.races.push({
      id: id,
      level: el("r_level").value,
      office: office,
      district: district || null,
      counties: counties,
      seats_open: parseInt(el("r_seats").value, 10) || 1,
      notes: "Added by " + (state.volunteer || "a volunteer") + " on " + today() + ". Needs review.",
      _new: true
    });
    return { id: id };
  }

  function saveCard() {
    var name = el("f_name").value.trim();
    if (!name) { return msg("formMsg", "err", "Candidate name is required."); }

    var raceId = el("f_race").value;
    if (raceId === "__new__") {
      var r = commitNewRace();
      if (r.err) { return msg("formMsg", "err", r.err); }
      raceId = r.id;
    }
    if (!raceId) { return msg("formMsg", "err", "Choose a race, or add one."); }

    var headline = el("f_headline").value.trim();
    var summary = el("f_summary").value.trim();
    if (!headline) { return msg("formMsg", "err", "Headline is required."); }
    if (!summary) { return msg("formMsg", "err", "Summary is required."); }
    var bullets = getBullets();
    if (!bullets.length) { return msg("formMsg", "err", "At least one why bullet is required."); }
    if (pendingPhoto && !el("f_credit").value.trim()) {
      return msg("formMsg", "err", "Add a photo credit saying where the image came from.");
    }

    var id = state.editing || ("entry-" + slug(name));
    if (!state.editing && state.entries.some(function (e) { return e.id === id; })) {
      return msg("formMsg", "err", "You already have a card for that name. Edit it from the list instead.");
    }

    var photoPath = pendingPhoto ? ("images/" + slug(name) + ".jpg") : "";

    var card = {
      id: id,
      category: el("f_category").value,
      race_id: raceId,
      name: name,
      incumbent: el("f_incumbent").checked,
      ballot_designation: el("f_designation").value.trim(),
      headline: headline,
      summary: summary,
      why_bullets: bullets,
      links: {
        website: el("f_website").value.trim(),
        volunteer: el("f_volunteer").value.trim(),
        donate: el("f_donate").value.trim()
      },
      photo: photoPath,
      photo_credit: el("f_credit").value.trim(),
      status: el("f_status").value,
      created_by: state.volunteer || "unknown",
      updated: today()
    };

    if (pendingPhoto) { state.photos[id] = pendingPhoto; }
    else { delete state.photos[id]; }

    if (state.editing) {
      state.entries = state.entries.map(function (e) { return e.id === id ? card : e; });
    } else {
      state.entries.push(card);
    }
    if (!save()) { return; }
    renderList();
    fillRaceSelect("");
    clearForm();
    updateMeter();
    msg("formMsg", "ok", "Saved " + name + ".");
  }

  /* ---------- preview and list ---------- */
  function preview() {
    var name = el("f_name").value.trim() || "Candidate name";
    var r = raceById(el("f_race").value);
    var bullets = getBullets();
    var pic = pendingPhoto
      ? '<img src="' + pendingPhoto + '" alt="">'
      : personAvatar(name);
    el("preview").innerHTML =
      '<div class="prevpic">' + pic + "</div>" +
      '<div class="prevbody">' +
        '<div class="prevrace">' + esc(r ? raceLabel(r) : "No race selected") + "</div>" +
        '<div class="prevname">' + esc(name) + "</div>" +
        '<p class="prevhead">' + esc(el("f_headline").value || "Headline goes here.") + "</p>" +
        '<p class="prevsum">' + esc(el("f_summary").value || "Summary goes here.") + "</p>" +
        '<ul class="prevbul">' + bullets.map(function (b) {
          return "<li>" + esc(b) + "</li>";
        }).join("") + "</ul>" +
      "</div>";
  }

  function counter(inputId, target, limit) {
    var n = el(inputId).value.length;
    var c = el(target);
    c.textContent = n + " / " + limit;
    c.className = "count" + (n > limit ? " over" : "");
  }

  function updateMeter() {
    var bytes = 0;
    try { bytes = JSON.stringify(state).length; } catch (e) {}
    var pct = Math.min(100, Math.round(bytes / (4 * 1024 * 1024) * 100));
    var m = el("meter");
    m.className = "meter" + (pct > 70 ? " warn" : "");
    m.firstChild.style.width = pct + "%";
    el("meterNote").textContent =
      Math.round(bytes / 1024) + " KB stored" +
      (pct > 70 ? " \u2014 getting full. Export soon." : "");
  }

  function renderList() {
    var ul = el("cardlist");
    ul.innerHTML = "";
    el("cardCount").textContent = state.entries.length
      ? state.entries.length + " card" + (state.entries.length === 1 ? "" : "s")
      : "";
    el("emptyNote").hidden = state.entries.length > 0;

    state.entries.forEach(function (c) {
      var r = raceById(c.race_id);
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="tag ' + (c.category === "hold_the_line" ? "hold" : "seize") + '">' +
          (c.category === "hold_the_line" ? "Hold" : "Seize") + "</span>" +
        '<span class="nm"><b>' + esc(c.name) + "</b><span>" +
          esc(r ? raceLabel(r) : "unknown race") + "</span></span>" +
        (state.photos[c.id] ? '<span class="tag pic">Photo</span>' : "") +
        (c.status === "draft" ? '<span class="tag draft">Draft</span>' : "");
      var edit = document.createElement("button");
      edit.className = "ghost sm"; edit.textContent = "Edit";
      edit.addEventListener("click", function () { loadCard(c.id); });
      var del = document.createElement("button");
      del.className = "danger sm"; del.textContent = "Delete";
      del.addEventListener("click", function () {
        if (!confirm("Delete the card for " + c.name + "?")) return;
        state.entries = state.entries.filter(function (e) { return e.id !== c.id; });
        delete state.photos[c.id];
        save(); renderList(); updateMeter();
        if (state.editing === c.id) clearForm();
      });
      li.appendChild(edit); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  /* ---------- export ---------- */
  function doExport() {
    if (!state.entries.length && !state.races.length) {
      return msg("exportMsg", "err", "Nothing to export yet.");
    }
    if (!state.volunteer) {
      return msg("exportMsg", "err", "Put your name in the bar at the top first.");
    }
    var photos = {};
    var nPhotos = 0;
    state.entries.forEach(function (e) {
      if (e.photo && state.photos[e.id]) { photos[e.photo] = state.photos[e.id]; nPhotos++; }
    });
    var frag = {
      _fragment: true,
      created_by: state.volunteer,
      exported: today(),
      races: state.races.map(function (r) {
        var c = JSON.parse(JSON.stringify(r)); delete c._new; return c;
      }),
      entries: state.entries,
      organizations: state.orgs,
      photos: photos
    };
    var text = JSON.stringify(frag, null, 2);
    var blob = new Blob([text], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hsf-fragment-" + slug(state.volunteer) + "-" + today() + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    msg("exportMsg", "ok", "Exported " + state.entries.length + " card(s), " +
      nPhotos + " photo(s), " + state.races.length + " new race(s). File is about " +
      Math.round(text.length / 1024) + " KB. Email it to George.");
  }

  /* ---------- boot ---------- */
  function wire() {
    el("volunteer").value = state.volunteer;
    el("volunteer").addEventListener("input", function () {
      state.volunteer = this.value.trim();
      el("whoNote").textContent = state.volunteer ? "" : "needed before export";
      save();
    });
    el("whoNote").textContent = state.volunteer ? "" : "needed before export";

    var lv = el("r_level");
    (base.levels || []).forEach(function (l) {
      var o = document.createElement("option");
      o.value = l.id; o.textContent = l.label; lv.appendChild(o);
    });
    var cty = el("r_counties");
    (base.counties || []).forEach(function (c) {
      var w = document.createElement("label");
      w.innerHTML = '<input type="checkbox" value="' + esc(c.id) + '"> ' + esc(c.name);
      cty.appendChild(w);
    });

    el("f_race").addEventListener("change", function () {
      el("newRace").hidden = this.value !== "__new__";
      preview();
    });
    el("f_incumbent").addEventListener("change", function () {
      el("f_category").value = this.checked ? "hold_the_line" : "seize_new_ground";
    });
    el("addBullet").addEventListener("click", function () {
      el("bullets").appendChild(bulletRow(""));
    });

    el("f_photo").addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      el("photoInfo").textContent = "Processing\u2026";
      el("photoRow").hidden = false;
      resizeImage(f, "person", function (dataUrl, err) {
        if (err) {
          el("photoRow").hidden = true;
          return msg("formMsg", "err", err);
        }
        pendingPhoto = dataUrl;
        showPhoto(dataUrl);
        preview();
      });
    });
    el("removePhoto").addEventListener("click", function () {
      pendingPhoto = null;
      el("f_photo").value = "";
      showPhoto(null);
      preview();
    });

    el("saveCard").addEventListener("click", saveCard);
    el("clearForm").addEventListener("click", clearForm);
    el("exportBtn").addEventListener("click", doExport);
    el("wipeBtn").addEventListener("click", function () {
      if (!confirm("Delete every card you have made in this browser? This cannot be undone.")) return;
      if (!confirm("Really delete all of it? Export first if you have not.")) return;
      state.entries = []; state.races = []; state.orgs = []; state.photos = {};
      save(); renderList(); clearForm(); updateMeter();
      msg("exportMsg", "ok", "Cleared.");
    });

    ["f_name","f_headline","f_summary"].forEach(function (id) {
      el(id).addEventListener("input", preview);
    });
    el("f_headline").addEventListener("input", function () { counter("f_headline", "c_headline", 70); });
    el("f_summary").addEventListener("input", function () { counter("f_summary", "c_summary", 400); });

    fillRaceSelect("");
    setBullets(null);
    counter("f_headline", "c_headline", 70);
    counter("f_summary", "c_summary", 400);
    renderList();
    updateMeter();
    preview();
    el("boot").hidden = true;
    el("app").hidden = false;
  }

  load();
  fetch("data.json?t=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) { base = d; wire(); })
    .catch(function (e) {
      el("boot").innerHTML = '<div class="msg err"><strong>Could not load data.json.</strong><br>' +
        esc(e.message) + "<br><br>The builder must be opened over http, not from disk.</div>";
    });
})();