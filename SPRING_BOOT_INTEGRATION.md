# Guía de Integración con Spring Boot

Esta documentación explica cómo integrar el frontend del organizador de tareas con un backend de Spring Boot.

## 📋 Estructura Refactorizada

### Archivos Principales

1. **`modals.html`** - Contiene todos los modales separados del HTML principal
2. **`api-service.js`** - Servicio centralizado para comunicación con API
3. **`tablero-service.js`** - Lógica de negocio para tableros
4. **`share-service.js`** - Lógica de compartición de tableros
5. **`tablero-controller.js`** - Controlador principal de la interfaz
6. **`spring-boot-config.js`** - Configuración para Spring Boot

### Ventajas de la Refactorización

- ✅ **Separación de responsabilidades** - Cada archivo tiene una función específica
- ✅ **Modales organizados** - HTML más limpio y mantenible
- ✅ **Servicios reutilizables** - Lógica separada de la presentación
- ✅ **Preparado para API** - Fácil switch entre desarrollo y producción
- ✅ **Event-driven architecture** - Comunicación entre componentes vía eventos

## 🔧 Configuración para Spring Boot

### 1. Activar Modo Producción

En `api-service.js`, cambiar:

```javascript
// Cambiar de desarrollo a producción
this.isDevelopment = false;
```

### 2. Configurar URL Base

En `spring-boot-config.js`, ajustar:

```javascript
baseUrl: 'http://localhost:8080/api', // Cambiar por tu URL
```

### 3. Agregar Autenticación

Si usas Spring Security con JWT:

```javascript
// En spring-boot-config.js
auth: {
    tokenKey: 'jwt_token',
    tokenHeader: 'Authorization', 
    tokenPrefix: 'Bearer '
}
```

## 🗄️ Endpoints Requeridos en Spring Boot

### Tableros

```java
@RestController
@RequestMapping("/api/tableros")
public class TableroController {
    
    @GetMapping
    public List<TableroDTO> getTableros(@RequestParam(required = false) Long userId) { }
    
    @PostMapping
    public TableroDTO createTablero(@RequestBody CreateTableroRequest request) { }
    
    @PutMapping("/{id}")
    public TableroDTO updateTablero(@PathVariable Long id, @RequestBody UpdateTableroRequest request) { }
    
    @DeleteMapping("/{id}")
    public void deleteTablero(@PathVariable Long id) { }
    
    @PostMapping("/{id}/leave")
    public void leaveTablero(@PathVariable Long id) { }
}
```

### Compartición

```java
@RestController 
@RequestMapping("/api/share")
public class ShareController {
    
    @GetMapping("/tablero/{id}")
    public ShareDataDTO getShareData(@PathVariable Long id) { }
    
    @PostMapping("/tablero/{id}/link")
    public EnlaceComparticionDTO createLink(@PathVariable Long id, @RequestBody CreateLinkRequest request) { }
    
    @PostMapping("/tablero/{id}/code") 
    public CodigoComparticionDTO createCode(@PathVariable Long id, @RequestBody CreateCodeRequest request) { }
    
    @PostMapping("/join")
    public JoinResultDTO joinByCode(@RequestBody JoinByCodeRequest request) { }
}
```

### Usuarios

```java
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {
    
    @GetMapping
    public List<UsuarioDTO> getUsuarios() { }
    
    @GetMapping("/{id}")
    public UsuarioDTO getUsuario(@PathVariable Long id) { }
    
    @GetMapping("/current")
    public UsuarioDTO getCurrentUser() { }
}
```

## 📊 Modelos de Datos (DTOs)

### TableroDTO

```java
public class TableroDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaModificacion;
    private Long propietarioId;
    private EstadoTablero estado;
    private Boolean esPublico;
    private List<MiembroTableroDTO> miembros;
    
    // getters y setters
}

public enum EstadoTablero {
    ACTIVO, ARCHIVADO, ELIMINADO
}
```

### MiembroTableroDTO

```java
public class MiembroTableroDTO {
    private Long id;
    private Long usuarioId;
    private Long tableroId;
    private RolTablero rol;
    private LocalDateTime fechaInvitacion;
    private Long invitadoPor;
    
    // getters y setters
}

public enum RolTablero {
    PROPIETARIO, EDITOR, MIEMBRO, SOLO_LECTURA
}
```

### CodigoComparticionDTO

```java
public class CodigoComparticionDTO {
    private Long id;
    private Long tableroId;
    private String codigo;
    private TipoPermiso tipo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaExpiracion;
    private Boolean estaActivo;
    private Integer usos;
    private Integer maxUsos;
    
    // getters y setters
}
```

## 🔐 Configuración de Spring Security

### Configuración CORS

```java
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### JWT Filter (si se usa JWT)

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String token = getTokenFromRequest(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            Authentication auth = jwtTokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

## 🌐 Configuración para Thymeleaf (Opcional)

Si decides usar Thymeleaf en lugar de API REST:

### Controller para Thymeleaf

```java
@Controller
public class TableroViewController {
    
    @GetMapping("/inicio")
    public String inicio(Model model, Principal principal) {
        // Cargar datos del usuario actual
        Usuario usuario = usuarioService.findByEmail(principal.getName());
        List<Tablero> tableros = tableroService.findByUsuario(usuario.getId());
        
        model.addAttribute("usuario", usuario);
        model.addAttribute("tableros", tableros);
        model.addAttribute("usuarioActualId", usuario.getId());
        
        return "inicio";
    }
    
    @PostMapping("/tableros")
    public String crearTablero(@ModelAttribute CreateTableroRequest request, 
                              Principal principal,
                              RedirectAttributes redirectAttributes) {
        try {
            Usuario usuario = usuarioService.findByEmail(principal.getName());
            tableroService.createTablero(request, usuario);
            redirectAttributes.addFlashAttribute("mensaje", "Tablero creado exitosamente");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        
        return "redirect:/inicio";
    }
}
```

### Modificaciones en el HTML

```html
<!-- En inicio.html, agregar atributos Thymeleaf -->
<body th:data-usuario-actual="${usuarioActualId}" class="...">

<!-- Renderizar tableros con Thymeleaf -->
<div th:each="tablero : ${tableros}" class="tablero-card" th:data-id="${tablero.id}">
    <h2 class="titulo" th:text="${tablero.titulo}"></h2>
    <p class="descripcion" th:text="${tablero.descripcion}"></p>
    <!-- ... más campos -->
</div>
```

## 🧪 Testing

### Testing del Frontend

```javascript
// Ejemplo de test con Jest
describe('TableroService', () => {
    beforeEach(() => {
        // Mock API service
        window.apiService = {
            getTableros: jest.fn(),
            createTablero: jest.fn(),
            // ... más mocks
        };
        
        tableroService = new TableroService(window.apiService);
    });
    
    test('should load tableros', async () => {
        const mockTableros = [/* ... datos de prueba ... */];
        window.apiService.getTableros.mockResolvedValue(mockTableros);
        
        const result = await tableroService.loadTableros();
        
        expect(result).toEqual(expect.arrayContaining(mockTableros));
    });
});
```

### Testing del Backend

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TableroServiceTest {
    
    @Autowired
    private TableroService tableroService;
    
    @Test
    void shouldCreateTablero() {
        CreateTableroRequest request = new CreateTableroRequest();
        request.setTitulo("Test Tablero");
        request.setDescripcion("Descripción de prueba");
        
        TableroDTO result = tableroService.createTablero(request, usuarioTest);
        
        assertThat(result.getTitulo()).isEqualTo("Test Tablero");
        assertThat(result.getPropietarioId()).isEqualTo(usuarioTest.getId());
    }
}
```

## 🚀 Deployment

### 1. Construir el Frontend

```bash
# Si usas un build tool como Vite o Webpack
npm run build

# Si usas Tailwind CSS
npx tailwindcss -i ./src/css/input.css -o ./dist/styles.css --minify
```

### 2. Incluir en Spring Boot

```
src/
├── main/
│   ├── java/
│   └── resources/
│       ├── static/
│       │   ├── js/
│       │   ├── css/
│       │   └── img/
│       └── templates/
│           └── inicio.html
```

### 3. Configuración de Spring Boot

```properties
# application.properties
spring.web.resources.static-locations=classpath:/static/
spring.mvc.static-path-pattern=/static/**

# Para servir el HTML desde templates
spring.thymeleaf.prefix=classpath:/templates/
spring.thymeleaf.suffix=.html
```

## 📝 Notas Adicionales

### Manejo de Errores

El sistema incluye manejo centralizado de errores que se puede configurar para Spring Boot:

```javascript
// Los errores HTTP se manejan automáticamente
// 401 -> Redirect a login
// 403 -> Mensaje de permisos
// 404 -> Recurso no encontrado
// 500+ -> Error del servidor
```

### Optimizaciones de Performance

1. **Caching de usuarios y códigos** - Evita peticiones repetidas
2. **Event-driven updates** - Solo actualiza lo necesario
3. **Lazy loading** - Los modales se cargan dinámicamente
4. **Debounced search** - Para futuras implementaciones de búsqueda

### Extensibilidad

El sistema está diseñado para ser fácilmente extensible:

- Agregar nuevos servicios siguiendo el patrón establecido
- Implementar websockets para actualizaciones en tiempo real
- Agregar más tipos de permisos y roles
- Integrar con sistemas de notificaciones

¡La refactorización está lista para producción con Spring Boot! 🎉
