# Decisiones de implementación

Registro de decisiones no cubiertas explícitamente por PLAN.md. Se elige la opción
más simple y se anota acá.

## Fase 1

1. **Puerto de PostgreSQL configurable.** El `docker-compose.yml` publica
   `${DB_PORT:-5432}:5432` para poder convivir con otro PostgreSQL local. En esta
   máquina el 5432 estaba ocupado, así que el `.env` local usa `DB_PORT=5433` y
   `DATABASE_URL` apunta a `localhost:5433`. El `.env.example` conserva 5432.
2. **Prisma config file.** Se usa `prisma.config.ts` (con `dotenv/config`) en lugar
   de la clave `prisma` de `package.json`, que está deprecada en Prisma 6.19.
3. **Tailwind CSS v3.4** en lugar de v4: es la versión estable con la que está
   documentado shadcn/ui y evita fricción en el resto de las fases.
4. **ESLint 8 + `.eslintrc.json`.** Se ejecuta `eslint .` directamente en vez de
   `next lint` (deprecado en Next 15.5). Reglas de Prettier integradas.
5. **Tipografía Montserrat por Google Fonts** vía `@import` en `globals.css`, con
   fallback al stack del sistema. Si el equipo necesita uso offline, se self-hostea
   la fuente en `public/fonts` sin cambiar la configuración de Tailwind.
6. **Auth.js se incorpora en la Fase 2.** En Fase 1 la home es una página estática
   de verificación; no se protege ninguna ruta todavía.
7. **Seed de Fase 1 vacío.** El seed real (admin + técnica + preguntas) se agrega en
   las fases 2 y 4. El script ya está conectado a `prisma.config.ts`.
8. **`noUncheckedIndexedAccess` activado** además de `strict`, para evitar accesos a
   índices sin verificar en las funciones de juegos.
9. **Zod 4** (versión estable actual) en lugar de Zod 3.
10. **Vitest en entorno `node`** para funciones puras. Los tests de componentes, si
    hicieran falta, usarán `jsdom` en un proyecto separado.
