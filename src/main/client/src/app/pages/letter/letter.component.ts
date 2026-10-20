import { afterRenderEffect, Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, PRIMARY_OUTLET, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LeafletComponent } from '@joakimono/echarts-extension-leaflet/src/export';
import L from 'leaflet';
import { init, use } from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent } from 'echarts/components';
import { AppConfiguration } from '../../app-configuration';
import { AppState } from '../../app-state';

use([CanvasRenderer, GraphChart, TooltipComponent, LeafletComponent]);

@Component({
  selector: 'app-letter',
  imports: [DatePipe, TranslateModule, RouterModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './letter.component.html',
  styleUrl: './letter.component.scss',
})
export class LetterComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private config = inject(AppConfiguration);
  private state = inject(AppState);
  private translation = inject(TranslateService);
  private mapElement = viewChild<ElementRef<HTMLDivElement>>('letterMap');
  private letterId = toSignal(this.route.paramMap.pipe(map(params => params.get('id') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('id') ?? '',
  });

  readonly language = toSignal(this.translation.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.translation.currentLang || 'cs',
  });
  readonly source = this.getSource();
  readonly searchUrl = this.router.createUrlTree(['/'], {
    queryParams: this.source?.url.queryParams ?? this.route.snapshot.queryParams,
  });
  readonly letterRes = httpResource<any>(() => this.letterId() ? {
    url: '/api/data/get_letter',
    params: { id: this.letterId() },
  } : undefined);
  readonly letter = computed(() => this.letterRes.hasValue() ? this.letterRes.value() : undefined);
  readonly personGroups = computed(() => ['authors', 'recipients', 'mentioned'].map((label, index) => ({
    label,
    people: (this.letter()?.identities ?? []).filter((person: any) => person.role === ['author', 'recipient', 'mentioned'][index]),
  })));
  readonly placeGroups = computed(() => ['origins', 'destinations'].map((label, index) => ({
    label,
    places: (this.letter()?.places ?? []).filter((place: any) => place.role === ['origin', 'destination'][index]),
  })));
  readonly mappedPlaces = computed<any[]>(() => (this.letter()?.places ?? []).filter((place: any) =>
    place.latitude != null && place.longitude != null &&
    Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude))));
  readonly keywords = computed<any[]>(() => this.letter()?.keywords ?? this.letter()?.hiko?.keywords ?? []);
  readonly abstract = computed(() => {
    const value = this.letter()?.abstract;
    return value?.[this.language()] || value?.cs || value?.en;
  });
  readonly hikoUrl = computed(() => {
    const letter = this.letter();
    const id = letter?.letter_id ?? letter?.hiko?.id;
    const tenant = this.config.isTest ? this.config.test_mappings[letter?.tenant] : letter?.tenant;
    return id && tenant ? this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', String(id)) : null;
  });

  constructor() {
    afterRenderEffect(onCleanup => {
      const element = this.mapElement()?.nativeElement;
      const places = this.mappedPlaces();
      if (!element || !places.length) return;

      const unique = [...new Map(places.map(place => [String(place.id), place])).values()];
      const bounds = L.latLngBounds(unique.map(place => L.latLng(Number(place.latitude), Number(place.longitude))));
      const center = bounds.getCenter();
      const chart = init(element);
      const origin = places.find(place => place.role === 'origin');
      const destination = places.find(place => place.role === 'destination');
      chart.setOption({
        lmap: {
          center: [center.lng, center.lat], zoom: 10, resizeEnable: true,
          renderOnMoving: true, echartsLayerInteractive: true,
        },
        tooltip: {
          trigger: 'item', renderMode: 'richText',
          formatter: (params: any) => params.dataType === 'edge' ? params.data.name : params.name,
        },
        series: [{
          type: 'graph', coordinateSystem: 'lmap',
          data: unique.map(place => ({ id: String(place.id), name: place.name, value: [Number(place.longitude), Number(place.latitude), 1] })),
          links: origin && destination ? [{
            source: String(origin.id), target: String(destination.id),
            name: `${origin.name} → ${destination.name}`,
          }] : [],
          edgeSymbol: ['circle', 'arrow'], edgeSymbolSize: [2, 6],
          label: { show: true, position: 'right', formatter: '{b}' },
          labelLayout: { hideOverlap: true },
          lineStyle: { color: 'source', curveness: 0.3 },
          emphasis: { focus: 'adjacency', lineStyle: { width: 10 } },
        }],
      });
      const leaflet: L.Map = (chart as any).getModel().getComponent('lmap').getLeaflet();
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(leaflet);
      leaflet.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
      let frame = 0;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          chart.resize();
          leaflet.invalidateSize();
        });
      });
      observer.observe(element);
      onCleanup(() => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        chart.dispose();
      });
    });
  }

  identityUrl(person: any): string {
    return '/identity/' + (person.global_identity ? 'global_' + person.global_identity.id : person.id);
  }

  translatedValue(group: string, value: string): string {
    this.language();
    const key = `letter.${group}.${value}`;
    const translated = this.translation.instant(key);
    return translated === key ? value : translated;
  }

  private getSource() {
    const previous = this.router.currentNavigation()?.previousNavigation ?? this.router.lastSuccessfulNavigation();
    const url = previous?.finalUrl ?? previous?.extractedUrl;
    const path = url?.root.children[PRIMARY_OUTLET]?.segments.map(segment => segment.path).join('/');
    const view = this.state.views.find(view => view.route && view.route === path);
    return view && url ? { header: view.header, url } : null;
  }
}
