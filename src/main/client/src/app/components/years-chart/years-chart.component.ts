import { Component, effect, Inject, input, NgZone, output } from '@angular/core';

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
import { Facet, JSONFacet } from '../../shared/facet';
import { HttpParams } from '@angular/common/http';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Letter, Place } from '../../shared/letter';
import { MatIconModule } from '@angular/material/icon';
import { AppState, Tenant } from '../../app-state';
import { TranslateService } from '@ngx-translate/core';
echarts.use([BarChart, CanvasRenderer, LegendComponent, TooltipComponent, GridComponent, TitleComponent, BrushComponent, ToolboxComponent]);

@Component({
  selector: 'app-years-chart',
  imports: [NgxEchartsDirective],
  templateUrl: './years-chart.component.html',
  styleUrl: './years-chart.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class YearsChartComponent {

  dateYearFacet = input<any>();
  onChangeLimits = output<[number, number]>();
  limits: [number, number];

  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  barColor: string;
  rokAxis: string[] = [];
  rokSeries: number[] = [];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
    private translation: TranslateService,
        public state: AppState
  ) {
    effect(() => {
      const facet = this.dateYearFacet();
      this.limits = [this.state.tenant.date_year_min, this.state.tenant.date_year_max];
      if (this.chartRok) {
        this.setYearsChart(facet);
      }
    });
   }

  ngOnInit(): void {
    this.barColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
  }

  onChartRokInit(e: any) {
    this.chartRok = e;
    this.setYearsChart(this.dateYearFacet());
  }

  onSetYears(e: any) {
    if (!e.areas || e.areas.length === 0) {
      return;
    }
    this.limits = [parseInt(this.rokAxis[e.areas[0].coordRange[0]]), parseInt(this.rokAxis[e.areas[0].coordRange[1]])];
    this.onChangeLimits.emit(this.limits);
    this.setChartTitle();
  }

  onClearSelection(e: any) {
    if (e.batch[0].areas.length === 0) {
      this.limits = [this.state.tenant.date_year_min, this.state.tenant.date_year_max];
      this.onChangeLimits.emit(this.limits);
      this.setChartTitle();
    }
  }

  setSelection(minWithValue: string, maxWithValue: string) {
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

  setChartTitle() {
    this.chartRok.setOption({title: {
      show: true,
      text: this.limits[0] + ' - ' + this.limits[1]
    }
  })
  }

  setYearsChart(facet: { buckets: JSONFacet[], after: {count: number}}) {

    this.rokSeries = facet.buckets.map(c => c.count);
    this.rokSeries.push(facet.after.count);
    this.rokAxis = facet.buckets.map(c => c.val);
    this.rokAxis.push(this.limits[1] + '');

    let minRokWithValue = '1100';
    let maxRokWithValue = '2025';
    
      minRokWithValue = this.limits[0] + '';
      maxRokWithValue = this.limits[1] + '';

    this.chartOptionsRok = {
      animation: false,
      title: {
        show: true,
        left: 'center',
        top: 10,
        text: this.limits[0] + ' - ' + this.limits[1]
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
          colorAlpha: 0.5
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
        color: this.barColor,
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

    this.chartRok.on('click', (params: any) => {
      const year = parseInt(params.name);
      this.limits = [year, year];
      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [params.name, params.name],
            xAxisIndex: 0
          }
        ]
      });
      this.setChartTitle();
      
    this._ngZone.run(() => {
      this.onChangeLimits.emit(this.limits);
    });
    })

    setTimeout(() => {
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

      this.chartRok.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: 'lineX',
          brushMode: 'single'
        }
      });
    }, 50);

  }
}
