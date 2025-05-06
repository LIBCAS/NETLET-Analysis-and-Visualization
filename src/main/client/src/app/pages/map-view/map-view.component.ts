import { Component, Inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import L, { circle, CircleMarker, LatLng, latLng, LatLngBounds, Layer, LayerGroup, Map, Marker, polygon, tileLayer } from 'leaflet';
import '@elfalem/leaflet-curve';
import { CurveLatLngExpression, CurvePathDataElement } from '@elfalem/leaflet-curve';
import { AppService } from '../../app.service';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatListModule } from '@angular/material/list';
import {MatProgressBarModule} from '@angular/material/progress-bar';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { EChartsOption, ECharts } from 'echarts';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { LegendComponent } from 'echarts/components';
import { TooltipComponent } from 'echarts/components';
import { GridComponent } from 'echarts/components';
import { TitleComponent } from 'echarts/components';
import { BrushComponent } from 'echarts/components';
import { ToolboxComponent } from 'echarts/components';
import { Facet } from '../../shared/facet';
import { HttpParams } from '@angular/common/http';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Letter, Place } from '../../shared/letter';
import { MatIconModule } from '@angular/material/icon';
import { AppState, Tenant } from '../../app-state';
echarts.use([BarChart, CanvasRenderer, LegendComponent, TooltipComponent, GridComponent, TitleComponent, BrushComponent, ToolboxComponent]);

@Component({
  selector: 'app-map-view',
  imports: [TranslateModule, FormsModule, CommonModule,
    LeafletModule, NgxEchartsDirective,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatListModule,
  MatIconModule, MatProgressBarModule
],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class MapViewComponent implements OnInit {

  loading: boolean;
  map: Map;
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
    ],
    zoom: 4,
    center: latLng(49.879966, 16.726909)
  };

  linkColor = '#5470c6';
  activeLinkColor = '#f00';

  solrResponse: any;
  recipients: Facet[] = [];
  mentioned: Facet[] = [];

  nodeLayer: LayerGroup<CircleMarker> = new L.LayerGroup();
  linkLayer: LayerGroup<CircleMarker> = new L.LayerGroup();

  nodes: { [id: number]: { coords: [number, number], name: string } } = {};
  links: { [id: string]: { node1: [number, number], node2: [number, number], count: number, letters: Letter[] } } = {};

  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  rokAxis: string[] = [];
  rokSeries: number[] = [];
  limits: [number, number];
  showSelection: boolean = true;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
        public state: AppState,
    private service: AppService
  ) { }

  ngOnInit(): void {
    this.linkColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
    this.activeLinkColor = this.document.body.computedStyleMap().get('--app-color-map-link-active').toString();
 
  }

  onMapReady(map: Map) {
    this.map = map;
    if (this.state.tenant) {
      setTimeout(() => {
        
      this.limits = [this.state.tenant.date_year_min, this.state.tenant.date_year_max];
      this.getData(true);
      }, 10)
    }
  }

  changeTenant() {
    this.limits = [this.state.tenant.date_year_min, this.state.tenant.date_year_max];
    this.getData(true);
  }

  getData(withMap: boolean) {
    this.loading = true;
    if (withMap) {
      this.nodes = {};
      this.nodeLayer.clearLayers();
      this.links = {};
      this.linkLayer.clearLayers();
    }
    const p: any = {};
    p.tenant = this.state.tenant.val;
    p.date_range = this.limits.toString();
    p.tenant_date_range = this.state.tenant.date_year_min + ',' + this.state.tenant.date_year_max;
    if (!withMap) {
      p.rows = 0;
    }

    this.service.getMap(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      this.recipients = resp.facet_counts.facet_fields.identity_recipient;
      this.mentioned = resp.facet_counts.facet_fields.identity_mentioned;
      if (resp.stats?.stats_fields.latitude) {
        const lat = resp.stats.stats_fields.latitude;
        const lon = resp.stats.stats_fields.longitude;
        this.map.fitBounds(L.latLngBounds( [lat.max, lon.min], [lat.min, lon.max] ))
      } 
      if (withMap) {
        this.solrResponse = resp;
        this.setYearsChart(this.solrResponse.facet_counts.facet_ranges.date_year);
      }
      this.setMap();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setMap() {
    this.nodes = {};
    this.nodeLayer.clearLayers();
    this.links = {};
    this.linkLayer.clearLayers();
    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.places && letter.origin) {
        letter.places.forEach((place: Place) => {
          if (place.latitude && !this.nodes[place.place_id]) {
            this.nodes[place.place_id] = { coords: [place.latitude, place.longitude], name: place.name };
            const m = L.circleMarker([place.latitude, place.longitude], {
              color: '#795548',
              radius: 5,
              weight: 1
            });
            m.bindTooltip(place.name);
            m.addTo(this.nodeLayer);
          }
        });

        const linkId = letter.origin + '_' + letter.destination;
        const place_origin = letter.places.find(p => p.role === 'origin');
        const place_destination = letter.places.find(p => p.role === 'destination');

        if (place_origin && place_destination && place_origin.latitude && place_destination.latitude) {
          if (!this.links[linkId]) {
            this.links[linkId] = {
              node1: [place_origin.latitude, place_origin.longitude],
              node2: [place_destination.latitude, place_destination.longitude],
              count: 1,
              letters: [letter]
            };
          } else {
            this.links[linkId].count = this.links[linkId].count + 1;
            this.links[linkId].letters.push(letter);
          }
        }
      };

    });


    Object.keys(this.links).forEach(key => {
      const link = this.links[key];
      this.linkNodes(link.node1, link.node2, link.count, link.letters);
    });

    // this.linkNodes(this.links[letter.letter_id].node1, this.links[letter.letter_id].node2, this.links[letter.letter_id].count, letter.identities, letter.date_year);

    this.map.addLayer(this.linkLayer);
    this.map.addLayer(this.nodeLayer);

    // console.log(this.linkLayer.getLayers())
  }

  activeIdentity: Facet = null;
  clickRecipient(identity: Facet) {
    if (identity === this.activeIdentity) {
      this.activeIdentity = null;
      this.clearHighlight();
    } else {
      this.activeIdentity = identity;
      this.highlightRecipients(identity)
    }
  }

  highlightRecipients(identity: Facet) {
    let bounds: LatLngBounds = null;
    this.linkLayer.getLayers().forEach((layer: any) => {
      const hit = layer.options.letters.find((l: Letter) => l.identity_recipient && l.identity_recipient.includes(identity.name));
      if (hit) {
        layer.setStyle({ color:  this.activeLinkColor});
        layer.bringToFront();
        if (bounds) {
          bounds = bounds.extend(layer.getBounds());
        } else {
          bounds = layer.getBounds();
        }
        
      } else {
        layer.setStyle({ color: this.linkColor });
      }
    });

    if (bounds) {
      this.map.fitBounds(bounds);
    }
        

  }

  highlightLinks(identity: Facet) {
    this.linkLayer.getLayers().forEach((layer: any) => {
      if (layer.options.letters.find((l: Letter) => l.identity_mentioned?.includes(identity.name))) {
        layer.setStyle({ color: this.activeLinkColor });
        layer.bringToFront();
      } else {
        layer.setStyle({ color: this.linkColor });
      }
    })

  }

  clearHighlight() {
    this.linkLayer.getLayers().forEach((layer: any) => {
      layer.setStyle({ color: this.linkColor });
    });
  }

  linkNodes(node1: [number, number], node2: [number, number], count: number, letters: Letter[]) {
    const offsetX: any = node2[1] - node1[1];
    const offsetY: any = node2[0] - node1[0];

    var r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
      theta = Math.atan2(offsetY, offsetX);

    var thetaOffset = (3.14 / 10);

    var r2 = (r / 2) / (Math.cos(thetaOffset)),
      theta2 = theta + thetaOffset;

    var midpointX = (r2 * Math.cos(theta2)) + node1[1],
      midpointY = (r2 * Math.sin(theta2)) + node1[0];

    var midpointLatLng: CurvePathDataElement = [midpointY, midpointX];

    const m = L.curve(['M', node1,
      'Q', midpointLatLng,
      node2],
      { color: this.linkColor, fill: true, weight: Math.min(count, 4), fillColor: '#fff', fillOpacity: 0 }
    );

    L.setOptions(m, { letters: letters })

    m.on('mouseover', () => {
      m.setStyle({ color: this.activeLinkColor });
    });

    m.on('mouseout', () => {
      m.setStyle({ color: this.linkColor });
    });
    // console.log(m);
    // let popup = '<div>Rok:' + year + '</div>';
    // identities.forEach(i => {
    //   popup += '<div>' + i.role + ': ' + i.name + '</div>';
    // })

    let popup = '<div>' + this.nodes[letters[0].origin].name + ' -> ' + this.nodes[letters[0].destination].name + '</div><div>Count:' + count + '</div>';
    const roky: number[] = [];
    letters.forEach(letter => {
      if (!roky.includes(letter.date_year)) {
        roky.push(letter.date_year)
      }
    });
    popup += '<div>' + roky.join(', ') + '</div>';
    m.bindTooltip(popup, { sticky: true });
    m.addTo(this.linkLayer);
  }

  onChartRokInit(e: any) {
    this.chartRok = e;
  }

  onSetYears(e: any) {
    if (!e.areas || e.areas.length === 0) {
      return;
    }
    this.limits = [parseInt(this.rokAxis[e.areas[0].coordRange[0]]), parseInt(this.rokAxis[e.areas[0].coordRange[1]])];
    this.getData(false);
  }

  onClearSelection(e: any) {
    if (e.batch[0].areas.length === 0 && this.showSelection) {
      this.limits = [this.state.tenant.date_year_min, this.state.tenant.date_year_max];
      this.setMap();
      this.getData(false);
      // const params: any = {};
      // params.rokvydani = null;
      // this.router.navigate(['/results'], { queryParams: params, queryParamsHandling: 'merge' });
    }
  }

  setSelection(minWithValue: string, maxWithValue: string) {
    if (this.showSelection) {
      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [minWithValue, maxWithValue],
            xAxisIndex: 0
          }
        ]
      });
    }
  }

  setYearsChart(facet: { start: number, end: number, gap: string, after: number, counts: { name: string, type: string, value: number }[] }) {

    this.rokSeries = facet.counts.map(c => c.value);
    this.rokSeries.push(facet.after);
    this.rokAxis = facet.counts.map(c => c.name);
    this.rokAxis.push(facet.end + '');

    let minRokWithValue = '1100';
    let maxRokWithValue = '2025';
    if (this.limits) {
      minRokWithValue = this.limits[0] + '';
      maxRokWithValue = this.limits[1] + '';
    } else {
      minRokWithValue = facet.start + '';
      maxRokWithValue = facet.end + '';
    }
    this.chartOptionsRok = {
      animation: false,
      title: {
        show: false,
        text: this.translation.instant('Rok')
      },
      toolbox: {
        show: this.limits !== undefined,
        feature: {
          brush: { title: { 'clear': this.translation.instant('clearSelection') }, show: true }
        }
      },
      brush: {
        toolbox: ['clear'],
        brushType: 'lineX',
        xAxisIndex: 0,
        brushLink: 'all',
        outOfBrush: {
          colorAlpha: 0.2
        }
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: this.rokAxis,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisPointer: {
          z: 100
        }
      },
      yAxis: {
        show: false
      },
      series: [{
        name: '',
        type: 'bar',
        data: this.rokSeries,
        barCategoryGap: 0,
        color: this.linkColor,
        markArea: {
          silent: true,
          itemStyle: {
            opacity: 0.8,
            color: '#ccc0'
          },
          data: [
            [
              { xAxis: minRokWithValue },
              { xAxis: maxRokWithValue }
            ]
          ]
        },
      }]
    }
    setTimeout(() => {
      if (this.showSelection) {
        this.chartRok.dispatchAction({
          type: 'brush',
          areas: [
            {
              brushType: 'lineX',
              coordRange: [minRokWithValue, maxRokWithValue],
              xAxisIndex: 0
            }
          ]
        });
      }

      this.chartRok.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: 'lineX',
          brushMode: 'single'
        }
      });
    }, 50);

    // setTimeout(() => {
    //   this.setSelection(minRokWithValue, maxRokWithValue);
    // }, 50);

  }

}
