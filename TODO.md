# TODO — richieste da list2me-backend

**Stato: ✅ Completato e verificato end-to-end (2026-07-03).**

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
