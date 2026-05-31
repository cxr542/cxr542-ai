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

  global.ProjectShell = {
    init: init,
    setActiveView: setActiveView,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    isDrawerMode: isDrawerMode,
  };
})(window);
