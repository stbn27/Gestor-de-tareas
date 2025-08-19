/**
 * Controlador principal para la gestión de tableros
 */
class TableroController {
    constructor() {
        this.currentFilter = 'todos';
        this.currentShareBoardId = null;
        this.shareListenersInitialized = false;
        
        // Referencias a elementos DOM
        this.gridElement = document.getElementById('grid-tableros');
        this.templateElement = document.getElementById('template-tablero');
        this.counterElement = document.getElementById('contador-tableros');
        
        // Inicializar servicios
        this.initializeServices();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar datos iniciales
        this.loadInitialData();
    }

    /**
     * Inicializar servicios
     */
    initializeServices() {
        if (!window.apiService) {
            console.error('[TableroController] API Service no está disponible');
            return;
        }

        // Inicializar servicios
        window.tableroService = new TableroService(window.apiService);
        window.shareService = new ShareService(window.apiService);

        // Configurar listeners de servicios
        this.setupServiceListeners();
    }

    /**
     * Configurar listeners de los servicios
     */
    setupServiceListeners() {
        // Listeners del TableroService
        window.tableroService.on('loading', ({ loading }) => {
            this.showLoading(loading);
        });

        window.tableroService.on('tablerosLoaded', ({ tableros }) => {
            this.render();
        });

        window.tableroService.on('tablerosUpdated', ({ tableros }) => {
            this.render();
        });

        window.tableroService.on('error', ({ error }) => {
            this.showError(error);
        });

        window.tableroService.on('favoritoChanged', ({ id, isFavorito }) => {
            this.updateFavoritoUI(id, isFavorito);
        });

        // Listeners del ShareService
        window.shareService.on('linkGenerated', ({ tableroId, enlace }) => {
            if (tableroId === this.currentShareBoardId) {
                this.renderShareModal(tableroId);
            }
            this.showNotification('Enlace generado exitosamente');
        });

        window.shareService.on('codeGenerated', ({ tableroId, codigo }) => {
            if (tableroId === this.currentShareBoardId) {
                this.renderShareModal(tableroId);
            }
            this.showNotification('Código generado exitosamente');
        });

        window.shareService.on('textCopied', ({ text }) => {
            this.showNotification('Copiado al portapapeles');
        });

        window.shareService.on('error', ({ error }) => {
            this.showError(error);
        });
    }

    /**
     * Configurar event listeners del DOM
     */
    setupEventListeners() {
        // Filtros
        document.querySelectorAll('.filtro-tablero').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeFilter(e.target.dataset.filtro);
            });
        });

        // Delegación de eventos para acciones de tableros
        document.addEventListener('click', (e) => this.handleGlobalClick(e));

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Formularios
        this.setupFormListeners();
        document.addEventListener('modalsLoaded', () => this.setupFormListeners());
    }

    /**
     * Configurar listeners de formularios
     */
    setupFormListeners() {
        // Formulario de crear/editar tablero
        const formTablero = document.getElementById('form-tablero');
        if (formTablero) {
            formTablero.addEventListener('submit', (e) => this.handleTableroSubmit(e));
        }

        // Formulario de unirse a tablero
        const formUnirse = document.getElementById('form-unirse');
        if (formUnirse) {
            formUnirse.addEventListener('submit', (e) => this.handleJoinSubmit(e));
        }

        if (!this.shareListenersInitialized) {
            this.setupShareModalListeners();
            this.shareListenersInitialized = true;
        }
    }

    /**
     * Configurar listeners del modal de compartir
     */
    setupShareModalListeners() {
        // Cambio de permisos
        document.addEventListener('change', (e) => {
            if (e.target.name === 'share-link-perm' || e.target.name === 'share-code-perm') {
                if (this.currentShareBoardId) {
                    this.renderShareModal(this.currentShareBoardId);
                }
            }
            
            if (e.target.id === 'share-link-expira-pre' || e.target.id === 'share-code-expira-pre') {
                // Los checkboxes pre-generación no requieren acción inmediata
                console.log('[TableroController] Configuración de expiración actualizada');
            }
        });

        // Botones de compartir
        const shareButtons = {
            'btn-gen-link': () => this.generateLink(),
            'btn-copy-link': () => this.copyLink(),
            'btn-del-link': () => this.deleteLink(),
            'btn-gen-code': () => this.generateCode(),
            'btn-copy-code': () => this.copyCode(),
            'btn-del-code': () => this.deleteCode()
        };

        Object.entries(shareButtons).forEach(([id, handler]) => {
            document.addEventListener('click', (e) => {
                if (e.target.id === id) {
                    e.preventDefault();
                    handler();
                }
            });
        });
    }

    /**
     * Cargar datos iniciales
     */
    async loadInitialData() {
        try {
            await window.tableroService.loadTableros();
        } catch (error) {
            console.error('[TableroController] Error cargando datos iniciales:', error);
        }
    }

    /**
     * Cambiar filtro activo
     */
    changeFilter(filtro) {
        this.currentFilter = filtro;
        
        // Actualizar UI del filtro
        document.querySelectorAll('.filtro-tablero').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200');
        });
        
        const activeButton = document.querySelector(`[data-filtro="${filtro}"]`);
        if (activeButton) {
            activeButton.classList.add('bg-blue-600', 'text-white');
            activeButton.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200');
        }
        
        this.render();
    }

    /**
     * Renderizar lista de tableros
     */
    render() {
        if (!this.gridElement || !this.templateElement) {
            console.warn('[TableroController] Elementos DOM no encontrados');
            return;
        }

        // Limpiar grid (excepto el botón de crear)
        const createButton = document.getElementById('btn-crear-tablero-grid');
        this.gridElement.querySelectorAll('.tablero-card').forEach(card => card.remove());
        this.clearEmptyMessages();

        // Filtrar y renderizar tableros
        const tablerosVisibles = window.tableroService.filterTableros(this.currentFilter);
        
        tablerosVisibles.forEach(tablero => {
            this.renderTableroCard(tablero);
        });

        // Mostrar mensaje si no hay tableros
        if (tablerosVisibles.length === 0) {
            this.showEmptyMessage('No hay tableros para este filtro.');
        }

        // Actualizar contador
        if (this.counterElement) {
            this.counterElement.textContent = tablerosVisibles.length;
        }
    }

    /**
     * Renderizar una tarjeta de tablero
     */
    renderTableroCard(tablero) {
        const card = this.templateElement.content.firstElementChild.cloneNode(true);
        card.dataset.id = tablero.id;

        // Contenido básico
        card.querySelector('.titulo').textContent = tablero.titulo;
        card.querySelector('.descripcion').textContent = tablero.descripcion;
        card.querySelector('.valor-fecha').textContent = window.tableroService.formatFecha(tablero.creado);

        // Indicadores de estado
        this.updateCardIndicators(card, tablero);

        // Estado de favorito
        this.updateCardFavorito(card, tablero.id);

        // Insertar antes del botón de crear
        const createButton = document.getElementById('btn-crear-tablero-grid');
        this.gridElement.insertBefore(card, createButton);
    }

    /**
     * Actualizar indicadores de la tarjeta
     */
    updateCardIndicators(card, tablero) {
        const miembrosCount = tablero.miembros?.length || 0;
        const miembrosElement = card.querySelector('.miembros');
        
        if (tablero.propietario) {
            miembrosElement.textContent = `${miembrosCount} miembro${miembrosCount !== 1 ? 's' : ''}`;
            miembrosElement.classList.remove('hidden');
        } else {
            const esMiembroNoProp = tablero.miembros.some(m => m.usuario === window.tableroService.currentUserId);
            if (esMiembroNoProp) {
                miembrosElement.textContent = 'Miembro';
                miembrosElement.classList.remove('hidden');
            }
        }

        if (tablero.soloLectura) {
            const soloLecturaElement = card.querySelector('.solo-lectura');
            if (soloLecturaElement) {
                soloLecturaElement.classList.remove('hidden');
            }
        }

        if (!tablero.propietario) {
            const privadoElement = card.querySelector('.privado');
            if (privadoElement) {
                privadoElement.classList.remove('hidden');
            }
        }
    }

    /**
     * Actualizar estado de favorito en la tarjeta
     */
    updateCardFavorito(card, tableroId) {
        const favButton = card.querySelector('[data-action="favorito-toggle"]');
        const favIcon = favButton?.querySelector('.icono-favorito');
        
        if (window.tableroService.isFavorito(tableroId)) {
            favButton?.classList.add('text-yellow-500', 'bg-yellow-50', 'dark:bg-yellow-900/20');
            favButton?.classList.remove('text-gray-500');
            if (favIcon) favIcon.style.fill = 'currentColor';
        } else {
            favButton?.classList.remove('text-yellow-500', 'bg-yellow-50', 'dark:bg-yellow-900/20');
            favButton?.classList.add('text-gray-500');
            if (favIcon) favIcon.style.fill = 'none';
        }
    }

    /**
     * Actualizar UI de favorito específico
     */
    updateFavoritoUI(tableroId, isFavorito) {
        const card = this.gridElement.querySelector(`[data-id="${tableroId}"]`);
        if (card) {
            this.updateCardFavorito(card, tableroId);
        }
    }

    /**
     * Manejar clicks globales
     */
    handleGlobalClick(e) {
        // Cerrar menús abiertos si se hace click fuera
        if (!e.target.closest('.menu-acciones')) {
            this.closeAllMenus();
        }

        // Manejar acciones específicas
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action) {
            this.handleAction(e, action);
        }

        // Botón de menú
        if (e.target.closest('.btn-menu')) {
            this.toggleMenu(e);
        }

        // Botón crear tablero
        if (e.target.id === 'btn-crear-tablero-grid') {
            this.openCreateModal();
        }
    }

    /**
     * Manejar acciones de tableros
     */
    async handleAction(e, action) {
        e.preventDefault();
        e.stopPropagation();

        const tableroCard = e.target.closest('.tablero-card');
        const tableroId = tableroCard?.dataset.id;

        if (!tableroId && action !== 'create') {
            console.warn('[TableroController] ID de tablero no encontrado');
            return;
        }

        try {
            switch (action) {
                case 'abrir':
                    this.openTablero(tableroId);
                    break;
                case 'compartir':
                    await this.openShareModal(tableroId);
                    break;
                case 'usuarios':
                    await this.openShareModal(tableroId);
                    break;
                case 'eliminar':
                    this.openDeleteModal(tableroId);
                    break;
                case 'renombrar':
                    this.openEditModal(tableroId);
                    break;
                case 'duplicar':
                    await this.duplicateTablero(tableroId);
                    break;
                case 'favorito-toggle':
                    this.toggleFavorito(tableroId);
                    break;
                case 'salir':
                    await this.leaveTablero(tableroId);
                    break;
                default:
                    console.warn('[TableroController] Acción no reconocida:', action);
            }
        } catch (error) {
            console.error('[TableroController] Error ejecutando acción:', error);
            this.showError(`Error al ejecutar la acción: ${error.message}`);
        }

        this.closeAllMenus();
    }

    /**
     * Abrir tablero (navegar a la página del tablero)
     */
    openTablero(tableroId) {
        console.log('[TableroController] Abrir tablero:', tableroId);
        // Navegar al tablero con el ID como parámetro
        window.location.href = `tablero.html?id=${tableroId}`;
    }

    /**
     * Abrir modal de compartir
     */
    async openShareModal(tableroId) {
        this.currentShareBoardId = tableroId;
        
        try {
            // Precargar datos necesarios
            await Promise.all([
                window.shareService.loadCodigosCompartidos(),
                window.shareService.loadUsuarios()
            ]);

            const modal = document.getElementById('modal-compartir');
            if (modal) {
                modal.classList.remove('hidden');
                await this.renderShareModal(tableroId);
            }
        } catch (error) {
            console.error('[TableroController] Error abriendo modal de compartir:', error);
            this.showError('Error al cargar los datos de compartición');
        }
    }

    /**
     * Renderizar modal de compartir
     */
    async renderShareModal(tableroId) {
        try {
            const tablero = window.tableroService.getTablero(tableroId);
            if (!tablero) return;

            const shareData = await window.shareService.getTableroShareData(tableroId);
            
            // Renderizar enlaces
            await this.renderShareLinks(shareData);
            
            // Renderizar códigos
            await this.renderShareCodes(shareData);
            
            // Renderizar miembros
            await this.renderShareMembers(tablero);
            
        } catch (error) {
            console.error('[TableroController] Error renderizando modal de compartir:', error);
        }
    }

    /**
     * Renderizar sección de enlaces
     */
    async renderShareLinks(shareData) {
        const permisoLink = document.querySelector('input[name="share-link-perm"]:checked')?.value || 'rw';
        const linkObj = window.shareService.findLink(shareData, permisoLink);
        
        const linkWrapper = document.getElementById('share-link-wrapper');
        const linkText = document.getElementById('share-link-text');
        const linkExp = document.getElementById('share-link-exp');
        const btnGenLink = document.getElementById('btn-gen-link');

        if (linkObj && !window.shareService.isExpired(linkObj)) {
            linkWrapper?.classList.remove('hidden');
            if (linkText) linkText.value = linkObj.url;
            
            const expText = window.shareService.formatExpiration(linkObj.caducidad);
            if (linkExp) linkExp.textContent = expText || '';
            
            if (btnGenLink) btnGenLink.textContent = 'Regenerar Enlace';
        } else {
            linkWrapper?.classList.add('hidden');
            if (btnGenLink) btnGenLink.textContent = 'Generar Enlace';
        }
    }

    /**
     * Renderizar sección de códigos
     */
    async renderShareCodes(shareData) {
        const permisoCode = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
        const codeObj = window.shareService.findCode(shareData, permisoCode);
        
        const codeWrapper = document.getElementById('share-code-wrapper');
        const codeValue = document.getElementById('share-code-value');
        const codeExp = document.getElementById('share-code-exp');
        const btnGenCode = document.getElementById('btn-gen-code');

        if (codeObj && !window.shareService.isExpired(codeObj)) {
            codeWrapper?.classList.remove('hidden');
            if (codeValue) codeValue.textContent = codeObj.code;
            
            const expText = window.shareService.formatExpiration(codeObj.caducidad);
            if (codeExp) codeExp.textContent = expText || '';
            
            if (btnGenCode) btnGenCode.textContent = 'Regenerar Código';
        } else {
            codeWrapper?.classList.add('hidden');
            if (btnGenCode) btnGenCode.textContent = 'Generar Código';
        }
    }

    /**
     * Renderizar lista de miembros
     */
    async renderShareMembers(tablero) {
        const tbody = document.getElementById('tabla-miembros');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!tablero.miembros || tablero.miembros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="py-4 text-center text-gray-500 dark:text-gray-400">
                        No hay miembros en este tablero
                    </td>
                </tr>
            `;
            return;
        }

        for (const miembro of tablero.miembros) {
            const usuario = await window.shareService.getUserInfo(miembro.usuario);
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 dark:border-gray-700';
            
            row.innerHTML = `
                <td class="py-2">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                            ${usuario ? usuario.nombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span class="text-sm">${usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Usuario desconocido'}</span>
                    </div>
                </td>
                <td class="py-2">
                    <span class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        ${miembro.permiso.join(', ')}
                    </span>
                </td>
                <td class="py-2 text-right">
                    <button type="button" data-miembro-remove="${miembro.usuario}"
                            class="text-xs text-red-600 hover:text-red-800 dark:text-red-400">
                        Quitar
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
    }

    /**
     * Generar nuevo enlace
     */
    async generateLink() {
        if (!this.currentShareBoardId) return;
        
        const permiso = document.querySelector('input[name="share-link-perm"]:checked')?.value || 'rw';
        const expira = document.getElementById('share-link-expira-pre')?.checked || false;
        
        try {
            await window.shareService.generateLink(this.currentShareBoardId, permiso, expira);
        } catch (error) {
            console.error('[TableroController] Error generando enlace:', error);
        }
    }

    /**
     * Copiar enlace al portapapeles
     */
    async copyLink() {
        const linkText = document.getElementById('share-link-text')?.value;
        if (linkText) {
            await window.shareService.copyToClipboard(linkText);
        }
    }

    /**
     * Eliminar enlace
     */
    async deleteLink() {
        if (!this.currentShareBoardId) return;
        
        const permiso = document.querySelector('input[name="share-link-perm"]:checked')?.value || 'rw';
        
        if (confirm('¿Eliminar el enlace de compartición?')) {
            try {
                await window.shareService.deleteLink(this.currentShareBoardId, permiso);
            } catch (error) {
                console.error('[TableroController] Error eliminando enlace:', error);
            }
        }
    }

    /**
     * Generar nuevo código
     */
    async generateCode() {
        if (!this.currentShareBoardId) return;
        
        const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
        const expira = document.getElementById('share-code-expira-pre')?.checked || false;
        
        try {
            await window.shareService.generateCode(this.currentShareBoardId, permiso, expira);
        } catch (error) {
            console.error('[TableroController] Error generando código:', error);
        }
    }

    /**
     * Copiar código al portapapeles
     */
    async copyCode() {
        const codeText = document.getElementById('share-code-value')?.textContent;
        if (codeText) {
            await window.shareService.copyToClipboard(codeText);
        }
    }

    /**
     * Eliminar código
     */
    async deleteCode() {
        if (!this.currentShareBoardId) return;
        
        const permiso = document.querySelector('input[name="share-code-perm"]:checked')?.value || 'rw';
        
        if (confirm('¿Eliminar el código de compartición?')) {
            try {
                await window.shareService.deleteCode(this.currentShareBoardId, permiso);
            } catch (error) {
                console.error('[TableroController] Error eliminando código:', error);
            }
        }
    }

    /**
     * Manejar cambios en expiración
     */
    async handleExpirationChange(e) {
        // Aquí puedes implementar lógica para actualizar la expiración de enlaces/códigos existentes
        console.log('[TableroController] Cambio en expiración:', e.target.id, e.target.checked);
    }

    /**
     * Abrir modal de crear tablero
     */
    openCreateModal() {
        const modal = document.getElementById('modal-agregar-tablero');
        const form = document.getElementById('form-tablero');
        const title = document.getElementById('modal-title-text');
        const submitBtn = document.getElementById('btn-guardar-tablero');

        if (form) form.reset();
        if (title) title.textContent = 'Crear Tablero';
        if (submitBtn) submitBtn.textContent = 'Crear Tablero';

        modal?.classList.remove('hidden');
    }

    /**
     * Abrir modal de editar tablero
     */
    openEditModal(tableroId) {
        const tablero = window.tableroService.getTablero(tableroId);
        if (!tablero) return;

        const modal = document.getElementById('modal-agregar-tablero');
        const form = document.getElementById('form-tablero');
        const title = document.getElementById('modal-title-text');
        const submitBtn = document.getElementById('btn-guardar-tablero');

        if (form) {
            form.reset();
            document.getElementById('tablero-id').value = tablero.id;
            document.getElementById('tablero-titulo').value = tablero.titulo;
            document.getElementById('tablero-descripcion').value = tablero.descripcion;
        }

        if (title) title.textContent = 'Editar Tablero';
        if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

        modal?.classList.remove('hidden');
    }

    /**
     * Abrir modal de eliminar
     */
    openDeleteModal(tableroId) {
        const modal = document.getElementById('modal-eliminar');
        const confirmBtn = document.getElementById('btn-confirmar-eliminar');

        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                try {
                    await window.tableroService.deleteTablero(tableroId);
                    modal?.classList.add('hidden');
                    this.showNotification('Tablero eliminado exitosamente');
                } catch (error) {
                    this.showError(`Error eliminando tablero: ${error.message}`);
                }
            };
        }

        modal?.classList.remove('hidden');
    }

    /**
     * Duplicar tablero
     */
    async duplicateTablero(tableroId) {
        try {
            await window.tableroService.duplicateTablero(tableroId);
            this.showNotification('Tablero duplicado exitosamente');
        } catch (error) {
            this.showError(`Error duplicando tablero: ${error.message}`);
        }
    }

    /**
     * Toggle favorito
     */
    toggleFavorito(tableroId) {
        window.tableroService.toggleFavorito(tableroId);
    }

    /**
     * Salir de tablero
     */
    async leaveTablero(tableroId) {
        if (confirm('¿Estás seguro de que quieres salir de este tablero?')) {
            try {
                await window.tableroService.leaveTablero(tableroId);
                this.showNotification('Has salido del tablero');
            } catch (error) {
                this.showError(`Error al salir del tablero: ${error.message}`);
            }
        }
    }

    /**
     * Manejar submit del formulario de tablero
     */
    async handleTableroSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion')
        };
        
        const id = formData.get('id');
        
        try {
            if (id) {
                // Editar tablero existente
                await window.tableroService.updateTablero(id, data);
                this.showNotification('Tablero actualizado exitosamente');
            } else {
                // Crear nuevo tablero
                await window.tableroService.createTablero(data);
                this.showNotification('Tablero creado exitosamente');
            }
            
            const modal = document.getElementById('modal-agregar-tablero');
            modal?.classList.add('hidden');
            
        } catch (error) {
            this.showError(`Error guardando tablero: ${error.message}`);
        }
    }

    /**
     * Manejar submit del formulario de unirse
     */
    async handleJoinSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const codigo = formData.get('codigo');
        
        if (!codigo || codigo.length !== 6) {
            this.showError('Por favor ingresa un código válido de 6 dígitos');
            return;
        }
        
        try {
            const result = await window.shareService.joinTableroByCode(codigo);
            
            const modal = document.getElementById('modal-unirse');
            modal?.classList.add('hidden');
            
            this.showNotification('Te has unido al tablero exitosamente');
            
            // Recargar tableros para mostrar el nuevo
            await window.tableroService.loadTableros();
            
        } catch (error) {
            this.showError(`Error uniéndose al tablero: ${error.message}`);
        }
    }

    /**
     * Manejar atajos de teclado
     */
    handleKeyboard(e) {
        // Atajo para crear tablero (A)
        if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.openCreateModal();
            }
        }
        
        // Atajo para buscar (B) - si implementas búsqueda
        if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                // Implementar búsqueda si es necesario
            }
        }
    }

    /**
     * Toggle menú de acciones
     */
    toggleMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.btn-menu');
        const menu = button.parentElement.querySelector('.menu-acciones');
        
        if (menu) {
            this.closeAllMenus();
            menu.classList.toggle('hidden');
        }
    }

    /**
     * Cerrar todos los menús
     */
    closeAllMenus() {
        document.querySelectorAll('.menu-acciones').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    /**
     * Mostrar estado de carga
     */
    showLoading(loading) {
        // Implementar indicador de carga si es necesario
        console.log('[TableroController] Loading:', loading);
    }

    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        
        const baseClasses = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-fade';
        const typeClasses = {
            info: 'bg-gray-900 text-white',
            error: 'bg-red-600 text-white',
            success: 'bg-green-600 text-white'
        };
        
        notification.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Mostrar mensaje vacío
     */
    showEmptyMessage(message) {
        const existingMessage = this.gridElement.querySelector('.mensaje-vacio');
        if (existingMessage) existingMessage.remove();

        const createButton = document.getElementById('btn-crear-tablero-grid');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mensaje-vacio col-span-full flex flex-col items-center justify-center gap-2 py-10 text-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300';
        
        messageDiv.innerHTML = `
            <p class="text-sm">${message}</p>
            <p class="text-xs opacity-70">Pruebe cambiar el filtro o crear un nuevo tablero.</p>
        `;
        
        this.gridElement.insertBefore(messageDiv, createButton);
    }

    /**
     * Limpiar mensajes vacíos
     */
    clearEmptyMessages() {
        this.gridElement.querySelectorAll('.mensaje-vacio').forEach(msg => msg.remove());
    }
}

// Inicializar controlador cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    window.tableroController = new TableroController();
});
