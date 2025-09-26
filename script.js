(function () {
  "use strict";
  const STORAGE_KEY = "todo-items-v1";
  const listEl = document.getElementById("list");
  const newTask = document.getElementById("newTask");
  const addBtn = document.getElementById("addBtn");
  const filters = document.querySelectorAll(".filter-btn[data-filter]");
  const leftCount = document.getElementById("leftCount");
  const clearCompleted = document.getElementById("clearCompleted");
  const sortBtn = document.getElementById("sortBtn");
  const clock = document.getElementById("clock");

  // items array shape: {id, text, done:boolean, created:number}
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(items)) items = [];
  } catch (e) {
    items = [];
  }

  let filter = "all";
  let sortNewest = true;

  function updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    clock.textContent = hh + ":" + mm;
  }
  updateClock();
  setInterval(updateClock, 60000);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function render() {
    listEl.innerHTML = "";
    let out = items.slice();
    if (sortNewest) out = out.slice().reverse(); // don't mutate original
    if (filter === "active") out = out.filter((i) => !i.done);
    if (filter === "completed") out = out.filter((i) => i.done);

    if (out.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML =
        '<strong>No tasks yet</strong><div style="margin-top:8px">Add your first task to get started.</div>';
      listEl.appendChild(empty);
      updateCounts();
      return;
    }

    out.forEach((it) => {
      const tpl = document.getElementById("itemTpl");
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = it.id;
      if (it.done) node.querySelector(".checkbox").classList.add("checked");

      const title = node.querySelector(".title");
      title.textContent = it.text;
      if (it.done) title.classList.add("completed");
      else title.classList.remove("completed");

      const meta = node.querySelector(".meta");
      meta.textContent = timeAgo(it.created);

      node.classList.add("enter");

      // checkbox toggle
      node.querySelector(".checkbox").addEventListener("click", () => {
        toggleDone(it.id);
      });

      // delete
      node.querySelector(".delete").addEventListener("click", () => {
        removeItem(it.id);
      });

      // edit: focus and place caret
      const editBtn = node.querySelector(".edit");
      editBtn.addEventListener("click", () => {
        focusEditable(title);
      });

      // inline edit save
      title.addEventListener("blur", () => {
        const txt = title.textContent.trim();
        if (txt.length === 0) {
          title.textContent = it.text;
        } else {
          updateText(it.id, txt);
        }
      });
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          title.blur();
        }
      });

      // drag & drop handlers
      node.addEventListener("dragstart", (e) => {
        node.classList.add("dragging");
        e.dataTransfer.setData("text/plain", it.id);
        e.dataTransfer.effectAllowed = "move";
      });
      node.addEventListener("dragend", () => {
        node.classList.remove("dragging");
      });

      node.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        node.classList.add("drag-over");
      });
      node.addEventListener("dragleave", () => {
        node.classList.remove("drag-over");
      });

      node.addEventListener("drop", (e) => {
        e.preventDefault();
        node.classList.remove("drag-over");
        const sourceId = e.dataTransfer.getData("text/plain");
        const targetId = it.id;
        if (sourceId) reorder(sourceId, targetId);
      });

      listEl.appendChild(node);
    });

    updateCounts();
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return diff + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    const d = new Date(ts);
    return d.toLocaleString();
  }

  function updateCounts() {
    const left = items.filter((i) => !i.done).length;
    leftCount.textContent = left + (left === 1 ? " task left" : " tasks left");
    save();
  }

  function addItem(text) {
    const t = (text || "").trim();
    if (!t) return;
    const newItem = {
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7),
      text: t,
      done: false,
      created: Date.now(),
    };
    items.push(newItem);
    save();
    newTask.value = "";
    // keep focus
    newTask.focus();
    render();
  }

  function toggleDone(id) {
    items = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    save();
    render();
  }

  function removeItem(id) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    items.splice(idx, 1);
    save();
    render();
  }

  function updateText(id, text) {
    items = items.map((i) =>
      i.id === id ? { ...i, text: text || i.text } : i
    );
    save();
    render();
  }

  // reorder: move source before target
  function reorder(sourceId, targetId) {
    const srcIdx = items.findIndex((i) => i.id === sourceId);
    const tgtIdx = items.findIndex((i) => i.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return;
    const [moved] = items.splice(srcIdx, 1);
    // insert before target index
    const insertAt = srcIdx < tgtIdx ? tgtIdx : tgtIdx;
    items.splice(insertAt, 0, moved);
    save();
    render();
  }

  // helpers
  function focusEditable(el) {
    el.focus();
    placeCaretAtEnd(el);
  }
  function placeCaretAtEnd(el) {
    el.focus();
    if (
      typeof window.getSelection != "undefined" &&
      typeof document.createRange != "undefined"
    ) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // wire up UI
  addBtn.addEventListener("click", () => {
    addItem(newTask.value);
  });
  newTask.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addItem(newTask.value);
    }
  });

  filters.forEach((b) =>
    b.addEventListener("click", () => {
      filters.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      filter = b.dataset.filter;
      render();
    })
  );

  clearCompleted.addEventListener("click", () => {
    if (!confirm("Remove all completed tasks?")) return;
    items = items.filter((i) => !i.done);
    save();
    render();
  });

  sortBtn.addEventListener("click", () => {
    sortNewest = !sortNewest;
    sortBtn.textContent = sortNewest ? "Sort: New" : "Sort: Old";
    render();
  });

  // keyboard shortcut: press 'n' to focus new task
  window.addEventListener("keydown", (e) => {
    if (
      (e.key === "n" || e.key === "N") &&
      document.activeElement !== newTask
    ) {
      e.preventDefault();
      newTask.focus();
    }
  });

  // initial render
  render();

  // expose limited API for debugging in console
  window._todo = {
    get items() {
      return items.slice();
    },
    add: addItem,
  };
})();
