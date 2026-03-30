/* ============================================================
   SherlockFit Body Oracle — script.js
   Interactive body map, case file display, personal notes,
   My Map progress, sharing, export/import
   ============================================================ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────
  var currentZone = null;
  var STORAGE_KEY = "sherlockfit_notes";
  var EXPLORED_KEY = "sherlockfit_explored";

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }
  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
  function loadExplored() {
    try { return JSON.parse(localStorage.getItem(EXPLORED_KEY)) || []; }
    catch (_) { return []; }
  }
  function saveExplored(list) {
    localStorage.setItem(EXPLORED_KEY, JSON.stringify(list));
  }

  // ── Helpers ────────────────────────────────────────────────
  function esc(str) {
    if (str == null) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }
  function $(id) { return document.getElementById(id); }

  // ── View switching ─────────────────────────────────────────
  function initViews() {
    document.querySelectorAll(".nav-btn[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = this.getAttribute("data-view");
        document.querySelectorAll(".nav-btn[data-view]").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
        var target = $("view-" + view);
        if (target) target.classList.add("active");
        if (view === "mymap") refreshMyMap();
      });
    });
  }

  // ── Region tab filtering ───────────────────────────────────
  function initRegionTabs() {
    document.querySelectorAll(".region-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".region-tab").forEach(function (t) { t.classList.remove("active"); });
        this.classList.add("active");
        var region = this.getAttribute("data-region");
        document.querySelectorAll(".body-zone").forEach(function (z) {
          if (region === "all" || z.getAttribute("data-region") === region) {
            z.classList.remove("hidden");
          } else {
            z.classList.add("hidden");
          }
        });
      });
    });
  }

  // ── Accordion ──────────────────────────────────────────────
  function initAccordion() {
    document.querySelectorAll(".accordion-header").forEach(function (header) {
      header.addEventListener("click", function () {
        var wasActive = this.classList.contains("active");
        // close all in same accordion
        var parent = this.closest(".accordion");
        if (parent) {
          parent.querySelectorAll(".accordion-header").forEach(function (h) { h.classList.remove("active"); });
          parent.querySelectorAll(".accordion-body").forEach(function (b) { b.classList.remove("open"); });
        }
        if (!wasActive) {
          this.classList.add("active");
          var body = this.parentElement.querySelector(".accordion-body");
          if (body) body.classList.add("open");
        }
      });
    });
  }

  // ── Zone click → populate case file ────────────────────────
  function initZones() {
    document.querySelectorAll(".body-zone").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = this.getAttribute("data-zone");
        selectZone(key);
      });
    });
  }

  function selectZone(key) {
    if (typeof bodyWisdom === "undefined" || !bodyWisdom[key]) return;
    currentZone = key;
    var d = bodyWisdom[key];

    // mark explored
    var explored = loadExplored();
    if (explored.indexOf(key) === -1) {
      explored.push(key);
      saveExplored(explored);
    }

    // highlight active zone
    document.querySelectorAll(".body-zone").forEach(function (b) { b.classList.remove("active"); });
    var activeBtn = document.querySelector('.body-zone[data-zone="' + key + '"]');
    if (activeBtn) activeBtn.classList.add("active");

    // show case file content
    var header = $("caseFileHeader");
    var content = $("caseFileContent");
    if (header) header.style.display = "none";
    if (content) content.style.display = "block";

    // title bar
    if ($("zoneDot")) $("zoneDot").style.background = d.chakraColor || "#4A90D9";
    if ($("zoneTitle")) $("zoneTitle").textContent = d.name || key;
    if ($("zoneAnatomy")) $("zoneAnatomy").textContent = d.anatomy || "";

    // populate sections
    populateSpiritual(d);
    populateChakra(d);
    populateTCM(d);
    populateLouiseHay(d);
    populateManlyPHall(d);
    populateGNM(d);
    populatePatterns(d);
    populateAilments(d);
    populatePlaybook(d);
    populatePersonalNotes(key);

    // pre-select zone in modal dropdown
    var sel = $("noteZoneSelect");
    if (sel) sel.value = key;

    // collapse all accordion
    document.querySelectorAll("#mainAccordion .accordion-header").forEach(function (h) { h.classList.remove("active"); });
    document.querySelectorAll("#mainAccordion .accordion-body").forEach(function (b) { b.classList.remove("open"); });

    // auto-open first section
    var first = document.querySelector("#mainAccordion .accordion-header");
    if (first) {
      first.classList.add("active");
      var fb = first.parentElement.querySelector(".accordion-body");
      if (fb) fb.classList.add("open");
    }

    // scroll case file into view on mobile
    if (window.innerWidth < 768 && content) {
      content.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ── Section builders ───────────────────────────────────────
  function row(label, value) {
    return '<div class="data-row"><span class="data-label">' + esc(label) + '</span><span class="data-value">' + esc(value) + '</span></div>';
  }
  function tags(arr) {
    if (!arr || !arr.length) return "";
    var html = '<div class="tag-list">';
    arr.forEach(function (t) { html += '<span class="tag">' + esc(t) + '</span>'; });
    return html + '</div>';
  }
  function cite(text) {
    return text ? '<p class="citation">' + esc(text) + '</p>' : "";
  }

  function populateSpiritual(d) {
    var el = $("section-spiritual");
    if (!el) return;
    el.innerHTML = '<p>' + esc(d.spiritualMeaning || "") + '</p>';
  }

  function populateChakra(d) {
    var el = $("section-chakra");
    if (!el || !d.chakra) return;
    var c = d.chakra;
    el.innerHTML =
      row("Chakra", c.name) +
      row("Element", c.element) +
      '<p class="mt-1">' + esc(c.description) + '</p>' +
      cite(c.citation);
  }

  function populateTCM(d) {
    var el = $("section-tcm");
    if (!el || !d.tcm) return;
    var t = d.tcm;
    el.innerHTML =
      '<div class="data-row"><span class="data-label">Meridians</span>' + tags(t.meridians) + '</div>' +
      '<div class="data-row"><span class="data-label">Emotions</span>' + tags(t.emotions) + '</div>' +
      row("Element", t.element) +
      row("Season", t.season) +
      row("Organ Pair", t.organ) +
      '<p class="mt-1">' + esc(t.description) + '</p>' +
      cite(t.citation);
  }

  function populateLouiseHay(d) {
    var el = $("section-louiseHay");
    if (!el || !d.louiseHay) return;
    var l = d.louiseHay;
    el.innerHTML =
      row("Probable Cause", l.probableCause) +
      row("New Thought Pattern", l.newThoughtPattern) +
      row("Emotional Pattern", l.emotionalPattern) +
      '<p class="mt-1">' + esc(l.description) + '</p>' +
      (l.affirmations && l.affirmations.length
        ? '<ul class="affirmation-list mt-1">' + l.affirmations.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("") + '</ul>'
        : "") +
      cite(l.citation);
  }

  function populateManlyPHall(d) {
    var el = $("section-manlyPHall");
    if (!el || !d.manlyPHall) return;
    var m = d.manlyPHall;
    el.innerHTML =
      row("Esoteric Significance", m.esotericSignificance) +
      row("Symbolic Meaning", m.symbolicMeaning) +
      row("Consciousness", m.consciousnessConnection) +
      cite(m.citation);
  }

  function populateGNM(d) {
    var el = $("section-gnm");
    if (!el || !d.gnm) return;
    var g = d.gnm;
    el.innerHTML =
      row("Conflict Pattern", g.conflictPattern) +
      row("Brain Relay", g.brainRelay) +
      row("Active Phase", g.activePhase) +
      row("Healing Phase", g.healingPhase) +
      row("Biological Program", g.biologicalProgram) +
      '<p class="mt-1">' + esc(g.description) + '</p>' +
      cite(g.citation);
  }

  function populatePatterns(d) {
    var el = $("section-patterns");
    if (!el) return;
    var html = "";
    if (d.weightGainPatterns) html += row("Weight Gain Pattern", d.weightGainPatterns);
    if (d.celluliteMeaning && d.celluliteMeaning !== "N/A") html += row("Cellulite Meaning", d.celluliteMeaning);
    el.innerHTML = html || '<p class="text-center" style="color:var(--sepia-light)">No additional body patterns documented for this zone.</p>';
  }

  function populateAilments(d) {
    var el = $("section-ailments");
    if (!el) return;
    if (!d.healthIssues || !d.healthIssues.length) {
      el.innerHTML = '<p class="text-center" style="color:var(--sepia-light)">No specific ailments documented for this zone.</p>';
      return;
    }
    el.innerHTML = d.healthIssues.map(function (h) {
      return '<div class="health-issue">' +
        '<h4>' + esc(h.name) + '</h4>' +
        '<p class="issue-root">' + esc(h.emotionalRoot) + '</p>' +
        '<p>' + esc(h.description) + '</p>' +
        '</div>';
    }).join("");
  }

  function populatePlaybook(d) {
    var el = $("section-playbook");
    if (!el || !d.playbook) return;
    var p = d.playbook;
    var html = '<p>' + esc(p.description) + '</p>';
    if (p.programs && p.programs.length) {
      p.programs.forEach(function (prog) {
        html += '<div class="playbook-program mt-1">' +
          '<h4>' + esc(prog.name) + '</h4>' +
          '<p>' + esc(prog.description) + '</p>' +
          '<a class="btn-playbook" href="' + esc(prog.url) + '" target="_blank" rel="noopener"><i class="fas fa-dumbbell"></i> View Program</a>' +
          '</div>';
      });
    }
    // affirmations from zone level
    if (d.affirmations && d.affirmations.length) {
      html += '<h4 class="mt-2" style="font-family:Playfair Display,serif">Affirmations</h4>';
      html += '<ul class="affirmation-list">' + d.affirmations.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("") + '</ul>';
    }
    el.innerHTML = html;
  }

  // ── Personal notes ─────────────────────────────────────────
  function populatePersonalNotes(key) {
    var section = $("personalNotesSection");
    var el = $("section-notes");
    if (!el || !section) return;
    var notes = loadNotes();
    var zoneNotes = notes[key] || [];
    if (zoneNotes.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    el.innerHTML = zoneNotes.map(function (n, i) {
      return '<div class="personal-note">' +
        '<div class="note-meta"><span class="note-type-badge">' + esc(n.type) + '</span> ' + esc(n.date) +
        ' <button class="btn-sm btn-secondary" data-delete-note="' + i + '" style="float:right;font-size:0.7rem"><i class="fas fa-trash"></i></button></div>' +
        '<p>' + esc(n.text) + '</p>' +
        '</div>';
    }).join("");

    // delete buttons
    el.querySelectorAll("[data-delete-note]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-delete-note"), 10);
        var all = loadNotes();
        if (all[key]) {
          all[key].splice(idx, 1);
          saveNotes(all);
          populatePersonalNotes(key);
        }
      });
    });
  }

  // ── Case note modal ────────────────────────────────────────
  function initModal() {
    var modal = $("caseNoteModal");
    if (!modal) return;

    // populate zone dropdown
    var sel = $("noteZoneSelect");
    if (sel && typeof bodyWisdom !== "undefined") {
      sel.innerHTML = "";
      Object.keys(bodyWisdom).forEach(function (k) {
        var opt = document.createElement("option");
        opt.value = k;
        opt.textContent = bodyWisdom[k].name || k;
        sel.appendChild(opt);
      });
    }

    function openModal() { modal.classList.add("open"); if (currentZone && sel) sel.value = currentZone; }
    function closeModal() { modal.classList.remove("open"); }

    var addBtn = $("addNoteBtn");
    if (addBtn) addBtn.addEventListener("click", openModal);
    var closeBtn = $("modalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    var cancelBtn = $("cancelNoteBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    // close on overlay click
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    var saveBtn = $("saveNoteBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var zone = sel ? sel.value : currentZone;
        var type = $("noteTypeSelect") ? $("noteTypeSelect").value : "observation";
        var text = $("noteText") ? $("noteText").value.trim() : "";
        if (!text || !zone) return;

        var notes = loadNotes();
        if (!notes[zone]) notes[zone] = [];
        notes[zone].push({
          type: type,
          text: text,
          date: new Date().toLocaleDateString()
        });
        saveNotes(notes);
        if ($("noteText")) $("noteText").value = "";
        closeModal();
        if (currentZone === zone) populatePersonalNotes(zone);
      });
    }
  }

  // ── Share buttons ──────────────────────────────────────────
  function initShare() {
    var twitterBtn = $("shareTwitter");
    var fbBtn = $("shareFacebook");
    var copyBtn = $("shareCopy");
    var shareBtn = $("shareBtn");

    function shareUrl() {
      var url = window.location.href.split("?")[0];
      return currentZone ? url + "?zone=" + encodeURIComponent(currentZone) : url;
    }
    function shareText() {
      if (!currentZone || typeof bodyWisdom === "undefined") return "SherlockFit Body Oracle — Beyond Elementary";
      var d = bodyWisdom[currentZone];
      return "Investigating " + (d ? d.name : currentZone) + " — SherlockFit Body Oracle";
    }

    if (twitterBtn) {
      twitterBtn.addEventListener("click", function () {
        window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText()) + "&url=" + encodeURIComponent(shareUrl()), "_blank", "noopener");
      });
    }
    if (fbBtn) {
      fbBtn.addEventListener("click", function () {
        window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl()), "_blank", "noopener");
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl()).then(function () {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(function () { copyBtn.innerHTML = '<i class="fas fa-link"></i> Copy Link'; }, 2000);
          });
        }
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        if (navigator.share) {
          navigator.share({ title: shareText(), url: shareUrl() });
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl());
        }
      });
    }
  }

  // ── My Map view ────────────────────────────────────────────
  function refreshMyMap() {
    if (typeof bodyWisdom === "undefined") return;
    var grid = $("zoneGrid");
    if (!grid) return;

    var explored = loadExplored();
    var notes = loadNotes();
    var keys = Object.keys(bodyWisdom);
    var total = keys.length;

    // progress bar
    if ($("progressCount")) $("progressCount").textContent = explored.length + " of " + total;
    if ($("progressFill")) $("progressFill").style.width = (total ? (explored.length / total * 100) : 0) + "%";

    // zone cards
    grid.innerHTML = keys.map(function (k) {
      var d = bodyWisdom[k];
      var isExplored = explored.indexOf(k) !== -1;
      var hasNotes = notes[k] && notes[k].length > 0;
      var cls = "zone-card" + (isExplored ? " explored" : "") + (hasNotes ? " has-notes" : "");
      var status = hasNotes ? (notes[k].length + " note" + (notes[k].length > 1 ? "s" : "")) : (isExplored ? "Explored" : "Not explored");
      return '<div class="' + cls + '" data-zone-card="' + k + '">' +
        '<div class="zone-card-dot" style="background:' + esc(d.chakraColor || "#4A90D9") + '"></div>' +
        '<div class="zone-card-name">' + esc(d.name || k) + '</div>' +
        '<div class="zone-card-status">' + esc(status) + '</div>' +
        '</div>';
    }).join("");

    // click zone card → switch to oracle view and select
    grid.querySelectorAll("[data-zone-card]").forEach(function (card) {
      card.addEventListener("click", function () {
        var key = this.getAttribute("data-zone-card");
        // switch to oracle view
        document.querySelectorAll(".nav-btn[data-view]").forEach(function (b) { b.classList.remove("active"); });
        var oracleBtn = document.querySelector('.nav-btn[data-view="oracle"]');
        if (oracleBtn) oracleBtn.classList.add("active");
        document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
        var oracleView = $("view-oracle");
        if (oracleView) oracleView.classList.add("active");
        selectZone(key);
      });
    });
  }

  // ── Export / Import / Clear ────────────────────────────────
  function initMapActions() {
    var exportBtn = $("exportMapBtn");
    var importBtn = $("importMapBtn");
    var clearBtn = $("clearMapBtn");
    var fileInput = $("importFileInput");

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var data = {
          notes: loadNotes(),
          explored: loadExplored(),
          exportDate: new Date().toISOString()
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "sherlockfit-map-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (importBtn && fileInput) {
      importBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var data = JSON.parse(e.target.result);
            if (data.notes) saveNotes(data.notes);
            if (data.explored) saveExplored(data.explored);
            refreshMyMap();
          } catch (_) {
            // silently ignore malformed files
          }
        };
        reader.readAsText(file);
        this.value = "";
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (confirm("Clear all notes and progress? This cannot be undone.")) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(EXPLORED_KEY);
          refreshMyMap();
        }
      });
    }
  }

  // ── Deep link support ──────────────────────────────────────
  function checkDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var zone = params.get("zone");
    if (zone && typeof bodyWisdom !== "undefined" && bodyWisdom[zone]) {
      selectZone(zone);
    }
  }

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initViews();
    initRegionTabs();
    initAccordion();
    initZones();
    initModal();
    initShare();
    initMapActions();
    checkDeepLink();
  });
})();