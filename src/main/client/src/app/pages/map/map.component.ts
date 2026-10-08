import { Component, effect, Inject, NgZone, DOCUMENT, signal, computed } from '@angular/core';
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


import L, { latLng, Map, tileLayer as LtileLayer, MapOptions, geoJSON } from "leaflet";
import 'leaflet.fullscreen';

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
import { AngularSplitModule } from "angular-split";


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
    MatProgressBarModule, YearsChartComponent, LettersInfoComponent, FacetsComponent, AngularSplitModule],
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

  geojsons: string[] = ['1500', '1530', '1600', '1650', '1700', '1715', '1783', '1800', '1815', '1878', '1880', '1900', '1914', '1920', '1930', '1938', '1945', '1960', '1994', '2000', '2010'];
  geojsonsFiltered = signal<string[]>([]);
  selectedGeo = signal<string>('');

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
    p.rows = 0;
    // if (!withMap) {
    //   p.rows = 0;
    // } else {
    //   p.rows = 20000;
    // }

    this.filterGeos();

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
      if (withMap && !this.graphChart) {
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
        setTimeout(() => {
          this.fitBounds();
        }, 100);
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
      symbolSize: number,
      color: string,
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


  maxCount = signal(0);
  halfCount = computed(() => Math.floor(this.maxCount() / 2));
  maxSize = 26;
  minSize = 6;
  getColor(symbolSize: number) {
    const sat = Math.floor(12.8 * (symbolSize - this.minSize)) + 127;
    return 'rgb(' + sat + ', 80, 80)';
  }

  setGraphData() {

    this.nodes = {};
    const nodes: any = [];
    this.maxCount.set(this.solrResponse.facets.places.buckets[0].count);
    this.solrResponse.facets.places.buckets.forEach((f: { val: string, count: number }) => {
      const place = this.state.places()[f.val];
      let symbolSize = this.minSize;
      if (f.count > 0) {
        symbolSize = this.maxSize * (f.count) / this.maxCount() + this.minSize;
      } else {
        symbolSize = this.minSize;
      }
      const itemStyle = {
        color: this.getColor(symbolSize)
      }

      this.nodes[f.val] = { coords: [place.latitude, place.longitude], name: place.name, count: f.count };
      nodes.push({ id: place.id, name: place.name, value: [place.longitude, place.latitude, 1], count: f.count, color: '#00f', symbolSize: symbolSize, itemStyle });

    });

    this.links = {};
    const links: any[] = [];
    this.solrResponse.facets.links.buckets.forEach((f: { val: string, count: number }) => {
      const parts = f.val.split('-');
      const linkId = f.val;
      const place_origin = this.state.places()[parts[0]];
      const place_destination = this.state.places()[parts[1]];
      if (place_origin && place_destination && place_origin.latitude && place_destination.latitude) {
        this.links[linkId] = {
          node1: [place_origin.latitude, place_origin.longitude],
          node2: [place_destination.latitude, place_destination.longitude],
          authors: [],
          recipients: [],
          count: f.count,
          letters: []
        };
        links.push({
          id: linkId,
          source: parts[0],
          target: parts[1],
          authors: [],
          recipients: [],
          label: place_origin.name + ' > ' + place_destination.name,
          labelReversed: place_destination.name + ' > ' + place_origin.name,
          count: this.links[linkId].count,
          lineStyle: {
            color: this.config.tenant_colors[1],
            width: 1,
            opacity: 1
          }
        });
      }
    });

    this.graphData = {
      links,
      nodes
    };

  }

  setMap() {
    const d = this.document.getElementById('echarts-lmap');
    // this.map.addLayer(this.linkLayer);
    // this.map.addLayer(this.nodeLayer);
    this.graphOptions = {
      lmap: {
        // See https://leafletjs.com/reference.html#map-option for details
        // NOTE: note that this order is reversed from Leaflet's [lat, lng]!

        //center: [16.726909, 49.879966],     // [lng, lat]
        //zoom: 4,
        fullscreenControl: true,
        // Expand the ECharts host together with the nested Leaflet container.
        fullscreenControlOptions: { fullscreenElement: d },
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
          data: this.graphData.nodes,
          links: this.showLinks ? this.graphData.links : [],

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

    if (!this.graphChart) {
      this.graphChart = init(d);
    }

    this.graphChart.setOption(this.graphOptions);

    this.graphChart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        this._ngZone.run(() => {
          this.getNodeData(params);
        });
      } else if (params.dataType === 'edge') {

        this._ngZone.run(() => {

          this.getLinkLetters(params);
          
        });

      }
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmapComponent = this.graphChart.getModel().getComponent("lmap");
    // Get the instance of Leaflet
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmap = lmapComponent.getLeaflet();

    //LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMaps' }).addTo(lmap);

    const osm = LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMaps' });
    //const carto = LtileLayer('https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_44kb_1_fcb333c51ecf506f887c03b7', { attribution: 'OpenStreetMaps, CARTO' });
    //const Historical = LtileLayer('https://tiles.traveltimeapp.com/osm-bright/{z}/{x}/{y}.png?key=d7b19cdc', { attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> | Created with <a href="https://traveltime.com" target="_blank">TravelTime API</a>' });


    // var baseMaps = {
    //   "OpenStreetMap": osm,
    //   "Historical": carto,
    //   //"Historical": Historical
    // };
    osm.addTo(lmap);
    //var layerControl = L.control.layers(baseMaps).addTo(lmap);

    setTimeout(() => {
      this.fitBounds();
    }, 100);


    lmap.on('enterFullscreen', () => {
      lmap.invalidateSize();
    });
    lmap.on('exitFullscreen', () => {
      lmap.invalidateSize();
    });
  }

  showLinks = true;
  toggleLinks() {
    this.graphChart.setOption({
      series: {
        links: this.showLinks ? this.graphData.links : []
      }
    })
  }

  fitBounds() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmapComponent = this.graphChart.getModel().getComponent("lmap");
    // Get the instance of Leaflet
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmap = lmapComponent.getLeaflet();
    lmap.fitBounds(this.getBounds(), { paddingBottomRight: [500, 100] });
  }

  getBounds() {
    let latMax = this.solrResponse.stats.stats_fields.latitude.max;
    let latMin = this.solrResponse.stats.stats_fields.latitude.min;
    let lngMax = this.solrResponse.stats.stats_fields.longitude.max;
    let lngMin = this.solrResponse.stats.stats_fields.longitude.min;



    const southWest = L.latLng(latMin, lngMin);
    const northEast = L.latLng(latMax, lngMax);
    return L.latLngBounds(southWest, northEast);
  }

  getNodeData(params: any) {
    const place = params.data.id;
    const p: any = {};
    p.tenant = this.state.selectedTenants().map(t => t.val);
    p.tenant_year_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();

    this.state.addFilters(p);
    p.rows = 20000;
    p.place = place;

    this.service.getMap(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      this.infoData = resp.response.docs;
      this.infoFields = ['letter_id', 'identity_author', 'identity_recipient', 'date_year', 'origin_name', 'destination_name', 'action'];
      this.infoHeader = `Letters from/to ${params.data.name}`;
      this.infoType = 'place';
      this.infoTypeData = place;
      this.state.showInfo.set(true);
    });
  }

  getLinkLetters(params: any) {


    const link_id = params.data.id;
    const reversed_link_id = link_id.split('-')[1] + '-' + link_id.split('-')[0];
    const p: any = {};
    p.tenant = this.state.selectedTenants().map(t => t.val);
    p.tenant_year_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();

    this.state.addFilters(p);
    p.rows = 20000;
    p.link_id = link_id;

    this.service.getMap(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      this.infoData = resp.response.docs.filter((letter: Letter) => letter.link_id?.includes(link_id));
      this.infoFields = ['letter_id', 'identity_author', 'identity_recipient', 'date_year', 'origin_name', 'destination_name', 'action'];
      this.infoHeader = `Letters from ${params.data.label} (${this.infoData.length})`;
      this.infoType = 'link';
      const reversed = resp.response.docs.filter((letter: Letter) => letter.link_id?.includes(reversed_link_id));
      const header = `Letters from ${params.data.labelReversed} (${reversed.length})`;
      this.infoTypeData = {
        header: header,
        docs: reversed
      };
      this.state.showInfo.set(true);
    });
  }

  onSelectionChange(event: any) {
    this.getGeos(this.selectedGeo())
  }

  filterGeos() {
    const first = this.geojsons.findIndex(g => parseInt(g) > this.limits[0].getFullYear()) - 1;
    const last = this.geojsons.findIndex(g => parseInt(g) > this.limits[1].getFullYear());
    this.geojsonsFiltered.set(this.geojsons.slice(Math.max(0, first), Math.min(last, this.geojsons.length - 1)));
    this.selectedGeo.set('')
    this.clearGeos();
  }

  clearGeos() {
    if (this.graphChart) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmapComponent = this.graphChart.getModel().getComponent("lmap");
      // Get the instance of Leaflet
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmap = lmapComponent.getLeaflet();

      if (this.geoJsonLayer) {
        this.geoJsonLayer.removeFrom(lmap);
      }
    }
  }
  

  geoJsonLayer: any;
  getGeos(year: string) {
    if (!year) {
      this.clearGeos();
      return;
    }

    this.service.getGeos(year).subscribe((resp:any) => {

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmapComponent = this.graphChart.getModel().getComponent("lmap");
    // Get the instance of Leaflet
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmap = lmapComponent.getLeaflet();

    if (this.geoJsonLayer) {
      this.geoJsonLayer.removeFrom(lmap);
    }
    
      this.geoJsonLayer = geoJSON((resp as any), { style: () => ({ color: '#333', weight: 1, fillColor: '#fff', fillOpacity: .4 }) });

      this.geoJsonLayer.addTo(lmap);
    });
  }

}
