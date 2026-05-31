(function (global) {
  "use strict";

  var DB_NAME = "idea-bank";
  var DB_VERSION = 1;
  var STORE = "ideas";

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = function () {
        reject(req.error);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("targetCategory", "targetCategory", { unique: false });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
  }

  function txStore(mode) {
    return openDb().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function slugFromTitle(title, existingIds) {
    var base = String(title)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\uac00-\ud7a3-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36);
    if (!base) base = "idea";
    var id = base;
    var n = 2;
    while (existingIds[id]) {
      id = base + "-" + n;
      n += 1;
    }
    return id;
  }

  function listIdeas() {
    return txStore("readonly").then(function (store) {
      return reqToPromise(store.getAll());
    });
  }

  function getIdea(id) {
    return txStore("readonly").then(function (store) {
      return reqToPromise(store.get(id));
    });
  }

  function putIdea(idea) {
    return txStore("readwrite").then(function (store) {
      return reqToPromise(store.put(idea));
    });
  }

  function deleteIdea(id) {
    return txStore("readwrite").then(function (store) {
      return reqToPromise(store.delete(id));
    });
  }

  function clearAll() {
    return txStore("readwrite").then(function (store) {
      return reqToPromise(store.clear());
    });
  }

  function seedIfEmpty() {
    return listIdeas().then(function (items) {
      if (items.length) return items;
      var now = new Date().toISOString();
      var seed = [
        {
          id: "marathon-log",
          title: "마라톤 기록장",
          body:
            "Keep에 흩어진 대회 기록을 JSON으로 관리하고 싶다.\n\n오늘뭐신지(신발)와 역할 분리. 로컬 저장 + export.\n→ projects/marathon-log MVP 배포, hub hobby 승격 완료.",
          targetCategory: "hobby",
          status: "promoted",
          pinned: true,
          tags: ["Running", "product"],
          images: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "hub-admin",
          title: "허브 admin 모드",
          body: "catalog 편집을 Git 없이…",
          targetCategory: "work",
          status: "active",
          pinned: false,
          tags: ["product"],
          images: [],
          createdAt: now,
          updatedAt: now,
        },
      ];
      return Promise.all(seed.map(putIdea)).then(function () {
        return seed;
      });
    });
  }

  function exportPayload(ideas) {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      ideas: ideas.map(function (i) {
        return Object.assign({}, i);
      }),
    };
  }

  function importPayload(data, replace) {
    var ideas = (data && data.ideas) || [];
    if (!Array.isArray(ideas)) {
      return Promise.reject(new Error("invalid"));
    }
    var run = replace ? clearAll() : Promise.resolve();
    return run.then(function () {
      return Promise.all(
        ideas.map(function (raw) {
          var now = new Date().toISOString();
          return putIdea({
            id: raw.id || slugFromTitle(raw.title || "idea", {}),
            title: raw.title || "제목 없음",
            body: raw.body || "",
            targetCategory: raw.targetCategory || "study",
            status: raw.status || "active",
            pinned: !!raw.pinned,
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            images: Array.isArray(raw.images) ? raw.images : [],
            createdAt: raw.createdAt || now,
            updatedAt: raw.updatedAt || now,
          });
        })
      );
    });
  }

  global.IdeaBankDb = {
    listIdeas: listIdeas,
    getIdea: getIdea,
    putIdea: putIdea,
    deleteIdea: deleteIdea,
    seedIfEmpty: seedIfEmpty,
    slugFromTitle: slugFromTitle,
    exportPayload: exportPayload,
    importPayload: importPayload,
  };
})(window);
