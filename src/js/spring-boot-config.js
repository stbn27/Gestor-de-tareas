/**
 * Configuración para integración con Spring Boot
 * 
 * Este archivo contiene la configuración necesaria para adaptar
 * la aplicación a un backend de Spring Boot
 */

// Configuración de endpoints para Spring Boot
const SPRING_BOOT_CONFIG = {
    // URL base del servidor Spring Boot
    baseUrl: 'http://localhost:8080/api',
    
    // Endpoints de la API REST
    endpoints: {
        // Tableros
        tableros: '/tableros',
        tableroById: '/tableros/{id}',
        tablerosUser: '/tableros/user/{userId}',
        tableroCreate: '/tableros',
        tableroUpdate: '/tableros/{id}',
        tableroDelete: '/tableros/{id}',
        tableroLeave: '/tableros/{id}/leave',
        
        // Usuarios
        usuarios: '/usuarios',
        usuarioById: '/usuarios/{id}',
        usuarioActual: '/usuarios/current',
        
        // Compartición
        codigosCompartidos: '/share',
        shareByTablero: '/share/tablero/{id}',
        createLink: '/share/tablero/{id}/link',
        createCode: '/share/tablero/{id}/code',
        deleteLink: '/share/tablero/{id}/link/{type}',
        deleteCode: '/share/tablero/{id}/code/{type}',
        joinByCode: '/share/join',
        
        // Miembros
        tableroMembers: '/tableros/{id}/members',
        addMember: '/tableros/{id}/members',
        removeMember: '/tableros/{id}/members/{userId}',
        updateMemberRole: '/tableros/{id}/members/{userId}/role'
    },
    
    // Headers por defecto para Spring Security
    defaultHeaders: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    
    // Configuración de autenticación
    auth: {
        // Token JWT (si se usa)
        tokenKey: 'jwt_token',
        
        // Header para el token
        tokenHeader: 'Authorization',
        
        // Prefijo del token (Bearer, etc.)
        tokenPrefix: 'Bearer '
    }
};

/**
 * Modelos de datos para Spring Boot
 * Estos DTOs coinciden con las entidades de Spring Boot
 */
const SPRING_BOOT_MODELS = {
    // Tablero DTO
    Tablero: {
        id: null,
        titulo: '',
        descripcion: '',
        fechaCreacion: null,
        fechaModificacion: null,
        propietarioId: null,
        estado: 'ACTIVO', // ACTIVO, ARCHIVADO, ELIMINADO
        esPublico: false,
        miembros: [] // Array de MiembroTablero
    },
    
    // Usuario DTO
    Usuario: {
        id: null,
        nombre: '',
        apellidos: '',
        nickname: '',
        correo: '',
        fechaRegistro: null,
        estado: 'ACTIVO'
    },
    
    // Miembro del tablero DTO
    MiembroTablero: {
        id: null,
        usuarioId: null,
        tableroId: null,
        rol: 'MIEMBRO', // PROPIETARIO, EDITOR, MIEMBRO, SOLO_LECTURA
        fechaInvitacion: null,
        invitadoPor: null
    },
    
    // Código de compartición DTO
    CodigoComparticion: {
        id: null,
        tableroId: null,
        codigo: '',
        tipo: 'LECTURA', // LECTURA, ESCRITURA
        fechaCreacion: null,
        fechaExpiracion: null,
        estaActivo: true,
        usos: 0,
        maxUsos: null
    },
    
    // Enlace de compartición DTO
    EnlaceComparticion: {
        id: null,
        tableroId: null,
        token: '',
        tipo: 'LECTURA', // LECTURA, ESCRITURA
        fechaCreacion: null,
        fechaExpiracion: null,
        estaActivo: true,
        usos: 0,
        maxUsos: null
    }
};

/**
 * Mappers para convertir entre formatos JSON locales y Spring Boot DTOs
 */
const SPRING_BOOT_MAPPERS = {
    // Convertir tablero local a DTO de Spring Boot
    toTableroDTO: (tableroLocal) => {
        return {
            id: tableroLocal.id,
            titulo: tableroLocal.titulo,
            descripcion: tableroLocal.descripcion,
            fechaCreacion: tableroLocal.creado,
            fechaModificacion: tableroLocal.modificado,
            propietarioId: tableroLocal.propietarioId || null,
            estado: tableroLocal.estado === 'activo' ? 'ACTIVO' : 'ARCHIVADO',
            esPublico: tableroLocal.isCompartido || false,
            miembros: (tableroLocal.miembros || []).map(m => ({
                usuarioId: m.usuario,
                rol: m.permiso.includes('Escritura') ? 'EDITOR' : 'SOLO_LECTURA'
            }))
        };
    },
    
    // Convertir DTO de Spring Boot a formato local
    fromTableroDTO: (dto, currentUserId) => {
        const propietario = dto.propietarioId === currentUserId;
        let soloLectura = false;
        
        if (!propietario && dto.miembros) {
            const miembro = dto.miembros.find(m => m.usuarioId === currentUserId);
            soloLectura = miembro && miembro.rol === 'SOLO_LECTURA';
        }
        
        return {
            id: dto.id,
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            creado: dto.fechaCreacion,
            modificado: dto.fechaModificacion,
            propietario,
            soloLectura,
            miembros: (dto.miembros || []).map(m => ({
                usuario: m.usuarioId,
                permiso: m.rol === 'SOLO_LECTURA' ? ['Lectura'] : ['Lectura', 'Escritura']
            })),
            estado: dto.estado === 'ACTIVO' ? 'activo' : 'archivado',
            isCompartido: dto.esPublico
        };
    },
    
    // Convertir código de compartición
    fromCodigoComparticionDTO: (dto) => {
        return {
            tipo: dto.tipo === 'ESCRITURA' ? 'rw' : 'r',
            code: dto.codigo,
            creado: dto.fechaCreacion,
            caducidad: dto.fechaExpiracion
        };
    },
    
    // Convertir enlace de compartición
    fromEnlaceComparticionDTO: (dto) => {
        return {
            tipo: dto.tipo === 'ESCRITURA' ? 'rw' : 'r',
            url: `${window.location.origin}/share/${dto.token}`,
            creado: dto.fechaCreacion,
            caducidad: dto.fechaExpiracion
        };
    }
};

/**
 * Validadores para Spring Boot
 */
const SPRING_BOOT_VALIDATORS = {
    tablero: {
        titulo: (valor) => {
            if (!valor || valor.trim().length === 0) {
                return 'El título es requerido';
            }
            if (valor.length > 100) {
                return 'El título no puede exceder 100 caracteres';
            }
            return null;
        },
        
        descripcion: (valor) => {
            if (valor && valor.length > 500) {
                return 'La descripción no puede exceder 500 caracteres';
            }
            return null;
        }
    },
    
    codigo: {
        formato: (codigo) => {
            if (!/^[0-9]{6}$/.test(codigo)) {
                return 'El código debe tener 6 dígitos numéricos';
            }
            return null;
        }
    }
};

/**
 * Utilidades para Spring Boot
 */
const SPRING_BOOT_UTILS = {
    // Construir URL con parámetros
    buildUrl: (endpoint, params = {}) => {
        let url = SPRING_BOOT_CONFIG.baseUrl + endpoint;
        
        // Reemplazar parámetros de ruta
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    },
    
    // Obtener headers con autenticación
    getAuthHeaders: () => {
        const headers = { ...SPRING_BOOT_CONFIG.defaultHeaders };
        
        const token = localStorage.getItem(SPRING_BOOT_CONFIG.auth.tokenKey);
        if (token) {
            headers[SPRING_BOOT_CONFIG.auth.tokenHeader] = 
                SPRING_BOOT_CONFIG.auth.tokenPrefix + token;
        }
        
        return headers;
    },
    
    // Manejar errores de Spring Boot
    handleSpringBootError: (error, response) => {
        if (response && response.status === 401) {
            // Token expirado o no válido
            localStorage.removeItem(SPRING_BOOT_CONFIG.auth.tokenKey);
            window.location.href = '/login';
            return;
        }
        
        if (response && response.status === 403) {
            return 'No tienes permisos para realizar esta acción';
        }
        
        if (response && response.status === 404) {
            return 'Recurso no encontrado';
        }
        
        if (response && response.status >= 500) {
            return 'Error interno del servidor. Por favor, inténtalo más tarde.';
        }
        
        return error.message || 'Error desconocido';
    },
    
    // Formatear fecha para Spring Boot
    formatDateForSpring: (date) => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return date.toISOString();
    },
    
    // Parsear fecha de Spring Boot
    parseDateFromSpring: (dateString) => {
        if (!dateString) return null;
        return new Date(dateString);
    }
};

// Exportar configuración como objeto global para compatibilidad
if (typeof window !== 'undefined') {
    window.SPRING_BOOT_CONFIG = SPRING_BOOT_CONFIG;
    window.SPRING_BOOT_MODELS = SPRING_BOOT_MODELS;
    window.SPRING_BOOT_MAPPERS = SPRING_BOOT_MAPPERS;
    window.SPRING_BOOT_VALIDATORS = SPRING_BOOT_VALIDATORS;
    window.SPRING_BOOT_UTILS = SPRING_BOOT_UTILS;
}

// Para entornos Node.js o módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SPRING_BOOT_CONFIG,
        SPRING_BOOT_MODELS,
        SPRING_BOOT_MAPPERS,
        SPRING_BOOT_VALIDATORS,
        SPRING_BOOT_UTILS
    };
}
