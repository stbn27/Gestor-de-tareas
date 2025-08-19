/**
 * Servicio para el manejo de compartición de tableros
 */
class ShareService {
    constructor(apiService) {
        this.api = apiService;
        this.cacheCodigosCompartidos = null;
        this.cacheUsuarios = null;
        
        // Event emitter simple
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
     * Cargar códigos compartidos
     */
    async loadCodigosCompartidos() {
        try {
            if (this.cacheCodigosCompartidos) {
                return this.cacheCodigosCompartidos;
            }

            this.cacheCodigosCompartidos = await this.api.getCodigosCompartidos();
            return this.cacheCodigosCompartidos;
        } catch (error) {
            console.error('[ShareService] Error cargando códigos:', error);
            throw error;
        }
    }

    /**
     * Cargar usuarios
     */
    async loadUsuarios() {
        try {
            if (this.cacheUsuarios) {
                return this.cacheUsuarios;
            }

            this.cacheUsuarios = await this.api.getUsuarios();
            return this.cacheUsuarios;
        } catch (error) {
            console.error('[ShareService] Error cargando usuarios:', error);
            throw error;
        }
    }

    /**
     * Obtener datos de compartición de un tablero
     */
    async getTableroShareData(tableroId) {
        try {
            const codigos = await this.loadCodigosCompartidos();
            const entry = codigos.find(e => e['id-tablero'] === tableroId);
            
            if (!entry) {
                return {
                    links: [],
                    codigos: []
                };
            }

            return {
                links: Array.isArray(entry.links) ? entry.links : [],
                codigos: Array.isArray(entry.codigos) ? entry.codigos : []
            };
        } catch (error) {
            console.error('[ShareService] Error obteniendo datos de compartición:', error);
            throw error;
        }
    }

    /**
     * Encontrar enlace por tipo de permiso
     */
    findLink(shareData, tipo) {
        return shareData.links.find(l => l.tipo === tipo) || null;
    }

    /**
     * Encontrar código por tipo de permiso
     */
    findCode(shareData, tipo) {
        return shareData.codigos.find(c => c.tipo === tipo) || null;
    }

    /**
     * Generar nuevo enlace de compartición
     */
    async generateLink(tableroId, tipoPermiso, expira24h = false) {
        try {
            const expiracion = expira24h ? 
                new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : 
                null;

            const nuevoEnlace = await this.api.createEnlaceComparticion(tableroId, tipoPermiso, expiracion);
            
            // Actualizar cache local
            await this.updateCacheWithNewLink(tableroId, nuevoEnlace);
            
            this.emit('linkGenerated', { tableroId, enlace: nuevoEnlace });
            
            return nuevoEnlace;
        } catch (error) {
            console.error('[ShareService] Error generando enlace:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Generar nuevo código de compartición
     */
    async generateCode(tableroId, tipoPermiso, expira24h = false) {
        try {
            const expiracion = expira24h ? 
                new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : 
                null;

            const nuevoCodigo = await this.api.createCodigoComparticion(tableroId, tipoPermiso, expiracion);
            
            // Actualizar cache local
            await this.updateCacheWithNewCode(tableroId, nuevoCodigo);
            
            this.emit('codeGenerated', { tableroId, codigo: nuevoCodigo });
            
            return nuevoCodigo;
        } catch (error) {
            console.error('[ShareService] Error generando código:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Eliminar enlace de compartición
     */
    async deleteLink(tableroId, tipoPermiso) {
        try {
            if (this.api.isDevelopment) {
                // En desarrollo, solo actualizamos el cache local
                await this.removeLinkFromCache(tableroId, tipoPermiso);
            } else {
                // Para producción con Spring Boot
                await this.api.delete(`/codigos-compartidos/${tableroId}/enlace/${tipoPermiso}`);
                await this.removeLinkFromCache(tableroId, tipoPermiso);
            }
            
            this.emit('linkDeleted', { tableroId, tipo: tipoPermiso });
            
            return true;
        } catch (error) {
            console.error('[ShareService] Error eliminando enlace:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Eliminar código de compartición
     */
    async deleteCode(tableroId, tipoPermiso) {
        try {
            if (this.api.isDevelopment) {
                // En desarrollo, solo actualizamos el cache local
                await this.removeCodeFromCache(tableroId, tipoPermiso);
            } else {
                // Para producción con Spring Boot
                await this.api.delete(`/codigos-compartidos/${tableroId}/codigo/${tipoPermiso}`);
                await this.removeCodeFromCache(tableroId, tipoPermiso);
            }
            
            this.emit('codeDeleted', { tableroId, tipo: tipoPermiso });
            
            return true;
        } catch (error) {
            console.error('[ShareService] Error eliminando código:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Unirse a tablero usando código
     */
    async joinTableroByCode(codigo) {
        try {
            const result = await this.api.joinTableroByCode(codigo);
            
            this.emit('tableroJoined', { codigo, result });
            
            return result;
        } catch (error) {
            console.error('[ShareService] Error uniéndose al tablero:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Copiar texto al portapapeles
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback para navegadores que no soportan clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                textArea.remove();
                
                if (!successful) {
                    throw new Error('No se pudo copiar el texto');
                }
            }
            
            this.emit('textCopied', { text });
            return true;
        } catch (error) {
            console.error('[ShareService] Error copiando al portapapeles:', error);
            this.emit('error', { error: 'No se pudo copiar al portapapeles' });
            return false;
        }
    }

    /**
     * Actualizar cache local con nuevo enlace
     */
    async updateCacheWithNewLink(tableroId, nuevoEnlace) {
        if (!this.cacheCodigosCompartidos) {
            await this.loadCodigosCompartidos();
        }

        let entry = this.cacheCodigosCompartidos.find(e => e['id-tablero'] === tableroId);
        if (!entry) {
            entry = {
                'id-tablero': tableroId,
                links: [],
                codigos: []
            };
            this.cacheCodigosCompartidos.push(entry);
        }

        // Reemplazar enlace existente del mismo tipo o agregar nuevo
        const existingIndex = entry.links.findIndex(l => l.tipo === nuevoEnlace.tipo);
        if (existingIndex >= 0) {
            entry.links[existingIndex] = nuevoEnlace;
        } else {
            entry.links.push(nuevoEnlace);
        }
    }

    /**
     * Actualizar cache local con nuevo código
     */
    async updateCacheWithNewCode(tableroId, nuevoCodigo) {
        if (!this.cacheCodigosCompartidos) {
            await this.loadCodigosCompartidos();
        }

        let entry = this.cacheCodigosCompartidos.find(e => e['id-tablero'] === tableroId);
        if (!entry) {
            entry = {
                'id-tablero': tableroId,
                links: [],
                codigos: []
            };
            this.cacheCodigosCompartidos.push(entry);
        }

        // Reemplazar código existente del mismo tipo o agregar nuevo
        const existingIndex = entry.codigos.findIndex(c => c.tipo === nuevoCodigo.tipo);
        if (existingIndex >= 0) {
            entry.codigos[existingIndex] = nuevoCodigo;
        } else {
            entry.codigos.push(nuevoCodigo);
        }
    }

    /**
     * Remover enlace del cache local
     */
    async removeLinkFromCache(tableroId, tipoPermiso) {
        if (!this.cacheCodigosCompartidos) return;

        const entry = this.cacheCodigosCompartidos.find(e => e['id-tablero'] === tableroId);
        if (!entry) return;

        entry.links = entry.links.filter(l => l.tipo !== tipoPermiso);
    }

    /**
     * Remover código del cache local
     */
    async removeCodeFromCache(tableroId, tipoPermiso) {
        if (!this.cacheCodigosCompartidos) return;

        const entry = this.cacheCodigosCompartidos.find(e => e['id-tablero'] === tableroId);
        if (!entry) return;

        entry.codigos = entry.codigos.filter(c => c.tipo !== tipoPermiso);
    }

    /**
     * Verificar si un enlace/código ha expirado
     */
    isExpired(item) {
        if (!item.caducidad) return false;
        return new Date(item.caducidad) < new Date();
    }

    /**
     * Formatear fecha de expiración
     */
    formatExpiration(caducidad) {
        if (!caducidad) return null;
        
        const fecha = new Date(caducidad);
        if (isNaN(fecha)) return null;
        
        const now = new Date();
        const diff = fecha - now;
        
        if (diff <= 0) return 'Expirado';
        
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (horas > 0) {
            return `Expira en ${horas}h ${minutos}m`;
        } else {
            return `Expira en ${minutos}m`;
        }
    }

    /**
     * Obtener información de usuario por ID
     */
    async getUserInfo(userId) {
        try {
            const usuarios = await this.loadUsuarios();
            return usuarios.find(u => u.id.toString() === userId.toString());
        } catch (error) {
            console.error('[ShareService] Error obteniendo info de usuario:', error);
            return null;
        }
    }

    /**
     * Limpiar cache (útil para refrescar datos)
     */
    clearCache() {
        this.cacheCodigosCompartidos = null;
        this.cacheUsuarios = null;
    }
}

// Instancia global del servicio (se inicializará cuando se cargue la página)
window.shareService = null;
