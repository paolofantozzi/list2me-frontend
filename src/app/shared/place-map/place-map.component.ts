import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import * as L from 'leaflet';

// Le icone di default di Leaflet puntano a percorsi relativi al CSS che il bundler
// non risolve: le ricarichiamo esplicitamente dagli asset copiati in /leaflet (angular.json).
const defaultIcon = L.icon({
  iconUrl: 'leaflet/marker-icon.png',
  iconRetinaUrl: 'leaflet/marker-icon-2x.png',
  shadowUrl: 'leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

@Component({
  selector: 'app-place-map',
  standalone: true,
  imports: [],
  template: `<div #mapContainer class="place-map"></div>`,
  styleUrl: './place-map.component.scss',
})
export class PlaceMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() zoom = 15;
  /** Se true, la mappa risponde a click/drag per scegliere un punto. */
  @Input() interactive = false;

  @Output() positionChange = new EventEmitter<{ lat: number; lon: number }>();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  ngAfterViewInit(): void {
    const lat = this.latitude ?? 41.9028;
    const lon = this.longitude ?? 12.4964;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: this.interactive,
      dragging: this.interactive,
      scrollWheelZoom: this.interactive,
      doubleClickZoom: this.interactive,
      boxZoom: this.interactive,
      keyboard: this.interactive,
      touchZoom: this.interactive,
    }).setView([lat, lon], this.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.latitude != null && this.longitude != null) {
      this.marker = L.marker([lat, lon], { draggable: this.interactive }).addTo(this.map);
    }
    // In modalità interattiva senza coordinate iniziali non piazziamo un pin di default:
    // aspettiamo un click/drag esplicito dell'utente prima di emettere una posizione.

    if (this.interactive) {
      this.map.on('click', (e: L.LeafletMouseEvent) => this.placeMarker(e.latlng.lat, e.latlng.lng));
      this.marker?.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.emitPosition(pos.lat, pos.lng);
      });
    }

    // Leaflet calcola le dimensioni al primo render: se il contenitore era nascosto
    // (es. dentro un pannello appena aperto) le tile non vengono caricate correttamente.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if ((changes['latitude'] || changes['longitude']) && this.latitude != null && this.longitude != null) {
      const latlng: L.LatLngTuple = [this.latitude, this.longitude];
      this.map.setView(latlng, this.zoom);
      if (this.marker) {
        this.marker.setLatLng(latlng);
      } else {
        this.marker = L.marker(latlng, { draggable: this.interactive }).addTo(this.map);
        if (this.interactive) {
          this.marker.on('dragend', () => {
            const pos = this.marker!.getLatLng();
            this.emitPosition(pos.lat, pos.lng);
          });
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private placeMarker(lat: number, lon: number): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    } else {
      this.marker = L.marker([lat, lon], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.emitPosition(pos.lat, pos.lng);
      });
    }
    this.emitPosition(lat, lon);
  }

  private emitPosition(lat: number, lon: number): void {
    this.positionChange.emit({ lat, lon });
  }
}
