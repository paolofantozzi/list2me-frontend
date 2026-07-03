# TODO — richieste da list2me-backend

**Stato: ✅ Completato e verificato end-to-end (2026-07-03).**

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
