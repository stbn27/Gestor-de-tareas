/**
 * Servicio para el manejo de API - Configuración centralizada
 */
class ApiService {
    constructor() {
        // Configuración para desarrollo local con JSON files
        this.isDevelopment = true; 
        this.baseUrl = this.isDevelopment ? './json' : '/api';
        this.endpoints = {
            tableros: this.isDevelopment ? '/tablero2.json' : '/tableros',
            usuarios: this.isDevelopment ? '/usuarios.json' : '/usuarios', 
            codigos: this.isDevelopment ? '/codigos-compartidos.json' : '/codigos-compartidos'
        };
    }

    /**
     * Realizar petición HTTP
     * @param {string} endpoint - Endpoint de la API
     * @param {object} options - Opciones de la petición
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            cache: 'no-store'
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error(`API Request Error: ${url}`, error);
            throw new Error(`Error al conectar con el servidor: ${error.message}`);
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Métodos específicos para preparación con Spring Boot

    /**
     * Obtener tableros del usuario actual
     */
    async getTableros(userId = null) {
        if (this.isDevelopment) {
            const data = await this.get(this.endpoints.tableros);
            return data;
        }
        // Para Spring Boot
        const endpoint = userId ? `${this.endpoints.tableros}?userId=${userId}` : this.endpoints.tableros;
        return this.get(endpoint);
    }

    /**
     * Crear nuevo tablero
     */
    async createTablero(tableroData) {
        if (this.isDevelopment) {
            // Simular creación - en desarrollo solo retornamos los datos con ID generado
            return {
                'id-tablero': 'T' + Date.now(),
                'id-usuario': document.body.getAttribute('data-usuario-actual') || '0',
                'fecha_creacion': new Date().toISOString(),
                'fecha_modificacion': new Date().toISOString(),
                'estado': 'activo',
                'is-favorito': false,
                'is-compartido': false,
                'miembros': [],
                ...tableroData
            };
        }
        return this.post(this.endpoints.tableros, tableroData);
    }

    /**
     * Actualizar tablero
     */
    async updateTablero(id, tableroData) {
        if (this.isDevelopment) {
            // Simular actualización
            return { ...tableroData, 'fecha_modificacion': new Date().toISOString() };
        }
        return this.put(`${this.endpoints.tableros}/${id}`, tableroData);
    }

    /**
     * Eliminar tablero
     */
    async deleteTablero(id) {
        if (this.isDevelopment) {
            // Simular eliminación
            return { success: true, message: 'Tablero eliminado' };
        }
        return this.delete(`${this.endpoints.tableros}/${id}`);
    }

    /**
     * Obtener usuarios
     */
    async getUsuarios() {
        return this.get(this.endpoints.usuarios);
    }

    /**
     * Obtener códigos compartidos
     */
    async getCodigosCompartidos() {
        return this.get(this.endpoints.codigos);
    }

    /**
     * Crear código de compartición
     */
    async createCodigoComparticion(tableroId, tipoPermiso, expiracion = null) {
        const data = {
            tableroId,
            tipo: tipoPermiso,
            expiracion
        };

        if (this.isDevelopment) {
            // Simular creación de código
            return {
                tipo: tipoPermiso,
                code: Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''),
                creado: new Date().toISOString(),
                caducidad: expiracion
            };
        }
        return this.post(`${this.endpoints.codigos}/${tableroId}/codigo`, data);
    }

    /**
     * Crear enlace de compartición
     */
    async createEnlaceComparticion(tableroId, tipoPermiso, expiracion = null) {
        const data = {
            tableroId,
            tipo: tipoPermiso,
            expiracion
        };

        if (this.isDevelopment) {
            // Simular creación de enlace
            return {
                tipo: tipoPermiso,
                url: `${location.origin}/share/${tableroId}/${tipoPermiso}/${Math.random().toString(36).slice(2, 10)}`,
                creado: new Date().toISOString(),
                caducidad: expiracion
            };
        }
        return this.post(`${this.endpoints.codigos}/${tableroId}/enlace`, data);
    }

    /**
     * Unirse a tablero por código
     */
    async joinTableroByCode(codigo) {
        if (this.isDevelopment) {
            // Simular unión por código
            return {
                success: true,
                tablero: {
                    'id-tablero': 'DEMO_' + codigo,
                    titulo: 'Tablero Demo',
                    descripcion: 'Tablero de demostración'
                }
            };
        }
        return this.post('/tableros/join', { codigo });
    }
}

// Instancia global del servicio
window.apiService = new ApiService();
