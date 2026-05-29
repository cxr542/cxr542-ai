(function () {
  "use strict";

  var NAV_LABELS_KEY = "cxr542-hub-nav-labels";
  var CATEGORY_OVERRIDES_KEY = "cxr542-hub-category-overrides";
  var CATEGORY_EDIT_KEY = "cxr542-hub-category-edit";
  var VISIBILITY_KEY = "cxr542-hub-visibility";

  var statusLabels = {
    learning: "학습 중",
    demo: "데모",
    planned: "예정",
    local: "로컬",
    idea: "아이디어",
    wip: "진행 중",
  };

  var categoryIds = ["work", "study", "hobby", "ideas"];
  var systemViews = ["guide", "resources"];
  var navLabelKeys = ["work", "study", "hobby", "ideas", "guide", "resources"];

  var state = {
    catalogItems: [],
    items: [],
    categories: [],
    navLabels: {},
    navDefaults: {},
    resources: [],
    fileCategoryOverrides: {},
    localCategoryOverrides: {},
    baseCategories: {},
    categoryEditMode: false,
    hiddenItemIds: [],
    hiddenNavIds: [],
    fileHiddenItemIds: [],
    fileHiddenNavIds: [],
    route: { view: "work", itemId: "", panel: "intro" },
    searchQuery: "",
    profileUrl: "https://cxr542.github.io/",
    updated: "",
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function effectiveCategory(item) {
    return state.localCategoryOverrides[item.id] || item.category;
  }

  function loadVisibilityStore() {
    var stored = loadJson(VISIBILITY_KEY, null);
    if (stored && typeof stored === "object") {
      return {
        hiddenItems: stored.hiddenItems || [],
        hiddenNav: stored.hiddenNav || [],
      };
    }
    return { hiddenItems: [], hiddenNav: [] };
  }

  function saveVisibilityStore() {
    localStorage.setItem(
      VISIBILITY_KEY,
      JSON.stringify({
        hiddenItems: state.hiddenItemIds,
        hiddenNav: state.hiddenNavIds,
      })
    );
  }

  function mergeVisibilityFromFile(data) {
    var local = loadVisibilityStore();
    var fileItems = (data && data.hiddenItems) || state.fileHiddenItemIds || [];
    var fileNav = (data && data.hiddenNav) || state.fileHiddenNavIds || [];
    var set = new Set(fileItems.concat(local.hiddenItems));
    state.hiddenItemIds = [...set];
    var navSet = new Set(fileNav.concat(local.hiddenNav));
    state.hiddenNavIds = [...navSet];
  }

  function isItemHidden(id) {
    return state.hiddenItemIds.indexOf(id) !== -1;
  }

  function isNavHidden(id) {
    return state.hiddenNavIds.indexOf(id) !== -1;
  }

  function hideItem(id) {
    if (!id || isItemHidden(id)) return;
    state.hiddenItemIds.push(id);
    saveVisibilityStore();
    applyItemCategories();
  }

  function restoreItem(id) {
    state.hiddenItemIds = state.hiddenItemIds.filter(function (x) {
      return x !== id;
    });
    saveVisibilityStore();
    applyItemCategories();
  }

  function hideNav(id) {
    if (!id || isNavHidden(id)) return;
    state.hiddenNavIds.push(id);
    saveVisibilityStore();
  }

  function restoreNav(id) {
    state.hiddenNavIds = state.hiddenNavIds.filter(function (x) {
      return x !== id;
    });
    saveVisibilityStore();
  }

  function applyItemCategories() {
    state.items = state.catalogItems
      .map(function (item) {
        return Object.assign({}, item, { category: effectiveCategory(item) });
      })
      .filter(function (item) {
        return !isItemHidden(item.id);
      });
  }

  function firstVisibleCategoryId() {
    var id = categoryIds.find(function (cid) {
      return !isNavHidden(cid) && countCategory(cid) > 0;
    });
    if (id) return id;
    return categoryIds.find(function (cid) {
      return !isNavHidden(cid);
    });
  }

  function firstVisibleSystemView() {
    return systemViews.find(function (id) {
      return !isNavHidden(id);
    });
  }

  function getNavLabel(key) {
    return state.navLabels[key] || state.navDefaults[key] || key;
  }

  function countCategory(catId) {
    return state.items.filter(function (i) {
      return i.category === catId;
    }).length;
  }

  function itemsForView(view) {
    if (systemViews.indexOf(view) !== -1) return [];
    return state.items.filter(function (i) {
      return i.category === view;
    });
  }

  function findItem(id) {
    return state.items.find(function (i) {
      return i.id === id;
    });
  }

  function parseHash() {
    var hash = (location.hash || "").replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    if (!parts.length) return null;
    var view = parts[0];
    var itemId = parts[1] || "";
    var panel = parts[2] === "app" ? "app" : "intro";
    return { view: view, itemId: itemId, panel: panel };
  }

  function setHash() {
    var r = state.route;
    var path = r.view;
    if (itemIdForRoute(r)) path += "/" + r.itemId;
    if (r.panel === "app" && itemIdForRoute(r)) path += "/app";
    location.hash = "#/" + path;
  }

  function itemIdForRoute(r) {
    return (
      r.itemId &&
      categoryIds.indexOf(r.view) !== -1 &&
      systemViews.indexOf(r.view) === -1
    );
  }

  function defaultRoute() {
    return {
      view: firstVisibleCategoryId() || "work",
      itemId: "",
      panel: "intro",
    };
  }

  function ensureValidRoute() {
    var r = state.route;
    if (systemViews.indexOf(r.view) !== -1) {
      r.itemId = "";
      r.panel = "intro";
      return;
    }
    if (isNavHidden(r.view)) {
      var next = firstVisibleCategoryId() || firstVisibleSystemView() || "work";
      r.view = next;
      r.itemId = "";
      r.panel = "intro";
    }
    if (categoryIds.indexOf(r.view) === -1 && systemViews.indexOf(r.view) === -1) {
      state.route = defaultRoute();
      return;
    }
    var items = itemsForView(r.view);
    if (!items.length) {
      r.itemId = "";
      return;
    }
    if (!r.itemId || !findItem(r.itemId)) {
      r.itemId = items[0].id;
    }
    if (r.panel === "app") {
      var it = findItem(r.itemId);
      if (!it || !it.primaryAppUrl) r.panel = "intro";
    }
  }

  function renderSidebar() {
    var el = document.getElementById("hub-sidebar");
    if (!el) return;

    var html =
      '<div class="hub-sidebar__logo">' +
      "<h1>cxr542-hub</h1>" +
      "<p>Personal portal</p>" +
      "</div>" +
      '<p class="hub-nav-label">카테고리</p>';

    categoryIds.forEach(function (catId) {
      if (isNavHidden(catId)) return;
      var cat = state.categories.find(function (c) {
        return c.id === catId;
      });
      var label = getNavLabel(catId) || (cat && cat.label) || catId;
      html +=
        '<button type="button" class="hub-nav-item' +
        (state.route.view === catId ? " is-active" : "") +
        '" data-view="' +
        escapeHtml(catId) +
        '"><span>' +
        escapeHtml(label) +
        '</span><span class="hub-nav-item__badge">' +
        countCategory(catId) +
        "</span></button>";
    });

    html += '<p class="hub-nav-label">기타</p>';
    ["guide", "resources"].forEach(function (id) {
      if (isNavHidden(id)) return;
      html +=
        '<button type="button" class="hub-nav-item' +
        (state.route.view === id ? " is-active" : "") +
        '" data-view="' +
        id +
        '"><span>' +
        escapeHtml(getNavLabel(id)) +
        "</span></button>";
    });

    html +=
      '<div class="hub-sidebar__footer">' +
      '<button type="button" class="btn btn--ghost" id="hub-nav-labels-open" style="width:100%">사이드바 메뉴 설정</button>' +
      '<button type="button" class="btn btn--ghost" id="hub-hidden-restore-open" style="width:100%">숨긴 항목 복구</button>' +
      '<a class="btn btn--ghost" href="' +
      escapeHtml(state.profileUrl) +
      '" rel="noopener noreferrer" style="text-align:center">' +
      escapeHtml(getNavLabel("profile")) +
      "</a>" +
      "</div>";

    el.innerHTML = html;

    el.querySelectorAll(".hub-nav-item[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.route.view = btn.getAttribute("data-view");
        var items = itemsForView(state.route.view);
        state.route.itemId = items.length ? items[0].id : "";
        state.route.panel = "intro";
        ensureValidRoute();
        setHash();
        renderAll();
      });
    });

    var openLabels = document.getElementById("hub-nav-labels-open");
    if (openLabels) {
      openLabels.addEventListener("click", openNavLabelsModal);
    }
    var openRestore = document.getElementById("hub-hidden-restore-open");
    if (openRestore) {
      openRestore.addEventListener("click", openHiddenRestoreModal);
    }
  }

  function renderItemTabs() {
    var nav = document.getElementById("hub-item-tabs");
    if (!nav) return;

    if (systemViews.indexOf(state.route.view) !== -1) {
      nav.hidden = true;
      return;
    }

    var items = itemsForView(state.route.view).filter(matchesSearch);
    if (!items.length) {
      nav.hidden = true;
      return;
    }

    nav.hidden = false;
    nav.classList.toggle("hub-item-tabs--manage", state.categoryEditMode);
    nav.innerHTML = items
      .map(function (it) {
        var active = state.route.itemId === it.id;
        var removeBtn = state.categoryEditMode
          ? '<button type="button" class="hub-item-tab__remove" data-remove-item="' +
            escapeHtml(it.id) +
            '" aria-label="' +
            escapeHtml(it.title) +
            ' 숨기기" title="목록에서 숨기기">×</button>'
          : "";
        var catSelect = state.categoryEditMode
          ? '<select class="hub-cat-select" data-cat-item="' +
            escapeHtml(it.id) +
            '">' +
            categoryIds
              .map(function (cid) {
                return (
                  '<option value="' +
                  cid +
                  '"' +
                  (it.category === cid ? " selected" : "") +
                  ">" +
                  escapeHtml(getNavLabel(cid)) +
                  "</option>"
                );
              })
              .join("") +
            "</select>"
          : "";
        return (
          '<span class="hub-item-tab-chip' +
          (active ? " is-active" : "") +
          '">' +
          removeBtn +
          catSelect +
          '<button type="button" class="hub-item-tab" data-item-id="' +
          escapeHtml(it.id) +
          '">' +
          escapeHtml(it.title) +
          "</button></span>"
        );
      })
      .join("");

    nav.querySelectorAll(".hub-item-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.route.itemId = btn.getAttribute("data-item-id");
        state.route.panel = "intro";
        setHash();
        renderAll();
      });
    });

    nav.querySelectorAll(".hub-item-tab__remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-remove-item");
        if (!id) return;
        var hiddenTarget = state.catalogItems.find(function (i) {
          return i.id === id;
        });
        if (
          !window.confirm(
            "「" +
              (hiddenTarget ? hiddenTarget.title : id) +
              "」을 목록에서 숨길까요? (복구: 사이드바 → 숨긴 항목 복구)"
          )
        ) {
          return;
        }
        hideItem(id);
        ensureValidRoute();
        setHash();
        renderAll();
      });
    });

    nav.querySelectorAll(".hub-cat-select").forEach(function (sel) {
      sel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-cat-item");
        var val = sel.value;
        var base = state.baseCategories[id];
        if (val === base) delete state.localCategoryOverrides[id];
        else state.localCategoryOverrides[id] = val;
        localStorage.setItem(
          CATEGORY_OVERRIDES_KEY,
          JSON.stringify(state.localCategoryOverrides)
        );
        applyItemCategories();
        ensureValidRoute();
        renderAll();
      });
    });
  }

  function renderPanelTabs(item) {
    var nav = document.getElementById("hub-panel-tabs");
    if (!nav) return;

    if (systemViews.indexOf(state.route.view) !== -1 || !item) {
      nav.hidden = true;
      return;
    }

    nav.hidden = false;
    var appBtn = nav.querySelector('[data-panel="app"]');
    var hasApp = !!(item && item.primaryAppUrl && item.embedAllowed !== false);
    appBtn.disabled = !hasApp;

    nav.querySelectorAll(".hub-panel-tab").forEach(function (btn) {
      var panel = btn.getAttribute("data-panel");
      btn.classList.toggle("is-active", state.route.panel === panel);
      btn.onclick = function () {
        if (btn.disabled) return;
        state.route.panel = panel;
        setHash();
        renderPanel();
        renderPanelTabs(item);
      };
    });
  }

  function matchesSearch(item) {
    if (!state.searchQuery) return true;
    var q = state.searchQuery;
    var hay =
      (item.title || "") +
      " " +
      (item.summary || "") +
      " " +
      (item.nextAction || "") +
      " " +
      (item.tags || []).join(" ");
    return hay.toLowerCase().indexOf(q) !== -1;
  }

  function renderGuide() {
    return (
      '<h2>' +
      escapeHtml(getNavLabel("guide")) +
      "</h2>" +
      '<p class="hub-summary">안티그래비티·Cursor 팀 워크플로 — plan.md, 5단계 파이프라인.</p>' +
      '<div class="vibe-guide__grid">' +
      '<figure class="vibe-guide__figure"><img src="assets/vibe/zero-g-overview.png" alt="Zero-G 가이드 개요" width="1200" height="675" loading="lazy" /><figcaption>전체 가이드</figcaption></figure>' +
      '<figure class="vibe-guide__figure"><img src="assets/vibe/zero-g-steps.png" alt="Zero-G 단계별" width="1200" height="675" loading="lazy" /><figcaption>단계별 실전</figcaption></figure>' +
      "</div>" +
      '<p class="hub-summary"><a href="assets/vibe/README.md">assets/vibe 안내</a></p>'
    );
  }

  function renderResources() {
    var list = (state.resources || [])
      .map(function (r) {
        return (
          '<li><a href="' +
          escapeHtml(r.url) +
          '" rel="noopener noreferrer">' +
          escapeHtml(r.label) +
          "</a></li>"
        );
      })
      .join("");
    return (
      "<h2>" +
      escapeHtml(getNavLabel("resources")) +
      '</h2><ul class="hub-link-list">' +
      list +
      "</ul>"
    );
  }

  function introPanelHtml(item) {
    var status = statusLabels[item.status] || item.status;
    var tags = (item.tags || [])
      .map(function (t) {
        return '<span class="hub-pill">' + escapeHtml(t) + "</span>";
      })
      .join("");

    var html =
      "<h2>" +
      escapeHtml(item.title) +
      "</h2>" +
      '<div class="hub-meta-row">' +
      '<span class="hub-pill hub-pill--' +
      escapeHtml(item.category) +
      '">' +
      escapeHtml(getNavLabel(item.category)) +
      "</span>" +
      '<span class="hub-pill">' +
      escapeHtml(status) +
      "</span>" +
      tags +
      "</div>" +
      '<p class="hub-summary">' +
      escapeHtml(item.summary) +
      "</p>";

    if (item.nextAction) {
      html +=
        '<p class="hub-summary"><em>다음: ' +
        escapeHtml(item.nextAction) +
        "</em></p>";
    }

    if (item.introUrl) {
      html +=
        '<div class="hub-intro-frame"><iframe src="' +
        escapeHtml(item.introUrl) +
        '" title="' +
        escapeHtml(item.title) +
        ' 소개" loading="lazy"></iframe></div>';
    }

    if (state.categoryEditMode) {
      html +=
        '<p style="margin:0 0 1rem"><button type="button" class="btn btn--ghost" id="hub-hide-current-item">이 항목 숨기기</button></p>';
    }

    html += '<div class="hub-repo-footer">';
    if (item.repoUrl) {
      html +=
        "<p><strong>GitHub (Repo)</strong></p>" +
        '<p><a href="' +
        escapeHtml(item.repoUrl) +
        '" rel="noopener noreferrer">' +
        escapeHtml(item.repoUrl) +
        "</a></p>";
    } else {
      html += "<p><strong>GitHub (Repo)</strong></p><p class=\"hub-summary\">등록된 Repo 링크가 없습니다.</p>";
    }
    html += "</div>";

    return html;
  }

  function appPanelHtml(item) {
    var html = "<h2>" + escapeHtml(item.title) + " — 접속</h2>";

    if (!item.primaryAppUrl) {
      html += '<p class="hub-empty">접속 URL이 없습니다. 소개 탭을 확인하세요.</p>';
      return html;
    }

    html +=
      '<div class="hub-app-frame" id="hub-app-frame">' +
      '<div class="hub-app-frame__bar">' +
      escapeHtml(item.primaryAppUrl) +
      ' · <a href="' +
      escapeHtml(item.primaryAppUrl) +
      '" target="_blank" rel="noopener">새 탭</a></div>' +
      '<iframe id="hub-app-iframe" src="' +
      escapeHtml(item.primaryAppUrl) +
      '" title="' +
      escapeHtml(item.title) +
      '"></iframe>' +
      "</div>" +
      '<p class="hub-summary" id="hub-app-fallback" hidden>iframe에 표시되지 않으면 아래 링크를 사용하세요.</p>';

    var links = item.appUrls || [];
    if (links.length) {
      html +=
        '<ul class="hub-link-list">' +
        links
          .map(function (l) {
            return (
              "<li><a href=\"" +
              escapeHtml(l.url) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(l.label) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    return html;
  }

  function renderPanel() {
    var body = document.getElementById("hub-panel-body");
    var hint = document.getElementById("hub-route-hint");
    if (!body) return;

    ensureValidRoute();
    var r = state.route;
    var hashPath = "#/" + r.view;
    if (itemIdForRoute(r)) hashPath += "/" + r.itemId + (r.panel === "app" ? "/app" : "");
    if (hint) hint.textContent = hashPath;

    if (r.view === "guide") {
      body.innerHTML = renderGuide();
      return;
    }
    if (r.view === "resources") {
      body.innerHTML = renderResources();
      return;
    }

    var items = itemsForView(r.view).filter(matchesSearch);
    var item = findItem(r.itemId) || items[0];
    if (!item) {
      body.innerHTML = '<p class="hub-empty">이 카테고리에 항목이 없습니다.</p>';
      return;
    }
    r.itemId = item.id;

    renderPanelTabs(item);

    if (r.panel === "app") {
      body.innerHTML = appPanelHtml(item);
      setupIframeFallback();
      return;
    }

    body.innerHTML = introPanelHtml(item);
    var hideBtn = document.getElementById("hub-hide-current-item");
    if (hideBtn) {
      hideBtn.addEventListener("click", function () {
        if (!window.confirm("이 항목을 목록에서 숨길까요?")) return;
        hideItem(item.id);
        ensureValidRoute();
        setHash();
        renderAll();
      });
    }
  }

  function setupIframeFallback() {
    var iframe = document.getElementById("hub-app-iframe");
    var fallback = document.getElementById("hub-app-fallback");
    if (!iframe || !fallback) return;
    var shown = false;
    function showFallback() {
      if (shown) return;
      shown = true;
      fallback.hidden = false;
    }
    iframe.addEventListener("error", showFallback);
    setTimeout(showFallback, 4500);
  }

  function renderAll() {
    renderSidebar();
    renderItemTabs();
    renderPanel();
  }

  function openNavLabelsModal() {
    var modal = document.getElementById("nav-labels-modal");
    var form = document.getElementById("nav-labels-form");
    if (!modal || !form) return;

    form.innerHTML = navLabelKeys
      .map(function (key) {
        var hideName = "hide_" + key;
        return (
          '<div class="hub-modal-field">' +
          "<span>" +
          escapeHtml(key) +
          "</span>" +
          '<input type="text" name="' +
          escapeHtml(key) +
          '" value="' +
          escapeHtml(getNavLabel(key)) +
          '" />' +
          '<label class="hub-modal-hide"><input type="checkbox" name="' +
          hideName +
          '"' +
          (isNavHidden(key) ? " checked" : "") +
          " /> 메뉴 숨김</label>" +
          "</div>"
        );
      })
      .join("");

    modal.hidden = false;
  }

  function closeNavLabelsModal() {
    var modal = document.getElementById("nav-labels-modal");
    if (modal) modal.hidden = true;
  }

  function saveNavLabelsFromForm() {
    var form = document.getElementById("nav-labels-form");
    if (!form) return;
    navLabelKeys.forEach(function (key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (input && input.value.trim()) {
        state.navLabels[key] = input.value.trim();
      }
      var hideBox = form.querySelector('[name="hide_' + key + '"]');
      if (hideBox && hideBox.checked) {
        if (!isNavHidden(key)) hideNav(key);
      } else if (isNavHidden(key)) {
        restoreNav(key);
      }
    });
    localStorage.setItem(NAV_LABELS_KEY, JSON.stringify(state.navLabels));
    closeNavLabelsModal();
    ensureValidRoute();
    renderAll();
  }

  function resetNavLabels() {
    state.navLabels = {};
    localStorage.removeItem(NAV_LABELS_KEY);
    closeNavLabelsModal();
    renderAll();
  }

  function exportNavLabels() {
    var payload = {
      version: 1,
      updated: new Date().toISOString().slice(0, 10),
      comment: "ai/nav-labels.json labels 에 붙여넣기",
      labels: {},
    };
    navLabelKeys.forEach(function (key) {
      payload.labels[key] = getNavLabel(key);
    });
    downloadJson(payload, "nav-labels.json");
  }

  function exportHubVisibility() {
    downloadJson(
      {
        version: 1,
        updated: new Date().toISOString().slice(0, 10),
        comment: "ai/hub-visibility.json",
        hiddenItems: state.hiddenItemIds,
        hiddenNav: state.hiddenNavIds,
      },
      "hub-visibility.json"
    );
  }

  function openHiddenRestoreModal() {
    var modal = document.getElementById("hidden-restore-modal");
    var body = document.getElementById("hidden-restore-body");
    if (!modal || !body) return;

    var itemRows = state.hiddenItemIds
      .map(function (id) {
        var it = state.catalogItems.find(function (i) {
          return i.id === id;
        });
        return (
          "<li><span>" +
          escapeHtml((it && it.title) || id) +
          '</span><button type="button" class="btn btn--ghost" data-restore-item="' +
          escapeHtml(id) +
          '">복구</button></li>'
        );
      })
      .join("");

    var navRows = state.hiddenNavIds
      .map(function (id) {
        return (
          "<li><span>" +
          escapeHtml(getNavLabel(id) || id) +
          '</span><button type="button" class="btn btn--ghost" data-restore-nav="' +
          escapeHtml(id) +
          '">복구</button></li>'
        );
      })
      .join("");

    body.innerHTML =
      "<h4 style=\"margin:0 0 0.5rem;font-size:0.8125rem\">숨긴 항목</h4>" +
      (itemRows
        ? '<ul class="hub-restore-list">' + itemRows + "</ul>"
        : '<p class="hub-summary">없음</p>') +
      "<h4 style=\"margin:1rem 0 0.5rem;font-size:0.8125rem\">숨긴 사이드바 메뉴</h4>" +
      (navRows
        ? '<ul class="hub-restore-list">' + navRows + "</ul>"
        : '<p class="hub-summary">없음</p>');

    body.querySelectorAll("[data-restore-item]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        restoreItem(btn.getAttribute("data-restore-item"));
        openHiddenRestoreModal();
        ensureValidRoute();
        renderAll();
      });
    });
    body.querySelectorAll("[data-restore-nav]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        restoreNav(btn.getAttribute("data-restore-nav"));
        openHiddenRestoreModal();
        ensureValidRoute();
        renderAll();
      });
    });

    modal.hidden = false;
  }

  function closeHiddenRestoreModal() {
    var modal = document.getElementById("hidden-restore-modal");
    if (modal) modal.hidden = true;
  }

  function exportCategoryOverrides() {
    var overrides = {};
    Object.keys(state.localCategoryOverrides).forEach(function (id) {
      var base = state.baseCategories[id];
      if (state.localCategoryOverrides[id] !== base) {
        overrides[id] = state.localCategoryOverrides[id];
      }
    });
    downloadJson(
      {
        version: 1,
        updated: new Date().toISOString().slice(0, 10),
        overrides: overrides,
      },
      "category-overrides.json"
    );
  }

  function downloadJson(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2) + "\n"], {
      type: "application/json",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindUi() {
    document.getElementById("hub-search").addEventListener("input", function (e) {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderItemTabs();
      renderPanel();
    });

    var catExport = document.getElementById("hub-category-export");
    var visExport = document.getElementById("hub-visibility-export");
    document.getElementById("hub-category-edit-toggle").addEventListener("click", function () {
      state.categoryEditMode = !state.categoryEditMode;
      localStorage.setItem(CATEGORY_EDIT_KEY, state.categoryEditMode ? "1" : "0");
      this.classList.toggle("is-active", state.categoryEditMode);
      if (catExport) catExport.hidden = !state.categoryEditMode;
      if (visExport) visExport.hidden = !state.categoryEditMode;
      renderItemTabs();
      renderPanel();
    });
    if (catExport) {
      catExport.addEventListener("click", exportCategoryOverrides);
    }
    if (visExport) {
      visExport.addEventListener("click", exportHubVisibility);
    }

    document.getElementById("hidden-restore-close").addEventListener("click", closeHiddenRestoreModal);
    document.getElementById("hidden-restore-modal").addEventListener("click", function (e) {
      if (e.target.id === "hidden-restore-modal") closeHiddenRestoreModal();
    });

    document.getElementById("nav-labels-save").addEventListener("click", saveNavLabelsFromForm);
    document.getElementById("nav-labels-close").addEventListener("click", closeNavLabelsModal);
    document.getElementById("nav-labels-reset").addEventListener("click", resetNavLabels);
    document.getElementById("nav-labels-export").addEventListener("click", exportNavLabels);

    document.getElementById("nav-labels-modal").addEventListener("click", function (e) {
      if (e.target.id === "nav-labels-modal") closeNavLabelsModal();
    });

    window.addEventListener("hashchange", function () {
      var parsed = parseHash();
      if (parsed) state.route = parsed;
      ensureValidRoute();
      renderAll();
    });
  }

  function init() {
    state.localCategoryOverrides = loadJson(CATEGORY_OVERRIDES_KEY, {});
    state.navLabels = loadJson(NAV_LABELS_KEY, {});
    state.categoryEditMode = localStorage.getItem(CATEGORY_EDIT_KEY) === "1";

    var parsed = parseHash();
    state.route = parsed || defaultRoute();

    bindUi();

    return fetch("ai/catalog.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("catalog");
        return res.json();
      })
      .then(function (data) {
        state.catalogItems = data.items || [];
        state.categories = data.categories || [];
        state.resources = data.resources || [];
        state.fileCategoryOverrides = data.categoryOverrides || {};
        state.navDefaults = data.navLabels || {};
        state.profileUrl = data.profileUrl || state.profileUrl;
        state.updated = data.updated;

        state.navLabels = Object.assign(
          {},
          state.navDefaults,
          loadJson(NAV_LABELS_KEY, {})
        );

        if (data.hubVisibility) {
          state.fileHiddenItemIds = data.hubVisibility.hiddenItems || [];
          state.fileHiddenNavIds = data.hubVisibility.hiddenNav || [];
        }
        mergeVisibilityFromFile(data.hubVisibility);

        state.catalogItems.forEach(function (item) {
          state.baseCategories[item.id] = item.categoryBase || item.category;
        });

        applyItemCategories();
        ensureValidRoute();
        if (!location.hash) setHash();

        var editBtn = document.getElementById("hub-category-edit-toggle");
        if (editBtn) editBtn.classList.toggle("is-active", state.categoryEditMode);
        var catExportEl = document.getElementById("hub-category-export");
        if (catExportEl) catExportEl.hidden = !state.categoryEditMode;
        var visExportEl = document.getElementById("hub-visibility-export");
        if (visExportEl) visExportEl.hidden = !state.categoryEditMode;

        var updatedEl = document.getElementById("catalog-updated");
        if (updatedEl && data.updated) {
          updatedEl.textContent = "카탈로그: " + data.updated;
        }

        renderAll();
      })
      .catch(function () {
        var body = document.getElementById("hub-panel-body");
        if (body) {
          body.innerHTML =
            '<p class="hub-empty">catalog.json을 불러오지 못했습니다. npm run build:catalog 을 실행하세요.</p>';
        }
      });
  }

  init();
})();
