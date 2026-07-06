# TODO — richieste da list2me-backend

**Stato: ✅ Completato e verificato end-to-end (2026-07-03).**

---

## Gestione utenti da admin (deactivate/reactivate/promote), da backend v0.20.0/v0.21.0/v0.22.0

Il backend ha aggiunto tre endpoint di manutenzione riservati agli admin:
`DELETE /api/v1/auth/admin/users/{id}/` (disattiva, v0.20.0), `POST
/api/v1/auth/admin/users/{id}/reactivate/` (riattiva, v0.21.0) e `POST
/api/v1/auth/admin/users/{id}/promote/` (promuove a `is_staff`, solo superuser,
v0.21.0). Una prima implementazione frontend (2026-07-06) era rimasta bloccata
da due gap lato API, entrambi poi risolti in backend v0.22.0 (vedi TODO.md di
list2me-backend): `UserDetailSerializer` ora espone `is_staff`/`is_superuser`, e
un nuovo `GET /api/v1/auth/admin/users/` (con filtro `is_active`) permette di
elencare anche gli account disattivati. **Stato: ✅ Implementato e verificato
end-to-end contro entrambi i fix (2026-07-06).**

**File modificati:**
- `src/app/models/user.model.ts` — `UserDetail.is_staff`/`is_superuser` (rimasti
  opzionali solo per compatibilità con una sessione in `localStorage` salvata
  prima del backend v0.22.0); nuova interfaccia `AdminUser` (estende
  `UserPublic` con `is_active`) per i risultati di `GET /auth/admin/users/`.
- `src/app/services/user.service.ts` — `deactivateUser`, `reactivateUser`,
  `promoteUser`, `adminSearchUsers(query?, isActive?, page?)` →
  `GET /auth/admin/users/` con `search`/`is_active` come query param.
- `src/app/pages/users/users.component.ts`/`.html`/`.scss` — sostituito il primo
  approccio (pulsanti sparsi sulle card della ricerca pubblica + pannello
  "inserisci ID a mano" per la riattivazione, quest'ultimo uno stopgap dovuto al
  gap #2 sopra) con un unico pannello "Amministrazione utenti" in cima alla
  pagina "Trova utenti" (visibile solo se `currentUser.is_staff`): campo di
  ricerca (`username`/`first_name`/`last_name`, come la ricerca pubblica) +
  filtro di stato (`Tutti`/`Solo attivi`/`Solo disattivati`, via `nb-select`)
  contro il nuovo endpoint admin; ogni riga mostra un badge "Disattivato" se
  `!is_active` e le azioni pertinenti (Disattiva se attivo, Riattiva se
  disattivato, Promuovi ad admin se `currentUser.is_superuser`), nessuna azione
  sulla propria riga; gestione dei tre error code documentati dal backend
  (`ADMIN_CANNOT_TARGET_SELF`/`ADMIN_TARGET_IS_STAFF` → toast dedicati,
  generico altrimenti). La ricerca pubblica (grid `users-grid`, per
  seguire/non seguire) resta invariata e non mostra più azioni admin, per
  evitare due punti di ingresso diversi per la stessa funzionalità.

**Verifica end-to-end (2026-07-06):** eseguita due volte con Playwright contro
il backend locale via Docker e due utenti di test (email verificata a mano via
Django shell, non rilevante per questo test): una prima volta prima del fix
backend, iniettando `is_staff`/`is_superuser` in `localStorage['list2me_user']`
per simulare la risposta futura (necessario perché all'epoca il backend non li
inviava); una seconda volta dopo il fix (v0.22.0), con login reale e nessuna
manipolazione di `localStorage`, confermando che `POST /auth/login/` include
ora `is_staff`/`is_superuser` e che il pannello admin appare di conseguenza.
Confermati in entrambi i giri, contro gli endpoint reali: ricerca+filtro di
stato (un utente disattivato sparisce con "Solo attivi" e ricompare con "Solo
disattivati"), disattivazione (badge "Disattivato" compare sulla riga senza
sparire dalla lista, a differenza della ricerca pubblica), riattivazione
(badge scompare), promozione ad admin (`204`, `is_staff=True` confermato a
DB), protezione self-service (nessuna azione sulla propria riga), protezione
contro la disattivazione di un altro account admin (403
`ADMIN_TARGET_IS_STAFF`, toast dedicato). Nessun errore in console
riconducibile al nuovo codice (residua solo il warning Nebular preesistente
`NG0100` sul menu laterale). Utenti di test rimossi al termine di ogni giro di
verifica.

---

## Bug: `authInterceptor` allega un token stale/non valido anche alle richieste di login, bloccando il login (incluso Google)

**Stato: ✅ Corretto e verificato end-to-end (2026-07-06).**

Segnalato dall'utente: il login con Google fallisce con
`401 AUTH_INVALID_CREDENTIALS` e messaggio `"User not found"` /
`code: "user_not_found"`. Diagnosticato lato backend: quel messaggio proviene
esattamente da `rest_framework_simplejwt.authentication.JWTAuthentication.get_user()`
(l'utente indicato dal claim `user_id` del token non esiste più nel DB), **non**
da un problema nel flusso OAuth di Google in sé
(`apps/accounts/views.py::GoogleLoginView`, `apps/accounts/adapters.py`, entrambi
verificati lato backend e corretti).

**Causa nel frontend:** `src/app/interceptors/auth.interceptor.ts` allega
l'header `Authorization: Bearer <token>` a **ogni** richiesta HTTP in uscita,
prendendo il token da `localStorage` (`AuthService.getAccessToken()`) senza
alcuna eccezione — comprese le chiamate agli endpoint pubblici di autenticazione
(`POST /auth/login/`, `POST /auth/register/`, `POST /auth/google/`,
`POST /auth/token/refresh/`, `POST /auth/password/reset/`, ecc., vedi
`src/app/services/auth.service.ts`). Il backend applica `JWTAuthentication`
globalmente su **tutte** le richieste (non solo su quelle con
`permission_classes` che richiedono autenticazione: l'autenticazione DRF viene
valutata prima del controllo dei permessi) — quindi se in `localStorage` è
rimasto un `access_token` non più valido (scaduto, oppure riferito a uno
`user_id` che non esiste più nel DB — es. dopo un reset/ripristino del
database, vedi l'incidente di perdita dati del 2026-07-03), **qualunque**
richiesta, incluso il login stesso, viene rifiutata con 401 prima ancora che
la logica dell'endpoint (login, login Google, ecc.) venga eseguita. In pratica
un token stale in `localStorage` impedisce definitivamente di rifare login,
anche con credenziali/Google validi, finché non si svuota manualmente lo
storage del browser.

**Fix suggerito:** in `authInterceptor`, non allegare l'header `Authorization`
alle richieste verso gli endpoint di autenticazione pubblici (login, register,
google, token/refresh, password reset, verify-email) — ad es. con una whitelist
di path o escludendo le richieste per cui non è ancora presente una sessione
autenticata valida. In alternativa/aggiunta, quando una richiesta va in 401 con
`code: "user_not_found"` o `"user_inactive"` (utente non più valido, a
differenza di un token semplicemente scaduto) l'interceptor dovrebbe chiamare
`auth.clearSession()` senza tentare il refresh (il refresh token sarà
comunque legato allo stesso utente inesistente).

**Fix implementato:** in `src/app/interceptors/auth.interceptor.ts` aggiunta
una whitelist `PUBLIC_AUTH_PATHS` (login, register, resend-email,
verify-email, google, token/refresh, password/reset, password/reset/confirm);
`isPublicAuthRequest()` verifica l'URL della richiesta e, se corrisponde, il
token in `localStorage` non viene allegato affatto (indipendentemente dal
fatto che sia stale o meno) e l'intero blocco `catchError` di
refresh-automatico/`clearSession`+redirect viene bypassato per queste
richieste (l'errore viene propagato as-is al chiamante, es. `login.component`,
che già gestisce i propri stati di errore — evitava anche un effetto
collaterale preesistente per cui un tentativo di login con password errata,
in presenza di un refresh token in storage, veniva "agganciato" dal retry
automatico dell'interceptor invece di restituire subito l'errore di
credenziali non valide al componente). Non è stata implementata la
whitelist di `code`/messaggio per `user_not_found`/`user_inactive` (fix
"in alternativa/aggiunta" nella proposta sopra): verificato lato backend
(`apps/core/exceptions.py::custom_exception_handler`) che tutte le
`AuthenticationFailed` — incluso "User not found" da
`JWTAuthentication.get_user()` — vengono normalizzate allo stesso
`code: "AUTH_INVALID_CREDENTIALS"` (il messaggio testuale differisce ma non è
un identificatore stabile su cui basare logica applicativa); la whitelist dei
path pubblici già risolve al 100% il bug segnalato (token stale che blocca il
login), quindi questa parte opzionale è stata omessa per evitare di introdurre
pattern-matching fragile su stringhe di messaggio.

**Verifica end-to-end (2026-07-06):** riprodotto il bug con Playwright contro
il backend locale via Docker impostando in `localStorage` un access/refresh
token sintatticamente valido ma con `user_id` inesistente e firma non valida,
poi tentando il login con credenziali corrette di un utente reale: prima del
fix la richiesta `POST /auth/login/` sarebbe stata rifiutata con 401 dal
backend per il token stale allegato, impedendo il login; dopo il fix la
richiesta parte senza header `Authorization`, riceve `200` e l'utente atterra
correttamente su `/pages/dashboard`. Verificato anche via network log che
nessun header `Authorization` viene allegato alle chiamate verso gli endpoint
pubblici elencati in `PUBLIC_AUTH_PATHS`. Nessun errore in console
riconducibile al fix (residua solo il warning Nebular preesistente `NG0100`
sul menu laterale, già presente su `main`).

---

## Riattivazione tipi "Gioco da tavolo" (`board_game`) e "Gioco di ruolo" (`rpg`), via BoardGameGeek

I due tipi `board_game` e `rpg` erano presenti come `ItemType` di sistema fin dal
primo commit, ma non hanno mai avuto un form di ricerca/aggiunta dedicato lato
frontend; dal commit "Musicbrainz integration" (2026-07-02) venivano nascosti dal
type picker tramite `HIDDEN_ITEM_TYPES` in attesa che il backend implementasse
un'integrazione reale. Il backend ha ora aggiunto BoardGameGeek (XML API2):
`GET /api/v1/bgg/search/?q=…&type=boardgame|rpgitem`, `GET /api/v1/bgg/games/{id}/`
(dettaglio esteso con versioni localizzate) e `GET /api/v1/bgg/languages/`.
**Stato: ✅ Implementato (ricerca + aggiunta) e verificato end-to-end (2026-07-06).**

**File nuovi:**
- `src/app/models/bgg.model.ts` — `BGGSearchType` (`'boardgame' | 'rpgitem'`),
  `BGGSearchResult` (i risultati di ricerca BGG espongono solo `bgg_id`,
  `year_published`, `service_url` in `metadata`; `image_url` è sempre `null` per
  costruzione lato backend — BGG non restituisce immagini nei risultati di ricerca).
- `src/app/services/bgg.service.ts` — `search(q, type, limit)`, stesso pattern
  hardcoded-per-tipo di `EuropeanaService`/`MusicBrainzService`.

**File modificati:**
- `src/app/pages/list-detail/list-detail.component.ts` — rimossa la costante
  `HIDDEN_ITEM_TYPES` e il filtro in `ngOnInit` (i due tipi tornano visibili nel
  type picker); signal/subject per la ricerca BGG (`showBggSearch`/`bggQuery`/
  `bggResults`), branch in `selectItemType`/`backToTypePicker`/`closeAddPanel`,
  `onBggQueryChange`, `addBggItem` (usa direttamente i campi minimali restituiti
  dalla ricerca, senza chiamare il dettaglio esteso `/bgg/games/{id}/` — coerente
  con il resto della pagina, che non arricchisce mai i risultati di ricerca con
  una fetch aggiuntiva se non per i figli di una serie TV), `isBggItem`/`bggMeta`/
  `bggIcon` (`shuffle-outline` per `board_game`, `book-open-outline` per `rpg` —
  Eva Icons non ha un'icona "dado"), label italiane "Gioco da tavolo"/"Gioco di
  ruolo" (già presenti in `typeLabelTranslations` da prima).
- `src/app/pages/list-detail/list-detail.component.html` — pannello di ricerca BGG
  (stesso pattern di libro/TVDB/MusicBrainz/Europeana/prodotto), branch `isBggItem`
  nella card elemento (nessuna miniatura, solo icona — `image_url` sempre `null`
  in ricerca) e nel pannello di dettaglio (anno, link a BoardGameGeek).
- `public/images/powered-by-bgg.png` — logo ufficiale "Powered by BGG" (fornito
  dall'utente, non generato), mostrato sia nel pannello di ricerca sia nel
  pannello di dettaglio elemento (sotto il link "Apri su BoardGameGeek"), ognuno
  come link a boardgamegeek.com. Referenziato con path assoluto (`/images/...`)
  anziché relativo, perché la pagina vive sotto `/pages/lists/{id}` — un path
  relativo si sarebbe risolto in modo errato rispetto alla route corrente.
- **Bug preesistente corretto nel percorso:** il footer di attribuzione
  (`items-attribution`) concatenava le fonti con una catena di `@if` a coppie
  adiacenti (`hasX && hasY`), che ometteva il separatore " · " ogni volta che due
  fonti presenti non erano adiacenti nella catena (es. solo libro + BGG, senza
  TVDB/MusicBrainz/Luogo/Europeana/Prodotto in mezzo) — riscontrato durante il
  test end-to-end di questa funzionalità. Sostituito con `externalAttributions()`
  (metodo che restituisce l'elenco delle fonti effettivamente presenti) e un
  `@for` con separatore basato su `$last`, che gestisce correttamente qualunque
  combinazione di fonti.

**Nota:** la ricerca BGG restituisce metadata minimale (`bgg_id`, `year_published`,
`service_url`); i campi ricchi dello schema (`min_players`, `categories`,
`mechanics`, `designers`, `publisher`, `language`, `thumbnail_url`, versioni
localizzate) richiederebbero una chiamata aggiuntiva a `GET /bgg/games/{id}/` in
fase di aggiunta — non implementata qui per coerenza con il resto della pagina,
che non arricchisce mai i risultati di ricerca con una fetch di dettaglio (lo
stesso limite esiste già per l'artista Europeana, vedi sezione sotto). Un'estensione
futura per popolare giocatori/tempo di gioco/versioni localizzate userebbe
`bggService` con una chiamata a `fetch_game` dopo la selezione del risultato.

**Verifica end-to-end (2026-07-06):** testato con Playwright contro il backend
locale via Docker (richiede l'overlay `docker-compose.x86_64.yml` e
`BGG_API_KEY` configurata in `.env`, vedi `CLAUDE.md`). Confermati: le due tile
"Gioco da tavolo"/"Gioco di ruolo" nel type picker; ricerca testuale reale su
BoardGameGeek per entrambi i tipi (`type=boardgame`/`type=rpgitem`); aggiunta di
un elemento per tipo (Catan, 1995; un gioco di ruolo del 1998); rendering
miniatura/card con icona dedicata e anno; pannello di dettaglio con link
"Apri su BoardGameGeek"; footer di attribuzione con la fonte BoardGameGeek,
incluso il caso non-adiacente (libro + BGG) dopo il fix del bug preesistente
sopra descritto. Nessun errore in console riconducibile al codice applicativo
(residua solo il warning Nebular preesistente `NG0100` sul menu laterale, già
presente su `main`).

---

## Condivisione lista (utenti + gruppi, con permesso view/edit) e copia elemento tra liste

Il backend ha aggiunto nel tempo `permission` (`view`/`edit`) su `ListGroupVisibility`
(v0.19.0, mirror di `ListShare.permission` già esistente) e l'endpoint
`POST /api/v1/lists/{id}/items/{item_id}/copy/` per copiare un elemento in un'altra
lista modificabile (v0.18.0). Nessuna delle due funzionalità aveva UI lato frontend:
gli endpoint di condivisione (`shares/`, `group-visibility/`) esistevano solo come
metodi di servizio mai richiamati da nessun componente. **Stato: ✅ Implementato e
verificato end-to-end (2026-07-04).**

**File nuovi:**
- `src/app/shared/list-share/list-share.component.ts` (+ `.html`, `.scss`) — pannello
  standalone (`@Input({ required: true }) listId`) con due sezioni: condivisione con
  utenti (ricerca username, stesso pattern debounced di `groups.component.ts`) e
  condivisione con gruppi (`nb-select`-like nativo sui gruppi di cui si è membri,
  via `GroupService.getGroups()`). Entrambe le sezioni mostrano un `<select>` di
  permesso (`view`/`edit`) per riga; poiché il backend non espone un PATCH su
  `shares/{id}/` né su `group-visibility/{id}/` (solo GET/POST/DELETE), il cambio di
  permesso è implementato come revoca + ricreazione (`changeSharePermission`/
  `changeGroupPermission`).

**File modificati:**
- `src/app/models/list.model.ts` — `GroupVisibility.permission: 'view' | 'edit'`;
  `Item.copied_from_item`/`copied_from_list`/`copied_from_list_detail` (nuovo tipo
  `ListSummary`, alias di `ChildListDetail` — stessa forma restituita dal backend
  per entrambi i campi `*_detail`).
- `src/app/services/list.service.ts` — `shareList`/`addGroupVisibility` accettano
  ora un parametro `permission` (default `'view'`).
- `src/app/services/item.service.ts` — `copyItem(sourceListId, itemId, targetListId)`
  → `POST /lists/{sourceListId}/items/{itemId}/copy/` con `{ target_list }`.
- `src/app/pages/list-detail/list-detail.component.ts`/`.html`/`.scss` — pulsante
  "Condividi" in header (solo owner) che apre `<app-list-share>`; pulsante "Copia in
  un'altra lista" su ogni elemento (visibile a chiunque veda la lista, non solo
  owner, dato che il backend richiede solo accesso in lettura sulla lista sorgente),
  con pannello di scelta della lista di destinazione limitato alle **liste proprie
  dell'utente** (`GET /lists/` filtrato client-side su `owner.id === currentUser.id`,
  escludendo la lista corrente); badge "Copiato da «Titolo»" sulla riga elemento
  quando `item.copied_from_list_detail` è presente.

**Nota architetturale — scope del picker "copia in":** il backend non espone un
filtro per "liste in cui ho accesso in modifica" (né dirette via `ListShare` né via
gruppo), e l'endpoint `shares/`/`group-visibility/` di una lista è leggibile solo dal
proprietario di quella lista — quindi un utente non-owner non ha modo di scoprire
lato client se una lista di terzi gli è stata condivisa in modifica, se non
provandoci e gestendo l'eventuale 403 `LIST_NO_EDIT_ACCESS`. Per questo il picker
mostra solo le liste proprie dell'utente (sempre garantite modificabili): copre il
caso d'uso principale ("copio un elemento da una lista pubblica altrui in una mia
lista"), ma non permette di scegliere come destinazione una lista di terzi condivisa
in modifica. Un'estensione futura richiederebbe un endpoint backend dedicato
(es. `GET /lists/?editable=true`).

**Verifica end-to-end (2026-07-04):** testato con Playwright contro il backend
locale via Docker. Il container `api` era in esecuzione da prima dell'aggiunta della
migrazione `0015_listitem_copied_from_item_listitem_copied_from_list.py` (v0.18.0);
come nei casi precedenti, è stato necessario un `docker compose restart api` (nessuna
modifica al codice) prima che le colonne `copied_from_item`/`copied_from_list`
esistessero a DB — senza, `GET /lists/{id}/` falliva con 500
(`ProgrammingError: column lists_listitem.copied_from_item_id does not exist`).
Confermati con due utenti di test: condivisione di una lista con un utente
(comparsa nella sua vista "Altre liste"); condivisione con un gruppo con permesso
`edit`, cambio permesso a `view` tramite il select di riga, e revoca; copia di un
elemento di testo dalla lista sorgente a una lista di destinazione di proprietà
dello stesso utente, con badge di provenienza visibile nella lista di destinazione.
Nessun errore in console riconducibile al nuovo codice (residua solo il warning
Nebular preesistente `NG0100` sul menu laterale, già presente su `main`).

---

## Nuovi tipi di elemento: Prodotto alimentare (`food_product`), di bellezza
## (`beauty_product`) e altro (`other_product`), via Open Food/Beauty/Products Facts

Il backend (list2me-backend v0.15.0) ha aggiunto il supporto per Open Food Facts,
Open Beauty Facts e Open Products Facts — tre database indipendenti ma con API
identica (stesso software "Product Opener"), selezionabili tramite un parametro
`domain` (`food` | `beauty` | `product`) sull'unico endpoint di ricerca condiviso.
**Stato: ✅ Implementato e verificato end-to-end (2026-07-03).**

**File nuovi:**
- `src/app/models/openfoodfacts.model.ts` — `OpenFoodFactsDomain`
  (`'food' | 'beauty' | 'product'`), `OpenFoodFactsResultMetadata`,
  `OpenFoodFactsSearchResult`.
- `src/app/services/openfoodfacts.service.ts` — `search(q, domain, limit)` e
  `fetchByBarcode(barcode, domain)`, stesso pattern hardcoded-per-tipo di
  `PlaceService`/`EuropeanaService`.

**File modificati:**
- `src/app/pages/list-detail/list-detail.component.ts` — signal/subject per la
  ricerca testuale (`showProductSearch`/`productQuery`/`productResults`) e per
  la modalità alternativa di lookup per codice a barre
  (`productBarcodeMode`/`productBarcode`/`productBarcodeResult`, sul modello
  della modalità "coordinate manuali" già usata per `place`); mappa
  `productDomains` che risolve `food_product`→`food`, `beauty_product`→`beauty`,
  `other_product`→`product`; branch in `selectItemType`/`backToTypePicker`/
  `closeAddPanel`, `addProductItem`, `isProductItem`/`productMeta`/`productIcon`,
  icone `utensils`→`shopping-bag-outline`, `sparkles`→`star-outline`,
  `package`→`cube-outline` in `iconNameFixes`/`getDefaultIcon`, label italiane
  "Prodotto alimentare"/"Prodotto di bellezza"/"Altro prodotto".
- `src/app/pages/list-detail/list-detail.component.html` — pannello di ricerca
  prodotto (stesso pattern di libro/TVDB/MusicBrainz/luogo/Europeana) con
  toggle verso una modalità "Cerca per codice a barre" (analoga alla modalità
  coordinate manuali di `place`, usata per recuperare gli allergeni — presenti
  solo nella risposta di dettaglio per barcode, non nei risultati di ricerca
  testuale); branch `isProductItem` nella card elemento (con badge Nutri-Score/
  NOVA/Eco-Score solo per `food_product`) e nel pannello di dettaglio
  (marca, quantità, categorie, barcode, ingredienti, etichette, allergeni),
  attribuzione Open Food Facts nel footer.
- `src/app/pages/list-detail/list-detail.component.scss` — stili per il
  pannello di ricerca prodotto e per i badge Nutri-Score/Eco-Score colorati
  (verde/giallo/arancio/rosso secondo lo schema ufficiale A–E).

**Nota:** il lookup per codice a barre richiede di selezionare il `domain`
corretto (il tipo di elemento scelto nel type picker) — un barcode alimentare
cercato con il tipo "Altro prodotto" restituisce correttamente un errore 502
dal backend (`OPENFOODFACTS_FETCH_ERROR`), dato che i tre database sono
indipendenti; comportamento verificato e non un bug.

**Verifica end-to-end (2026-07-03):** testato con Playwright contro il backend
locale via Docker. Il container `api` era in esecuzione da prima dell'aggiunta
della migrazione `0012_add_openfoodfacts_item_types.py`; è stato necessario un
`docker compose restart api` (nessuna modifica al codice del backend, solo
riavvio del container per far eseguire la migrazione già presente nel
repository) prima che i tre nuovi tipi comparissero in `GET /item-types/`.
Confermati: le tre tile nel type picker; ricerca testuale su tutti e tre i
domini (`food`/`beauty`/`product`) con risultati e aggiunta elemento; modalità
codice a barre con successo (barcode Nutella `3017620422003` su dominio
`food`, badge Nutri-Score E / NOVA 4 e allergeni visibili nel pannello di
dettaglio) e con fallimento atteso su dominio sbagliato; nessun errore in
console riconducibile al nuovo codice (residua solo il warning Nebular
preesistente `NG0100`, già presente su `main`).

## Nuovo tipo di elemento: Luogo (`place`), con mappa

Il backend (list2me-backend v0.12.0) ha aggiunto il supporto per i luoghi come
elementi tipizzati di una lista, tramite integrazione con Nominatim
(OpenStreetMap). Per completare la funzionalità serve lavoro lato frontend:

### Cosa è già disponibile nel backend

- Nuovo `ItemType` di sistema `place` (`GET /api/v1/item-types/`), con schema:
  `display_name` (string), `address` (object, componenti indirizzo OSM),
  `latitude` (number), `longitude` (number), `osm_id` (integer), `osm_type`
  (string), `place_id` (integer), `category` (string), `place_type` (string),
  `service_url` (string, link a openstreetmap.org).
- `GET /api/v1/places/search/?q=…&limit=…` — ricerca libera di un luogo/indirizzo
  tramite Nominatim. Risposta nello stesso formato uniforme degli altri servizi
  esterni (`{"results": [{"title", "subtitle", "image_url", "service_url",
  "metadata"}]}`), coerente con `search_config.endpoint` restituito da
  `GET /api/v1/item-types/` per il tipo `place`.
- `GET /api/v1/places/reverse/?lat=…&lon=…` — reverse geocoding: dato un punto
  GPS (es. da un pin piazzato su una mappa, o coordinate inserite a mano),
  restituisce un singolo oggetto con la stessa forma di un elemento di
  `/places/search/` (quindi riusabile con la stessa logica di parsing).

### Cosa manca lato frontend

1. ✅ **Form di aggiunta elemento "Luogo"**: implementato un pannello dedicato
   di ricerca (pattern hardcoded per tipo, coerente con book/TVDB/MusicBrainz —
   nel frontend non esiste un meccanismo generico basato su `search_config`,
   vedi nota sotto), con autocomplete debounced su `/places/search/`.
2. ✅ **Inserimento diretto di coordinate GPS**: aggiunta una modalità
   "Inserisci coordinate manualmente" con campi numerici lat/lon e una mappa
   Leaflet con pin trascinabile/cliccabile; ogni cambio posizione chiama
   `GET /places/reverse/` (debounced) per popolare `display_name`/indirizzo.
3. ✅ **Visualizzazione dell'elemento "Luogo" nella lista**: la riga elemento
   mostra il nome e una miniatura statica (singola tile OSM calcolata da
   lat/lon, per evitare di istanziare una mappa Leaflet per ogni riga); il
   pannello di dettaglio (click sulla riga) mostra una mappa Leaflet
   interattiva con marker, usando `metadata.latitude`/`longitude` — nessuna
   chiamata API aggiuntiva per il rendering.
4. ✅ **Icona**: mappato `icon: "map-pin"` (non presente in Eva Icons) su
   `pin-outline`, sia come icona di default per il tipo `place` sia come fix
   generico nel dizionario `iconNameFixes`.

Nessuna API key richiesta per Nominatim; il backend applica già caching Redis
e rispetta il rate limit del servizio pubblico, quindi il frontend può
richiamare `/places/search/` liberamente durante la digitazione (con un
debounce, come per gli altri tipi con autocomplete).

---

## Implementazione (riferimento)

**File nuovi:**
- `src/app/models/place.model.ts` — `PlaceSearchResult` / `PlaceResultMetadata`.
- `src/app/services/place.service.ts` — `search()`, `reverse()`, `getPlaceItemTypeId()`.
- `src/app/shared/place-map/place-map.component.ts` (+ `.scss`) — wrapper
  standalone su Leaflet, con modalità sola visualizzazione e modalità
  interattiva (click/drag per scegliere un punto).

**File modificati:**
- `src/app/pages/list-detail/list-detail.component.ts` — signal/subject per
  ricerca luoghi e coordinate manuali, `selectItemType`/`backToTypePicker`/
  `closeAddPanel` estesi, `addPlaceItem`, `isPlaceItem`/`placeMeta`,
  `placeTileUrl` (tile OSM statica per la miniatura), fix icona `map-pin` →
  `pin-outline`, label `place` → `Luogo`.
- `src/app/pages/list-detail/list-detail.component.html` — pannello di ricerca
  luogo + modalità coordinate manuali, branch `isPlaceItem` nella card e nel
  pannello di dettaglio, attribuzione OpenStreetMap nel footer.
- `src/app/pages/list-detail/list-detail.component.scss` — stili per pannello
  di ricerca, mappa di selezione, miniatura tile e mappa di dettaglio.
- `angular.json` — `leaflet` aggiunto agli `styles` globali; asset
  `node_modules/leaflet/dist/images` copiati in `leaflet/` nell'output di
  build (necessari per le icone dei marker).
- `package.json` — aggiunte dipendenze `leaflet` e `@types/leaflet`.
  `@angular/cdk` resta pinnato a `^21.0.6`.

**Nota architetturale:** il backend documenta `search_config` come meccanismo
generico per l'autocomplete (`GET /item-types/` → `search_config.endpoint`),
ma il frontend non lo consuma ancora per nessun tipo esistente (book/TVDB/
MusicBrainz sono tutti hardcoded per tipo). Per coerenza con il codice
esistente, anche `place` è stato implementato con lo stesso pattern hardcoded
invece di introdurre un meccanismo generico non richiesto — un'eventuale
migrazione a `search_config` resterebbe un refactor più ampio, da valutare
a parte se si vuole eliminare la duplicazione tra i vari servizi di ricerca.

**Verifica end-to-end (2026-07-03):** testato con Playwright contro il
backend locale via Docker (richiede l'overlay `docker-compose.x86_64.yml` su
host x86_64, vedi `CLAUDE.md`). Confermati: schema `place` e risposte di
`/places/search/` e `/places/reverse/` coerenti col modello frontend; aggiunta
di un elemento via ricerca testuale; aggiunta via pin manuale su mappa con
reverse geocoding; rendering miniatura e pannello di dettaglio con mappa
interattiva, marker, indirizzo, categoria, coordinate e link OpenStreetMap;
nessun errore in console riconducibile al nuovo codice.

---

## Nuovi tipi di elemento: Opera d'arte (`artwork`) e Artista (`art_artist`), via Europeana

Il backend (list2me-backend v0.10.0) ha aggiunto l'integrazione con Europeana
per opere d'arte e artisti (`GET /api/v1/europeana/search/?q=…&type=artwork|artist`,
più i dettagli estesi `/europeana/artworks/{record_id}/` e
`/europeana/artists/{agent_id}/`). I due tipi `artwork` e `art_artist` erano
già presenti nella traduzione delle etichette (`typeLabelTranslations`) ma non
avevano né form di ricerca/aggiunta né rendering in lista/dettaglio — la
funzionalità mancava del tutto lato frontend. **Stato: ✅ Implementato e
verificato end-to-end (2026-07-03).**

**File nuovi:**
- `src/app/models/europeana.model.ts` — `EuropeanaEntityType`
  (`'artwork' | 'artist'`), `EuropeanaSearchResult`.
- `src/app/services/europeana.service.ts` — `search(q, type, limit)`, stesso
  pattern hardcoded-per-tipo di `MusicBrainzService`/`PlaceService`.

**File modificati:**
- `src/app/pages/list-detail/list-detail.component.ts` — signal/subject per
  la ricerca Europeana, branch in `selectItemType`/`backToTypePicker`/
  `closeAddPanel`, `onEuropeanaQueryChange`, `addEuropeanaItem`,
  `isEuropeanaItem`/`europeanaMeta`, icone `palette`→`color-palette-outline`
  e `brush`→`brush-outline` in `iconNameFixes`/`getDefaultIcon`, label
  `art_artist` rinominata da `Artista` a **`Artista (arte)`** per
  disambiguarla dall'omonimo tipo MusicBrainz `artist` nel type picker (con
  due tile "Artista" identiche l'utente non avrebbe potuto distinguerle).
- `src/app/pages/list-detail/list-detail.component.html` — pannello di
  ricerca Europeana (stesso pattern di libro/TVDB/MusicBrainz/luogo), branch
  `isEuropeanaItem` nella card elemento e nel pannello di dettaglio (campi
  diversi per `artwork` vs `art_artist`: creatore/anno/mezzo/descrizione/
  fornitore per le opere, biografia/date/luoghi/professioni per gli artisti),
  attribuzione Europeana nel footer.

**Nota:** la ricerca artisti di Europeana (Entity API `/suggest`) restituisce
solo `id` e nome — a differenza di MusicBrainz, i cui risultati di ricerca
includono già i campi estesi (paese, date). Il pannello di dettaglio
dell'artista mostrerà quindi solo nome e link a Europeana finché non si
aggiunge (fuori scope qui) una chiamata a `/europeana/artists/{id}/` dopo la
selezione — limite dei dati disponibili in fase di ricerca, non un bug.

**Bug preesistente corretto nel percorso:** `addEpisodeItem` inviava
`text: episode.name` senza fallback; TheTVDB restituisce `name: null` per gli
episodi privi di traduzione nella lingua richiesta (tipico per gli "special"
di stagione 0), causando un 422 `VALIDATION_ERROR` dal backend
("This field may not be null") e nessun elemento aggiunto. Ora usa
`` `${serie} ${stagione}×${episodio}` `` come fallback quando `name` è vuoto.

**Verifica end-to-end (2026-07-03):** testato con Playwright contro il
backend locale via Docker. Oltre alla nuova funzionalità Europeana (ricerca
e aggiunta di un'opera d'arte e di un artista, rendering miniatura/dettaglio),
è stato eseguito un giro end-to-end completo di regressione su tutti i tipi
di elemento esistenti (testo, libro/OpenLibrary, film e episodio/TheTVDB,
artista/album/brano MusicBrainz, luogo via ricerca testuale e via pin
manuale/reverse geocoding, immagine), oltre a modifica, riordino ed
eliminazione di elementi e apertura del pannello suggerimenti. Nessun errore
in console riconducibile al codice applicativo (residuano solo un warning
Nebular preesistente `NG0100` sul menu laterale e un `ERR_ABORTED` di
navigazione sulla dashboard, entrambi riproducibili anche su `main` prima di
queste modifiche).
