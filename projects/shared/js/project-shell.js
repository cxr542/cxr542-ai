(function (global) {
  "use strict";

  var cfg = {};

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function isDrawerMode() {
    return global.matchMedia("(max-width: 1024px)").matches;
  }

  function openDrawer() {
    document.body.classList.add("project-nav-open");
    var backdrop = qs("#" + (cfg.backdropId || "project-nav-backdrop"));
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.setAttribute("aria-hidden", "false");
    }
    qsa('[id="' + (cfg.navToggleId || "project-nav-toggle") + '"], .project-nav-toggle').forEach(
      function (btn) {
        btn.setAttribute("aria-expanded", "true");
      }
    );
  }

  function closeDrawer() {
    document.body.classList.remove("project-nav-open");
    var backdrop = qs("#" + (cfg.backdropId || "project-nav-backdrop"));
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    qsa('[id="' + (cfg.navToggleId || "project-nav-toggle") + '"], .project-nav-toggle').forEach(
      function (btn) {
        btn.setAttribute("aria-expanded", "false");
      }
    );
  }

  function applyCollapsed(collapsed) {
    var shell = qs("#" + (cfg.shellId || "app-shell"));
    if (shell) shell.classList.toggle("is-sidebar-collapsed", collapsed);
    document.documentElement.classList.toggle("project-sidebar-collapsed-boot", collapsed);
    var rail = qs("#" + (cfg.railToggleId || "sidebar-toggle"));
    if (rail) {
      rail.setAttribute("aria-expanded", collapsed ? "false" : "true");
      var label = collapsed ? "메뉴 펼치기" : "메뉴 접기";
      rail.setAttribute("aria-label", label);
      rail.title = label;
      var railLabel = rail.querySelector(".project-sidebar-rail__label, .sidebar-rail__label");
      if (railLabel) railLabel.textContent = collapsed ? "펼침" : "접기";
    }
    qsa(".project-nav-toggle, #" + (cfg.toolbarToggleId || "sidebar-toggle-toolbar")).forEach(
      function (btn) {
        btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      }
    );
  }

  function setActiveView(view) {
    if (!view) return;
    qsa(".project-nav-item[data-view], .nav-item[data-view]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === view);
    });
    qsa(".project-mobile-tab[data-view]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === view);
    });
  }

  function bindDrawer() {
    var toggleSel =
      cfg.navToggleSelector ||
      "#project-nav-toggle, #sidebar-toggle-toolbar, .project-nav-toggle";
    qsa(toggleSel).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!isDrawerMode()) return;
        if (document.body.classList.contains("project-nav-open")) closeDrawer();
        else openDrawer();
      });
    });
    var backdrop = qs("#" + (cfg.backdropId || "project-nav-backdrop"));
    if (backdrop) {
      backdrop.addEventListener("click", closeDrawer);
    }
    qsa(".project-nav-item[data-view], .nav-item[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (isDrawerMode()) closeDrawer();
      });
    });
    global.matchMedia("(max-width: 1024px)").addEventListener("change", function () {
      if (!isDrawerMode()) closeDrawer();
    });
  }

  function bindCollapse(storageKey) {
    var collapsed = false;
    try {
      collapsed = localStorage.getItem(storageKey) === "1";
    } catch (e) {}
    applyCollapsed(collapsed);

    function onToggle() {
      if (isDrawerMode()) {
        if (document.body.classList.contains("project-nav-open")) closeDrawer();
        else openDrawer();
        return;
      }
      var shell = qs("#" + (cfg.shellId || "app-shell"));
      collapsed = shell && shell.classList.contains("is-sidebar-collapsed");
      collapsed = !collapsed;
      try {
        localStorage.setItem(storageKey, collapsed ? "1" : "0");
      } catch (e) {}
      applyCollapsed(collapsed);
    }

    var rail = qs("#" + (cfg.railToggleId || "sidebar-toggle"));
    if (rail) rail.addEventListener("click", onToggle);
    qsa(".project-nav-toggle, #" + (cfg.toolbarToggleId || "sidebar-toggle-toolbar")).forEach(
      function (btn) {
        btn.addEventListener("click", function (e) {
          if (isDrawerMode()) return;
          onToggle();
        });
      }
    );
  }

  function bindMobileTabs() {
    qsa(".project-mobile-tab[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-view");
        if (cfg.onViewChange) cfg.onViewChange(view, { source: "mobile-tab" });
      });
    });
  }

  function init(options) {
    cfg = options || {};
    var storageKey = cfg.storageKey || "project-sidebar-collapsed";
    bindDrawer();
    bindCollapse(storageKey);
    if (cfg.mobileTabs) bindMobileTabs();
    closeDrawer();
  }

  function loadBranding(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveBranding(storageKey, data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {}
  }

  function syncBrandingUi(options, data) {
    var titleEl = qs(options.titleSelector || "#app-brand-title");
    var subEl = qs(options.subtitleSelector || "#app-brand-sub");
    var title = data.title || options.defaults.title || "";
    var subtitle = data.subtitle || options.defaults.subtitle || "";
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (options.pageTitle !== false && title) {
      document.title = title + (options.titleSuffix || "");
    }
    var banner = options.bannerBrandSelector ? qs(options.bannerBrandSelector) : null;
    if (banner && title) {
      banner.textContent =
        (options.bannerIcon ? options.bannerIcon + " " : "") + title;
    }
  }

  function beginInlineEdit(el, onCommit) {
    if (!el || el.dataset.editing === "1") return;
    el.dataset.editing = "1";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "project-brand-input";
    input.value = el.textContent;
    el.style.display = "none";
    el.parentNode.insertBefore(input, el.nextSibling);
    input.focus();
    input.select();

    function finish(save) {
      if (save) {
        var val = input.value.trim() || el.textContent;
        el.textContent = val;
        if (onCommit) onCommit(val);
      }
      input.remove();
      el.style.display = "";
      delete el.dataset.editing;
    }

    input.addEventListener("blur", function () {
      finish(true);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
  }

  function initBranding(options) {
    options = options || {};
    if (!options.storageKey) return;
    var data = loadBranding(options.storageKey);
    syncBrandingUi(options, data);

    var titleEl = qs(options.titleSelector || "#app-brand-title");
    var subEl = qs(options.subtitleSelector || "#app-brand-sub");

    function persist(field, value) {
      var next = loadBranding(options.storageKey);
      next[field] = value;
      saveBranding(options.storageKey, next);
      syncBrandingUi(options, next);
    }

    if (titleEl) {
      titleEl.classList.add("project-brand-editable");
      titleEl.setAttribute("title", "더블클릭하여 제목 수정");
      titleEl.addEventListener("dblclick", function (e) {
        e.preventDefault();
        e.stopPropagation();
        beginInlineEdit(titleEl, function (val) {
          persist("title", val);
        });
      });
    }
    if (subEl) {
      subEl.classList.add("project-brand-editable");
      subEl.setAttribute("title", "더블클릭하여 부제 수정");
      subEl.addEventListener("dblclick", function (e) {
        e.preventDefault();
        e.stopPropagation();
        beginInlineEdit(subEl, function (val) {
          persist("subtitle", val);
        });
      });
    }
  }

  function bindInlineTitles(root, selector, onSave) {
    qsa(selector, root).forEach(function (el) {
      el.classList.add("inline-title-editable");
      el.setAttribute("title", "더블클릭하여 제목 수정");
      el.addEventListener("dblclick", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var card = el.closest("[data-id]");
        if (!card) return;
        var id = card.getAttribute("data-id");
        beginInlineEdit(el, function (val) {
          if (onSave) onSave(id, val, el);
        });
      });
    });
  }

  global.ProjectShell = {
    init: init,
    setActiveView: setActiveView,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    isDrawerMode: isDrawerMode,
    initBranding: initBranding,
    bindInlineTitles: bindInlineTitles,
  };
})(window);
