// board.js
// Carga y renderizado del tablero Kanban usando Tailwind para estilos utilitarios

(async function () {
    const boardContainer = document.getElementById('kanbanBoard');
    if (!boardContainer) return;

    try {
        const data = await fetch('./json/actividades.json').then(r => r.json());
        window.boardData = data;
        renderBoard(data);
        document.dispatchEvent(new CustomEvent('board:ready'));
    } catch (e) {
        console.error('Error cargando actividades.json', e);
        boardContainer.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">No se pudieron cargar los datos.</p>';
    }

    function renderBoard(data) {
        window.activityIndex = {}; // <-- Reiniciar índice
        const frag = document.createDocumentFragment();
        Object.entries(data).forEach(([estado, info]) => {
            const col = document.createElement('section');
            col.className = 'kanban-col flex flex-col w-72 max-h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm';
            col.setAttribute('role', 'group');
            col.setAttribute('aria-label', estado);
            col.innerHTML = `
        <header data-id-card="${info.id_card || ''}" class="col-header sticky top-0 z-10 px-3 py-3 flex items-center justify-between gap-2 rounded-t-lg border-b border-slate-200 dark:border-slate-700 text-sm font-medium dark:bg-slate-700/60" style="background-color: ${info['fondo-header'] || '#c6005c'};">
          <h2 class="truncate text-slate-700 dark:text-slate-900">${estado}</h2>
          <span class="col-count inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-brand text-white px-2 py-0.5" data-count>${info.actividades?.length || 0}</span>
        </header>
        <div class="col-body flex flex-col gap-3 p-3 overflow-y-auto scrollbar-thin" data-droplist>
          ${(info.actividades || []).map(a => {
                window.activityIndex[a.id] = { actividad: a, estado };
                return tarjetaHTML(a, estado);
            }).join('')}
        </div>
        <div class="px-3 pb-3 mb-3">
          <button type="button" data-add-activity data-estado="${estado}" class="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand">
            <span class="text-base leading-none">+</span> Añadir actividad
          </button>
        </div>
      `;
            frag.appendChild(col);
        });
        // --- NUEVO: botón añadir columna ---
        const addCol = document.createElement('div');
        addCol.className = 'w-72';
        addCol.innerHTML = `
          <button type="button" data-add-column class="m-0 w-full h-full min-h-[4.5rem] flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand hover:border-brand hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand">
            <span class="text-lg leading-none">+</span>
            <span>Nueva columna</span>
          </button>
        `;
        frag.appendChild(addCol);
        // --- FIN NUEVO ---
        boardContainer.innerHTML = '';
        boardContainer.appendChild(frag);
        // --- NUEVO: asegurar Drag & Drop para columnas recién creadas ---
        initDrag();
        updateCounts();
    }

    // Exponer funciones para re-render externo (edición en modal)
    window.renderBoard = renderBoard;
    window.updateBoard = () => renderBoard(window.boardData);

    function tarjetaHTML(a, estado) {
        const etiquetas = a.etiquetas ? `<ul class="flex flex-wrap gap-1 mt-1">${a.etiquetas.map(t => `<li class="text-[10px] tracking-wide px-2 py-0.5 rounded-full bg-brand text-white">${t}</li>`).join('')}</ul>` : '';
        return `<article data-id-act="${a.id}" data-estado="${estado}" class="kanban-card cursor-pointer relative group bg-[${a.background || 'var(--card-bg)'}] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow hover:shadow-md transition shadow-slate-200/60 dark:shadow-slate-900/40 p-3 flex flex-col gap-2 text-slate-700 dark:text-slate-200 text-sm" draggable="true" role="listitem">
          <div class="mb-2 flex flex-wrap justify-between w-full">
          <div class="flex-1">
          ${a.prioridad ? `<span class="px-1.5 py-0.3 text-xs rounded border ${prioridadClase(a.prioridad)}">${a.prioridad}</span>` : ''}
          ${a.fecha_creacion ? `<span class="ms-auto px-1.5 text-xs py-0.5 text-slate-500">⏱ ${a.fecha_creacion}</span>` : ''}
          </div>
          <span><button class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Opcion</button></span>
          </div>
          <h3 class="font-semibold leading-tight text-[13px]">${a.titulo}</h3>
          <p class="text-xs leading-snug text-slate-500 dark:text-slate-300">${a.descripcion || ''}</p>
          <div class="flex flex-col gap-1.2 text-[10px] tracking-wide">
        ${a.responsable ? `<span class="px-1.5 py-0.3 text-slate-400">Creado por: ${a.responsable}</span>` : ''}
        ${a.asignado_a ? `<span class="px-1.5 py-0.3 text-slate-400">Asignado: ${a.asignado_a}</span>` : ''}        
          </div>
          ${etiquetas}
          <div class="mt-2 flex flex-wrap justify-between w-full">
        <p class="text-xs opacity-80">🗨️ <span>${a.comentarios ? Object.values(a.comentarios).reduce((acc, obj) => acc + Object.keys(obj).length, 0) : 0}</span></p>
        ${a.fecha_limite ? `<span class="px-1.5 text-xs py-0.5 text-slate-500">⏱ Vence: ${a.fecha_limite}</span>` : ''}
          </div>
        </article>`;
    }

    function prioridadClase(p) {
        const low = 'text-slate-500 bg-lime-400 dark:text-slate-50 border-lime-500 dark:bg-lime-900';
        const med = 'text-slate-500 border-yellow-200 bg-yellow-200 dark:text-slate-50 dark:border-yellow-800 dark:bg-yellow-900';
        const hi  = 'text-white bg-red-600 border-red-800 dark:bg-red-400';
        const base = 'bg-opacity-90';
        switch ((p || '').toLowerCase()) {
            case 'alta': return hi + ' ' + base;
            case 'media': return med + ' ' + base;
            case 'baja': return low + ' ' + base;
            default: return 'text-slate-600 border-slate-300 bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:bg-slate-700';
        }
    }

    function initDrag() {
        document.querySelectorAll('[data-droplist]').forEach(list => {
            new Sortable(list, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'drag-ghost',
                onAdd: updateCounts,
                onRemove: updateCounts,
                onUpdate: updateCounts
            });
        });
    }

    function updateCounts() {
        document.querySelectorAll('.kanban-col').forEach(col => {
            const countEl = col.querySelector('[data-count]');
            const body = col.querySelector('[data-droplist]');
            if (countEl && body) countEl.textContent = body.children.length;
        });
    }
})();
