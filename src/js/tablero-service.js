/**
 * Servicio para el manejo de tableros
 */
class TableroService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUserId = document.body.getAttribute('data-usuario-actual') || '0';
        this.FAVORITES_KEY = 'tableros_favoritos_' + this.currentUserId;
        this.tableros = [];
        this.userFavorites = this.loadFavorites();
        
        // Cache para evitar múltiples peticiones
        this.cacheUsuarios = null;
        this.lastUpdate = null;
        
        // Event emitter simple para notificar cambios
        this.listeners = new Map();
    }

    /**
     * Event emitter simple
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    /**
     * Cargar favoritos desde localStorage
     */
    loadFavorites() {
        try {
            const raw = localStorage.getItem(this.FAVORITES_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? new Set(arr) : new Set();
        } catch (e) {
            console.warn('[TableroService] Favoritos corruptos, reiniciando.', e);
            return new Set();
        }
    }

    /**
     * Guardar favoritos en localStorage
     */
    saveFavorites() {
        try {
            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify([...this.userFavorites]));
        } catch (e) {
            console.warn('[TableroService] No se pudieron guardar favoritos.', e);
        }
    }

    /**
     * Normalizar datos de tablero desde JSON a formato interno
     */
    normalizeTablero(raw) {
        const miembros = Array.isArray(raw.miembros) ? raw.miembros : [];
        const propietario = raw['id-usuario'] === this.currentUserId;

        let soloLectura = false;
        if (!propietario) {
            const yo = miembros.find(m => m.usuario === this.currentUserId);
            if (yo) {
                soloLectura = !yo.permiso.includes('Escritura');
            }
        }

        // Migración: si el JSON marca is-favorito y el usuario actual es el propietario
        if (propietario && raw['is-favorito'] === true && !this.userFavorites.has(raw['id-tablero'])) {
            this.userFavorites.add(raw['id-tablero']);
            this.saveFavorites();
        }

        return {
            id: raw['id-tablero'],
            titulo: raw.titulo || 'Sin título',
            descripcion: raw.descripcion || 'Sin descripción',
            creado: raw.fecha_creacion,
            modificado: raw.fecha_modificacion,
            propietario,
            soloLectura,
            miembros,
            estado: raw.estado || 'activo',
            isCompartido: raw['is-compartido'] || false
        };
    }

    /**
     * Cargar todos los tableros
     */
    async loadTableros() {
        try {
            this.emit('loading', { loading: true });
            
            const data = await this.api.getTableros(this.currentUserId);
            
            if (!Array.isArray(data)) {
                throw new Error('Los datos recibidos no son válidos');
            }

            this.tableros = data.map(raw => this.normalizeTablero(raw));
            this.lastUpdate = new Date();

            console.info('[TableroService] Cargados:', this.tableros.length, 'tableros');
            
            this.emit('tablerosLoaded', { tableros: this.tableros });
            
            return this.tableros;
        } catch (error) {
            console.error('[TableroService] Error cargando tableros:', error);
            this.emit('error', { error: error.message });
            throw error;
        } finally {
            this.emit('loading', { loading: false });
        }
    }

    /**
     * Obtener tablero por ID
     */
    getTablero(id) {
        return this.tableros.find(t => t.id === id);
    }

    /**
     * Crear nuevo tablero
     */
    async createTablero(data) {
        try {
            const tableroData = await this.api.createTablero(data);
            const nuevoTablero = this.normalizeTablero(tableroData);
            
            // Agregar al inicio de la lista
            this.tableros.unshift(nuevoTablero);
            
            this.emit('tableroCreated', { tablero: nuevoTablero });
            this.emit('tablerosUpdated', { tableros: this.tableros });
            
            return nuevoTablero;
        } catch (error) {
            console.error('[TableroService] Error creando tablero:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Actualizar tablero
     */
    async updateTablero(id, data) {
        try {
            const tableroActualizado = await this.api.updateTablero(id, data);
            
            const index = this.tableros.findIndex(t => t.id === id);
            if (index !== -1) {
                this.tableros[index] = this.normalizeTablero({ 
                    ...this.tableros[index], 
                    ...tableroActualizado 
                });
                
                this.emit('tableroUpdated', { tablero: this.tableros[index] });
                this.emit('tablerosUpdated', { tableros: this.tableros });
            }
            
            return this.tableros[index];
        } catch (error) {
            console.error('[TableroService] Error actualizando tablero:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Eliminar tablero
     */
    async deleteTablero(id) {
        try {
            await this.api.deleteTablero(id);
            
            // Remover de la lista local
            this.tableros = this.tableros.filter(t => t.id !== id);
            
            // Remover de favoritos si estaba marcado
            this.userFavorites.delete(id);
            this.saveFavorites();
            
            this.emit('tableroDeleted', { id });
            this.emit('tablerosUpdated', { tableros: this.tableros });
            
            return true;
        } catch (error) {
            console.error('[TableroService] Error eliminando tablero:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Duplicar tablero
     */
    async duplicateTablero(id) {
        const original = this.getTablero(id);
        if (!original) {
            throw new Error('Tablero no encontrado');
        }

        const dataCopia = {
            titulo: original.titulo + ' (copia)',
            descripcion: original.descripcion
        };

        return this.createTablero(dataCopia);
    }

    /**
     * Toggle favorito
     */
    toggleFavorito(id) {
        if (this.userFavorites.has(id)) {
            this.userFavorites.delete(id);
        } else {
            this.userFavorites.add(id);
        }
        
        this.saveFavorites();
        this.emit('favoritoChanged', { id, isFavorito: this.userFavorites.has(id) });
        
        return this.userFavorites.has(id);
    }

    /**
     * Verificar si un tablero es favorito
     */
    isFavorito(id) {
        return this.userFavorites.has(id);
    }

    /**
     * Filtrar tableros según criterio
     */
    filterTableros(filtro) {
        return this.tableros.filter(tablero => {
            switch (filtro) {
                case 'propios':
                    return tablero.propietario;
                case 'compartidos':
                    return !tablero.propietario;
                case 'favoritos':
                    return this.isFavorito(tablero.id);
                case 'todos':
                default:
                    return true;
            }
        });
    }

    /**
     * Salir de un tablero compartido
     */
    async leaveTablero(id) {
        const tablero = this.getTablero(id);
        if (!tablero || tablero.propietario) {
            throw new Error('No puedes salir de un tablero propio');
        }

        // En desarrollo, solo lo quitamos de la lista local
        if (this.api.isDevelopment) {
            this.tableros = this.tableros.filter(t => t.id !== id);
            this.userFavorites.delete(id);
            this.saveFavorites();
            
            this.emit('tableroLeft', { id });
            this.emit('tablerosUpdated', { tableros: this.tableros });
            return true;
        }

        // Para producción con Spring Boot
        try {
            await this.api.post(`/tableros/${id}/leave`, {});
            
            this.tableros = this.tableros.filter(t => t.id !== id);
            this.userFavorites.delete(id);
            this.saveFavorites();
            
            this.emit('tableroLeft', { id });
            this.emit('tablerosUpdated', { tableros: this.tableros });
            
            return true;
        } catch (error) {
            console.error('[TableroService] Error al salir del tablero:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Obtener usuarios (con cache)
     */
    async getUsuarios() {
        if (this.cacheUsuarios) {
            return this.cacheUsuarios;
        }

        try {
            this.cacheUsuarios = await this.api.getUsuarios();
            return this.cacheUsuarios;
        } catch (error) {
            console.error('[TableroService] Error cargando usuarios:', error);
            throw error;
        }
    }

    /**
     * Buscar usuario por ID
     */
    async findUsuario(id) {
        const usuarios = await this.getUsuarios();
        return usuarios.find(u => u.id.toString() === id.toString());
    }

    /**
     * Formatear fecha para mostrar
     */
    formatFecha(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    /**
     * Validar permisos de usuario en tablero
     */
    hasPermission(tableroId, permission = 'read') {
        const tablero = this.getTablero(tableroId);
        if (!tablero) return false;

        if (tablero.propietario) return true;

        const miembro = tablero.miembros.find(m => m.usuario === this.currentUserId);
        if (!miembro) return false;

        switch (permission) {
            case 'write':
                return miembro.permiso.includes('Escritura');
            case 'read':
            default:
                return miembro.permiso.includes('Lectura');
        }
    }
}

// Instancia global del servicio (se inicializará cuando se cargue la página)
window.tableroService = null;
