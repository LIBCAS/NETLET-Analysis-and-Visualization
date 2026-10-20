import { afterRenderEffect, Component, computed, DOCUMENT, ElementRef, inject, signal, viewChild } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, PRIMARY_OUTLET, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import L, { latLng, tileLayer as LtileLayer, MapOptions, geoJSON, control } from "leaflet";
//import L, { geoJSON } from 'leaflet';
import { use, init, EChartsType, ComposeOption } from "echarts/core";
import { VisualMapComponentOption, GraphSeriesOption, color } from 'echarts';
import { GraphChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, TitleComponentOption } from 'echarts/components';
import { AppConfiguration } from '../../app-configuration';
import { AppState } from '../../app-state';

import * as echarts from 'echarts/core';
import { AppService } from '../../app.service';
use([CanvasRenderer, GraphChart, TooltipComponent, LeafletComponent]);

import {
  LeafletComponent,
  LeafletComponentOption,
  LeafletHeatmapSeriesOption,
} from "@joakimono/echarts-extension-leaflet/src/export";

type ECOption = ComposeOption<
  | TitleComponentOption
  | VisualMapComponentOption
  | GraphSeriesOption
// unite LeafletComponentOption with the initial options of Leaflet `MapOptions`
> &
  LeafletComponentOption<MapOptions>;


@Component({
  selector: 'app-letter',
  imports: [DatePipe, TranslateModule, RouterModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './letter.component.html',
  styleUrl: './letter.component.scss',
})
export class LetterComponent {

  
  private document: Document= inject(DOCUMENT); 
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private config = inject(AppConfiguration);
  private state = inject(AppState);
  private translation = inject(TranslateService);

  chart: EChartsType;

  
  private destroyed = false;


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

  map: any;

  constructor() {
    afterRenderEffect(onCleanup => {
      const element = this.mapElement()?.nativeElement;
      const places = this.mappedPlaces();
      if (!element || !places.length) return;

      const unique = [...new Map(places.map(place => [String(place.id), place])).values()];
      const bounds = L.latLngBounds(unique.map(place => L.latLng(Number(place.latitude), Number(place.longitude))));
      const center = bounds.getCenter();
      this.chart = init(element);
      const origin = places.find(place => place.role === 'origin');
      const destination = places.find(place => place.role === 'destination');
      const itemStyle = {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: '#ff7e5f' },  // Barva uprostřed
          { offset: 1, color: '#992509' },   // Barva na okrajích
        ]),
      };

      this.chart.setOption({
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
          data: unique.map(place => ({ id: String(place.id), name: place.name, value: [Number(place.longitude), Number(place.latitude), 1], itemStyle })),
          links: origin && destination ? [{
            source: String(origin.id), target: String(destination.id),
            name: `${origin.name} → ${destination.name}`,
          }] : [],
          edgeSymbol: ['circle', 'arrow'], edgeSymbolSize: [2, 6],
          label: { show: true, position: 'right', formatter: '{b}' },
          labelLayout: { hideOverlap: true },
          lineStyle: { color: this.config.tenant_colors[this.letter().tenant], curveness: 0.3, opacity: 1, width: 2 },
          emphasis: { focus: 'adjacency', lineStyle: { width: 10 } },
        }],
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmapComponent = this.chart.getModel().getComponent("lmap");
      // Get the instance of Leaflet
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmap = lmapComponent.getLeaflet();

      this.map = lmap;

    
      //const leaflet: L.Map = lmap.getLeaflet();
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(lmap);

      setTimeout(() => {
        this.addControl(lmap);
      }, 1000);
      
      
      lmap.fitBounds(bounds, { padding: [100, 100], maxZoom: 10 });
      let frame = 0;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          this.chart.resize();
          lmap.invalidateSize();
        });
      });
      observer.observe(element);
      onCleanup(() => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        this.chart.dispose();
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

    selectedGeo = signal<string>('');
    geoJsonControl: any;
    addControl(lmap: any) {
      if (this.geoJsonControl) {
        //this.geoJsonControl.removeFrom(lmap);
        lmap.removeControl(this.geoJsonControl);
      }
      
      this.geoJsonControl = new L.Control({ position: 'topright' });
  
      this.geoJsonControl.onAdd = (map: any) => {
  
        const div = L.DomUtil.create('div', 'info legend app-map-boundaries');
        const label = L.DomUtil.create('strong', 'app-map-boundaries-title');
        label.textContent = this.translation.instant('map.boundaries');
        div.appendChild(label);
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
  
        const years = L.DomUtil.create('div', 'app-map-boundaries-years');
        div.appendChild(years);


        
        const first = this.config.geojsons.findIndex(g => g > this.letter().date_year) - 1;
        const rok = this.config.geojsons[first] + '';
        
          const button = this.document.createElement('button');
          button.type = 'button';
          button.className = 'rok';
          button.classList.toggle('selected', this.selectedGeo() === rok);
          button.setAttribute('aria-pressed', String(this.selectedGeo() === rok));
          button.textContent = rok;
          button.onclick = () => {
            this.selectedGeo.set(this.selectedGeo() === rok ? '' : rok);
            years.querySelectorAll('button').forEach(item => {
              const selected = item.textContent === this.selectedGeo();
              item.classList.toggle('selected', selected);
              item.setAttribute('aria-pressed', String(selected));
            });
            this.getGeos(this.selectedGeo());
          };
          years.appendChild(button);
  
        return div;
      };
  
      this.geoJsonControl.addTo(lmap);
    }

    geoJsonLayer: any;
      getGeos(year: string) {
    
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const lmapComponent = this.chart.getModel().getComponent("lmap");
        // Get the instance of Leaflet
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const lmap = lmapComponent.getLeaflet();
        if (!year) {
          this.clearGeos(lmap);
          return;
        }
    
        this.service.getGeos(year).subscribe((resp: any) => {
          if (this.destroyed || this.selectedGeo() !== year) return;
    
          if (this.geoJsonLayer) {
            this.geoJsonLayer.removeFrom(lmap);
          }
    
          this.geoJsonLayer = geoJSON((resp as any), { style: () => ({ color: '#333', weight: 1, fillColor: '#fff', fillOpacity: .4 }) });
    
          this.geoJsonLayer.addTo(lmap);
        });
      }

      clearGeos(lmap: any) {

    if (this.geoJsonLayer) {
      this.geoJsonLayer.removeFrom(lmap);
    }

  }

}
