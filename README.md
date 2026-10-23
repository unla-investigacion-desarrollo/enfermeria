# Manual Digital de Técnicas de Enfermería — UNLa

Aplicación web del Manual de Técnicas de Enfermería (Licenciatura en Enfermería,
Departamento de Salud Comunitaria – UNLa). MVP centrado en la técnica
**Colocación de vía periférica en adulto**.

## Stack

- Next.js 15 (App Router) + TypeScript estricto
- Tailwind CSS + componentes estilo shadcn/ui
- PostgreSQL 16 + Prisma
- Auth.js v5 (Credentials) + bcryptjs
- Zod, Vitest, Playwright
- `@dnd-kit` para el juego de ordenar pasos

## Requisitos

- Node.js 20 o superior (probado con Node 26)
- Docker Desktop / Docker Engine con Compose

## Puesta en marcha desde cero

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Editá AUTH_SECRET y SEED_ADMIN_PASSWORD antes de publicar.

# 3. Base de datos
docker compose up -d
npm run db:migrate

# 4. Datos iniciales (admin + técnica de vía periférica)
npm run db:seed

# 5. Desarrollo
npm run dev
```

La app queda en <http://localhost:3000>.

> Si ya tenés otro PostgreSQL usando el puerto 5432, definí `DB_PORT=5433` en `.env`
> y usá ese puerto en `DATABASE_URL`. El contenedor del proyecto se publica en
> `${DB_PORT:-5432}`.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:reset` | Borra y recrea la base + seed |
| `npm run db:studio` | Prisma Studio |
| `npm run format` | Prettier |

## Estructura

```
app/                 Rutas (App Router)
components/          Componentes de UI
lib/                 auth, db, gamification, games, storage, validation
prisma/              schema.prisma, migraciones, seed y seed-data
tests/unit           Tests de funciones puras (Vitest)
tests/e2e            Recorridos de usuario (Playwright)
```

## Estado del proyecto

El avance se lleva en [PLAN.md](./PLAN.md). Las decisiones no cubiertas por el
plan se registran en [DECISIONS.md](./DECISIONS.md).
