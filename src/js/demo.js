// Utilidades básicas
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// --- NUEVO: conversión HEX a RGBA para degradados ---
function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = String(hex).trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) { // #abc -> #aabbcc
    h = h.split('').map(c => c + c).join('');
  }
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) {
    return `rgba(0,0,0,${alpha})`;
  }
  const num = parseInt(h, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// --- FIN NUEVO ---

// Estado simulado del tablero
const state = {
  lists: {
    todo: ["c1", "c2", "c3"],
    doing: ["c4", "c5"],
    done: ["c6"],
  },
  cards: {
    c1: { id: "c1", text: "Configurar Tailwind y estructura del proyecto" },
    c2: { id: "c2", text: "Diseñar modelo de datos" },
    c3: { id: "c3", text: "Crear endpoints en Spring Boot" },
    c4: { id: "c4", text: "Maquetar vistas" },
    c5: { id: "c5", text: "Autenticación" },
    c6: { id: "c6", text: "Estructura base del repositorio" },
  },
};

// Extensión de estado para propiedades de listas y bloqueo de tarjetas
if (!state.meta) state.meta = { lists: {}, cards: {} }; // meta.lists[id] = {c1,c2,opacity,desc,locked}

function applyListHeaderStyles(listEl, meta) {
  if (!listEl) return;
  const header = listEl.querySelector('header');
  if (!header) return;
  if (meta?.c1 && meta?.c2) {
    header.style.background = `linear-gradient(90deg, ${hexToRgba(meta.c1, meta.opacity || 0.7)} 0%, ${hexToRgba(meta.c2, meta.opacity || 0.7)} 100%)`;
  }
  if (meta?.locked) {
    listEl.classList.add('opacity-80');
    listEl.setAttribute('data-locked','true');
  } else {
    listEl.classList.remove('opacity-80');
    listEl.removeAttribute('data-locked');
  }
  // descripción
  const descEl = listEl.querySelector('[data-list-desc]');
  if (descEl) descEl.textContent = meta?.desc || '';
}

// Observador de scroll para añadir clase is-scrollable
function setupScrollHint() {
  const wrap = document.getElementById('board-scroll');
  if (!wrap) return;
  function refresh() {
    if (wrap.scrollWidth > wrap.clientWidth + 10) {
      wrap.classList.add('is-scrollable');
    } else {
      wrap.classList.remove('is-scrollable');
    }
  }
  refresh();
  window.addEventListener('resize', refresh);
  const ro = new ResizeObserver(refresh); ro.observe(wrap);
}

// Bloqueo de arrastre cuando lista está bloqueada
function isListLocked(listId) { return state.meta?.lists?.[listId]?.locked; }

// Override setupAddCard para respetar bloqueo
const _origSetupAddCard = setupAddCard;
setupAddCard = function() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-card]');
    if (!btn) return;
    const listId = btn.getAttribute('data-add-card');
    if (isListLocked(listId)) return; // bloqueada
  });
  _origSetupAddCard();
};

// Bloqueo de tarjetas individuales
function toggleCardLock(cardId, lock) {
  state.meta.cards[cardId] = state.meta.cards[cardId] || {};
  state.meta.cards[cardId].locked = lock;
  const el = document.querySelector(`[data-card-id="${cardId}"]`);
  if (el) {
    el.classList.toggle('opacity-70', !!lock);
    el.classList.toggle('pointer-events-none', !!lock);
  }
  saveLocal();
}

// Util: construir HTML de tarjeta con menú móvil (3 puntos)
function cardHTML(c) {
  const due = c.due
    ? `<span class="ml-2 rounded bg-black/10 px-2 py-0.5 text-[10px] text-black/70 dark:bg-white/10 dark:text-white/80">${c.due}</span>`
    : "";
  const assigned = c.assignedTo
    ? `<div class=\"mt-1 text-xs text-black/70 dark:text-white/80\">Asignado a: ${c.assignedTo}</div>`
    : "";
  const locked = state.meta.cards[c.id]?.locked;
  const lockIcon = locked
    ? `<span class="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white" title="Bloqueada"><svg viewBox='0 0 20 20' class='h-3 w-3' fill='currentColor'><path d='M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z'/></svg></span>`
    : "";
  return `
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between">
          <div class="font-medium text-sm truncate">${c.text}</div>
          ${due}
        </div>
        ${assigned}
      </div>
      <button class="card-menu inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" aria-label="Opciones" data-card-menu>
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 3a2 2 0 110 4 2 2 0 010-4zm0 5a2 2 0 110 4 2 2 0 010-4zm2 7a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
      </button>
      ${lockIcon}
    </div>`;
}

function saveLocal() {
  try {
    localStorage.setItem("tb_board_state", JSON.stringify(state));
  } catch (_) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem("tb_board_state");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.lists && data.cards) {
      Object.assign(state, data);
    // Rehidratar DOM según estado
      for (const listId of Object.keys(state.lists)) {
        const container = document.querySelector(`[data-list="${listId}"]`);
        if (!container) continue;
        container.innerHTML = "";
        state.lists[listId].forEach((cardId) => {
          const c = state.cards[cardId];
          const article = document.createElement("article");
          article.className =
            "card rounded p-3 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700";
          if (c.color) article.style.backgroundColor = c.color;
          article.dataset.cardId = c.id;
      article.innerHTML = cardHTML(c);
          container.appendChild(article);
        });
      }
      updateCounts();
    }
  } catch (_) {}
}

function updateCounts() {
  $$(".list").forEach((listEl) => {
    const listId = listEl.dataset.listId;
    const countEl = $("[data-list-count]", listEl);
    const items = $$(".card", listEl).length;
    if (countEl) countEl.textContent = String(items);
    // Sincroniza estado con DOM por robustez
    state.lists[listId] = $$(".card", listEl).map((c) => c.dataset.cardId);
  });
  saveLocal();
}

// Dropdowns y modales
function setupDropdowns() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dropdown-toggle]");
    const dropdowns = $$(".dropdown");
    if (btn) {
      const id = btn.getAttribute("data-dropdown-toggle");
      const dd = document.getElementById(id);
      dropdowns.forEach((d) => d !== dd && d.classList.add("hidden"));
      dd?.classList.toggle("hidden");
    } else if (!e.target.closest(".dropdown")) {
      dropdowns.forEach((d) => d.classList.add("hidden"));
    }
  });
}

function setupModales() {
  // Abrir
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-modal-open]");
    if (openBtn) {
      const id = openBtn.getAttribute("data-modal-open");
      const modal = document.getElementById(id);
      modal?.classList.remove("hidden");
      modal?.classList.add("flex");
    }
  });
  // Cerrar
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal");
      modal?.classList.add("hidden");
      modal?.classList.remove("flex");
    }
  });
}

function setupThemeToggle() {
  const btn = $("#theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (_) {}
  });
}

function setupCreateJoin() {
  const crear = $("#btn-crear");
  const unirse = $("#btn-unirse");
  crear?.addEventListener("click", () => {
    const name = $("#create-name")?.value?.trim();
    if (!name) return;
    console.log(`[sim] crear tablero: ${name}`);
    // Cierra modal
    $("#modal-crear")?.classList.add("hidden");
    $("#modal-crear")?.classList.remove("flex");
  });
  unirse?.addEventListener("click", () => {
    const code = $("#join-code")?.value?.trim();
    if (!code) return;
    console.log(`[sim] unirse a tablero con código: ${code}`);
    // Cierra modal
    $("#modal-unirse")?.classList.add("hidden");
    $("#modal-unirse")?.classList.remove("flex");
  });
}

// Añadir tarjeta con modal
function setupAddCard() {
  // Al pulsar "Añadir tarjeta" abrir modal y setear list destino
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-card]");
    if (!btn) return;
    const listId = btn.getAttribute("data-add-card");
    const modal = document.getElementById("modal-card");
    if (!modal) return;
    modal.dataset.targetList = listId;
    $("#card-form")?.reset();
    $("#card-color").value = "#ffffff";
    $("#modal-card-title").textContent = "Nueva actividad";
  // Limpia dataset de edición
  delete modal.dataset.editCardId;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  });

  // Guardar tarjeta
  const form = document.getElementById("card-form");
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const modal = document.getElementById("modal-card");
    const listId = modal?.dataset.targetList || "todo";
    const editingId = modal?.dataset.editCardId || null;
    const title = $("#card-title")?.value?.trim();
    if (!title) return;
    const color = $("#card-color")?.value || "#ffffff";
    const due = $("#card-due")?.value || "";
    const createdBy = $("#card-created-by")?.value?.trim() || "";
    const assignedTo = $("#card-assigned-to")?.value?.trim() || "";
    const details = $("#card-details")?.value?.trim() || "";

    let id = editingId;
    if (editingId) {
      // Editar
      const c = state.cards[editingId];
      Object.assign(c, {
        text: title,
        color,
        due,
        createdBy,
        assignedTo,
        details,
      });
      // Actualizar DOM existente
      const el = document.querySelector(`[data-card-id="${editingId}"]`);
      if (el) {
        el.style.backgroundColor = color;
        el.innerHTML = cardHTML(c);
      }
    } else {
      // Crear
      id = "c" + Math.random().toString(36).slice(2, 8);
      state.cards[id] = {
        id,
        text: title,
        color,
        due,
        createdBy,
        assignedTo,
        details,
      };
      // Pintar tarjeta
      const container = document.querySelector(`[data-list="${listId}"]`);
      const article = document.createElement("article");
      article.className =
        "card rounded p-3 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700";
      article.style.backgroundColor = color;
      article.dataset.cardId = id;
      article.innerHTML = cardHTML(state.cards[id]);
      container?.appendChild(article);
      // Inserta en el estado al final de la lista
      state.lists[listId].push(id);
    }
    // Re-inicializar draggable sobre nueva tarjeta (Sortable ya maneja DOM dinamico)
    updateCounts();
    saveLocal();

    // Cerrar modal
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");

    // Simulación API
    console.log("[sim] crear tarjeta", {
      id,
      listId,
      title,
      color,
      due,
      createdBy,
      assignedTo,
      details,
    });
  });
}

// Drag & Drop con SortableJS
function setupDnD() {
  // Listas (para reordenar listas en el futuro si se desea)
  const lists = $("#lists");
  if (window.Sortable && lists) {
    Sortable.create(lists, {
      animation: 150,
      draggable: ".list",
      handle: "header",
      ghostClass: "opacity-50",
    });
  }

  // Tarjetas por lista
  $$(".card-list").forEach((el) => {
    if (!window.Sortable) return;
    Sortable.create(el, {
      draggable: ".card",
      group: "cards",
      animation: 150,
      easing: "ease-in-out",
      ghostClass: "opacity-50", // se permite una sola clase aquí
      // IMPORTANTE: dragClass sólo acepta un token de clase. Antes se pasaba
      // "ring-2 ring-brand" y Sortable internamente hace element.classList.add(token)
      // provocando InvalidCharacterError. Si queremos varias clases, las añadimos
      // manualmente en onStart y las quitamos en onEnd.
      dragClass: "", // evitamos error (opcional, se podría omitir)
      onStart: (evt) => {
        const item = evt.item;
        // Añadimos varias clases de utilidad Tailwind de forma segura
        item.classList.add("ring-2", "ring-brand");
      },
      onEnd: (evt) => {
        const fromList = evt.from.getAttribute("data-list");
        const toList = evt.to.getAttribute("data-list");
        const cardEl = evt.item;
        const cardId = cardEl.dataset.cardId;
        // Limpiamos las clases añadidas manualmente
        cardEl.classList.remove("ring-2", "ring-brand");
        // Actualiza estado según DOM
        updateCounts();
        // Simula persistencia (a futuro será fetch a Spring Boot)
        console.log("[sim] mover tarjeta", {
          cardId,
          fromList,
          toList,
          newIndex: evt.newIndex,
        });
      },
    });
  });
}

// Acciones de tarjeta (menú 3 puntos) y abrir para ver/editar
function setupCardActions() {
  const actionsModal = document.getElementById("modal-card-actions");
  const moveModal = document.getElementById("modal-move");
  let currentCardId = null;
  let moveTargetList = null;

  // Abrir menú acciones tocando botón 3 puntos (mejor para móviles)
  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest("[data-card-menu]");
    if (!menuBtn) return;
    const card = menuBtn.closest(".card");
    if (!card) return;
    currentCardId = card.dataset.cardId;
    actionsModal?.classList.remove("hidden");
    actionsModal?.classList.add("flex");
  });

  // Abrir tarjeta al hacer click en el contenido (recomendación: un solo click)
  // Doble click es menos accesible en móviles.
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    // Evitar que el botón de menú dispare esto (ya manejado)
    if (e.target.closest("[data-card-menu]")) return;
    const id = card.dataset.cardId;
    openCardForEdit(id);
  });

  // Manejo de acciones dentro del modal de acciones
  actionsModal?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (!currentCardId) return;
    if (action === "card-edit") {
      actionsModal.classList.add("hidden");
      actionsModal.classList.remove("flex");
      openCardForEdit(currentCardId);
    } else if (action === "card-delete") {
      deleteCard(currentCardId);
      actionsModal.classList.add("hidden");
      actionsModal.classList.remove("flex");
    } else if (action === "card-move") {
      // Construir opciones de listas de destino
      const container = document.getElementById("move-list-options");
      if (container) {
        container.innerHTML = "";
        Object.keys(state.lists).forEach((listId) => {
          // opcionalmente excluir la lista actual
          const option = document.createElement("label");
          option.className = "flex items-center gap-2 text-sm";
          option.innerHTML = `<input type="radio" name="moveList" value="${listId}" class="accent-brand"/> <span>${labelForList(listId)}</span>`;
          container.appendChild(option);
        });
      }
      actionsModal.classList.add("hidden");
      actionsModal.classList.remove("flex");
      moveModal?.classList.remove("hidden");
      moveModal?.classList.add("flex");
    }
  });

  // Confirmar mover
  document.getElementById("btn-move-confirm")?.addEventListener("click", () => {
    const checked = document.querySelector('#modal-move input[name="moveList"]:checked');
    moveTargetList = checked ? checked.value : null;
    if (currentCardId && moveTargetList) {
      moveCardToList(currentCardId, moveTargetList);
    }
    moveModal?.classList.add("hidden");
    moveModal?.classList.remove("flex");
  });
}

function labelForList(listId) {
  // Podríamos mapear a títulos visuales; por ahora derivamos del header
  const listEl = document.querySelector(`.list[data-list-id="${listId}"] h2`);
  return listEl ? listEl.textContent : listId;
}

function openCardForEdit(id) {
  const c = state.cards[id];
  if (!c) return;
  // Abrimos vista de lectura en lugar de edición directa
  const viewModal = document.getElementById('modal-card-view');
  if (viewModal) {
    viewModal.dataset.cardId = id;
    const titleEl = document.getElementById('view-card-title');
    const metaEl = document.getElementById('view-card-meta');
    const detailsEl = document.getElementById('view-card-details');
    titleEl.textContent = c.text || '';
    const metaBits = [];
    if (c.due) metaBits.push('Vence: ' + c.due);
    if (c.assignedTo) metaBits.push('Asignado a: ' + c.assignedTo);
    if (c.createdBy) metaBits.push('Creado por: ' + c.createdBy);
    metaEl.textContent = metaBits.join(' • ');
    detailsEl.textContent = c.details || 'Sin detalles.';
    viewModal.classList.remove('hidden');
    viewModal.classList.add('flex');
    return; // salir sin abrir editor
  }
  // fallback (si no existe modal de vista) comportamiento previo
  const modal = document.getElementById("modal-card");
  const currentListId = Object.keys(state.lists).find((k) => state.lists[k].includes(id)) || "todo";
  modal.dataset.targetList = currentListId;
  modal.dataset.editCardId = id;
  document.getElementById("card-title").value = c.text || "";
  document.getElementById("card-color").value = c.color || "#ffffff";
  document.getElementById("card-due").value = c.due || "";
  document.getElementById("card-created-by").value = c.createdBy || "";
  document.getElementById("card-assigned-to").value = c.assignedTo || "";
  document.getElementById("card-details").value = c.details || "";
  document.getElementById("modal-card-title").textContent = "Editar actividad";
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function deleteCard(id) {
  // Quitar del estado y del DOM
  Object.keys(state.lists).forEach((listId) => {
    state.lists[listId] = state.lists[listId].filter((cid) => cid !== id);
  });
  delete state.cards[id];
  const el = document.querySelector(`[data-card-id="${id}"]`);
  el?.parentElement?.removeChild(el);
  updateCounts();
  saveLocal();
  console.log("[sim] eliminar tarjeta", { id });
}

function moveCardToList(cardId, targetList) {
  // Remover de lista actual
  const fromList = Object.keys(state.lists).find((k) => state.lists[k].includes(cardId));
  if (fromList) {
    state.lists[fromList] = state.lists[fromList].filter((id) => id !== cardId);
  }
  // Agregar al final de target
  state.lists[targetList] = state.lists[targetList] || [];
  state.lists[targetList].push(cardId);

  // Mover en DOM
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
  const targetEl = document.querySelector(`[data-list="${targetList}"]`);
  if (cardEl && targetEl) targetEl.appendChild(cardEl);
  updateCounts();
  saveLocal();
  console.log("[sim] mover tarjeta por modal", { cardId, fromList, toList: targetList });
}

// Crear nueva lista con degradado
function setupCreateList() {
  const tile = document.querySelector('[data-add-list]');
  const modal = document.getElementById('modal-list');
  tile?.addEventListener('click', () => {
    document.getElementById('list-title').value = '';
    document.getElementById('list-color1').value = '#60a5fa';
    document.getElementById('list-color2').value = '#a78bfa';
    document.getElementById('list-opacity').value = '0.15';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  // presets
  document.getElementById('list-presets')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    const [c1, c2] = btn.getAttribute('data-preset').split(',');
    document.getElementById('list-color1').value = c1;
    document.getElementById('list-color2').value = c2;
  });

  document.getElementById('btn-list-create')?.addEventListener('click', () => {
    const title = document.getElementById('list-title').value.trim();
    const c1 = document.getElementById('list-color1').value;
    const c2 = document.getElementById('list-color2').value;
    const opacity = parseFloat(document.getElementById('list-opacity').value || '0.15');
    if (!title) return;
    createList(title, c1, c2, opacity);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
}

function createList(title, c1, c2, opacity) {
  // Crear id seguro
  let base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) base = 'list';
  let id = base;
  let i = 1;
  while (state.lists[id]) {
    id = `${base}-${i++}`;
  }
  state.lists[id] = [];
  // DOM
  const li = document.createElement('li');
  li.className = 'list w-80 shrink-0 rounded-lg p-3';
  li.dataset.listId = id;
  // Aplicar degradado claro con opacidad baja
  li.style.background = `linear-gradient(135deg, ${hexToRgba(c1, opacity)} 0%, ${hexToRgba(c2, opacity)} 100%)`;
  // Contenido
  li.innerHTML = `
    <header class="mb-2 flex cursor-grab items-center justify-between">
      <h2 class="font-medium">${title}</h2>
      <span class="text-xs text-gray-500 dark:text-gray-400" data-list-count>0</span>
    </header>
    <div class="card-list space-y-3" data-list="${id}"></div>
    <button class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-600" data-add-card="${id}">
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>
      Añadir tarjeta
    </button>`;

  // Insertar antes del tile "Agregar lista"
  const ul = document.getElementById('lists');
  const tile = document.getElementById('add-list-tile');
  ul.insertBefore(li, tile);

  // Inicializar Sortable para su card-list
  const cl = li.querySelector('.card-list');
  if (window.Sortable && cl) {
    Sortable.create(cl, {
      draggable: '.card',
      group: 'cards',
      animation: 150,
      easing: 'ease-in-out',
      ghostClass: 'opacity-50',
      onStart: (evt) => evt.item.classList.add('ring-2', 'ring-brand'),
      onEnd: (evt) => {
        const cardEl = evt.item;
        cardEl.classList.remove('ring-2', 'ring-brand');
        updateCounts();
      },
    });
  }

  updateCounts();
  saveLocal();
}

// Extender cardHTML para icono de bloqueo
const _origCardHTML = cardHTML;
cardHTML = function(c) {
  const html = _origCardHTML(c);
  const locked = state.meta.cards[c.id]?.locked;
  if (!locked) return html;
  return `<div class="relative">${html}<span class="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white" title="Bloqueada"><svg viewBox='0 0 20 20' class='h-3 w-3' fill='currentColor'><path d='M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z'/></svg></span></div>`;
};

// Menú contextual simple para tarjeta (lock/unlock/delete)
function setupSimpleCardContext() {
  document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    const id = card.dataset.cardId;
    const locked = state.meta.cards[id]?.locked;
    const choice = prompt(`Acción para tarjeta:\n1 = ${locked? 'Desbloquear':'Bloquear'}\n2 = Eliminar\n(ESC cancelar)`);
    if (choice === '1') toggleCardLock(id, !locked);
    else if (choice === '2') deleteCard(id);
  });
}

// Edición lista ampliada
function setupExtendedListEditing() {
  document.getElementById('list-edit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#list-edit-id').value;
    if (!id) return;
    const meta = state.meta.lists[id] || (state.meta.lists[id] = {});
    meta.c1 = $('#list-edit-color1').value;
    meta.c2 = $('#list-edit-color2').value;
    meta.opacity = parseFloat($('#list-edit-opacity').value || '0.7');
    meta.desc = $('#list-edit-desc').value.trim();
    meta.locked = $('#list-edit-locked').checked;
    const listEl = document.querySelector(`.list[data-list-id='${id}']`);
    applyListHeaderStyles(listEl, meta);
    saveLocal();
    const modal = document.getElementById('modal-list-edit');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  // Pre-cargar colores al abrir modal existente listener ya creado -> extendemos
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-list-edit]');
    if (!btn) return;
    const id = btn.getAttribute('data-list-edit');
    const meta = state.meta.lists[id] || { c1:'#6366f1', c2:'#06b6d4', opacity:0.7, desc:'' };
    $('#list-edit-color1').value = meta.c1;
    $('#list-edit-color2').value = meta.c2;
    $('#list-edit-opacity').value = meta.opacity;
    $('#list-edit-desc').value = meta.desc || '';
    $('#list-edit-locked').checked = !!meta.locked;
  });

  // Eliminar lista
  document.getElementById('btn-list-delete')?.addEventListener('click', () => {
    const id = $('#list-edit-id').value;
    if (!id) return;
    if (!confirm('¿Eliminar lista y sus tarjetas?')) return;
    // Eliminar tarjetas de estado
    (state.lists[id] || []).forEach(cid => delete state.cards[cid]);
    delete state.lists[id];
    delete state.meta.lists[id];
    document.querySelector(`.list[data-list-id='${id}']`)?.remove();
    saveLocal();
    updateCounts();
    document.getElementById('modal-list-edit')?.classList.add('hidden');
  });
}

// Ejecutar nuevas funciones tras DOMContentLoaded
(function afterEnhancements(){
  document.addEventListener('DOMContentLoaded', () => {
    setupScrollHint();
    setupSimpleCardContext();
    setupExtendedListEditing();
    // Aplicar estilos a listas iniciales si meta existe
    Object.keys(state.lists).forEach(id => {
      if (state.meta.lists[id]) applyListHeaderStyles(document.querySelector(`.list[data-list-id='${id}']`), state.meta.lists[id]);
    });
  });
})();

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupDropdowns();
  setupModales();
  setupThemeToggle();
  setupCreateJoin();
  setupAddCard();
  loadLocal();
  setupDnD();
  setupCardActions();
  setupCreateList();
  upgradeInitialCards();
  updateCounts();
});

// Añadir listeners adicionales para vista y edición desde vista
document.addEventListener('DOMContentLoaded', () => {
  // Botón editar dentro de vista
  document.getElementById('card-view-edit')?.addEventListener('click', () => {
    const viewModal = document.getElementById('modal-card-view');
    const id = viewModal?.dataset.cardId;
    if (!id) return;
    // Cerrar vista
    viewModal.classList.add('hidden');
    viewModal.classList.remove('flex');
    // Abrir modal de edición
    const c = state.cards[id];
    if (!c) return;
    const modal = document.getElementById('modal-card');
    const currentListId = Object.keys(state.lists).find((k) => state.lists[k].includes(id)) || 'todo';
    modal.dataset.targetList = currentListId;
    modal.dataset.editCardId = id;
    document.getElementById('card-title').value = c.text || '';
    document.getElementById('card-color').value = c.color || '#ffffff';
    document.getElementById('card-due').value = c.due || '';
    document.getElementById('card-created-by').value = c.createdBy || '';
    document.getElementById('card-assigned-to').value = c.assignedTo || '';
    document.getElementById('card-details').value = c.details || '';
    document.getElementById('modal-card-title').textContent = 'Editar actividad';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  // Edición de lista (nombre y descripción)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-list-edit]');
    if (!btn) return;
    const listId = btn.getAttribute('data-list-edit');
    const listEl = document.querySelector(`.list[data-list-id="${listId}"]`);
    if (!listEl) return;
    const title = listEl.querySelector('[data-list-title]')?.textContent.trim() || '';
    const desc = listEl.querySelector('[data-list-desc]')?.textContent.trim() || '';
    document.getElementById('list-edit-id').value = listId;
    document.getElementById('list-edit-title').value = title;
    document.getElementById('list-edit-desc').value = desc;
    const modal = document.getElementById('modal-list-edit');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  document.getElementById('list-edit-form')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = document.getElementById('list-edit-id').value;
    const title = document.getElementById('list-edit-title').value.trim();
    const desc = document.getElementById('list-edit-desc').value.trim();
    if (!id || !title) return;
    const listEl = document.querySelector(`.list[data-list-id="${id}"]`);
    if (listEl) {
      const tEl = listEl.querySelector('[data-list-title]');
      const dEl = listEl.querySelector('[data-list-desc]');
      if (tEl) tEl.textContent = title;
      if (dEl) dEl.textContent = desc;
    }
    const modal = document.getElementById('modal-list-edit');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
});
