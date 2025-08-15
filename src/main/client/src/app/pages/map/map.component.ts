import { Component, effect, Inject, NgZone } from '@angular/core';
import { YearsChartComponent } from "../../components/years-chart/years-chart.component";
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Tenant, AppState } from '../../app-state';
import { AppService } from '../../app.service';
import { JSONFacet } from '../../shared/facet';
import { Letter, Place } from '../../shared/letter';

import {
  LeafletComponent,
  LeafletComponentOption,
  LeafletHeatmapSeriesOption,
} from "@joakimono/echarts-extension-leaflet/src/export";


import L, { latLng, Map, tileLayer as LtileLayer, MapOptions } from "leaflet";

import { EChartsOption, ECharts, EffectScatterSeriesOption, ScatterSeriesOption, VisualMapComponentOption, GraphSeriesOption } from 'echarts';
import { use, init, EChartsType, ComposeOption } from "echarts/core";

import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, TitleComponent, TitleComponentOption } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { MatCheckboxModule } from '@angular/material/checkbox';


type ECOption = ComposeOption<
  | TitleComponentOption
  | VisualMapComponentOption
  | LeafletHeatmapSeriesOption
  | GraphSeriesOption
// unite LeafletComponentOption with the initial options of Leaflet `MapOptions`
> &
  LeafletComponentOption<MapOptions>;

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, TitleComponent, LabelLayout, LeafletComponent]);

@Component({
  selector: 'app-map',
  imports: [TranslateModule, FormsModule, LeafletModule, MatCardModule, MatExpansionModule, MatCheckboxModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatListModule, MatIconModule, MatProgressBarModule, YearsChartComponent, LettersInfoComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {


  loading: boolean;
  running: boolean;
  invalidTenant: boolean;
  map: Map;
  options = {
    layers: [
      LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
    ],
    zoom: 4,
    center: latLng(49.879966, 16.726909)
  };

  solrResponse: any;
  authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];

  graphOptions: ECOption = {};
  graphChart: EChartsType;

  nodes: { [id: number]: { coords: [number, number], name: string } } = {};
  links: { [id: string]: { node1: [number, number], node2: [number, number], count: number, letters: Letter[] } } = {};
  limits: [number, number];

  infoContent: string;
  infoHeader: string;

  tenants: Tenant[] = [];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
    private router: Router,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService
  ) {
    effect(() => {
      this.tenants = this.state.selectedTenants();
      console.log(this.tenants)
      if (this.tenants.length > 0) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {
    this.state.tenants.forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'map');
  }

  onMapReady(map: Map) {
    this.map = map;
    if (this.tenants.length > 0) {
      setTimeout(() => {

        this.limits = this.state.getTenantsRange();
        this.getData(true);
      }, 10)
    }
  }

  clickTenant(t: Tenant) {
    this.state.setSelectedTenants();
    this.router.navigate([], { queryParams: { tenant: this.state.tenants.filter(t => t.selected).map(t => t.val).toString() } });
  }

  changeTenant() {
    this.limits = this.state.getTenantsRange();
    this.getData(true);
  }

  getData(withMap: boolean) {
    this.loading = true;
    this.invalidTenant = false;
    this.closeInfo();
    if (withMap) {
      this.nodes = {};
      this.links = {};
    }
    const p: any = {};
    // p.tenant = this.tenant.val;
    p.tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.tenant_date_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits.toString();
    // p.tenant_date_range = this.tenant.date_computed_min.getFullYear() + ',' + this.tenant.date_computed_max.getFullYear();
    if (!withMap) {
      p.rows = 0;
    } else {
      p.rows = 20000;
    }

    this.service.getMap(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      const ts: JSONFacet[] = resp.facets.tenants.buckets;
      this.state.tenants.forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });

      // if (!this.state.tenant().available) {
      //   this.loading = false;
      //   this.invalidTenant = true;
      //   return;
      // }

      if (resp.stats?.stats_fields.latitude) {
        const lat = resp.stats.stats_fields.latitude;
        const lon = resp.stats.stats_fields.longitude;
        if (!this.running) {
          this.map.fitBounds(L.latLngBounds([lat.max, lon.min], [lat.min, lon.max]))
        }

      }
      this.authors = resp.facets.identity_recipient ? resp.facets.identity_author.buckets : [];
      this.recipients = resp.facets.identity_recipient ? resp.facets.identity_recipient.buckets : [];
      this.mentioned = resp.facets.identity_mentioned ? resp.facets.identity_mentioned.buckets : [];
      if (withMap) {
        this.solrResponse = resp;
        // this.setYearsChart(this.solrResponse.facet_counts.facet_ranges.date_year);
      }

      this.setGraphData();
      if (withMap) {
        this.setMap();
      } else {
        this.graphChart.setOption({series: [
            {
              data: this.graphData.nodes,
              links: this.graphData.links,
            }
          ]});
      }

      this.loading = false;
    });
  }

  changeRunning(r: boolean) {
    this.running = r;
    this.graphChart.setOption({series: [
            {
              animation: !this.running
            }
          ]});
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  activeIdentity: JSONFacet = null;
  clickRecipient(identity: JSONFacet) {

  }

  graphData: {
    links: {
      source: string,
      target: string
    }[],
    nodes: {
      category: number,
      id: string,
      name: string
      symbolSize: number
      value: number
    }[]
  }



  hideNode() {
    this.graphChart.dispatchAction({
      type: 'hideTip'
    });
    this.graphChart.dispatchAction({
      type: 'downplay'
    });

  }

  showNode(identity: JSONFacet) {
    //const idx = this.graphData.nodes.findIndex(n => n.id === identity.val + '_' + category);
    const idx = this.graphData.nodes.findIndex(n => n.id === identity.val);
    // currentIndex = (currentIndex + 1) % dataLen;
    // this.graphChart.dispatchAction({
    //   type: 'showTip',
    //   seriesIndex: 0,
    //   dataIndex: idx
    // });
    this.graphChart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: idx
    });
  }

  clearHighlight() { }

  highlightLinks(identity: JSONFacet) { }

  closeInfo() {
    this.infoHeader = '';

  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setGraphData() {

    this.nodes = {};
    const nodes: any = [];
    this.links = {};
    const links: any[] = [];
    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.places && letter.origin) {
        letter.places.forEach((place: Place) => {
          if (place.latitude && !this.nodes[place.id]) {
            this.nodes[place.id] = { coords: [place.latitude, place.longitude], name: place.name };
            nodes.push({ id: place.id, name: place.name, value: [place.longitude, place.latitude, 1] });
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
            links.push({
              id: linkId,
              source: letter.origin + '',
              target: letter.destination + '',
              label: place_origin.name + ' > ' + place_destination.name,
              count: this.links[linkId].count
            });
          }
        }
      };

    });
    Object.keys(this.links).forEach(key => {
      const link = this.links[key];
      // this.linkNodes(link.node1, link.node2, link.count, link.letters);
    });

    this.graphData = {
      links,
      nodes
    };

  }

  setMap() {
    // this.map.addLayer(this.linkLayer);
    // this.map.addLayer(this.nodeLayer);
    this.graphOptions = {
      lmap: {
        // See https://leafletjs.com/reference.html#map-option for details
        // NOTE: note that this order is reversed from Leaflet's [lat, lng]!

        center: [16.726909, 49.879966],     // [lng, lat]
        zoom: 4,
        resizeEnable: true,     // automatically handles browser window resize.
        // whether echarts layer should be rendered when the map is moving. Default is true.
        // if false, it will only be re-rendered after the map `moveend`.
        // It's better to set this option to false if data is large.
        renderOnMoving: true,
        echartsLayerInteractive: true, // Default: true
        largeMode: false               // Default: false
        // Note: Please DO NOT use the initial option `layers` to add Satellite/RoadNet/Other layers now.
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return params.dataType === 'edge' ?
            `${params.data.label} (${params.data.count})` :
            params.name
        }
      },
      series: [
        {
          type: 'graph',
          // use `lmap` as the coordinate system
          coordinateSystem: 'lmap',
          // data items [[lng, lat, value], [lng, lat, value], ...]
          data: this.graphData.nodes,
          links: this.graphData.links,

          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [2, 6],

          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}'
          },
          labelLayout: {
            hideOverlap: true
          },
          scaleLimit: {
            min: 0.4,
            max: 2
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          }

        }
      ]
    }

    const d = document.getElementById("echarts-lmap");
    this.graphChart = init(d);

    this.graphChart.setOption(this.graphOptions);

    this.graphChart.on('click', (params: any) => {
      console.log(params)
      if (params.dataType === 'node') {
        this._ngZone.run(() => {
          const place = params.data.id;
          let lettersFrom: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => { return letter.origin === place });
          let lettersTo: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => { return letter.destination === place });
          // lettersFrom += layer.options.letters.filter((l: Letter) => l.origin === place.place_id).length;
          // lettersTo += layer.options.letters.filter((l: Letter) => l.destination === place.place_id).length;

          this.infoHeader = `Letters from/to ${params.data.name}`;
          this.infoContent = `<div>From: ${lettersFrom.length}</div><div>To: ${lettersTo.length}</div>`;
        });
      } else if (params.dataType === 'edge') {

        this._ngZone.run(() => {
          let popup = '';
          // let letters: Letter[] = [...this.solrResponse.response.docs.filter((letter: Letter) => letter.origin + '' === params.data.source),
          // ... this.solrResponse.response.docs.filter((letter: Letter) => letter.destination + '' === params.data.target)];
          let letters: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => letter.origin + '' === params.data.source && letter.destination + '' === params.data.target);
          letters.forEach((letter: Letter) => {
            popup += `<div>${letter.letter_id}.- ${letter.identity_author} -> ${letter.identity_recipient}. ${letter.date_year}`;
            if (letter.keywords_category_cs?.length > 0) {
              popup += ` (${letter.keywords_category_cs.join(', ')})</div>`;
            } else if (letter.keywords_cs?.length > 0) {
              popup += ` (${letter.keywords_cs.join(', ')})</div>`;
            } else {
              popup += `</div>`;
            }
          });

          this.infoContent = popup;
          this.infoHeader = `Letters from ${params.data.label} (${letters.length})`;
        });

      }
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmapComponent = this.graphChart.getModel().getComponent("lmap");
    // Get the instance of Leaflet
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmap = lmapComponent.getLeaflet();

    LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' }).addTo(lmap);
  }

}
