import { httpResource } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, PRIMARY_OUTLET, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import L from 'leaflet';
import { AppState } from '../../app-state';

interface PlaceDetail {
  name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  country?: string;
  note?: string;
  geoname_id?: number | string;
  stats?: {
    count?: number;
    orig?: { count?: number };
    dest?: { count?: number };
    mentioned?: { count?: number };
  };
}

@Component({
  selector: 'app-place',
  imports: [TranslateModule, RouterLink, LeafletModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './place.component.html',
  styleUrl: './place.component.scss',
})
export class PlaceComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private state = inject(AppState);
  private destroyRef = inject(DestroyRef);
  private placeId = toSignal(this.route.paramMap.pipe(map(params => params.get('id') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('id') ?? '',
  });
  private leafletMap = signal<L.Map | undefined>(undefined);
  private nodeLayer = L.layerGroup();
  private resizeObserver?: ResizeObserver;
  private resizeFrame = 0;
  private icon = L.divIcon({ className: 'map-pin', iconSize: undefined });

  readonly source = this.getSource();
  readonly searchUrl = this.router.createUrlTree(['/'], {
    queryParams: this.source?.url.queryParams ?? this.route.snapshot.queryParams,
  });
  readonly placeRes = httpResource<PlaceDetail>(() => this.placeId() ? {
    url: '/api/data/get_place',
    params: { id: this.placeId() },
  } : undefined);
  readonly place = computed(() => this.placeRes.hasValue() ? this.placeRes.value() : undefined);
  readonly coordinates = computed(() => {
    const place = this.place();
    if (place?.latitude == null || place.longitude == null ||
        String(place.latitude).trim() === '' || String(place.longitude).trim() === '') return null;

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    return Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
      Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? L.latLng(latitude, longitude) : null;
  });
  readonly geonamesUrl = computed(() => {
    const id = this.place()?.geoname_id;
    return id && /^\d+$/.test(String(id)) ? `https://www.geonames.org/${id}/` : null;
  });
  readonly options: L.MapOptions = {
    layers: [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    })],
    zoom: 8,
    center: L.latLng(49.879966, 16.726909),
  };

  constructor() {
    effect(() => {
      const map = this.leafletMap();
      const coordinates = this.coordinates();
      const place = this.place();
      if (!map || !coordinates || !place || !map.getContainer().isConnected) return;

      this.nodeLayer.clearLayers();
      const label = document.createElement('span');
      label.textContent = place.name;
      L.marker(coordinates, { icon: this.icon, riseOnHover: true })
        .bindTooltip(label)
        .addTo(this.nodeLayer);
      this.nodeLayer.addTo(map);
      map.invalidateSize({ animate: false });
      map.panTo(coordinates, { animate: false });
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      cancelAnimationFrame(this.resizeFrame);
    });
  }

  onMapReady(map: L.Map) {
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.resizeFrame);
    this.leafletMap.set(map);
    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        if (this.leafletMap() === map && map.getContainer().isConnected) {
          map.invalidateSize({ animate: false });
        }
      });
    });
    this.resizeObserver.observe(map.getContainer());
  }

  private getSource() {
    const previous = this.router.currentNavigation()?.previousNavigation ?? this.router.lastSuccessfulNavigation();
    const url = previous?.finalUrl ?? previous?.extractedUrl;
    const segments = url?.root.children[PRIMARY_OUTLET]?.segments.map(segment => segment.path) ?? [];
    const view = this.state.views.find(view => view.route && view.route === segments.join('/'));
    const label = view ? `home.${view.header}.header` :
      segments[0] === 'letter' ? 'letter.detail' :
      segments[0] === 'identity' ? 'identity_detail.detail' :
      segments[0] === 'catalog' ? 'field.tenant' : null;
    return label && url ? { label, url } : null;
  }
}
