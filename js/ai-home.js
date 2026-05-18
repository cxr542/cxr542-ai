(function () {
  "use strict";

  var statusLabels = {
    learning: "학습 중",
    demo: "데모",
    planned: "예정",
    local: "로컬",
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCard(item) {
    var status = item.status || "planned";
    var badgeLabel = statusLabels[status] || status;
    var tags = (item.tags || [])
      .map(function (tag) {
        return '<span class="ai-card__tag">' + escapeHtml(tag) + "</span>";
      })
      .join("");

    var links = (item.links || [])
      .map(function (link) {
        return (
          '<a href="' +
          escapeHtml(link.url) +
          '" rel="noopener noreferrer">' +
          escapeHtml(link.label) +
          "</a>"
        );
      })
      .join("");

    var linksBlock = links
      ? '<div class="ai-card__links">' + links + "</div>"
      : "";

    return (
      '<article class="ai-card" data-tags="' +
      escapeHtml((item.tags || []).join(",")) +
      '">' +
      '<div class="ai-card__head">' +
      "<h3 class=\"ai-card__title\">" +
      escapeHtml(item.title) +
      "</h3>" +
      '<span class="ai-card__badge ai-card__badge--' +
      escapeHtml(status) +
      '">' +
      escapeHtml(badgeLabel) +
      "</span>" +
      "</div>" +
      '<p class="ai-card__summary">' +
      escapeHtml(item.summary) +
      "</p>" +
      '<div class="ai-card__tags">' +
      tags +
      "</div>" +
      linksBlock +
      "</article>"
    );
  }

  function initCatalog(config) {
    var grid = document.getElementById(config.gridId);
    var filtersEl = document.getElementById(config.filtersId);
    var updatedNote = config.updatedNoteId
      ? document.getElementById(config.updatedNoteId)
      : null;
    var activeFilter = "all";

    function renderGrid(items) {
      if (!grid) return;
      var filtered =
        activeFilter === "all"
          ? items
          : items.filter(function (item) {
              return (item.tags || []).indexOf(activeFilter) !== -1;
            });

      if (!filtered.length) {
        grid.innerHTML =
          '<p class="ai-grid-empty">해당 태그에 맞는 카드가 없습니다.</p>';
        return;
      }

      grid.innerHTML = filtered.map(renderCard).join("");
    }

    function renderFilters(categories, items) {
      if (!filtersEl) return;
      var buttons = [
        '<button type="button" class="filter-btn is-active" data-filter="all">전체</button>',
      ];

      categories.forEach(function (cat) {
        buttons.push(
          '<button type="button" class="filter-btn" data-filter="' +
            escapeHtml(cat) +
            '">' +
            escapeHtml(cat) +
            "</button>"
        );
      });

      filtersEl.innerHTML = buttons.join("");

      filtersEl.querySelectorAll(".filter-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeFilter = btn.getAttribute("data-filter") || "all";
          filtersEl.querySelectorAll(".filter-btn").forEach(function (b) {
            b.classList.toggle("is-active", b === btn);
          });
          renderGrid(items);
        });
      });
    }

    return fetch(config.dataUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + config.dataUrl);
        return res.json();
      })
      .then(function (data) {
        var items = data.items || [];
        renderFilters(data.categories || [], items);
        renderGrid(items);

        if (updatedNote && data.updated) {
          updatedNote.hidden = false;
          updatedNote.textContent = "마지막 업데이트: " + data.updated;
        }
        return data;
      })
      .catch(function () {
        if (grid) {
          grid.innerHTML =
            '<p class="ai-grid-empty">' +
            escapeHtml(config.errorMessage || "목록을 불러오지 못했습니다.") +
            "</p>";
        }
      });
  }

  function renderResources(resources) {
    var resourceList = document.getElementById("resource-list");
    if (!resourceList) return;
    resourceList.innerHTML = (resources || [])
      .map(function (r) {
        return (
          "<li><a href=\"" +
          escapeHtml(r.url) +
          "\" rel=\"noopener noreferrer\">" +
          escapeHtml(r.label) +
          "</a></li>"
        );
      })
      .join("");
  }

  initCatalog({
    dataUrl: "ai/services.json",
    gridId: "ai-grid",
    filtersId: "ai-filters",
    updatedNoteId: "updated-note",
    errorMessage: "서비스 목록을 불러오지 못했습니다. ai/services.json을 확인하세요.",
  }).then(function (data) {
    if (data) renderResources(data.resources);
  });

  initCatalog({
    dataUrl: "ai/projects.json",
    gridId: "projects-grid",
    filtersId: "projects-filters",
    updatedNoteId: "projects-updated-note",
    errorMessage:
      "프로젝트 목록을 불러오지 못했습니다. npm run sync:projects 후 ai/projects.json을 확인하세요.",
  });
})();
