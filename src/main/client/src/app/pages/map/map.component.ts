import { Component, effect, Inject, NgZone, DOCUMENT, signal } from '@angular/core';
import { YearsChartComponent } from "../../components/years-chart/years-chart.component";
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";

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
import { FacetFields, JSONFacet } from '../../shared/facet';
import { Letter, Place } from '../../shared/letter';

import {
  LeafletComponent,
  LeafletComponentOption,
  LeafletHeatmapSeriesOption,
} from "@joakimono/echarts-extension-leaflet/src/export";


import L, { latLng, Map, tileLayer as LtileLayer, MapOptions } from "leaflet";

import { VisualMapComponentOption, GraphSeriesOption, color } from 'echarts';
import { use, init, EChartsType, ComposeOption } from "echarts/core";

import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, TitleComponent, TitleComponentOption } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppConfiguration } from '../../app-configuration';
import { FacetsComponent } from "../../components/facets/facets.component";


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
  imports: [TranslateModule, FormsModule, LeafletModule,
    MatCardModule, MatExpansionModule, MatCheckboxModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatListModule, MatIconModule,
    MatProgressBarModule, YearsChartComponent, LettersInfoComponent, FacetsComponent],
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
  facets = signal<FacetFields>({});
  authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];

  graphOptions: ECOption = {};
  graphChart: EChartsType;

  nodes: { [id: string]: { coords: [number, number], name: string, count: number } } = {};
  links: {
    [id: string]: {
      node1: [number, number], node2: [number, number], count: number,
      letters: Letter[], authors: string[], recipients: string[]
    }
  } = {};
  limits: [Date, Date];

  infoContent: string;
  infoHeader: string;
  infoData: any[];
  infoFields: string[];
  infoType: string;
  infoTypeData: any;

  tenants: Tenant[] = [];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
    private router: Router,
    private translation: TranslateService,
    public config: AppConfiguration,
    public state: AppState,
    private service: AppService
  ) {

    effect(() => {

      const sc = this.state.stateChanged();
      if (sc > 0) {
        this.limits = this.state.getTenantsRange();
        this.getData(true);
      } else {
        this.loading = false;
        this.facets.set({});
      }
    });
  }

  ngOnInit(): void {
    this.state.tenants().forEach(t => { t.available = true });
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

    this.router.navigate([], { queryParams: { tenant: this.state.selectedTenants().map(t => t.val).toString() } });
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
    p.tenant = this.state.selectedTenants().map(t => t.val);
    p.tenant_year_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();

    this.state.addFilters(p);
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
      this.state.tenants().forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });

      // if (!this.state.tenant().available) {
      //   this.loading = false;
      //   this.invalidTenant = true;
      //   return;
      // }
      this.facets.set(resp.facets);
      if (resp.stats?.stats_fields.latitude) {
        const lat = resp.stats.stats_fields.latitude;
        const lon = resp.stats.stats_fields.longitude;
        if (!this.running) {
          // this.map.fitBounds(L.latLngBounds([lat.max, lon.min], [lat.min, lon.max]))
        }

      }
      this.authors = resp.facets.authors ? resp.facets.authors.buckets : [];
      this.recipients = resp.facets.recipients ? resp.facets.recipients.buckets : [];
      this.mentioned = resp.facets.mentioned ? resp.facets.mentioned.buckets : [];
      if (withMap) {
        this.solrResponse = resp;
        // this.setYearsChart(this.solrResponse.facet_counts.facet_ranges.date_year);
      }

      this.setGraphData();
      if (withMap) {
        this.setMap();
      } else {
        this.graphChart.setOption({
          series: [
            {
              data: this.graphData.nodes,
              links: this.graphData.links,
            }
          ]
        });
      }

      this.loading = false;
    });
  }

  changeRunning(r: boolean) {
    this.running = r;
    this.graphChart.setOption({
      series: [
        {
          animation: !this.running
        }
      ]
    });
  }

  changeLimits(limits: [Date, Date]) {
    this.limits = limits;
    this.getData(false);
  }

  activeIdentity: JSONFacet = null;
  clickRecipient(identity: JSONFacet) {

  }

  usedFacets: { field: string, value: string }[] = [];
  onFiltersChanged(usedFacets: { field: string, value: string }[]) {
    this.usedFacets = usedFacets;
    this.getData(true);
  }

  graphData: {
    links: {
      source: string,
      target: string,
      authors: string[],
      recipients: string[]
    }[],
    nodes: {
      category: number,
      id: string,
      name: string
      symbolSize: number
      value: number
    }[]
  }



  showNodeExt(e: any) {
    this.highlightLinks(e.field, e.value)
  }

  hideNode() {
    this.graphChart.dispatchAction({
      type: 'hideTip'
    });
    this.graphChart.dispatchAction({
      type: 'downplay'
    });
    this.graphChart.dispatchAction({
      dataType: 'edge',
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

  highlightLinks(field: string, val: string) {
    //const idx = this.graphData.links.findIndex(n => n.authors.includes(val));
    const idxs: number[] = [];
    this.graphData.links.forEach((n: any, idx: number) => {
      if (n[field]?.includes(val)) {
        idxs.push(idx)
      }
    });
    this.graphChart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataType: 'edge',
      dataIndex: idxs
    });

  }

  closeInfo() {
    this.infoHeader = '';

  }

  inLimits(n: number): boolean {
    return n >= this.limits[0].getFullYear() && n <= this.limits[1].getFullYear();
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
            this.nodes[place.id] = { coords: [place.latitude, place.longitude], name: place.name, count: 0 };
            nodes.push({ id: place.id, name: place.name, value: [place.longitude, place.latitude, 1], count: 0 });
          }
        });

        const linkId = letter.origin_id + '_' + letter.destination_id;
        const place_origin = letter.places.find(p => p.role === 'origin');
        const place_destination = letter.places.find(p => p.role === 'destination');

        if (place_origin && place_destination && place_origin.latitude && place_destination.latitude) {
          this.nodes[place_origin.id].count = this.nodes[place_origin.id].count + 1;
          this.nodes[place_destination.id].count = this.nodes[place_destination.id].count + 1;

          if (!this.links[linkId]) {
            this.links[linkId] = {
              node1: [place_origin.latitude, place_origin.longitude],
              node2: [place_destination.latitude, place_destination.longitude],
              authors: letter.identity_author,
              recipients: letter.identity_recipient,
              count: 1,
              letters: [letter]
            };
            links.push({
              id: linkId,
              source: letter.origin_id,
              target: letter.destination_id,
              authors: letter.identity_author,
              recipients: letter.identity_recipient,
              label: place_origin.name + ' > ' + place_destination.name,
              labelReversed: place_destination.name + ' > ' + place_origin.name,
              count: this.links[linkId].count,
              lineStyle: {
                color: this.config.tenant_colors[letter.tenant],
                width: 1,
                opacity: 1
              }
            });
          } else {
            this.links[linkId].count++;
            this.links[linkId].letters.push(letter);
            this.links[linkId].authors.concat(letter.identity_author)
            this.links[linkId].recipients.concat(letter.identity_recipient)
          }
        }
      };

    });
    links.forEach(link => {
      link.count = this.links[link.id].count
    })
    // Object.keys(this.links).forEach(key => {
    //   const link = this.links[key];
    //   // this.linkNodes(link.node1, link.node2, link.count, link.letters);
    // });

    
    Object.keys(this.nodes).forEach(key => {
      const node = this.nodes[key];
      nodes.filter((n:any) => n.id === key).forEach((n:any) => {n.count = node.count});
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
            `${params.data.name} (${params.data.count})`
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
    if (!this.graphChart) {
      this.graphChart = init(d);
    }

    this.graphChart.setOption(this.graphOptions);

    this.graphChart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        this._ngZone.run(() => {
          const place = params.data.name;
          // let lettersFrom: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => { return letter.origin === place });
          // let lettersTo: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => { return letter.destination === place });
          // this.infoContent = `<div>From: ${lettersFrom.length}</div><div>To: ${lettersTo.length}</div>`;


          this.infoData = this.solrResponse.response.docs.filter((letter: Letter) => { return (letter.origin_name + '' === place) || (letter.destination_name + '' === place) });
          this.infoFields = ['letter_id', 'identity_author', 'identity_recipient', 'date_year', 'origin_name', 'destination_name', 'action'];
          this.infoHeader = `Letters from/to ${params.data.name}`;
          this.infoType = 'place';
          this.infoTypeData = place;
          this.state.showInfo.set(true);
        });
      } else if (params.dataType === 'edge') {

        this._ngZone.run(() => {
          // let popup = '';
          // let letters: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => letter.origin_name + '' === params.data.source && letter.destination_name + '' === params.data.target);
          // letters.forEach((letter: Letter) => {
          //   popup += `<div>${letter.letter_id}.- ${letter.identity_author} -> ${letter.identity_recipient}. ${letter.date_year}`;
          //   if (letter.keyword_categories_cs?.length > 0) {
          //     popup += ` (${letter.keyword_categories_cs.join(', ')})</div>`;
          //   } else if (letter.keywords_cs?.length > 0) {
          //     popup += ` (${letter.keywords_cs.join(', ')})</div>`;
          //   } else {
          //     popup += `</div>`;
          //   }
          // });
          // this.infoContent = popup;
          this.infoData = this.solrResponse.response.docs.filter((letter: Letter) => letter.origin_id + '' === params.data.source + '' && letter.destination_id + '' === params.data.target + '');
          this.infoFields = ['letter_id', 'identity_author', 'identity_recipient', 'origin_name', 'destination_name', 'date_year', 'action'];
          this.infoHeader = `Letters from ${params.data.label} (${this.infoData.length})`;
          this.infoType = 'link';
          const reversed = this.solrResponse.response.docs.filter((letter: Letter) => letter.destination_id + '' === params.data.source + '' && letter.origin_id + '' === params.data.target + '');
          const header = `Letters from ${params.data.labelReversed} (${reversed.length})`;
          this.infoTypeData = {
            header: header,
            docs: reversed
          };


          this.state.showInfo.set(true);
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
