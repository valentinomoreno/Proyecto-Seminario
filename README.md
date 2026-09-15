# Sistema de Gestión Integral para Local de Autopartes

Proyecto de Seminario Integrador (UTN). Los Sprint 1 a 3 implementan autenticación JWT con roles, catálogo y stock, clientes, cuentas corrientes y el núcleo transaccional de ventas, cobros, comprobantes y POS.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Docker Desktop con Docker Compose

## Puesta en marcha

1. Copiar `.env.example` como `.env` y cambiar `JWT_SECRET`, `SEED_ADMIN_USERNAME` y `SEED_ADMIN_PASSWORD`.
2. Instalar dependencias: `npm install`.
3. Levantar PostgreSQL: `docker compose up -d db`.
4. Crear el esquema: `npm run db:migration:run`.
5. Cargar datos iniciales: `npm run db:seed`.
6. Iniciar backend y frontend: `npm run dev`.

La API queda disponible en `http://localhost:3000`, el frontend en `http://localhost:5173` y el healthcheck en `GET /health`.

Si el puerto 5432 ya está ocupado, defina el mismo puerto alternativo en `POSTGRES_PORT` y `DB_PORT` (por ejemplo, `55432`) antes de levantar el contenedor.

## Comandos

```powershell
npm run dev                 # Backend y frontend en modo desarrollo
npm run build               # Compila ambos paquetes
npm test                    # Pruebas unitarias y de componentes
npm run test:e2e            # Integración real (requiere migración y seed)
npm run lint                # Análisis estático
npm run db:migration:run    # Aplica migraciones pendientes
npm run db:migration:revert # Revierte la última migración
npm run db:seed             # Seed idempotente
```

## API del Sprint 1

`POST /auth/login` es público. Los recursos `/productos`, `/categorias`, `/marcas`, `/depositos`, `/sectores` y `/estantes` requieren Bearer JWT. Ambos roles pueden consultar; las altas, modificaciones y bajas lógicas requieren `ADMINISTRADOR`.

`GET /productos?buscar=filtro&page=1&limit=10` devuelve productos paginados con categoría, marca y ubicación completa. Los endpoints `GET /sectores?depositoId=1` y `GET /estantes?sectorId=1` permiten construir selecciones dependientes.

## API del Sprint 2

Los recursos de clientes requieren Bearer JWT. Administrador y Empleado de Venta pueden consultar el catálogo `GET /condiciones-iva`, buscar clientes con `GET /clientes?buscar=...`, registrar particulares o empresas, actualizar sus datos de contacto y habilitar cuentas corrientes.

```text
GET    /condiciones-iva
GET    /clientes?buscar=&page=1&limit=10
GET    /clientes/:id
POST   /clientes/persona
POST   /clientes/empresa
PUT    /clientes/:id
DELETE /clientes/:id
GET    /cuentas-corrientes?page=1&limit=10
POST   /cuentas-corrientes
DELETE /cuentas-corrientes/:id
```

Las bajas de clientes y cuentas corrientes son exclusivas del Administrador. Una cuenta solo puede darse de baja con saldo cero; al reactivarla conserva su número `CC-000001` y vuelve a saldo cero. La baja de un cliente se rechaza mientras mantenga una cuenta activa.

## API y POS del Sprint 3

El POS protegido está disponible en `/pos`. Permite buscar productos, seleccionar o registrar rápidamente un cliente, cobrar al contado o imputar a cuenta corriente y visualizar el comprobante resultante.

```text
GET  /ventas?buscar=&page=1&limit=20
GET  /ventas/:id
POST /ventas
```

`POST /ventas` recibe `idCliente`, `modalidadPago` e `items` con `idProducto` y `cantidad`. Para contado también requiere `metodoCobro`; para cuenta corriente no acepta datos de cobro. El alta rápida de cliente puede enviar `cuentaCorrienteHabilitada` y `limiteCredito` a `POST /clientes/persona` o `POST /clientes/empresa`.

Cada venta se ejecuta en una transacción con bloqueo pesimista de productos. La operación valida y descuenta stock, registra Kardex y genera Cobro + Factura A/B/C para contado, o Movimiento de Cuenta Corriente + Remito para crédito. Los números de comprobante son correlativos internos. Mientras no se integre un proveedor fiscal/ARCA, las facturas quedan sin CAE y la interfaz las identifica como pendientes de autorización fiscal; no deben considerarse comprobantes fiscales válidos.

## Estructura

- `backend/src/modules/`: módulos NestJS de autenticación, usuarios, productos, clientes y cuentas corrientes.
- `backend/src/database/`: configuración TypeORM, migración y seed.
- `frontend/src/`: contexto de sesión, cliente HTTP, rutas protegidas y vistas.

No se deben versionar `.env`, credenciales, contraseñas ni tokens JWT.
