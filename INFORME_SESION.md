# Informe Extenso de Actividades y Mejoras del Sistema

**Proyecto:** Autopartes – Sistema de Gestión de Repuestos  
**Fecha:** 23 de Septiembre de 2026  
**Entorno de Ejecución:** Node.js (NestJS + Vite React), PostgreSQL en Docker (`autopartes-postgres`)  

---

## Resumen Ejecutivo

Durante la sesión se abordó un conjunto integral de mejoras visuales, funcionales, de rendimiento y de consistencia en datos para la plataforma web de gestión de repuestos. Los hitos clave abarcan:

1. **Estabilización de Layout y Zoom**: Corrección del comportamiento responsive ante variaciones de zoom (50% a 80%), evitando vacíos horizontales y previniendo el colapso del sidebar.
2. **Población de Datos de Rendimiento en Base de Datos**: Generación y carga de 292 ventas con líneas de detalle y cobros en PostgreSQL, permitiendo probar con cifras reales los KPIs y gráficos del Dashboard.
3. **Rediseño del Componente de Métodos de Pago**: Resolución de solapamientos en la dona de cobros mediante una disposición en columna de alto impacto visual.
4. **Suite Completa de Modo Oscuro y Optimización Móvil (Android / iOS)**: Adaptación de todos los botones, formularios y tablas a tema noche, barra de estado sincronizada, soporte de safe areas y prevención de zoom forzado en dispositivos Apple.
5. **Unificación de Roles de Usuario**: Fusión del "Usuario Común" en la entidad única de "Vendedor" (`EMPLEADO_VENTA`), eliminando redundancias en login, migraciones seguras en base de datos y limpieza de seeds.
6. **Depuración del Inicio de Sesión**: Remoción de animaciones flotantes, limpieza de textos no institucionales (título de seminario y etiquetas de JWT/Rate Limiting) y centrado de la tarjeta.
7. **Aplicación de Paleta de Azul Fuerte y Fondo de Login Color Hueso**: Reemplazo del negro plano por un azul corporativo de alta gama (`#0D254C`, `#1D4ED8`) y fondo de login plano en tono hueso cálido (`#F5F2EB`).

---

## 1. Ajustes de Layout, Zoom y Vista General

### Diagnóstico Inicial
Al aplicar niveles de reducción de zoom en el navegador (50% a 80%), la interfaz presentaba espacios en blanco sin ocupar en resoluciones anchas y el sidebar de Datta Able sufría desalineaciones en su modo colapsado/expandido.

### Acciones Tomadas
- Se flexibilizó el contenedor principal (`.pc-container`, `.pc-content`) para ocupar el 100% del ancho del viewport disponible sin márgenes rígidos que provocaran bandas vacías.
- Se fijó la posición y el cálculo de ancho del sidebar (`.pc-sidebar`, `.modern-sidebar`), evitando saltos y bugs visuales al alternar niveles de zoom en el explorador.

---

## 2. Generación de Datos de Prueba (Seed de Rendimiento)

Para validar analíticamente el Dashboard de control se desarrolló un script de población en masa que inyectó métricas operativas directas en PostgreSQL:

- **Archivo**: `backend/src/database/seed-rendimiento.ts` (registrado en `.gitignore` para no contaminar el repositorio).
- **Volumen inyectado**: 292 ventas distribuidas en los meses de Agosto y Septiembre de 2026.
- **Detalle de comprobantes**: Líneas de artículos (`detalles_venta`) con cálculo de subtotales, IVA y asignación de cobros asociados (`cobros`).
- **Métricas resultantes verificables en el Dashboard**:
  - **Ventas del Mes**: `$ 8.629.625`
  - **Variación Intermensual**: `+36.5%` respecto al período anterior.
  - **Operaciones Registradas**: `151` transacciones en el mes corriente.
  - **Distribución de Cobros**: Efectivo (39%), Cuenta Corriente (29%), Mercado Pago (24%), Otros (7%).
  - **Cuentas en Mora**: 299 clientes con saldo deudor en seguimiento.
  - **Alertas de Stock**: 180 repuestos bajo nivel de punto de pedido.

---

## 3. Resolución de Solapamiento en el Dashboard ("Se Solapan")

### Problema
En el gráfico de distribución de cobros, la leyenda de métodos de pago y la dona central se superponían en pantallas medianas y reducidas, impidiendo leer los porcentajes e importes por canal de venta.

### Solución Implementada
- **Rediseño Estructural** en `frontend/src/pages/DashboardPage.tsx` y `frontend/src/styles.css`:
  - Se configuró el contenedor `.dashboard-donut-container` con disposición vertical orientada a respirabilidad de información.
  - **Parte Superior**: Gráfico dona circular centrado de 190px de diámetro con trazado SVG nítido y radio proporcional.
  - **Parte Inferior**: 4 filas apiladas en tarjetas horizontales que presentan:
    - Indicador de color distintivo por método (Verde Efectivo, Azul Cobalto CC, Celeste Mercado Pago, Gris Otros).
    - Nombre del canal y cantidad de operaciones.
    - Monto total facturado en pesos formateado.
    - Badge con porcentaje de participación (`39%`, `29%`, etc.).
  - Total eliminación de colisiones en cualquier tamaño de pantalla.

---

## 4. Modo Oscuro Completo y Adaptación Móvil (Android & iOS)

### Modo Oscuro Extendido
Se estilizó la totalidad de los componentes de interacción bajo el selector `[data-theme="dark"]`:
- **Botones Sólidos (`.btn-*`)**: Reemplazo de colores apagados por tonos con luminancia calibrada (azul royal `#2563eb`, esmeralda `#059669`, carmín `#dc2626`, ámbar `#d97706`).
- **Botones Outline (`.btn-outline-*`)**: Bordes vivos (`#3b82f6`, `#34d399`, `#f87171`) con relleno luminoso al hover.
- **Formularios e Inputs**: Fondos en grafito `#181b20`, bordes `#2c313d`, texto blanco `#f1f5f9` y anillo de foco violeta/azul.
- **Modales y Desplegables**: Paneles en `#1e2229`, bordes finos `#2c313d` y sombras difusas de profundidad.
- **Paginadores y Cierres**: Paginadores en gris carbón y botón de cierre (`.btn-close`) con filtro de inversión de luminosidad para visibilidad sobre superficies oscuras.

### Responsividad en Dispositivos Móviles
- **Configuración de Viewport**: Adición de `viewport-fit=cover` en `frontend/index.html` para soporte de muescas (notch) y barra de gestos.
- **Barra de Navegador Dinámica**: Integración en `ThemeContext.tsx` de actualización en vivo del meta tag `<meta name="theme-color">` y `apple-mobile-web-app-status-bar-style` (blanco en modo claro, oscuro profundo en noche).
- **Control de Zoom en iOS Safari**: Regla `font-size: 16px !important` en todos los inputs para anchos $\le 768\text{px}$, evitando el zoom involuntario del teclado virtual de iPhone.
- **Touch Targets**: Botones con altura táctil mínima de 42px y `touch-action: manipulation`.
- **Navegación Móvil**: Sidebar drawer lateral de 280px con botón de cierre explícito `(✕)`, sombra profunda y cierre automático al seleccionar una ruta.

---

## 5. Unificación de Usuario Común en Vendedor

### Diagnóstico de Negocio
El sistema contaba con dos credenciales de ventas idénticas: `user` ("Usuario Común") y `vendedor` ("Vendedor"), ambos asignados al rol `EMPLEADO_VENTA`. Se solicitó eliminar la duplicidad para conservar únicamente el perfil de **Vendedor**.

### Cambios Ejecutados
1. **Pantalla de Login (`LoginPage.tsx`)**:
   - Se removió el botón `👤 User Común` del selector de accesos rápidos de prueba.
   - Permanecen exclusivamente los dos roles reales:
     - 👑 **Admin**: `admin` / `Admin_Seguro.2026!`
     - 🛒 **Vendedor**: `vendedor` / `Vendedor_Seguro.2026!`
2. **Plantilla General (`AppLayout.tsx`)**:
   - Se simplificó la asignación de rol del sidebar: `rol === 'ADMINISTRADOR' ? 'Administrador' : 'Vendedor'`.
3. **Semilla de Base de Datos (`seed.ts`)**:
   - Se eliminaron las variables `SEED_USER_USERNAME` y `SEED_USER_PASSWORD` junto a su validación.
   - Se suprimió la creación del usuario duplicado `Usuario Comun` (`USER-001`, DNI `00000003`).
   - Se agregó una rutina de migración automática: si el script detecta un usuario `user` persistido de versiones anteriores, reasigna sus ventas al `vendedor` y lo elimina.
4. **Migración en Base de Datos PostgreSQL Activa**:
   - Se migraron 98 ventas asociadas al `id_usuario = 3` (`user`) hacia el `id_usuario = 2` (`vendedor`).
   - Se eliminó el registro de la tabla `usuarios`, el legajo de `empleados` y el registro de `personas`.
   - La tabla `usuarios` quedó constituida estrictamente por los registros con ID 1 (`admin`) e ID 2 (`vendedor`).
5. **Servicio de Autenticación (`auth.service.ts`)**:
   - Se restringió el atajo de credenciales de desarrollo para reconocer únicamente a `vendedor`.

---

## 6. Depuración y Limpieza del Login (Fondo Plano)

### Requerimiento Visual
A partir de capturas enviadas por el usuario, se solicitó retirar:
1. El encabezado de la tarjeta (*"Autopartes / Sistema de Gestión de Repuestos · UTN"*).
2. El pie informativo de backend (*"Autenticación segura JWT · Rate Limiting activo"*).
3. Las esferas flotantes animadas de Datta Able.

### Ejecución Técnica
- **Limpieza de JSX en `LoginPage.tsx`**:
  - Remoción de los elementos `.r`, `.r.s` y la clase `.auth-bg`.
  - Supresión del bloque de título institucional y subtítulo universitario.
  - Supresión del contenedor inferior con badge de seguridad JWT.
  - Ajuste del margen inferior de la botonera de prueba a `mb-0` para un equilibrio perimetral uniforme.
- **Fondo Plano**:
  - Supresión de la animación CSS de rotación infinita (`@keyframes floating`).
  - Anulación de imágenes de fondo y gradientes en `.auth-main`, `.auth-wrapper` y `.auth-form`.

---

## 7. Paleta Cromática Final: Azul Fuerte Corporativo y Login Color Hueso

Se reemplazó la base negra (`#111111`) por una identidad visual basada en **Azul Fuerte**, combinada con un **fondo plano color hueso** en el login.

### Ficha Técnica de la Paleta

| Elemento / Token | Color Hex | Propósito y Comportamiento |
| :--- | :--- | :--- |
| **Sidebar Lateral** | `#0D254C` | Azul marino corporativo profundo. Sustituye el negro plano aportando sofisticación institucional. |
| **Sidebar Ítem Activo** | Gradiente Azul + `#38BDF8` | Fondo suave `rgba(37, 99, 235, 0.32)` con borde izquierdo y punta de flecha en celeste cian brillante. |
| **Sidebar Subtítulos** | `#60A5FA` | Encabezados de grupo de menú en azul cielo de alto contraste. |
| **Botones Primarios** | `#1D4ED8` | Azul real intenso (Tailwind Blue-700), con hover en `#1E40AF` y foco con anillo translúcido. |
| **Fondo Login** | `#F5F2EB` | **Color Hueso Plano** cálido y suave que envuelve la tarjeta de login sin fatiga visual. |
| **Tarjeta de Login** | `#FFFFFF` | Contenedor blanco puro con borde perimetral suave a tono (`#E5E1D8`) y ancho optimizado a 400px. |
| **Fondo General del Sistema** | `#F0F4F8` | Gris pizarra frío sutil (*cool slate*) que destaca las tarjetas blancas del dashboard. |
| **Tarjetas y Tablas** | `#FFFFFF` | Fondos limpios con bordes suaves `#E2E8F0`. |
| **Texto Principal** | `#0F172A` | Azul pizarra oscuro para máxima nitidez de lectura en pantallas de alta densidad. |
| **Texto Secundario** | `#64748B` | Pizarra neutro para leyendas, etiquetas de métricas y breadcrumbs. |
| **Brand Mark Header** | Gradiente Azul | `linear-gradient(135deg, #1D4ED8 0%, #38BDF8 100%)`. |

---

## 8. Verificación y Resultados de Pruebas

Toda la base de código fue sometida a la suite completa de pruebas automatizadas:

### Pruebas Unitarias Frontend (Vitest)
```
 ✓ src/pages/DevolucionesHistorialPage.spec.tsx (1 test)
 ✓ src/components/ConfirmActionModal.spec.tsx (1 test)
 ✓ src/routes/ProtectedRoute.spec.tsx (3 tests)
 ✓ src/pages/VentasHistorialPage.spec.tsx (1 test)
 ✓ src/pages/DashboardPage.spec.tsx (1 test)
 ✓ src/components/AppLayout.spec.tsx (4 tests)
 ✓ src/pages/ClientesPages.spec.tsx (4 tests)
 ✓ src/context/CartContext.spec.tsx (2 tests)

 Test Files: 8 passed (8 total)
 Tests:      17 passed (17 total)
 Estado:     EXITOSO (0 errores)
```

### Pruebas Unitarias Backend (Jest)
```
 PASS src/modules/productos/repositories/marcas.service.spec.ts
 PASS src/modules/productos/services/alertas-stock.service.spec.ts
 PASS src/modules/auth/auth.service.spec.ts
 PASS src/modules/notificaciones/services/avisos-cobro.service.spec.ts
 PASS src/modules/clientes/dto/cliente.dto.spec.ts
 PASS src/modules/clientes/services/clientes.service.spec.ts
 PASS src/modules/cuentas-corrientes/services/cuentas-corrientes.service.spec.ts
 PASS src/modules/notificaciones/services/mora.service.spec.ts
 PASS src/modules/devoluciones/services/devoluciones.service.spec.ts
 PASS src/common/guards/roles.guard.spec.ts
 PASS src/modules/dashboard/dashboard.service.spec.ts
 PASS src/modules/productos/repositories/categorias.service.spec.ts
 PASS src/modules/ventas/services/ventas.service.spec.ts
 PASS src/modules/clientes/utils/documento.util.spec.ts
 PASS src/modules/productos/dto/producto.dto.spec.ts
 PASS src/modules/ventas/utils/limite-credito.util.spec.ts

 Test Suites: 16 passed (16 total)
 Tests:       59 passed (59 total)
 Estado:      EXITOSO (0 errores)
```

### Servicios en Vivo
- **Backend NestJS**: Corriendo en `http://localhost:3000` con TypeORM conectado al contenedor `autopartes-postgres` (puerto 55432).
- **Frontend Vite**: Corriendo en `http://localhost:5173` con Hot Module Replacement (HMR) activo.

---

## 9. Lista de Archivos Modificados

- `frontend/src/pages/LoginPage.tsx`: Limpieza de títulos, pie de JWT, formas flotantes y acceso directo de `user`.
- `frontend/src/styles.css`: Incorporación de paleta Azul Fuerte, fondo de login color hueso `#F5F2EB`, botones primarios, focus azul y dark mode afinado.
- `frontend/src/components/AppLayout.tsx`: Simplificación del renderizado de rol (Admin / Vendedor).
- `frontend/src/context/ThemeContext.tsx`: Gestión dinámica de meta tags para navegación móvil.
- `frontend/index.html`: Inclusión de `viewport-fit=cover`.
- `backend/src/database/seed.ts`: Remoción de credenciales y generación del usuario `user`; rutina de saneamiento idempotente.
- `backend/src/modules/auth/auth.service.ts`: Depuración de credenciales de desarrollo para único vendedor.
- Base de datos PostgreSQL: Reasignación de 98 ventas de `id_usuario = 3` a `id_usuario = 2` y depuración física del registro legacy.
