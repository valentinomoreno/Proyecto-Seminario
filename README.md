# Sistema de Gestión Integral para Local de Autopartes

Proyecto de Seminario Integrador (UTN). El Sprint 1 implementa autenticación JWT con roles, catálogo de productos, stock y ubicación física mediante Depósito → Sector → Estante.

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

## Estructura

- `backend/src/modules/`: módulos NestJS de autenticación, usuarios y productos.
- `backend/src/database/`: configuración TypeORM, migración y seed.
- `frontend/src/`: contexto de sesión, cliente HTTP, rutas protegidas y vistas.

No se deben versionar `.env`, credenciales, contraseñas ni tokens JWT.
