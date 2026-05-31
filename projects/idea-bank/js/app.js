(function () {
  "use strict";

  var CAT_LABEL = { work: "업무 도우미", study: "공부·실험", hobby: "러닝·취미" };
  var SIDEBAR_COLLAPSED_KEY = "idea-bank-sidebar-collapsed";
  var state = {
    view: "list",
    filter: "all",
    statusFilter: "all",
    search: "",
    editId: null,
    isNew: false,
    draft: null,
    images: [],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function previewBody(body) {
    var t = (body || "").replace(/\s+/g, " ").trim();
    return t.length > 120 ? t.slice(0, 120) + "…" : t;
  }

  function filterIdeas(ideas) {
    return ideas.filter(function (idea) {
      if (state.view === "pinned" && !idea.pinned) return false;
      if (state.statusFilter === "active" && idea.status === "promoted") return false;
      if (state.statusFilter === "promoted" && idea.status !== "promoted") return false;
      if (state.filter !== "all" && idea.targetCategory !== state.filter) return false;
      if (state.search) {
        var q = state.search.toLowerCase();
        return (
          (idea.title || "").toLowerCase().indexOf(q) >= 0 ||
          (idea.body || "").toLowerCase().indexOf(q) >= 0
        );
      }
      return true;
    });
  }

  function resetListFilters() {
    state.filter = "all";
    state.statusFilter = "all";
    state.search = "";
    var searchEl = $("search");
    if (searchEl) searchEl.value = "";
  }

  function countByCategory(ideas, catId) {
    if (catId === "all") return ideas.length;
    return ideas.filter(function (idea) {
      return idea.targetCategory === catId;
    }).length;
  }

  function countIdeasByStatus(ideas) {
    var active = 0;
    var promoted = 0;
    ideas.forEach(function (idea) {
      if (idea.status === "promoted") promoted += 1;
      else active += 1;
    });
    return { total: ideas.length, active: active, promoted: promoted };
  }

  function updateNavCounts(ideas) {
    var counts = countIdeasByStatus(ideas);
    var pinned = 0;
    ideas.forEach(function (idea) {
      if (idea.pinned) pinned += 1;
    });
    var allEl = $("nav-count-all");
    var pinnedEl = $("nav-count-pinned");
    if (allEl) {
      allEl.textContent = String(counts.total);
      allEl.title =
        counts.total === 0
          ? "저장된 아이디어 없음"
          : "전체 " +
            counts.total +
            "건 (노트 중 " +
            counts.active +
            " · 승격 " +
            counts.promoted +
            ") — 승격된 아이디어도 포함";
    }
    if (pinnedEl) pinnedEl.textContent = String(pinned);
  }

  function renderCatFilter(ideas) {
    var nav = $("cat-filter");
    if (!nav) return;
    if (state.view !== "list") {
      nav.hidden = true;
      nav.innerHTML = "";
      return;
    }
    nav.hidden = false;
    ideas = ideas || [];
    var counts = countIdeasByStatus(ideas);
    var chips = [
      { id: "all", label: "전체", kind: "cat", n: ideas.length },
      { id: "work", label: CAT_LABEL.work, kind: "cat", n: countByCategory(ideas, "work") },
      { id: "study", label: CAT_LABEL.study, kind: "cat", n: countByCategory(ideas, "study") },
      { id: "hobby", label: CAT_LABEL.hobby, kind: "cat", n: countByCategory(ideas, "hobby") },
      { id: "all", label: "상태·전체", kind: "status", n: counts.total },
      { id: "active", label: "🌱 노트 중", kind: "status", n: counts.active },
      { id: "promoted", label: "🚀 승격됨", kind: "status", n: counts.promoted },
    ];
    nav.innerHTML = chips
      .map(function (c) {
        var active =
          c.kind === "cat"
            ? state.filter === c.id
            : state.statusFilter === c.id;
        var nBadge = ' <span class="cat-chip__n">' + c.n + "</span>";
        return (
          '<button type="button" class="cat-chip cat-chip--' +
          c.kind +
          (active ? " is-active" : "") +
          '" data-kind="' +
          c.kind +
          '" data-filter="' +
          c.id +
          '">' +
          escapeHtml(c.label) +
          nBadge +
          "</button>"
        );
      })
      .join("");
    $("cat-filter").querySelectorAll(".cat-chip").forEach(function (btn) {
      btn.onclick = function () {
        var kind = btn.getAttribute("data-kind");
        var id = btn.getAttribute("data-filter");
        if (kind === "status") state.statusFilter = id;
        else state.filter = id;
        render();
      };
    });
  }

  function listMetaHtml(filteredCount, ideas) {
    var total = ideas.length;
    if (state.view === "pinned") {
      var pinnedTotal = ideas.filter(function (i) {
        return i.pinned;
      }).length;
      return (
        '<p class="list-meta list-meta--context">📌 <strong>고정함</strong>만 표시 중 · ' +
        filteredCount +
        "개 (고정 " +
        pinnedTotal +
        " · 전체 " +
        total +
        "건)</p>"
      );
    }
    var html =
      '<p class="list-meta list-meta--context">📋 <strong>전체 아이디어</strong> · ';
    if (filteredCount === total) {
      html += filteredCount + "개</p>";
    } else {
      html +=
        filteredCount +
        "개 표시 <span class="list-meta__dim">(전체 " +
        total +
        "건 중)</span></p>";
    }
    return html;
  }

  function renderList(ideas) {
    var statusCounts = countIdeasByStatus(ideas);
    var filtered = filterIdeas(ideas);
    filtered.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    if (!filtered.length) {
      var emptyMsg =
        '<p class="empty">💭 이 목록에 맞는 아이디어가 없어요.</p>';
      if (
        state.view === "list" &&
        state.statusFilter === "active" &&
        statusCounts.promoted > 0
      ) {
        emptyMsg +=
          '<p class="list-meta">🚀 승격 완료 ' +
          statusCounts.promoted +
          "건은 「승격됨」 필터에서 보세요. 승격해도 노트에서 자동 삭제되지 않습니다.</p>";
      } else {
        emptyMsg +=
          '<p class="list-meta">✨ <strong>새 아이디어</strong>로 첫 메모를 남겨 보세요.</p>';
      }
      $("content").innerHTML = emptyMsg;
      return;
    }
    $("content").innerHTML =
      listMetaHtml(filtered.length, ideas) +
      filtered
        .map(function (idea) {
          return (
            '<article class="idea-card" data-id="' +
            escapeHtml(idea.id) +
            '"><div class="idea-card__body">' +
            '<p class="idea-card__title">' +
            escapeHtml(idea.title) +
            "</p>" +
            '<p class="idea-card__preview">' +
            escapeHtml(previewBody(idea.body)) +
            "</p>" +
            '<div class="pill-row">' +
            (idea.pinned ? '<span class="pill pill--pin">고정</span>' : "") +
            (idea.status === "promoted"
              ? '<span class="pill pill--promoted">승격 완료</span>'
              : "") +
            '<span class="pill pill--' +
            idea.targetCategory +
            '">' +
            escapeHtml(CAT_LABEL[idea.targetCategory] || idea.targetCategory) +
            "</span>" +
            (idea.status !== "promoted" && IdeaBankPromote
              ? '<span class="pill pill--progress">' +
                IdeaBankPromote.progressDoneCount(
                  IdeaBankPromote.normalizeProgress(idea.promoteProgress)
                ) +
                "/" +
                IdeaBankPromote.PROMOTE_STEPS.length +
                "</span>"
              : "") +
            "</div></div></article>"
          );
        })
        .join("");
    $("content").querySelectorAll(".idea-card").forEach(function (card) {
      card.onclick = function () {
        state.editId = card.getAttribute("data-id");
        state.isNew = false;
        state.view = "sketch";
        loadSketch();
      };
    });
  }

  function renderCatRadios(selected) {
    return ["work", "study", "hobby"]
      .map(function (c) {
        return (
          '<button type="button" class="cat-radio cat-radio--' +
          c +
          (selected === c ? " is-selected" : "") +
          '" data-cat="' +
          c +
          '">' +
          escapeHtml(CAT_LABEL[c]) +
          "</button>"
        );
      })
      .join("");
  }

  function renderImages() {
    var html = state.images
      .map(function (img, i) {
        return (
          '<div class="img-thumb"><img src="' +
          escapeHtml(img.dataUrl) +
          '" alt="" /><button type="button" data-rm-img="' +
          i +
          '" aria-label="삭제">×</button></div>'
        );
      })
      .join("");
    html +=
      '<div class="img-thumb" id="img-paste-hint" tabindex="0">+ 붙여넣기</div>';
    return html;
  }

  function renderSketchForm() {
    var d = state.draft;
    $("content").innerHTML =
      '<div class="sketch-form">' +
      "<h2>" +
      (state.isNew ? "✨ 새 아이디어" : escapeHtml(d.title)) +
      "</h2>" +
      '<label class="field-label">제목</label>' +
      '<input class="field-input" id="f-title" type="text" value="' +
      escapeHtml(d.title || "") +
      '" />' +
      '<label class="field-label">허브 프로젝트 ID (폴더·catalog id)</label>' +
      '<input class="field-input field-input--mono" id="f-hub-id" type="text" value="' +
      escapeHtml(d.hubProjectId || d.id || "") +
      '" placeholder="예: marathon-log" />' +
      '<p class="field-hint">projects/<strong>이 ID</strong>/ · ai/projects.json · intro/manifest</p>' +
      '<span class="field-label">목표 카테고리 (허브 승격 시)</span>' +
      '<div class="cat-radios" id="cat-radios">' +
      renderCatRadios(d.targetCategory) +
      "</div>" +
      '<label class="field-label">본문</label>' +
      '<textarea class="sketch-body" id="f-body">' +
      escapeHtml(d.body || "") +
      "</textarea>" +
      '<label class="field-label"><input type="checkbox" id="f-pinned"' +
      (d.pinned ? " checked" : "") +
      " /> 고정</label>" +
      '<span class="field-label">이미지 (Ctrl+V)</span>' +
      '<div class="img-grid" id="img-grid">' +
      renderImages() +
      "</div>" +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn--primary" id="btn-save">저장</button>' +
      '<button type="button" class="btn" id="btn-back">목록</button>' +
      (!state.isNew
        ? '<button type="button" class="btn btn--danger" id="btn-delete">삭제</button>'
        : "") +
      "</div>" +
      IdeaBankPromote.renderPromotePanel(d, CAT_LABEL, escapeHtml) +
      "</div>";

    bindPromotePanel();

    $("cat-radios").querySelectorAll(".cat-radio").forEach(function (btn) {
      btn.onclick = function () {
        state.draft.targetCategory = btn.getAttribute("data-cat");
        syncDraftFromForm();
        renderSketchForm();
      };
    });
    $("btn-save").onclick = saveSketch;
    $("btn-back").onclick = function () {
      state.view = "list";
      render();
    };
    var del = $("btn-delete");
    if (del) {
      del.onclick = function () {
        if (!window.confirm("이 아이디어를 삭제할까요?")) return;
        IdeaBankDb.deleteIdea(state.editId).then(function () {
          state.view = "list";
          render();
        });
      };
    }
    $("img-grid").querySelectorAll("[data-rm-img]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var i = Number(btn.getAttribute("data-rm-img"));
        state.images.splice(i, 1);
        renderSketchForm();
      };
    });
    var pasteHint = $("img-paste-hint");
    if (pasteHint) {
      pasteHint.onpaste = handlePaste;
      pasteHint.onclick = function () {
        pasteHint.focus();
      };
    }
    document.onpaste = handlePaste;
  }

  function handlePaste(e) {
    if (state.view !== "sketch") return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        e.preventDefault();
        var file = items[i].getAsFile();
        if (!file || file.size > 2 * 1024 * 1024) {
          window.alert("이미지는 2MB 이하만 지원합니다.");
          return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
          state.images.push({
            id: "img-" + Date.now(),
            mime: file.type,
            dataUrl: ev.target.result,
          });
          renderSketchForm();
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }

  function bindPromotePanel() {
    var panel = document.querySelector(".promote-panel");
    if (!panel) return;

    panel.querySelectorAll(".status-chip").forEach(function (btn) {
      btn.onclick = function () {
        state.draft.status = btn.getAttribute("data-status");
        if (state.draft.status === "promoted" && !state.draft.promotedAt) {
          state.draft.promotedAt = new Date().toISOString();
        }
        syncDraftFromForm();
        renderSketchForm();
      };
    });

    panel.querySelectorAll("[data-promote-step]").forEach(function (box) {
      box.onchange = function () {
        if (!state.draft.promoteProgress) {
          state.draft.promoteProgress = IdeaBankPromote.defaultProgress();
        }
        state.draft.promoteProgress[box.getAttribute("data-promote-step")] = box.checked;
      };
    });

    panel.querySelectorAll("[data-copy-snippet]").forEach(function (btn) {
      btn.onclick = function () {
        var stepId = btn.getAttribute("data-copy-snippet");
        var pre = document.getElementById("snippet-" + stepId);
        if (!pre) return;
        IdeaBankPromote.copyText(pre.textContent).then(
          function () {
            btn.textContent = "복사됨";
            setTimeout(function () {
              btn.textContent = "복사";
            }, 1500);
          },
          function () {
            window.alert("복사에 실패했습니다. 코드 블록을 직접 선택해 복사하세요.");
          }
        );
      };
    });
  }

  function syncDraftFromForm() {
    var t = $("f-title");
    var b = $("f-body");
    var p = $("f-pinned");
    var hubId = $("f-hub-id");
    if (t) state.draft.title = t.value;
    if (b) state.draft.body = b.value;
    if (p) state.draft.pinned = p.checked;
    if (hubId) {
      state.draft.hubProjectId = hubId.value.trim() || state.draft.id;
    }
    state.draft.images = state.images.slice();
    var panel = document.querySelector(".promote-panel");
    if (panel) {
      if (!state.draft.promoteProgress) {
        state.draft.promoteProgress = IdeaBankPromote.defaultProgress();
      }
      panel.querySelectorAll("[data-promote-step]").forEach(function (box) {
        state.draft.promoteProgress[box.getAttribute("data-promote-step")] = box.checked;
      });
    }
  }

  function saveSketch() {
    syncDraftFromForm();
    if (!state.draft.title.trim()) {
      window.alert("제목을 입력하세요.");
      return;
    }
    var now = new Date().toISOString();
    var save = function (id) {
      var idea = Object.assign({}, state.draft, {
        id: id,
        title: state.draft.title.trim(),
        body: state.draft.body || "",
        updatedAt: now,
        images: state.images.slice(),
      });
      if (state.isNew) {
        idea.createdAt = now;
        if (!idea.status) idea.status = "active";
      }
      if (!idea.promoteProgress) {
        idea.promoteProgress = IdeaBankPromote.defaultProgress();
      }
      idea.hubProjectId = (idea.hubProjectId || idea.id || "").trim();
      if (!idea.hubProjectId) idea.hubProjectId = idea.id;
      return IdeaBankDb.putIdea(idea).then(function () {
        state.editId = idea.id;
        state.isNew = false;
        state.view = "list";
        render();
      });
    };
    if (state.isNew) {
      IdeaBankDb.listIdeas().then(function (ideas) {
        var ids = {};
        ideas.forEach(function (i) {
          ids[i.id] = true;
        });
        save(IdeaBankDb.slugFromTitle(state.draft.title, ids));
      });
      return;
    }
    save(state.draft.id);
  }

  function loadSketch() {
    if (state.isNew) {
      state.draft = {
        id: "",
        title: "",
        body: "",
        targetCategory: "study",
        pinned: false,
        status: "active",
        hubProjectId: "",
        promoteProgress: IdeaBankPromote.defaultProgress(),
        tags: [],
      };
      state.images = [];
      renderSketchForm();
      return;
    }
    IdeaBankDb.getIdea(state.editId).then(function (idea) {
      if (!idea) {
        state.view = "list";
        render();
        return;
      }
      state.draft = Object.assign(
        {
          promoteProgress: IdeaBankPromote.defaultProgress(),
          hubProjectId: idea.id,
          status: "active",
        },
        idea
      );
      state.draft.promoteProgress = IdeaBankPromote.normalizeProgress(
        state.draft.promoteProgress
      );
      if (!state.draft.hubProjectId) state.draft.hubProjectId = state.draft.id;
      state.images = Array.isArray(idea.images) ? idea.images.slice() : [];
      renderSketchForm();
    });
  }

  function render() {
    document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
      var v = btn.getAttribute("data-view");
      btn.classList.toggle(
        "is-active",
        (v === "list" && state.view === "list") ||
          (v === "pinned" && state.view === "pinned") ||
          (v === "sketch" && state.view === "sketch")
      );
    });
    IdeaBankDb.listIdeas().then(function (ideas) {
      updateNavCounts(ideas);
      renderCatFilter(ideas);
      if (state.view === "sketch") {
        if (!state.draft && !state.isNew) loadSketch();
        else renderSketchForm();
        return;
      }
      renderList(ideas);
    });
  }

  function exportJson() {
    IdeaBankDb.listIdeas().then(function (ideas) {
      var payload = IdeaBankDb.exportPayload(ideas);
      var blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
        type: "application/json",
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "idea-bank-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var replace = window.confirm(
          "기존 데이터를 모두 지우고 가져올까요?\n취소 = 병합(덮어쓰기)"
        );
        IdeaBankDb.importPayload(data, replace).then(function () {
          render();
        });
      } catch (err) {
        window.alert("JSON 형식이 올바르지 않습니다.");
      }
    };
    reader.readAsText(file);
  }

  function newSketch() {
    IdeaBankDb.listIdeas().then(function (ideas) {
      var ids = {};
      ideas.forEach(function (i) {
        ids[i.id] = true;
      });
      state.isNew = true;
      state.editId = null;
      var newId = IdeaBankDb.slugFromTitle("새-아이디어", ids);
      state.draft = {
        id: newId,
        title: "",
        body: "",
        targetCategory: "study",
        pinned: false,
        status: "active",
        hubProjectId: newId,
        promoteProgress: IdeaBankPromote.defaultProgress(),
        tags: [],
      };
      state.images = [];
      state.view = "sketch";
      renderSketchForm();
    });
  }

  function applySidebarCollapsed(collapsed) {
    var shell = document.getElementById("app-shell");
    var toggles = [
      document.getElementById("sidebar-toggle"),
      document.getElementById("sidebar-toggle-toolbar"),
    ];
    if (shell) shell.classList.toggle("is-sidebar-collapsed", collapsed);
    document.documentElement.classList.toggle("sidebar-collapsed-boot", collapsed);
    toggles.forEach(function (toggle) {
      if (!toggle) return;
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      var label = collapsed ? "메뉴 펼치기" : "메뉴 접기";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    });
    var rail = document.getElementById("sidebar-toggle");
    if (rail) {
      var railLabel = rail.querySelector(".sidebar-rail__label");
      if (railLabel) railLabel.textContent = collapsed ? "펼침" : "접기";
    }
  }

  function bindSidebarToggle() {
    var collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    applySidebarCollapsed(collapsed);
    function onToggle() {
      collapsed = !document.getElementById("app-shell").classList.contains("is-sidebar-collapsed");
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
      applySidebarCollapsed(collapsed);
    }
    ["sidebar-toggle", "sidebar-toggle-toolbar"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", onToggle);
    });
  }

  function bindUi() {
    bindSidebarToggle();
    document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
      btn.onclick = function () {
        var next = btn.getAttribute("data-view");
        if (next === "list") resetListFilters();
        state.view = next;
        if (state.view === "sketch" && !state.editId && !state.isNew) {
          newSketch();
          return;
        }
        render();
      };
    });
    $("search").oninput = function (e) {
      state.search = e.target.value.trim();
      if (state.view === "list" || state.view === "pinned") render();
    };
    $("btn-new").onclick = newSketch;
    $("btn-export").onclick = exportJson;
    $("import-file").onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importJson(f);
      e.target.value = "";
    };
  }

  IdeaBankDb.seedIfEmpty()
    .then(function () {
      bindUi();
      render();
    })
    .catch(function () {
      $("content").innerHTML =
        '<p class="empty">IndexedDB를 사용할 수 없습니다. 브라우저 설정을 확인하세요.</p>';
    });
})();
