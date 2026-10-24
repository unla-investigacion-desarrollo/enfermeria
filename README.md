# Manual Digital de Técnicas de Enfermería — UNLa

Aplicación web del Manual de Técnicas de Enfermería de la Licenciatura en
Enfermería (Departamento de Salud Comunitaria, Universidad Nacional de Lanús).
El MVP está centrado en la técnica **Colocación de vía periférica en adulto** e
incluye lectura guiada, imágenes, video, juegos, progreso y administración de
contenidos.

![Pantalla de inicio](docs/screenshots/02-inicio.jpg)

## Funcionalidades

- **Lectura de la técnica** con definición, objetivos, materiales, 29 pasos,
  imágenes de referencia, video de YouTube sin cookies y check list.
- **Check list autoevaluable** con los 15 ítems oficiales y tres niveles de
  desempeño (“Lo realizo correctamente”, “Lo realizo con dificultad”, “No lo
  realiza”), con progreso y reinicio.
- **Registro de lectura** con XP la primera vez y relecturas registradas.
- **Juego “Ordená los pasos”** con arrastrar y soltar, botones accesibles para
  teclado y corrección en el servidor.
- **Trivia** de 10 preguntas al azar sobre un banco de 16 derivadas del
  contenido oficial, opciones mezcladas, una pregunta por pantalla y corrección
  exclusivamente en el servidor (la respuesta correcta nunca llega antes de
  responder).
- **Gamificación** con XP auditable, niveles, insignias e insignia de técnica
  dominada al completar lectura y ambos juegos.
- **Panel administrativo** para estudiantes, técnicas publicadas/borradores y
  banco de preguntas de trivia.
- **PWA** instalable con manifest e íconos, y diseño mobile-first con foco en
  accesibilidad WCAG AA.

## Capturas

| Ingreso | Inicio | Técnica |
| --- | --- | --- |
| <img src="docs/screenshots/01-login.jpg" width="240" alt="Pantalla de ingreso" /> | <img src="docs/screenshots/02-inicio.jpg" width="240" alt="Pantalla de inicio con progreso" /> | <img src="docs/screenshots/03-tecnica.jpg" width="240" alt="Encabezado de la técnica" /> |

| Paso a paso | Ordená los pasos | Resultado del juego |
| --- | --- | --- |
| <img src="docs/screenshots/04-paso-a-paso.jpg" width="240" alt="Pasos de la técnica" /> | <img src="docs/screenshots/05-ordenar.jpg" width="240" alt="Juego de ordenar pasos" /> | <img src="docs/screenshots/06-ordenar-resultado.jpg" width="240" alt="Resultado del juego de ordenar" /> |

| Trivia | Perfil y gamificación |
| --- | --- |
| <img src="docs/screenshots/07-trivia.jpg" width="240" alt="Trivia con una pregunta y sus opciones" /> | <img src="docs/screenshots/08-perfil.jpg" width="240" alt="Perfil con XP e insignias" /> |

| Administración de estudiantes | Técnicas | Preguntas de trivia |
| --- | --- | --- |
| <img src="docs/screenshots/09-admin-estudiantes.jpg" width="360" alt="Panel de estudiantes" /> | <img src="docs/screenshots/10-admin-tecnicas.jpg" width="360" alt="Panel de técnicas" /> | <img src="docs/screenshots/11-admin-preguntas.jpg" width="360" alt="Panel de preguntas de trivia" /> |

| Check list autoevaluable |
| --- |
| <img src="docs/screenshots/12-checklist.jpg" width="360" alt="Check list con opciones de autoevaluación" /> |

> Las capturas se generan con `yarn tsx scripts/capture-screenshots.ts` sobre una
> base con el seed y la cuenta demo.

## Stack

- Next.js 15 (App Router) + TypeScript estricto
- Tailwind CSS + componentes estilo shadcn/ui
- PostgreSQL 16 + Prisma 6
- Auth.js v5 (Credentials) + bcryptjs
- Zod, Vitest, Playwright
- `@dnd-kit` para el juego de ordenar pasos

## Requisitos

- Node.js 20 o superior (probado con Node 26)
- Yarn 4 (el repo fija `packageManager: yarn@4.18.0`; con Corepack alcanza con
  `corepack enable`)
- Docker Desktop / Docker Engine con Compose

## Puesta en marcha

```bash
# 1. Dependencias
yarn install

# 2. Variables de entorno
cp .env.example .env
# Editá AUTH_SECRET, SEED_ADMIN_PASSWORD y, si corresponde, DB_PORT.

# 3. Base de datos
docker compose up -d
yarn db:migrate

# 4. Datos iniciales (badges + técnica de vía periférica + admin)
yarn db:seed

# 5. Cuenta de estudiante para probar el recorrido (opcional)
yarn db:demo

# 6. Desarrollo
yarn dev
```

La app queda en <http://localhost:3000>.

> **Puerto de PostgreSQL:** el contenedor se publica en `${DB_PORT:-5432}`. Si
> ya tenés otro PostgreSQL en 5432, definí `DB_PORT=5433` en `.env` y usá ese
> puerto en `DATABASE_URL`, por ejemplo
> `postgresql://manual:manual@localhost:5433/manual`.

### Usuarios demo

| Rol | Email | Contraseña | Notas |
| --- | --- | --- | --- |
| Administración | `admin@unla.edu.ar` | `cambiar-en-primer-login` | Lo crea `db:seed`; exige cambio de contraseña en el primer ingreso. |
| Estudiante | `estudiante.demo@unla.edu.ar` | `Demo1234!` | Lo crea `db:demo`; no exige cambio y sirve para recorrer lectura y juegos. |

> Cambiá estas credenciales antes de publicar. `db:demo` está pensado para
> entornos locales o de demostración, no para producción.

## Scripts

| Script | Qué hace |
| --- | --- |
| `yarn dev` | Servidor de desarrollo |
| `yarn build` | Build de producción |
| `yarn start` | Servidor de producción |
| `yarn lint` | ESLint |
| `yarn typecheck` | TypeScript sin emitir |
| `yarn test` | Tests unitarios (Vitest) |
| `yarn test:e2e` | Tests end-to-end (Playwright, desktop + mobile) |
| `yarn db:migrate` | Crea/aplica migraciones en desarrollo |
| `yarn db:seed` | Admin, insignias y técnica inicial |
| `yarn db:demo` | Cuenta de estudiante demo |
| `yarn db:reset` | Borra y recrea la base + seed |
| `yarn db:studio` | Prisma Studio |
| `yarn format` | Prettier |

## Tests y calidad

```bash
yarn lint
yarn typecheck
yarn test
yarn test:e2e
```

- **Unitarios (Vitest):** reglas de XP, insignias, niveles, selección y
  corrección de trivia, LIS de ordenar pasos, búsqueda y validaciones.
- **E2E (Playwright):** autenticación y cambio de contraseña, alta/reseteo y
  desactivación de estudiantes, lectura y video, juego de ordenar con teclado,
  trivia con corrección en servidor, CRUD de preguntas, insignia de técnica
  dominada y un **recorrido completo** de alta → cambio de contraseña → lectura →
  video → ordenar → trivia → perfil.
- La suite corre en serie porque comparte una única base de datos; los usuarios
  y el progreso de prueba se limpian en cada corrida.

### Accesibilidad, PWA y seguridad

- Lighthouse mobile sobre las pantallas auditadas: **Accesibilidad 100** y
  **Buenas prácticas ≥96** (la página de la técnica descuenta por el uso de
  `unsafe-inline` en la CSP, requerido por los scripts inline de Next.js).
- Enlace “Saltar al contenido”, landmarks, foco visible, etiquetas de formulario,
  mensajes con `role="alert"`/`status`, contraste AA y respeto por
  `prefers-reduced-motion`.
- Manifest PWA en `/manifest.webmanifest` con íconos de 192/512 px, versión
  maskable, apple-touch-icon y favicon.
- Cabeceras de seguridad: CSP, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.
- Contraseñas con bcrypt (costo 12), errores de login genéricos, rate limit de
  intentos, validación Zod en todos los formularios, DNI visible solo en el panel
  administrativo, carga de imágenes JPG/PNG/WebP de hasta 5 MB con nombre
  generado en el servidor y videos embebidos solo desde
  `youtube-nocookie.com`.

## Estructura

```
app/                 Rutas (App Router), manifest, estados de error y carga
components/          UI, juegos, gamificación y contenido de la técnica
lib/                 auth, db, gamification, games, storage, validation
prisma/              schema.prisma, migraciones, seed, seed-demo y seed-data
scripts/             Generación de íconos/placeholders y capturas
tests/unit           Tests de funciones puras (Vitest)
tests/e2e            Recorridos de usuario (Playwright)
docs/screenshots     Capturas usadas en este README
```

## Estado y pendientes

El avance por fases está en [PLAN.md](./PLAN.md) y las decisiones técnicas en
[DECISIONS.md](./DECISIONS.md).

- **Banco de trivia inicial.** `prisma/seed-data/via-periferica.json` incluye
  16 preguntas derivadas de los 29 pasos y del check list oficiales: cada una
  tiene una opción correcta y tres distractores que invierten una conducta del
  procedimiento. Se marcaron como `reviewed` para habilitar el juego; el equipo
  de Enfermería puede editarlas, desactivarlas o reemplazarlas desde
  `/admin/tecnicas/[id]/preguntas`.
- **Imágenes de referencia provisorias.** Los archivos
  `public/uploads/placeholder-*.jpg` son marcadores generados; deben
  reemplazarse por el material definitivo desde el panel.
- El rate limit de login es en memoria: para despliegues con más de una
  instancia conviene moverlo a un almacenamiento compartido.
