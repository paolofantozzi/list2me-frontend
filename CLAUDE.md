# List2Me Frontend — Guida per Claude Code

Questo file viene caricato automaticamente da Claude Code all'inizio di ogni sessione.

---

## Stack tecnologico

| Voce | Valore |
|---|---|
| Framework | Angular 21 (standalone components, no NgModule) |
| UI Library | Nebular 17 (`@nebular/theme`, `@nebular/auth`, `@nebular/security`) |
| Icone | Eva Icons via `@nebular/eva-icons` |
| Stili | SCSS — tema Nebular default |
| HTTP | `HttpClient` + interceptor funzionale (`authInterceptor`) |
| State | Nessuno store globale — servizi RxJS + Angular Signals |
| Test | Vitest + jsdom |
| Formato | Prettier (100 char, single quotes, Angular HTML parser) |
| Deploy | GitHub Pages via `.github/workflows/deploy.yml` (push su `main`) |

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
│   ├── app.ts                 # Root component (selector: app-root)
│   ├── app.config.ts          # Bootstrap config: router, HttpClient, Nebular providers
│   ├── app.routes.ts          # Routing lazy-loaded con authGuard / guestGuard
│   └── app.scss
├── environments/
│   ├── environment.ts         # Dev — apiBase: http://localhost:8000/api/v1
│   └── environment.production.ts  # Prod — apiBase: https://api.list2me.it/api/v1
├── styles.scss                # Stili globali + import tema Nebular
└── index.html
public/
├── 404.html                   # Redirect SPA per GitHub Pages
├── CNAME                      # Dominio custom: www.list2me.it
└── .nojekyll
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
- Ogni componente importa direttamente i moduli Nebular che usa.
- Naming: cartella `kebab-case`, classe `PascalCase`, selector `app-kebab-case`.
- File per componente: `.ts`, `.html`, `.scss`, `.spec.ts` (opzionale).

### Servizi
- Iniettati con `providedIn: 'root'` (singleton).
- HTTP calls usano `environment.apiBase` come prefisso.
- Modello paginato: `PaginatedResponse<T>` per le liste.

### SCSS
- Nebular default theme; custom properties CSS disabilitate (`$nb-enable-css-custom-properties: false`).
- Stili globali in `src/styles.scss`; stili componente nel proprio `.scss`.
- Non usare `::ng-deep` — preferire classi CSS specifiche del componente.
- **Non usare `nb-theme()` nei file SCSS dei componenti** — Angular 21 compila ogni SCSS in isolamento, quindi la funzione è fuori scope. Usare i valori hex diretti del tema Nebular default:
  - Primary: `#3366ff`
  - Text: `#1a2138`
  - Text hint: `#8f9bb3`
  - Background: `#f0f2f7`
  - Border: `#edf0f7`
  - Danger: `#ff3d71`
  - Warning: `#ffaa00`

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
npm run build:gh     # ng build --configuration github-pages
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

---

## Compatibilità e dipendenze critiche

- **`@angular/cdk` va tenuto fisso a `^21.0.6`** — NON aggiornare a 21.1.x o superiore. Nebular 17.0.0 usa internamente `_VIEW_REPEATER_STRATEGY` da `@angular/cdk/collections`, rimossa in 21.1.0. L'upgrade rompe la build con "No matching export". Il `package.json` e il lockfile già lo pinnano; verificare dopo ogni `npm install` o `npm update`.

---

## Confini del workspace

- **Non eseguire modifiche in altri workspace** (es. `/home/antigravity/workspace/list2me-backend`). Questa istanza di Claude Code opera solo su `list2me-frontend`.
- Se per completare un task servono modifiche in un altro workspace, **non applicarle direttamente**: crea (o aggiorna, se già esiste) un file `TODO.md` nella root di quel workspace, descrivendo chiaramente le modifiche richieste.
- Allo stesso modo, potresti trovare in questa cartella (`list2me-frontend`) un file `TODO.md` creato da un'altra istanza di Claude Code con richieste di modifiche da implementare qui — controllalo se presente e tienine conto nel lavoro.

## Note importanti

- Il deploy avviene automaticamente al push su `main` via GitHub Actions.
- `public/404.html` gestisce il redirect SPA su GitHub Pages — non modificare senza testare il routing.
- La configurazione Nebular globale (tema, moduli condivisi come `NbToastrModule`, `NbDialogModule`) è in `app.config.ts` — aggiungi lì i nuovi moduli Nebular usati in più componenti.
- Non esistono proxy Angular — le chiamate dev vanno direttamente a `localhost:8000` (backend locale).
