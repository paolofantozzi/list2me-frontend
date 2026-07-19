# List2Me Frontend — Guida per Claude Code

Questo file viene caricato automaticamente da Claude Code all'inizio di ogni sessione.

---

## Stack tecnologico

| Voce | Valore |
|---|---|
| Framework | Angular 21 (standalone components, no NgModule) |
| UI Library | Taiga UI 5 (`@taiga-ui/core`, `@taiga-ui/kit`, `@taiga-ui/cdk`) |
| Icone | Lucide via `@taiga-ui/icons` (asset in `assets/taiga-ui/icons`, riferite come `@tui.<nome>`) |
| Stili | SCSS + design token `--l2m-*`; bridge condiviso `src/styles/_bridge.scss` |
| HTTP | `HttpClient` + interceptor funzionale (`authInterceptor`) |
| State | Nessuno store globale — servizi RxJS + Angular Signals |
| Test | Vitest + jsdom |
| Formato | Prettier (100 char, single quotes, Angular HTML parser) |
| Deploy | Cloudflare Pages (build automatica su push su `main`) |

---

## Struttura del progetto

```
src/
├── app/
│   ├── auth/                  # Pagine pubbliche (login, register, forgot-password, reset-password, verify-email)
│   ├── pages/                 # Pagine protette (dashboard, lists, list-detail, groups, profile, users)
│   │   └── layout/            # Shell component con sidebar e header
│   ├── guards/                # authGuard, guestGuard (funzionali)
│   ├── interceptors/          # authInterceptor — aggiunge Bearer token, gestisce refresh 401
│   ├── services/              # AuthService, ListService, ItemService, BookService, GroupService,
│   │                          # UserService, ActivityService, TagService, ItemTypeService, TvdbService
│   ├── models/                # Interfacce TypeScript (User, List, Item, Group, Tag, Activity…)
│   ├── app.ts                 # Root component (selector: app-root, wrappa <tui-root>)
│   ├── app.config.ts          # Bootstrap config: router, HttpClient, provideTaiga()
│   ├── app.routes.ts          # Routing lazy-loaded con authGuard / guestGuard
│   └── app.scss
├── environments/
│   ├── environment.ts         # Dev — apiBase: http://localhost:8000/api/v1
│   └── environment.production.ts  # Prod — apiBase: https://api.list2me.it/api/v1
├── styles.scss                # Stili globali + token --l2m-* (light/dark) + accent Taiga
└── index.html
public/
└── _redirects                 # Fallback SPA per Cloudflare Pages (/* → /index.html 200)
```

---

## Routing

- `/` → redirect a `/pages/dashboard`
- `/auth/**` — protetto da `guestGuard` (redirect a dashboard se già loggato)
  - `/login`, `/register`, `/forgot-password`
- `/pages/**` — protetto da `authGuard` (redirect a login se non loggato)
  - `/dashboard`, `/lists`, `/lists/:id`, `/groups`, `/profile`, `/users`
- `/reset-password/:uid/:token` — fuori dal layout
- `/verify-email/:key` — fuori dal layout
- `/**` → redirect a `/pages/dashboard`

Router configurato con `withComponentInputBinding()` — i parametri di route sono accessibili come `@Input()`.

---

## Autenticazione e token

- Access token: `localStorage['list2me_access']`
- Refresh token: `localStorage['list2me_refresh']`
- Cache utente: `localStorage['list2me_user']`
- `authInterceptor` aggiunge `Authorization: Bearer <token>` ad ogni richiesta e gestisce il refresh automatico sui 401.

---

## Convenzioni di sviluppo

### Componenti
- **Tutti standalone** — nessun NgModule condiviso.
- Ogni componente importa direttamente i componenti/direttive Taiga che usa (`TuiIcon`, `TuiButton`, `TuiLoader`, `TuiAvatar`…).
- Componenti UI riusabili al posto di quelli Nebular: `app-user-chip` (avatar+nome), `app-page-header`, `app-empty-state`, e le classi bridge (`.l2m-card`, `.l2m-input`, `.l2m-alert`…).
- Icone: `<tui-icon icon="@tui.<nome-lucide>">`; scegliere l'icona Lucide più adatta al significato.
- Naming: cartella `kebab-case`, classe `PascalCase`, selector `app-kebab-case`.
- File per componente: `.ts`, `.html`, `.scss`, `.spec.ts` (opzionale).

### Servizi
- Iniettati con `providedIn: 'root'` (singleton).
- HTTP calls usano `environment.apiBase` come prefisso.
- Modello paginato: `PaginatedResponse<T>` per le liste.

### SCSS
- **Design token `--l2m-*`** come unica fonte di verità (colori/spaziatura/radius/ombre): definiti in `src/styles.scss` per `body.nb-theme-default`/`body.nb-theme-dark` (il prefisso `nb-theme-` è solo il nome della classe, nessuna dipendenza Nebular). I componenti li usano via le variabili Sass in `src/styles/_tokens.scss` — così seguono automaticamente il tema chiaro/scuro.
- **Bridge condiviso** `src/styles/_bridge.scss`: classi UI riusabili (`.l2m-card`, `.l2m-input`, `.l2m-alert`, `.l2m-radio`, toast…). Usarle invece di ridefinire il "chrome" in ogni componente.
- Stili globali in `src/styles.scss`; stili componente nel proprio `.scss` (importano i token con `@use '.../styles/tokens' as *;`).
- Non usare `::ng-deep` — preferire classi CSS specifiche del componente.
- Accent Taiga allineato al brand via override `--tui-background-accent-1: #3366ff` in `styles.scss`.
- Valori brand principali: Primary `#3366ff` · Text `#1a2138` · Text hint `#8f9bb3` · Border `#e8ecf5` · Danger `#ff3d71` · Warning `#ffaa00`.

### TypeScript
- Strict mode completo (`strict`, `strictTemplates`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- Nessun path alias — import relativi standard.
- Target: ES2022, module: preserve.

---

## Backend locale (Docker)

Il backend Django è in `/home/antigravity/workspace/list2me-backend` e si avvia con Docker Compose.

**Servizi esposti:**

| Servizio | Immagine | Porta locale |
|---|---|---|
| api (Django + Gunicorn) | Dockerfile custom | 8000 |
| db (PostgreSQL 16) | postgres:16-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| cloudflared | cloudflare/cloudflared | — (tunnel) |

**Comandi backend:**

> **Nota architettura:** `docker-compose.yml` targetizza `linux/arm64` di default. Su host x86_64 (amd64) — come questa macchina — va aggiunto in overlay `docker-compose.x86_64.yml`, che riporta la piattaforma di ogni servizio a `linux/amd64`; senza, la build fallisce con `exec format error`. Aggiungere `-f docker-compose.yml -f docker-compose.x86_64.yml` a ogni comando `docker compose` (vedi esempi sotto).

```bash
cd /home/antigravity/workspace/list2me-backend

docker compose -f docker-compose.yml -f docker-compose.x86_64.yml up -d          # avvia tutti i servizi in background
docker compose -f docker-compose.yml -f docker-compose.x86_64.yml up -d api      # avvia solo api (+ dipendenze)
docker compose -f docker-compose.yml -f docker-compose.x86_64.yml logs -f api    # segui i log dell'API
docker compose -f docker-compose.yml -f docker-compose.x86_64.yml down           # ferma tutto
docker compose -f docker-compose.yml -f docker-compose.x86_64.yml exec api python manage.py shell  # Django shell
```

Il container `api` esegue automaticamente `python manage.py migrate` all'avvio prima di lanciare gunicorn. Il codice è montato come volume (`- .:/app`), quindi le modifiche al codice Python sono ricaricate in tempo reale (`--reload`).

**App Django:**

```
list2me-backend/apps/
├── accounts/    # utenti e autenticazione
├── activity/    # feed attività
├── core/        # modelli e utilità condivise
├── follows/     # sistema di follow
├── groups/      # gruppi
├── lists/       # liste e item
├── reports/     # segnalazioni
├── sharing/     # condivisione liste
└── suggestions/ # suggerimenti item
```

---

## Comandi chiave

```bash
npm start            # ng serve (dev, porta 4200)
npm run build        # ng build (production)
npm test             # Vitest
```

---

## Tool disponibili nel sistema

| Tool | Versione | Note |
|---|---|---|
| `docker` | 29.6.0 | Container runtime |
| `docker compose` | v5.2.0 | Orchestrazione (plugin, non docker-compose) |
| `node` | 20.20.2 | Runtime JS |
| `npm` | 10.8.2 | Package manager — usare per Angular |
| `git` | 2.34.1 | VCS |
| `curl` | 7.81.0 | HTTP client da terminale |
| `python3` | — | In `/opt/venvs/project/bin/python3` |

`ng` non è installato globalmente — usare sempre `npm run <script>` o `npx ng <comando>`.

### Tool per test browser

| Tool | Versione | Stato | Note |
|---|---|---|---|
| `google-chrome` | 149.0.7827.196 | Installato (`/usr/bin/google-chrome`) | Funziona headless con `--no-sandbox --headless` |
| `playwright` | 1.61.1 | Installato globalmente (`/usr/lib`) | Browser binaries **non** scaricati — serve `playwright install chromium` prima dell'uso |
| `cypress` | 15.18.0 | Binary cachato in `~/.cache/Cypress/15.18.0` | Disponibile via `npx cypress`; bundla Electron (Node 22.19) — non richiede browser esterno |

**Uso pratico:**
- Per test rapidi/script headless → `google-chrome --headless --no-sandbox`
- Per E2E con Playwright → eseguire prima `playwright install chromium` (scarica ~200 MB); poi `npx playwright test`
- Per E2E con Cypress → `npx cypress open` (UI) o `npx cypress run` (headless via Electron)

---

## API di riferimento

| Risorsa | URL |
|---|---|
| OpenAPI schema | https://api.list2me.it/api/v1/schema/ |
| Changelog API | https://api.list2me.it/api/v1/changelog/ |
| Frontend live | https://www.list2me.it |

**Per implementare le nuove funzionalità del backend, consultare esclusivamente `CHANGELOG.md`, `README.md` e lo schema OpenAPI/Swagger del backend** (`/home/antigravity/workspace/list2me-backend/CHANGELOG.md` e `README.md`). Lo schema OpenAPI/Swagger va consultato dalla **versione locale** (`http://localhost:8000/api/v1/schema/`, con il backend Docker avviato — vedi sezione "Backend locale" sotto), non da quella live in produzione, per essere certi di vedere le funzionalità più recenti anche prima di un deploy. Guardare il codice sorgente del backend solo se strettamente necessario (es. per chiarire un comportamento non documentato o ambiguo).

---

## Compatibilità e dipendenze critiche

- **Migrazione a Taiga UI 5** (branch `feat/taiga-migration`, 2026-07-11): Nebular è stato **rimosso completamente**. Il pin storico di `@angular/cdk` a `^21.0.6` (richiesto da Nebular 17) **non è più necessario** — Taiga usa il proprio `@taiga-ui/cdk`; l'`@angular/cdk` di Angular resta usato solo da `cdkDrag` in list-detail. Peer deps Taiga: `@angular/core >=19`.
- **`less`** è una devDependency necessaria: gli stili globali di Taiga (`@taiga-ui/styles/*.less` in `angular.json`) sono in Less e l'Angular CLI li compila.

---

## Confini del workspace

- **Non eseguire modifiche in altri workspace** (es. `/home/antigravity/workspace/list2me-backend`). Questa istanza di Claude Code opera solo su `list2me-frontend`.
- Se per completare un task servono modifiche in un altro workspace, **non applicarle direttamente**: crea (o aggiorna, se già esiste) un file `TODO.md` nella root di quel workspace, descrivendo chiaramente le modifiche richieste.
- Allo stesso modo, potresti trovare in questa cartella (`list2me-frontend`) un file `TODO.md` creato da un'altra istanza di Claude Code con richieste di modifiche da implementare qui — controllalo se presente e tienine conto nel lavoro.

## Note importanti

- Il deploy avviene automaticamente al push su `main` via Cloudflare Pages (build command `npm run build`, output `dist/list2me-frontend/browser`).
- `public/_redirects` gestisce il fallback SPA su Cloudflare — non modificare senza testare il routing.
- La versione di Node per la build è fissata da `.nvmrc` (20).
- Bootstrap Taiga in `app.config.ts` (`provideTaiga()`) e `<tui-root>` in `app.ts`.
- Servizi globali custom (non più Nebular): `ThemeService` (dark mode via classe body + `TUI_DARK_MODE`), `ToastService` (`.success/.danger/.warning/.info(msg, title?)`), `ConfirmDialogService` (via `TuiDialogService`). Notifiche → iniettare `ToastService`, non un modulo.
- Non esistono proxy Angular — le chiamate dev vanno direttamente a `localhost:8000` (backend locale).
