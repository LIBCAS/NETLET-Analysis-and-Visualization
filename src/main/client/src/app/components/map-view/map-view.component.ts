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
  links: { [id: string]: { node1: [number, number], node2: [number, number], count: number } } = {};


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
    this.service.getPlaces(p as HttpParams).subscribe((resp: any) => {
      this.solrResponse = resp;
      this.setYearsChart(this.solrResponse.letter_place.facet_counts.facet_ranges.date_year);
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
    this.solrResponse.letter_place.response.docs.forEach((lp: any) => {
      if (lp.latitude && this.inLimits(lp.date_year)) {
        if (!this.nodes[lp.place_id]) {
          this.nodes[lp.place_id] = [lp.latitude, lp.longitude];
          const m = L.circleMarker([lp.latitude, lp.longitude], {
            color: '#795548',
            radius: 5,
            weight: 1
          });
          m.bindTooltip(lp.name);
          m.addTo(this.nodeLayer);
        }

        if (!this.links[lp.letter_id]) {
          this.links[lp.letter_id] = { node1: [lp.latitude, lp.longitude], node2: [lp.latitude, lp.longitude], count: 2 };
        } else {
          if (lp.role === 'origin') {
            this.links[lp.letter_id].node1 = [lp.latitude, lp.longitude];
          } else {
            this.links[lp.letter_id].node2 = [lp.latitude, lp.longitude];
            this.linkNodes(this.links[lp.letter_id].node1, this.links[lp.letter_id].node2, this.links[lp.letter_id].count, lp.identities, lp.date_year);
          }
        }
      }


    });
    this.map.addLayer(this.linkLayer);
    this.map.addLayer(this.nodeLayer);

  }

  linkNodes(node1: [number, number], node2: [number, number], count: number, identities: {id: number, role: string, name: string}[], year: number) {
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
      { color: '#5470c6', fill: false, weight: count }
    );
    // console.log(m);
    let popup = '<div>Rok:' + year + '</div>';
    identities.forEach(i => {
      popup += '<div>' + i.role + ': ' + i.name + '</div>';
    })
    m.bindTooltip(popup);
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
