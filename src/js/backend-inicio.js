(function () {
    // =========================
    // Config / Estado
    // =========================
    const RUTA_JSON = './json/tablero2.json';
    const currentUserId = document.body.getAttribute('data-usuario-actual') || '0';
    const FAVORITES_KEY = 'tableros_favoritos_' + currentUserId;

    const grid = document.getElementById('grid-tableros');
    const tpl = document.getElementById('template-tablero');
    const contador = document.getElementById('contador-tableros');

    let tableros = [];          // Normalizados
    let userFavorites = cargarFavoritos();
    const state = { filtro: 'todos', cargando: false, error: null };

    const RUTA_CODIGOS = './json/codigos-compartidos.json';
    const RUTA_USUARIOS = './json/usuarios.json';
    let cacheCodigos = null;
    let cacheUsuarios = null;
    let currentShareBoardId = null;

    // =========================
    // Utilidades
    // =========================
    function cargarFavoritos() {
        try {
            const raw = localStorage.getItem(FAVORITES_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return new Set(arr);
        } catch (e) {
            console.warn('[tableros] Favoritos corruptos, reiniciando.', e);
        }
        return new Set();
    }
    function guardarFavoritos() {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify([...userFavorites]));
        } catch (e) {
            console.warn('[tableros] No se pudieron guardar favoritos.', e);
        }
    }

    function formatearFecha(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function mapJsonToTablero(raw) {
        const miembros = Array.isArray(raw.miembros) ? raw.miembros : [];
        const propietario = raw['id-usuario'] === currentUserId;

        let soloLectura = false;
        if (!propietario) {
            const yo = miembros.find(m => m.usuario === currentUserId);
            if (yo) {
                const perms = Array.isArray(yo.permiso) ? yo.permiso : [];
                soloLectura = perms.includes('Lectura') && !perms.includes('Escritura');
            }
        }

        // Migración: si el JSON marca is-favorito y el usuario actual es el propietario,
        // se añade como favorito inicial (solo primera vez si no estaba).
        if (propietario && raw['is-favorito'] === true && !userFavorites.has(raw['id-tablero'])) {
            userFavorites.add(raw['id-tablero']);
            guardarFavoritos();
        }

        return {
            id: raw['id-tablero'],
            titulo: raw.titulo || 'Sin título',
            descripcion: raw.descripcion || 'Sin descripción',
            creado: raw.fecha_creacion,
            propietario,
            soloLectura,
            miembros
        };
    }

    function isFavorito(id) {
        return userFavorites.has(id);
    }

    function pasaFiltro(tb) {
        switch (state.filtro) {
            case 'propios': return tb.propietario;
            case 'compartidos': return (tb.miembros?.length || 0) > 0;
            case 'favoritos': return isFavorito(tb.id);
            default: return true;
        }
    }

    function mostrarMensajeVacio(texto) {
        const prev = grid.querySelector('.mensaje-vacio');
        if (prev) prev.remove();
        const btnCrear = document.getElementById('btn-crear-tablero-grid');
        const div = document.createElement('div');
        div.className = 'mensaje-vacio col-span-full flex flex-col items-center justify-center gap-2 py-10 text-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300';
        div.innerHTML = `<p class="text-sm">${texto}</p><p class="text-xs opacity-70">Pruebe cambiar el filtro o crear un nuevo tablero.</p>`;
        grid.insertBefore(div, btnCrear);
    }

    function limpiarMensajesVacio() {
        grid.querySelectorAll('.mensaje-vacio').forEach(n => n.remove());
    }

    // =========================
    // Render
    // =========================
    function render() {
        if (!grid || !tpl) {
            console.warn('[tableros] Grid o template no encontrados en el DOM.');
            return;
        }
        [...grid.querySelectorAll('.tablero-card')].forEach(n => n.remove());
        limpiarMensajesVacio();

        let visibles = 0;
        tableros.forEach(tb => {
            if (!pasaFiltro(tb)) return;
            visibles++;

            const node = tpl.content.firstElementChild.cloneNode(true);
            node.dataset.id = tb.id;
            node.querySelector('.titulo').textContent = tb.titulo;
            node.querySelector('.descripcion').textContent = tb.descripcion;
            node.querySelector('.valor-fecha').textContent = formatearFecha(tb.creado);

            const miembrosCount = tb.miembros?.length || 0;
            const esMiembroNoProp = !tb.propietario && tb.miembros.some(m => m.usuario === currentUserId);

            if (tb.propietario) {
                if (miembrosCount > 0) {
                    node.querySelector('.badge-compartido')?.classList.remove('hidden');
                } else {
                    node.querySelector('.privado')?.classList.remove('hidden');
                }
            } else if (esMiembroNoProp) {
                node.querySelector('.badge-conmigo')?.classList.remove('hidden');
                // Si el dueño no añadió otros miembros aparte de mí (caso poco usual), ya estaríamos aquí igual.
            } else {
                // fallback: privado si llega a darse
                node.querySelector('.privado')?.classList.remove('hidden');
            }

            if (tb.soloLectura) node.querySelector('.lectura')?.classList.remove('hidden');
            if (!tb.propietario) node.querySelector('.salir')?.classList.remove('hidden');

            if (isFavorito(tb.id)) {
                const favBtn = node.querySelector('.marcar-favorito');
                favBtn.classList.add('text-yellow-500');
                node.querySelector('.icono-favorito')?.classList.add('fill-yellow-400');
            }

            grid.insertBefore(node, document.getElementById('btn-crear-tablero-grid'));
        });

        if (visibles === 0 && !state.error) mostrarMensajeVacio('No hay tableros para este filtro.');
        if (state.error) mostrarMensajeVacio('Ocurrió un error al cargar los tableros.');
        contador.textContent = visibles;
    }

    // =========================
    // Carga remota
    // =========================
    async function cargarTableros() {
        state.cargando = true;
        state.error = null;
        render();
        try {
            const resp = await fetch(RUTA_JSON, { cache: 'no-store' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            if (!Array.isArray(data)) throw new Error('Formato inválido (se esperaba un array)');
            tableros = data.map(mapJsonToTablero);
            console.info('[tableros] Cargados:', tableros.length);
            if (tableros.length === 0) console.warn('[tableros] El JSON está vacío.');
        } catch (e) {
            console.error('[tableros] Error cargando tableros:', e);
            state.error = e.message;
        } finally {
            state.cargando = false;
            render();
        }
    }

    // =========================
    // Acciones
    // =========================
    function buscar(id) { return tableros.find(t => t.id === id); }

    function abrirTablero(id) { console.log('Abrir tablero', id); }

    async function abrirModalCompartir(id) {
        currentShareBoardId = id;
        await Promise.all([cargarCodigos(), cargarUsuarios()]);
        document.getElementById('modal-compartir')?.classList.remove('hidden');
        renderCompartir(id);
    }

    function abrirModalUsuarios(id) {
        abrirModalCompartir(id);
    }

    function eliminarTablero(id) {
        const t = buscar(id);
        if (!t) return;
        document.getElementById('modal-eliminar')?.classList.remove('hidden');
        const btn = document.getElementById('btn-confirmar-eliminar');
        if (btn) {
            btn.onclick = () => {
                tableros = tableros.filter(t => t.id !== id);
                userFavorites.delete(id);
                guardarFavoritos();
                document.getElementById('modal-eliminar')?.classList.add('hidden');
                render();
            };
        }
    }

    function renombrarTablero(id) {
        const t = buscar(id);
        if (!t) return;
        document.getElementById('modal-agregar-tablero')?.classList.remove('hidden');
        // Aquí podrías prellenar inputs
    }

    function duplicarTablero(id) {
        const t = buscar(id);
        if (!t) return;
        const copia = {
            ...t,
            id: 'c' + Date.now(),
            titulo: t.titulo + ' (copia)',
            creado: new Date().toISOString(),
            propietario: true
        };
        tableros.unshift(copia);
        // No se marca favorito automáticamente
        render();
    }

    function toggleFavorito(id) {
        if (userFavorites.has(id)) userFavorites.delete(id);
        else userFavorites.add(id);
        guardarFavoritos();
        render();
    }

    function salirDeTablero(id) {
        if (!confirm('¿Salir del tablero?')) return;
        // Simplemente lo quitamos de la lista local.
        tableros = tableros.filter(t => t.id !== id);
        userFavorites.delete(id);
        guardarFavoritos();
        render();
    }

    function crearTablero() {
        document.getElementById('modal-agregar-tablero')?.classList.remove('hidden');
    }

    // =========================
    // Menús / eventos
    // =========================
    function cerrarMenus() {
        document.querySelectorAll('.menu-acciones').forEach(m => m.classList.add('hidden'));
    }

    function manejarAccion(id, action) {
        switch (action) {
            case 'abrir': abrirTablero(id); break;
            case 'compartir': abrirModalCompartir(id); break;
            case 'usuarios': abrirModalUsuarios(id); break;
            case 'eliminar': eliminarTablero(id); break;
            case 'renombrar': renombrarTablero(id); break;
            case 'duplicar': duplicarTablero(id); break;
            case 'favorito': toggleFavorito(id); break;
            case 'salir': salirDeTablero(id); break;
            default: console.debug('[tableros] Acción ignorada:', action);
        }
    }

    // Filtros
    document.querySelectorAll('.filtro-tablero').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-tablero')
                .forEach(b => b.classList.remove('bg-brand', 'text-white'));
            document.querySelectorAll('.filtro-tablero')
                .forEach(b => b.classList.add('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200'));
            btn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200');
            btn.classList.add('bg-brand', 'text-white');
            state.filtro = btn.dataset.filtro;
            render();
        });
    });

    // Delegación global
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-menu')) {
            const card = e.target.closest('.tablero-card');
            const menu = card?.querySelector('.menu-acciones');
            if (menu) {
                cerrarMenus();
                menu.classList.toggle('hidden');
            }
            return;
        }
        if (!e.target.closest('.menu-acciones')) cerrarMenus();

        const accionBtn = e.target.closest('.accion');
        if (accionBtn) {
            const card = accionBtn.closest('.tablero-card');
            if (card) manejarAccion(card.dataset.id, accionBtn.dataset.action);
        }

        if (e.target.matches('[data-action="abrir"], [data-action="abrir"] *')) {
            const card = e.target.closest('.tablero-card');
            if (card) abrirTablero(card.dataset.id);
        }

        if (e.target.closest('[data-action="favorito-toggle"]')) {
            const card = e.target.closest('.tablero-card');
            if (card) toggleFavorito(card.dataset.id);
        }

        if (e.target.id === 'btn-crear-tablero-grid') {
            crearTablero();
        }
    });

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) crearTablero();
        if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            document.getElementById('modal-unirse')?.classList.remove('hidden');
        }
    });

    // Init
    cargarTableros();

    // Utilidades nuevas para compartir
    async function cargarCodigos() {
        if (cacheCodigos) return cacheCodigos;
        const resp = await fetch(RUTA_CODIGOS, { cache: 'no-store' });
        cacheCodigos = await resp.json();
        return cacheCodigos;
    }
    async function cargarUsuarios() {
        if (cacheUsuarios) return cacheUsuarios;
        const resp = await fetch(RUTA_USUARIOS, { cache: 'no-store' });
        cacheUsuarios = await resp.json();
        return cacheUsuarios;
    }

    function getCodigosTablero(id) {
        const entry = (cacheCodigos || []).find(e => e['id-tablero'] === id);
        if (!entry) return { links: [], codigos: [] };
        return {
            links: Array.isArray(entry.links) ? entry.links : [],
            codigos: Array.isArray(entry.codigos) ? entry.codigos : []
        };
    }

    function findLink(cStruct, tipo) {
        return cStruct.links.find(l => l.tipo === tipo) || null;
    }
    function findCode(cStruct, tipo) {
        return cStruct.codigos.find(c => c.tipo === tipo) || null;
    }

    function generarLink(idTablero, tipo) {
        return {
            tipo,
            url: location.origin + '/share/' + idTablero + '/' + tipo + '/' + Math.random().toString(36).slice(2, 10),
            creado: new Date().toISOString(),
            caducidad: null
        };
    }
    function generarCodigo(tipo) {
        return {
            tipo,
            code: Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''),
            creado: new Date().toISOString(),
            caducidad: null
        };
    }

    function upsertLink(boardId, linkObj) {
        let entry = cacheCodigos.find(e => e['id-tablero'] === boardId);
        if (!entry) {
            entry = { 'id-tablero': boardId, links: [], codigos: [] };
            cacheCodigos.push(entry);
        }
        const idx = entry.links.findIndex(l => l.tipo === linkObj.tipo);
        if (idx >= 0) entry.links[idx] = linkObj; else entry.links.push(linkObj);
    }
    function deleteLink(boardId, tipo) {
        const entry = cacheCodigos.find(e => e['id-tablero'] === boardId);
        if (!entry) return;
        entry.links = entry.links.filter(l => l.tipo !== tipo);
    }
    function upsertCode(boardId, codeObj) {
        let entry = cacheCodigos.find(e => e['id-tablero'] === boardId);
        if (!entry) {
            entry = { 'id-tablero': boardId, links: [], codigos: [] };
            cacheCodigos.push(entry);
        }
        const idx = entry.codigos.findIndex(c => c.tipo === codeObj.tipo);
        if (idx >= 0) entry.codigos[idx] = codeObj; else entry.codigos.push(codeObj);
    }
    function deleteCode(boardId, tipo) {
        const entry = cacheCodigos.find(e => e['id-tablero'] === boardId);
        if (!entry) return;
        entry.codigos = entry.codigos.filter(c => c.tipo !== tipo);
    }

    function setCaducidad24h(obj, activar) {
        if (!obj) return;
        obj.caducidad = activar ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    }

    function renderCompartir(boardId) {
        const t = buscar(boardId);
        if (!t) return;

        const cStruct = getCodigosTablero(boardId);
        // LINK
        const permisoLink = document.getElementById('share-link-permiso')?.value || 'rw';
        const linkObj = findLink(cStruct, permisoLink);
        const linkWrapper = document.getElementById('share-link-wrapper');
        const linkText = document.getElementById('share-link-text');
        const linkExp = document.getElementById('share-link-exp');
        const btnCopyLink = document.getElementById('btn-copy-link');
        const btnDelLink = document.getElementById('btn-del-link');
        if (linkObj) {
            linkWrapper?.classList.remove('blur-sm');
            linkText.textContent = linkObj.url;
            btnCopyLink.disabled = false;
            btnDelLink.disabled = false;
            if (linkObj.caducidad) {
                linkExp.textContent = 'Expira ' + formatearFecha(linkObj.caducidad);
                linkExp.classList.remove('hidden');
            } else linkExp.classList.add('hidden');
            // checkbox expira
            document.getElementById('share-link-expira').checked = !!linkObj.caducidad;
        } else {
            linkWrapper?.classList.add('blur-sm');
            linkText.textContent = 'Sin link (' + (permisoLink === 'rw' ? 'Lect/Escr' : 'Lectura') + ')';
            btnCopyLink.disabled = true;
            btnDelLink.disabled = true;
            linkExp.classList.add('hidden');
            document.getElementById('share-link-expira').checked = false;
        }

        // CÓDIGO
        const permisoCode = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
        const codeObj = findCode(cStruct, permisoCode);
        const codeSpan = document.getElementById('share-code-value');
        const codeExp = document.getElementById('share-code-exp');
        const btnCopyCode = document.getElementById('btn-copy-code');
        const btnDelCode = document.getElementById('btn-del-code');
        if (codeObj) {
            codeSpan.textContent = codeObj.code;
            codeSpan.classList.remove('blur-sm');
            btnCopyCode.disabled = false;
            btnDelCode.disabled = false;
            if (codeObj.caducidad) {
                codeExp.textContent = 'Expira ' + formatearFecha(codeObj.caducidad);
                codeExp.classList.remove('hidden');
            } else codeExp.classList.add('hidden');
            document.getElementById('share-code-expira').checked = !!codeObj.caducidad;
        } else {
            codeSpan.textContent = '──────';
            codeSpan.classList.add('blur-sm');
            btnCopyCode.disabled = true;
            btnDelCode.disabled = true;
            codeExp.classList.add('hidden');
            document.getElementById('share-code-expira').checked = false;
        }

        // Miembros
        renderMiembros(t);
    }

    function renderMiembros(tablero) {
        const tbody = document.getElementById('tabla-miembros');
        if (!tbody) return;
        tbody.innerHTML = '';
        const miembros = tablero.miembros || [];
        if (miembros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-4 text-center text-gray-500 dark:text-gray-400">Sin miembros</td></tr>';
            return;
        }
        miembros.forEach(m => {
            const usr = (cacheUsuarios || []).find(u => String(u.id) === String(m.usuario));
            const nombre = usr ? (usr.nombre + ' ' + usr.apellidos) : 'Usuario ' + m.usuario;
            const perms = Array.isArray(m.permiso) ? m.permiso.join(', ') : '';
            const soloLect = perms.includes('Lectura') && !perms.includes('Escritura');
            const tipo = soloLect ? 'Lectura' : 'Lect / Escr';
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/40 transition';
            tr.innerHTML = `
                <td class="px-3 py-2">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            ${nombre.charAt(0).toUpperCase()}
                        </span>
                        <span class="truncate">${nombre}</span>
                    </div>
                </td>
                <td class="px-3 py-2">${perms}</td>
                <td class="px-3 py-2">${tipo}</td>
                <td class="px-3 py-2 text-right">
                    <button class="text-xs text-red-600 dark:text-red-400 hover:underline" data-miembro-remove="${m.usuario}">Quitar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Event handlers compartir
    document.addEventListener('change', (e) => {
        if (e.target.id === 'share-link-permiso' || e.target.name === 'share-code-perm') {
            if (currentShareBoardId) renderCompartir(currentShareBoardId);
        }
        if (e.target.id === 'share-link-expira') {
            const permiso = document.getElementById('share-link-permiso').value;
            const cStruct = getCodigosTablero(currentShareBoardId);
            const linkObj = findLink(cStruct, permiso);
            if (linkObj) {
                setCaducidad24h(linkObj, e.target.checked);
                renderCompartir(currentShareBoardId);
            }
        }
        if (e.target.id === 'share-code-expira') {
            const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
            const cStruct = getCodigosTablero(currentShareBoardId);
            const codeObj = findCode(cStruct, permiso);
            if (codeObj) {
                setCaducidad24h(codeObj, e.target.checked);
                renderCompartir(currentShareBoardId);
            }
        }
    });

    document.addEventListener('click', (e) => {
        // Generar link
        if (e.target.id === 'btn-gen-link') {
            const tipo = document.getElementById('share-link-permiso').value;
            const link = generarLink(currentShareBoardId, tipo);
            const expira = document.getElementById('share-link-expira').checked;
            setCaducidad24h(link, expira);
            upsertLink(currentShareBoardId, link);
            renderCompartir(currentShareBoardId);
        }
        // Copiar link
        if (e.target.id === 'btn-copy-link') {
            const permiso = document.getElementById('share-link-permiso').value;
            const linkObj = findLink(getCodigosTablero(currentShareBoardId), permiso);
            if (linkObj) {
                navigator.clipboard.writeText(linkObj.url);
                notificar('Link copiado');
            }
        }
        // Eliminar link
        if (e.target.id === 'btn-del-link') {
            const permiso = document.getElementById('share-link-permiso').value;
            deleteLink(currentShareBoardId, permiso);
            renderCompartir(currentShareBoardId);
        }
        // Generar código
        if (e.target.id === 'btn-gen-code') {
            const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
            const code = generarCodigo(permiso);
            const expira = document.getElementById('share-code-expira').checked;
            setCaducidad24h(code, expira);
            upsertCode(currentShareBoardId, code);
            renderCompartir(currentShareBoardId);
        }
        // Copiar código
        if (e.target.id === 'btn-copy-code') {
            const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
            const codeObj = findCode(getCodigosTablero(currentShareBoardId), permiso);
            if (codeObj) {
                navigator.clipboard.writeText(codeObj.code);
                notificar('Código copiado');
            }
        }
        // Eliminar código
        if (e.target.id === 'btn-del-code') {
            const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
            deleteCode(currentShareBoardId, permiso);
            renderCompartir(currentShareBoardId);
        }
        // Quitar miembro (solo UI)
        if (e.target.dataset.miembroRemove) {
            const miembroId = e.target.dataset.miembroRemove;
            const tablero = buscar(currentShareBoardId);
            if (tablero) {
                tablero.miembros = tablero.miembros.filter(m => String(m.usuario) !== miembroId);
                renderMiembros(tablero);
                render(); // actualización de tarjetas (badges)
            }
        }
    });

    function notificar(msg) {
        const n = document.createElement('div');
        n.textContent = msg;
        n.className = 'fixed bottom-4 right-4 bg-gray-900 text-white text-xs px-3 py-2 rounded shadow animate-fade';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 1500);
    }
})();

