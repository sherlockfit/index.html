/* ============================================================
   SherlockFit Body Oracle — auth.js
   Local account system (no backend). Passwords are hashed with
   PBKDF2-SHA256 (WebCrypto) and stored in localStorage alongside
   a per-user random salt. Sessions are kept in sessionStorage so
   closing the browser signs the user out by default; an optional
   "remember me" promotes the session to localStorage.

   Data keys used by the rest of the app are namespaced per user
   so one device can support multiple accounts without bleed-over.

   Public API (window.SFAuth):
     isSignedIn()            -> boolean
     currentUser()           -> string | null (username)
     requireAuth(reason, cb) -> opens modal; invokes cb() once signed in
     signOut()
     onChange(fn)            -> subscribe to auth-state changes
     userKey(baseKey)        -> namespaced storage key for the current user
   ============================================================ */

(function () {
  "use strict";

  var USERS_KEY = "sherlockfit_users";
  var SESSION_KEY = "sherlockfit_session";
  var PBKDF2_ITERATIONS = 150000;
  var SALT_BYTES = 16;
  var HASH_BYTES = 32;

  var listeners = [];
  var pendingAction = null; // callback to run once the user successfully signs in

  // ── Storage helpers ────────────────────────────────────────
  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSession(session, remember) {
    var raw = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(SESSION_KEY, raw);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, raw);
      localStorage.removeItem(SESSION_KEY);
    }
  }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  // ── Base64 helpers (binary-safe) ───────────────────────────
  function bytesToBase64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ── Password hashing (PBKDF2-SHA256 via WebCrypto) ─────────
  function hashPassword(password, saltBytes) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error("This browser does not support secure password hashing. Please use a modern browser."));
    }
    var enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    ).then(function (key) {
      return window.crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
        key, HASH_BYTES * 8
      );
    }).then(function (bits) {
      return new Uint8Array(bits);
    });
  }

  function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    var r = 0;
    for (var i = 0; i < a.length; i++) r |= a[i] ^ b[i];
    return r === 0;
  }

  // ── Notify ─────────────────────────────────────────────────
  function notify() {
    var user = currentUser();
    listeners.forEach(function (fn) {
      try { fn(user); } catch (e) { console.warn("auth listener failed:", e); }
    });
  }

  // ── Public state ───────────────────────────────────────────
  function currentUser() {
    var s = loadSession();
    return s && s.username ? s.username : null;
  }
  function isSignedIn() { return !!currentUser(); }
  function userKey(baseKey) {
    var u = currentUser();
    return u ? baseKey + "_" + u : baseKey;
  }

  // ── Sign up / in / out ─────────────────────────────────────
  function validateUsername(u) {
    if (!u || u.length < 3) return "Username must be at least 3 characters.";
    if (u.length > 40) return "Username is too long.";
    if (!/^[A-Za-z0-9._-]+$/.test(u)) return "Username may only contain letters, numbers, dots, underscores, or hyphens.";
    return null;
  }
  function validatePassword(p) {
    if (!p || p.length < 8) return "Password must be at least 8 characters.";
    if (p.length > 200) return "Password is too long.";
    return null;
  }

  function signUp(username, password, remember) {
    username = (username || "").trim().toLowerCase();
    var uErr = validateUsername(username);
    if (uErr) return Promise.reject(new Error(uErr));
    var pErr = validatePassword(password);
    if (pErr) return Promise.reject(new Error(pErr));

    var users = loadUsers();
    if (users[username]) return Promise.reject(new Error("That username is already taken. Try signing in instead."));

    var salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    return hashPassword(password, salt).then(function (hash) {
      users[username] = {
        salt: bytesToBase64(salt),
        hash: bytesToBase64(hash),
        iterations: PBKDF2_ITERATIONS,
        createdAt: new Date().toISOString()
      };
      saveUsers(users);

      // Migrate any device-local (pre-account) data into this first account,
      // so the user's previous notes follow them into their new account.
      migrateLegacyData(username);

      saveSession({ username: username, signedInAt: Date.now() }, !!remember);
      notify();
      return username;
    });
  }

  function signIn(username, password, remember) {
    username = (username || "").trim().toLowerCase();
    if (!username || !password) return Promise.reject(new Error("Please enter your username and password."));

    var users = loadUsers();
    var record = users[username];
    if (!record) return Promise.reject(new Error("No account found with that username."));

    var saltBytes = base64ToBytes(record.salt);
    return hashPassword(password, saltBytes).then(function (hash) {
      var stored = base64ToBytes(record.hash);
      if (!constantTimeEqual(hash, stored)) {
        throw new Error("Incorrect password. Please try again.");
      }
      saveSession({ username: username, signedInAt: Date.now() }, !!remember);
      notify();
      return username;
    });
  }

  function signOut() {
    clearSession();
    notify();
  }

  // ── Legacy data migration ──────────────────────────────────
  // If the user has existing data saved under the old un-namespaced
  // keys (from before accounts existed), migrate it into their first
  // account on sign-up so nothing is lost.
  function migrateLegacyData(username) {
    var legacyMap = {
      "sherlockfit_notes": "sherlockfit_notes_" + username,
      "sherlockfit_explored": "sherlockfit_explored_" + username
    };
    Object.keys(legacyMap).forEach(function (legacy) {
      var value = localStorage.getItem(legacy);
      if (value === null) return;
      // Only migrate if the target slot is empty (don't clobber a returning user).
      if (localStorage.getItem(legacyMap[legacy]) === null) {
        localStorage.setItem(legacyMap[legacy], value);
      }
      localStorage.removeItem(legacy);
    });
  }

  // ── Subscribers ────────────────────────────────────────────
  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  // ── requireAuth ────────────────────────────────────────────
  function requireAuth(reason, cb) {
    if (isSignedIn()) { if (typeof cb === "function") cb(); return; }
    pendingAction = typeof cb === "function" ? cb : null;
    openModal(reason);
  }

  // ── Modal UI ───────────────────────────────────────────────
  function esc(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function buildModal() {
    if (document.getElementById("authModal")) return;
    var modal = document.createElement("div");
    modal.className = "modal-overlay auth-modal";
    modal.id = "authModal";
    modal.innerHTML =
      '<div class="modal-box">' +
        '<div class="modal-header">' +
          '<h3><i class="fas fa-user-shield"></i> <span id="authModalTitle">Sign in to continue</span></h3>' +
          '<button class="modal-close" id="authModalClose" aria-label="Close"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p class="auth-reason" id="authReason"></p>' +
          '<div class="auth-tabs" role="tablist">' +
            '<button class="auth-tab active" data-auth-tab="signin" role="tab">Sign In</button>' +
            '<button class="auth-tab" data-auth-tab="signup" role="tab">Create Account</button>' +
          '</div>' +
          '<form id="authForm" autocomplete="on" novalidate>' +
            '<label for="authUsername">Username</label>' +
            '<input type="text" id="authUsername" class="modal-input" autocomplete="username" autocapitalize="none" spellcheck="false" required>' +
            '<label for="authPassword">Password</label>' +
            '<input type="password" id="authPassword" class="modal-input" autocomplete="current-password" required minlength="8">' +
            '<label class="auth-remember"><input type="checkbox" id="authRemember"> Keep me signed in on this device</label>' +
            '<p class="auth-error" id="authError" role="alert"></p>' +
            '<div class="modal-actions">' +
              '<button type="submit" class="btn btn-primary" id="authSubmit">Sign In</button>' +
              '<button type="button" class="btn btn-secondary" id="authCancel">Cancel</button>' +
            '</div>' +
            '<p class="auth-note">Accounts are stored locally on this device. Your notes stay with the account that created them.</p>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    wireModal(modal);
  }

  function wireModal(modal) {
    var tabs = modal.querySelectorAll(".auth-tab");
    var title = modal.querySelector("#authModalTitle");
    var submit = modal.querySelector("#authSubmit");
    var pwd = modal.querySelector("#authPassword");
    var err = modal.querySelector("#authError");
    var form = modal.querySelector("#authForm");
    var mode = "signin";

    function setMode(next) {
      mode = next;
      tabs.forEach(function (t) {
        t.classList.toggle("active", t.getAttribute("data-auth-tab") === next);
      });
      if (next === "signup") {
        title.textContent = "Create your account";
        submit.textContent = "Create Account";
        pwd.setAttribute("autocomplete", "new-password");
      } else {
        title.textContent = "Sign in to continue";
        submit.textContent = "Sign In";
        pwd.setAttribute("autocomplete", "current-password");
      }
      err.textContent = "";
    }

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { setMode(this.getAttribute("data-auth-tab")); });
    });

    modal.querySelector("#authModalClose").addEventListener("click", closeModal);
    modal.querySelector("#authCancel").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.textContent = "";
      submit.disabled = true;
      var originalLabel = submit.textContent;
      submit.textContent = "Working…";

      var username = modal.querySelector("#authUsername").value;
      var password = modal.querySelector("#authPassword").value;
      var remember = modal.querySelector("#authRemember").checked;

      var op = mode === "signup" ? signUp(username, password, remember) : signIn(username, password, remember);

      op.then(function () {
        submit.disabled = false;
        submit.textContent = originalLabel;
        var cb = pendingAction;
        pendingAction = null;
        closeModal();
        if (cb) { try { cb(); } catch (ex) { console.warn(ex); } }
      }).catch(function (ex) {
        submit.disabled = false;
        submit.textContent = originalLabel;
        err.textContent = ex && ex.message ? ex.message : "Something went wrong.";
      });
    });

    // expose a reset when opened
    modal._setMode = setMode;
  }

  function openModal(reason) {
    buildModal();
    var modal = document.getElementById("authModal");
    var reasonEl = modal.querySelector("#authReason");
    reasonEl.textContent = reason || "An account lets you build, save, and export your personal Body Map.";
    var users = loadUsers();
    // Default to "Create Account" when there are no accounts on this device.
    if (modal._setMode) modal._setMode(Object.keys(users).length === 0 ? "signup" : "signin");
    modal.querySelector("#authError").textContent = "";
    modal.classList.add("open");
    setTimeout(function () {
      var u = modal.querySelector("#authUsername");
      if (u) u.focus();
    }, 10);
  }

  function closeModal() {
    var modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("open");
    pendingAction = null;
  }

  // ── Expose ─────────────────────────────────────────────────
  window.SFAuth = {
    isSignedIn: isSignedIn,
    currentUser: currentUser,
    requireAuth: requireAuth,
    signOut: signOut,
    onChange: onChange,
    userKey: userKey,
    openSignIn: function (reason) { pendingAction = null; openModal(reason); }
  };
})();
