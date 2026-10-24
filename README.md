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
- **Registro de lectura** con XP la primera vez y relecturas registradas.
- **Juego “Ordená los pasos”** con arrastrar y soltar, botones accesibles para
  teclado y corrección en el servidor.
- **Trivia** de 10 preguntas activas al azar, opciones mezcladas, una pregunta
  por pantalla y corrección exclusivamente en el servidor (la respuesta correcta
  nunca llega antes de responder).
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

| Trivia (banco pendiente) | Perfil y gamificación |
| --- | --- |
| <img src="docs/screenshots/07-trivia.jpg" width="240" alt="Estado vacío de la trivia" /> | <img src="docs/screenshots/08-perfil.jpg" width="240" alt="Perfil con XP e insignias" /> |

| Administración de estudiantes | Técnicas | Preguntas de trivia |
| --- | --- | --- |
| <img src="docs/screenshots/09-admin-estudiantes.jpg" width="360" alt="Panel de estudiantes" /> | <img src="docs/screenshots/10-admin-tecnicas.jpg" width="360" alt="Panel de técnicas" /> | <img src="docs/screenshots/11-admin-preguntas.jpg" width="360" alt="Panel de preguntas de trivia" /> |

> Las capturas se generan con `npx tsx scripts/capture-screenshots.ts` sobre una
> base con el seed y la cuenta demo. La trivia muestra su estado vacío porque el
> banco del Apéndice B todavía no fue provisto.

## Stack

- Next.js 15 (App Router) + TypeScript estricto
- Tailwind CSS + componentes estilo shadcn/ui
- PostgreSQL 16 + Prisma 6
- Auth.js v5 (Credentials) + bcryptjs
- Zod, Vitest, Playwright
- `@dnd-kit` para el juego de ordenar pasos

## Requisitos

- Node.js 20 o superior (probado con Node 26)
- Docker Desktop / Docker Engine con Compose

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Editá AUTH_SECRET, SEED_ADMIN_PASSWORD y, si corresponde, DB_PORT.

# 3. Base de datos
docker compose up -d
npm run db:migrate

# 4. Datos iniciales (badges + técnica de vía periférica + admin)
npm run db:seed

# 5. Cuenta de estudiante para probar el recorrido (opcional)
npm run db:demo

# 6. Desarrollo
npm run dev
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
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright, desktop + mobile) |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:seed` | Admin, insignias y técnica inicial |
| `npm run db:demo` | Cuenta de estudiante demo |
| `npm run db:reset` | Borra y recrea la base + seed |
| `npm run db:studio` | Prisma Studio |
| `npm run format` | Prettier |

## Tests y calidad

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
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

- **Apéndice B (banco de preguntas de trivia): pendiente.** No se inventó
  contenido clínico. `prisma/seed-data/via-periferica.json` tiene
  `questions: []`; el panel `/admin/tecnicas/[id]/preguntas` permite cargar,
  revisar y activar preguntas cuando Enfermería entregue el banco. Los e2e usan
  preguntas ficticias marcadas como tales.
- **Imágenes de referencia provisorias.** Los archivos
  `public/uploads/placeholder-*.jpg` son marcadores generados; deben
  reemplazarse por el material definitivo desde el panel.
- El rate limit de login es en memoria: para despliegues con más de una
  instancia conviene moverlo a un almacenamiento compartido.
