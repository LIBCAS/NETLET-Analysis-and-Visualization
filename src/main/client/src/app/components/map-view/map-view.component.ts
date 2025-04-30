import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import L, { circle, CircleMarker, LatLng, latLng, Layer, LayerGroup, Map, Marker, polygon, tileLayer } from 'leaflet';
import '@elfalem/leaflet-curve';
import { CurveLatLngExpression, CurvePathDataElement } from '@elfalem/leaflet-curve';
import { AppService } from '../../app.service';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
import { CommonModule } from '@angular/common';
import { Letter, Place } from '../../shared/letter';
echarts.use([BarChart, CanvasRenderer, LegendComponent, TooltipComponent, GridComponent, TitleComponent, BrushComponent, ToolboxComponent]);

@Component({
  selector: 'app-map-view',
  imports: [TranslateModule, FormsModule, CommonModule,
    LeafletModule, NgxEchartsDirective,
    MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class MapViewComponent implements OnInit {

  tenants: {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number
  }[] = [];
  tenant: {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number
  };

  map: Map;
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
    ],
    zoom: 4,
    center: latLng(49.879966, 16.726909)
  };

  solrResponse: any;

  nodeLayer: LayerGroup<CircleMarker> = new L.LayerGroup();
  linkLayer: LayerGroup<CircleMarker> = new L.LayerGroup();

  nodes: { [id: number]: [number, number] } = {};
  links: { [id: string]: { node1: [number, number], node2: [number, number], count: number, letters: Letter[] } } = {};

  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  rokAxis: string[] = [];
  rokSeries: number[] = [];
  limits: [number, number];
  showSelection: boolean = true;

  constructor(
    private router: Router,
    private translation: TranslateService,
    private service: AppService
  ) { }

  ngOnInit(): void {

  }

  onMapReady(map: Map) {
    this.map = map;
    this.getTenants();

  }

  changeTenant() {
    this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
    this.getData();
  }

  getTenants() {
    this.service.getTenants().subscribe((resp: any) => {
      this.tenants = resp.buckets;
    });
  }

  getData() {
    this.nodes = {};
    this.nodeLayer.clearLayers();
    this.links = {};
    this.linkLayer.clearLayers();
    const p: any = {};
    p.tenant = this.tenant.val;
    // if (this.limits) {
    //   p.date_range = this.limits.toString();
    // } else {
    p.date_range = this.tenant.date_year_min + ',' + this.tenant.date_year_max;
    //}
    this.solrResponse = null;
    this.service.getLetters(p as HttpParams).subscribe((resp: any) => {
      this.solrResponse = resp;
      this.setYearsChart(this.solrResponse.facet_counts.facet_ranges.date_year);
      this.processData();

    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  processData() {
    if (!this.solrResponse) {
      return;
    }

    this.nodes = {};
    this.nodeLayer.clearLayers();
    this.links = {};
    this.linkLayer.clearLayers();
    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.places && letter.origin) {
        letter.places.forEach((place: Place) => {
          if (place.latitude && !this.nodes[place.place_id]) {
            this.nodes[place.place_id] = [place.latitude, place.longitude];
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
              letters: [letter] };
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
      { color: '#5470c6', fill: false, weight: Math.min(count, 4) }
    );
    // console.log(m);
    // let popup = '<div>Rok:' + year + '</div>';
    // identities.forEach(i => {
    //   popup += '<div>' + i.role + ': ' + i.name + '</div>';
    // })

    let popup = '<div>Count:' + count + '</div>';
    letters.forEach(letter => {
      popup += '<div>Rok:' + letter.date_year + '</div>';
    });
    m.bindTooltip(popup, {sticky: true});
    m.addTo(this.linkLayer);
  }

  onChartRokInit(e: any) {
    this.chartRok = e;
  }

  onRokSelected(e: any) {
    if (!e.areas || e.areas.length === 0) {
      return;
    }
    this.limits = [parseInt(this.rokAxis[e.areas[0].coordRange[0]]), parseInt(this.rokAxis[e.areas[0].coordRange[1]])];

    this.processData();
    // const params: any = {};
    // params.rokvydani = [this.rokAxis[e.areas[0].coordRange[0]], this.rokAxis[e.areas[0].coordRange[1]]].toString();
    // this.router.navigate(['/results'], { queryParams: params, queryParamsHandling: 'merge' })
  }

  onClearSelection(e: any) {
    if (e.batch[0].areas.length === 0 && this.showSelection) {
      this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
      this.processData();
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
        markArea: {
          silent: true,
          itemStyle: {
            opacity: 0.8,
            color: '#ccc'
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

    setTimeout(() => {
      this.setSelection(minRokWithValue, maxRokWithValue);
    }, 50);

  }

}
