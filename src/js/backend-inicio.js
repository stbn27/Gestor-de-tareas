
(function () {
    const grid = document.getElementById('grid-tableros');
    const tpl = document.getElementById('template-tablero');
    const contador = document.getElementById('contador-tableros');

    // Datos de ejemplo
    let tableros = [
        { id: 't1', titulo: 'Marketing Q4', descripcion: 'Campañas y contenidos para el trimestre.', creado: '2024-10-01', compartido: true, propietario: true, favorito: true, soloLectura: false, archivado: false },
        { id: 't2', titulo: 'Desarrollo Producto', descripcion: 'Roadmap y sprints del producto principal.', creado: '2024-09-15', compartido: true, propietario: false, favorito: false, soloLectura: true, archivado: false },
        { id: 't3', titulo: 'Personal', descripcion: 'Tareas personales y listas rápidas.', creado: '2024-11-05', compartido: false, propietario: true, favorito: false, soloLectura: false, archivado: false },
        { id: 't4', titulo: 'Ideas', descripcion: 'Banco de ideas y experimentos.', creado: '2024-08-20', compartido: false, propietario: true, favorito: false, soloLectura: false, archivado: true },
    ];

    const state = { filtro: 'todos' };

    function formatearFecha(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function render() {
        // Eliminar tarjetas actuales (menos la de crear)
        [...grid.querySelectorAll('.tablero-card')].forEach(n => n.remove());
        let visibles = 0;
        tableros.forEach(tb => {
            if (!pasaFiltro(tb)) return;
            visibles++;
            const node = tpl.content.firstElementChild.cloneNode(true);
            node.dataset.id = tb.id;
            node.querySelector('.titulo').textContent = tb.titulo;
            node.querySelector('.descripcion').textContent = tb.descripcion || 'Sin descripción';
            node.querySelector('.valor-fecha').textContent = formatearFecha(tb.creado);
            if (tb.compartido) node.querySelector('.badge-compartido').classList.remove('hidden');
            if (tb.archivado) node.querySelector('.badge-archivado').classList.remove('hidden');
            if (!tb.compartido) node.querySelector('.privado').classList.remove('hidden');
            if (tb.soloLectura) node.querySelector('.lectura').classList.remove('hidden');
            if (!tb.propietario) node.querySelector('.salir').classList.remove('hidden');
            if (tb.favorito) {
                node.querySelector('.marcar-favorito').classList.add('text-yellow-500');
                node.querySelector('.icono-favorito').classList.add('fill-yellow-400');
            }
            grid.insertBefore(node, document.getElementById('btn-crear-tablero-grid'));
        });
        contador.textContent = visibles;
    }

    function pasaFiltro(tb) {
        switch (state.filtro) {
            case 'propios': return tb.propietario;
            case 'compartidos': return tb.compartido;
            case 'favoritos': return tb.favorito;
            case 'archivados': return tb.archivado;
            default: return true;
        }
    }

    // Filtros
    document.querySelectorAll('.filtro-tablero').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-tablero').forEach(b => b.classList.remove('bg-brand', 'text-white'));
            document.querySelectorAll('.filtro-tablero').forEach(b => b.classList.add('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200'));
            btn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200');
            btn.classList.add('bg-brand', 'text-white');
            state.filtro = btn.dataset.filtro;
            render();
        });
    });

    // Delegación acciones
    document.addEventListener('click', (e) => {

        // Menú acciones dropdown
        if (e.target.closest('.btn-menu')) {
            const card = e.target.closest('.tablero-card');
            const menu = card.querySelector('.menu-acciones');
            cerrarMenus();
            menu.classList.toggle('hidden');
            return;
        }
        if (!e.target.closest('.menu-acciones')) cerrarMenus();

        //=================================================
        // Acciones dentro de un tablero(opciones del menú)
        //=================================================
        const accionBtn = e.target.closest('.accion');
        if (accionBtn) {
            const card = accionBtn.closest('.tablero-card');
            const id = card.dataset.id;
            manejarAccion(id, accionBtn.dataset.action);
        }

        // Abrir tablero
        if (e.target.matches('[data-action="abrir"], [data-action="abrir"] *')) {
            const card = e.target.closest('.tablero-card');
            if (card) abrirTablero(card.dataset.id);
            alert('Abrir tablero (pendiente)');
        }

        // Favorito toggle
        if (e.target.closest('[data-action="favorito-toggle"]')) {
            const card = e.target.closest('.tablero-card');
            toggleFavorito(card.dataset.id);
        }

        // Crear tablero - Ultima tarjeta
        if (e.target.id === 'btn-crear-tablero-grid') {
            crearTablero();
        }

        // Generar códigos de compartir de 6 digitos
        if (e.target.id === 'btn-regenerar-codigos') {
            generarCodigosCompartir();
        }
    });

    // Cerrar todos los dropdowns de acciones
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
            case 'archivar': archivarTablero(id); break;
            case 'favorito': toggleFavorito(id); break;
            case 'salir': salirDeTablero(id); break;
        }
    }

    function buscar(id) {
        return tableros.find(t => t.id === id);
    }

    function abrirTablero(id) {
        console.log('Abrir tablero', id);
        //window.location.href = './tablero.html?id=' + id;
    }

    function abrirModalCompartir(id) {
        const t = buscar(id);
        document.getElementById('contenedor-compartir').classList.remove('hidden');
        document.getElementById('modal-compartir').classList.remove('hidden');
        // document.getElementById('modal-compartir').textContent = t.titulo;
        // generarCodigosCompartir(id);
        // document.getElementById('modal-compartir').classList.remove('hidden');
    }

    function generarCodigosCompartir(id) {
        const suf = id ? '-' + id : '';
        document.getElementById('codigo-lectura').value = 'R-' + Math.random().toString(36).substring(2, 8).toUpperCase() + suf;
        document.getElementById('codigo-edicion').value = 'E-' + Math.random().toString(36).substring(2, 8).toUpperCase() + suf;
        document.getElementById('enlace-compartir').value = location.origin + '/tablero/' + (id || 'nuevo') + '?token=' + Math.random().toString(36).substring(2, 10);
    }

    function abrirModalUsuarios(id) {
        document.getElementById('modal-compartir').classList.remove('hidden');
        const contenedorCompartir = document.getElementById('contenedor-compartir');
    }

    function eliminarTablero(id) {
        // Eliminamos usando el modal
        const t = buscar(id);
        if (!t) return;
        document.getElementById('modal-eliminar').classList.remove('hidden');
        // document.getElementById('modal-eliminar-titulo').textContent = t.titulo;
        document.getElementById('btn-confirmar-eliminar').onclick = () => {
            tableros = tableros.filter(t => t.id !== id);
            document.getElementById('modal-eliminar').classList.toggle('hidden');
            render();
        };
    }

    function renombrarTablero(id) {
        const t = buscar(id);
        document.getElementById('modal-agregar-tablero').classList.remove('hidden');
        // const nuevo = prompt('Nuevo nombre:', t.titulo);
        // if (nuevo) { t.titulo = nuevo; render(); }
    }

    function duplicarTablero(id) {
        const t = buscar(id);
        const copia = { ...t, id: 'c' + Date.now(), titulo: t.titulo + ' (copia)', creado: new Date().toISOString().slice(0, 10), propietario: true, favorito: false };
        tableros.unshift(copia);
        render();
    }

    function archivarTablero(id) {
        const t = buscar(id);
        t.archivado = !t.archivado;
        render();
    }

    function toggleFavorito(id) {
        const t = buscar(id);
        t.favorito = !t.favorito;
        render();
    }

    function salirDeTablero(id) {
        if (!confirm('¿Salir del tablero?')) return;
        tableros = tableros.filter(t => t.id !== id);
        render();
    }

    function crearTablero() {
        /*const nombre = prompt('Nombre del tablero:');
        if (!nombre) return;
        tableros.unshift({
                id: 'n' + Date.now(),
                titulo: nombre,
                descripcion: 'Sin descripción',
                creado: new Date().toISOString().slice(0,10),
                compartido: false,
                propietario: true,
                favorito: false,
                soloLectura: false,
                archivado: false
        });
        render();*/
        document.getElementById('modal-agregar-tablero').classList.remove('hidden');
    }

    // Copiar al portapapeles
    function copiar(selector) {
        const el = document.querySelector(selector);
        el.select?.();
        navigator.clipboard.writeText(el.value).then(() => {
            // Pequeña notificación temporal
            const b = document.createElement('div');
            b.textContent = 'Copiado';
            b.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-1.5 rounded text-sm animate-fade';
            document.body.appendChild(b);
            setTimeout(() => b.remove(), 1400);
        });
    }

    // Atajo crear (A)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            crearTablero();
        }
    });

    // Atajo unirse (B)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            document.getElementById('modal-unirse').classList.remove('hidden');
        }
    });

    render();
})();
