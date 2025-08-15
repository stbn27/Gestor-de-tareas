(function () {
    const modal = document.getElementById('activityModal');
    if (!modal) return;
    const overlay = modal.querySelector('[data-modal-overlay]');
    const content = document.getElementById('modalContent');
    const actions = document.getElementById('modalActions');
    const closeBtns = modal.querySelectorAll('[data-close-modal]');
    const titleEl = document.getElementById('modalTitle'); // NUEVO

    function openModal() {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        content.innerHTML = '';
        actions.innerHTML = '';
    }

    function setModalTitle(t){ if(titleEl) titleEl.textContent = t; } // NUEVO

    function fieldRow(label, value) {
        if (value == null || value === '') return '';
        return `<div class="flex gap-2 text-xs">
          <span class="font-semibold text-slate-500 dark:text-slate-300">${label}:</span>
          <span class="text-slate-700 dark:text-slate-200 break-words">${value}</span>
        </div>`;
    }

    function comentariosHTML(comentarios) {
        if (!comentarios || !comentarios.length) return '';
        // comentarios es un array de objetos { autor: texto, ... }
        const lista = comentarios.map(obj =>
            Object.entries(obj).map(([autor, texto]) =>
                `<li class="flex gap-2"><span class="font-semibold">💬 ${autor}:</span><span class="flex-1 text-slate-400">${texto}</span></li>`
            ).join('')
        ).join('');
        return `<div class="space-y-2">
          <h3 class="text-sm font-semibold">Comentarios</h3>
          <ul class="pl-3 list-disc space-y-1 text-xs">${lista}</ul>
        </div>`;
    }

    function etiquetasHTML(etiquetas) {
        if (!etiquetas || !etiquetas.length) return '';
        return `<ul class="flex flex-wrap gap-1">${etiquetas.map(e =>
            `<li class="px-2 py-0.5 rounded-full bg-brand text-white text-[10px]">${e}</li>`
        ).join('')}</ul>`;
    }

    function buildDetails(a, estado) {
        return `
          <div class="space-y-4">
            <div>
              <h2 class="text-xl font-semibold mb-1">${a.titulo || '(Sin título)'}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Estado: <span class="font-medium">${estado}</span></p>
            </div>
            ${fieldRow('Descripción', a.descripcion)}
            <div>
                <h3 class="text-sm font-semibold">Detalles</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">${a.detalles || '(Sin detalles)'}</p>
            </div>
            ${fieldRow('Prioridad', a.prioridad)}
            ${fieldRow('Responsable', a.responsable || a.creado_por)}
            ${fieldRow('Asignado a', a.asignado_a)}
            <div class="pb-3 mb-4"><hr></div>
            <span class="text-slate-400">🗓️ Fecha creación ${a.fecha_creacion}</span>
            ${fieldRow('🕛 Fecha límite', a.fecha_limite)}
            ${etiquetasHTML(a.etiquetas)}
            ${comentariosHTML(a.comentarios)}
          </div>
        `;
    }

    function buildEditForm(a) {
        return `
          <form id="editActivityForm" class="space-y-5 text-sm">
            <label class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-blue-600">Título</span>
              <input name="titulo" value="${escapeHTML(a.titulo || '')}" class="input-like border-2 border-blue-200 focus:border-blue-400 bg-blue-50 dark:bg-slate-800 dark:border-slate-600" required autocomplete="off" />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="flex flex-col gap-1 col-span-1">
                <span class="text-xs font-medium">Prioridad</span>
                <select name="prioridad" class="input-like border-2 border-pink-200 focus:border-pink-400 bg-pink-50 dark:bg-slate-800 dark:border-slate-600">
                  <option value="">(Ninguna)</option>
                  ${['Alta','Media','Baja'].map(p => `<option ${a.prioridad===p?'selected':''}>${p}</option>`).join('')}
                </select>
              </label>
              <div class="flex gap-4">
                <label class="flex-1 flex flex-col gap-1">
                  <span class="text-xs font-medium">Responsable</span>
                  <input name="responsable" value="${escapeHTML(a.responsable || a.creado_por || '')}" class="input-like bg-slate-100 dark:bg-slate-700 text-slate-400" disabled />
                </label>
                <label class="flex-1 flex flex-col gap-1">
                  <span class="text-xs font-medium">Fecha creación</span>
                  <input name="fecha_creacion" value="${escapeHTML(a.fecha_creacion || '')}" class="input-like bg-slate-100 dark:bg-slate-700 text-slate-400" disabled />
                </label>
              </div>
              <label class="flex flex-col gap-1 col-span-2">
                <span class="text-xs font-medium">Asignado a</span>
                <input name="asignado_a" value="${escapeHTML(a.asignado_a || '')}" class="input-like border-2 border-green-200 focus:border-green-400 bg-green-50 dark:bg-slate-800 dark:border-slate-600" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1 col-span-2">
                <span class="text-xs font-medium">Fecha límite</span>
                <input name="fecha_limite" value="${escapeHTML(a.fecha_limite || '')}" class="input-like border-2 border-yellow-200 focus:border-yellow-400 bg-yellow-50 dark:bg-slate-800 dark:border-slate-600" autocomplete="off" />
              </label>
            </div>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Descripción</span>
              <textarea name="descripcion" rows="2" class="input-like border-2 border-indigo-200 focus:border-indigo-400 bg-indigo-50 dark:bg-slate-800 dark:border-slate-600 resize-y" autocomplete="off">${escapeHTML(a.descripcion || '')}</textarea>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Detalles</span>
              <textarea name="detalles" rows="3" class="input-like border-2 border-gray-200 focus:border-gray-400 bg-gray-50 dark:bg-slate-800 dark:border-slate-600 resize-y" autocomplete="off">${escapeHTML(a.detalles || '')}</textarea>
            </label>
          </form>
        `;
    }

    // --- NUEVO: helpers creación ---
    function getNextActivityId() {
        let max = 0;
        Object.values(window.boardData || {}).forEach(col =>
            (col.actividades || []).forEach(a => { if (a.id > max) max = a.id; })
        );
        return max + 1;
    }

    function buildCreateForm(estado) {
        return `
        <form id="createActivityForm" class="space-y-5 text-sm">
          <div>
            <h2 class="text-lg font-semibold">Nueva actividad</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Columna: <span class="font-medium">${estado}</span></p>
          </div>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium">Título *</span>
            <input name="titulo" required class="input-like" placeholder="Título descriptivo" />
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Prioridad</span>
              <select name="prioridad" class="input-like">
                <option value="">(Ninguna)</option>
                <option>Alta</option><option>Media</option><option>Baja</option>
              </select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Asignado a</span>
              <input name="asignado_a" class="input-like" placeholder="Persona asignada" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Responsable</span>
              <input name="responsable" class="input-like" placeholder="Creador / responsable" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Fecha límite</span>
              <input name="fecha_limite" class="input-like" placeholder="dd-mm-aaaa" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Color fondo</span>
              <input type="color" name="background" value="#ffffff" class="input-like p-1 h-9" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Etiquetas</span>
              <input name="etiquetas" class="input-like" placeholder="backend, api, ui" />
            </label>
          </div>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium">Descripción</span>
            <textarea name="descripcion" rows="2" class="input-like resize-y" placeholder="Resumen corto"></textarea>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium">Detalles</span>
            <textarea name="detalles" rows="3" class="input-like resize-y" placeholder="Detalles adicionales"></textarea>
          </label>
        </form>
      `;
    }

    function openCreateActivity(estado) {
        content.innerHTML = buildCreateForm(estado);
        actions.innerHTML = '';
        setModalTitle('Nueva actividad'); // NUEVO
        const saveBtn = btn('Crear', 'bg-brand text-white hover:bg-brand-600', () => saveNewActivity(estado));
        const cancelBtn = btn('Cancelar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', closeModal);
        actions.append(saveBtn, cancelBtn);
        openModal();
    }

    function saveNewActivity(estado) {
        const form = document.getElementById('createActivityForm');
        if (!form) return;
        if (!form.reportValidity()) return;
        const fd = new FormData(form);
        const nuevo = {
            id: getNextActivityId(),
            titulo: (fd.get('titulo') || '').toString().trim()
        };
        ['prioridad','asignado_a','responsable','fecha_limite','descripcion','detalles','background'].forEach(k => {
            const v = (fd.get(k) || '').toString().trim();
            if (v) nuevo[k] = v;
        });
        const etiquetasRaw = (fd.get('etiquetas') || '').toString()
            .split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        if (etiquetasRaw.length) nuevo.etiquetas = etiquetasRaw;
        const hoy = new Date();
        nuevo.fecha_creacion = hoy.toLocaleDateString('es-ES');
        // Insertar en memoria
        if (window.boardData?.[estado]) {
            window.boardData[estado].actividades = window.boardData[estado].actividades || [];
            window.boardData[estado].actividades.push(nuevo);
            if (window.updateBoard) window.updateBoard();
            closeModal();
            // Abrir detalle recién creado
            requestAnimationFrame(() => openActivity(String(nuevo.id)));
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function openActivity(id) {
        if (!window.activityIndex) return;
        const entry = window.activityIndex[id];
        if (!entry) return;
        const { actividad, estado } = entry;
        content.innerHTML = buildDetails(actividad, estado);
        actions.innerHTML = '';
        setModalTitle('Detalle de actividad'); // NUEVO
        const editBtn = btn('Editar', 'bg-brand text-white hover:bg-brand-600', () => enterEdit(actividad, estado));
        const closeBtn = btn('Cerrar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', closeModal);
        actions.append(editBtn, closeBtn);
        openModal();
    }

    function enterEdit(a, estado) {
        content.innerHTML = buildEditForm(a);
        actions.innerHTML = '';
        setModalTitle('Editar actividad'); // NUEVO
        const saveBtn = btn('Guardar', 'bg-emerald-600 text-white hover:bg-emerald-700', () => saveEdit(a, estado));
        const cancelBtn = btn('Cancelar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', () => {
            content.innerHTML = buildDetails(a, estado);
            actions.innerHTML = '';
            const editBtn = btn('Editar', 'bg-brand text-white hover:bg-brand-600', () => enterEdit(a, estado));
            const closeBtn = btn('Cerrar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', closeModal);
            actions.append(editBtn, closeBtn);
        });
        actions.append(saveBtn, cancelBtn);
    }

    function saveEdit(a, estado) {
        const form = document.getElementById('editActivityForm');
        if (!form) return;
        const fd = new FormData(form);
        ['titulo','prioridad','responsable','asignado_a','fecha_creacion','fecha_limite','descripcion','detalles']
            .forEach(k => {
                const val = (fd.get(k) || '').toString().trim();
                if (val) a[k] = val; else delete a[k];
            });
        // Persistencia sólo en memoria
        if (window.updateBoard) window.updateBoard();
        content.innerHTML = buildDetails(a, estado);
        actions.innerHTML = '';
        const editBtn = btn('Editar', 'bg-brand text-white hover:bg-brand-600', () => enterEdit(a, estado));
        const closeBtn = btn('Cerrar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', closeModal);
        actions.append(editBtn, closeBtn);
    }

    // --- NUEVO: helpers para columnas ---
    function getNextCardId() {
        let max = 0;
        Object.values(window.boardData || {}).forEach(c => {
            const id = parseInt(c.id_card, 10);
            if (!isNaN(id) && id > max) max = id;
        });
        return String(max + 1);
    }

    function buildCreateColumnForm() {
        return `
          <form id="createColumnForm" class="space-y-5 text-sm">
            <h2 class="text-lg font-semibold">Nueva columna</h2>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Nombre / Estado *</span>
              <input name="nombre" required class="input-like" placeholder="Ej: En pruebas" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium">Descripción</span>
              <textarea name="descripcion" rows="2" class="input-like resize-y" placeholder="Descripción opcional"></textarea>
            </label>
            <div class="grid gap-4 sm:grid-cols-3">
              <label class="flex flex-col gap-1">
                <span class="text-xs font-medium">Color encabezado</span>
                <input type="color" name="fondo_header" value="#c6005c" class="input-like p-1 h-9" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs font-medium">ID (auto)</span>
                <input disabled value="${getNextCardId()}" class="input-like text-slate-400 dark:text-slate-500" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs font-medium">Fecha creación (auto)</span>
                <input disabled value="${new Date().toLocaleDateString('es-ES')}" class="input-like text-slate-400 dark:text-slate-500" />
              </label>
            </div>
          </form>
        `;
    }

    function openCreateColumn() {
        content.innerHTML = buildCreateColumnForm();
        actions.innerHTML = '';
        setModalTitle('Nueva columna');
        const saveBtn = btn('Crear', 'bg-brand text-white hover:bg-brand-600', saveNewColumn);
        const cancelBtn = btn('Cancelar', 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600', closeModal);
        actions.append(saveBtn, cancelBtn);
        openModal();
    }

    function saveNewColumn() {
        const form = document.getElementById('createColumnForm');
        if (!form || !form.reportValidity()) return;
        const fd = new FormData(form);
        const nombre = (fd.get('nombre') || '').toString().trim();
        if (!nombre) return;
        if (window.boardData[nombre]) {
            alert('Ya existe una columna con ese nombre.');
            return;
        }
        const hoy = new Date().toLocaleDateString('es-ES');
        window.boardData[nombre] = {
            id_card: getNextCardId(),
            creacion: hoy,
            modificacion: hoy,
            descripcion: (fd.get('descripcion') || '').toString().trim(),
            estado: nombre,
            'fondo-header': (fd.get('fondo_header') || '#c6005c').toString(),
            actividades: []
        };
        if (window.updateBoard) window.updateBoard();
        closeModal();
        // Scroll suave a la nueva columna
        requestAnimationFrame(() => {
            const cols = document.querySelectorAll('.kanban-col');
            const last = cols[cols.length - 1];
            last?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
        });
    }
    // --- FIN NUEVO ---

    function btn(txt, cls, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `px-3 py-2 rounded-md text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-brand ${cls}`;
        b.textContent = txt;
        b.addEventListener('click', onClick);
        return b;
    }

    // Delegación de clic (extender)
    document.addEventListener('click', e => {
        const addColBtn = e.target.closest('[data-add-column]'); // NUEVO
        if (addColBtn) {
            e.preventDefault();
            openCreateColumn();
            return;
        }
        const addBtn = e.target.closest('[data-add-activity]');
        if (addBtn) {
            e.preventDefault();
            openCreateActivity(addBtn.getAttribute('data-estado'));
            return;
        }
        const card = e.target.closest('article[data-id-act]');
        if (card) {
            e.preventDefault();
            openActivity(card.getAttribute('data-id-act'));
        }
    });

    // Cierre
    overlay?.addEventListener('click', closeModal);
    closeBtns.forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });

    // Estilos utilitarios mínimos para inputs (puede integrarse a tu CSS)
    const style = document.createElement('style');
    style.textContent = `
      .input-like { background: var(--tw-bg,theme(colors.white)); border:1px solid theme(colors.slate.300); padding:0.4rem 0.55rem; border-radius:0.375rem; font-size:0.75rem; line-height:1.1rem; }
      .dark .input-like { background: theme(colors.slate.800); border-color: theme(colors.slate.600); color: theme(colors.slate.100); }
      .input-like:focus { outline:none; box-shadow:0 0 0 2px var(--tw-ring-color,rgba(244,114,182,.5)); border-color: var(--tw-ring-color,rgba(244,114,182,.5)); }
    `;
    document.head.appendChild(style);
})();
