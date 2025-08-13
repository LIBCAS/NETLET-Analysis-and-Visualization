import { Component, effect, inject, Inject, input, NgZone, output } from '@angular/core';

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
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { AppState, Tenant } from '../../app-state';
import { TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
echarts.use([BarChart, CanvasRenderer, LegendComponent, TooltipComponent, GridComponent, TitleComponent, BrushComponent, ToolboxComponent]);

const EXPAND_ICON =
  `
<svg width="800px" height="800px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <g id="Layer_2" data-name="Layer 2">
    <g id="invisible_box" data-name="invisible box">
      <rect width="48" height="48" fill="none"/>
    </g>
    <g id="icons_Q2" data-name="icons Q2">
      <g>
        <path d="M28.5,15.6a2.1,2.1,0,0,0-2.7-.2,1.9,1.9,0,0,0-.2,3L29.2,22H6a2,2,0,0,0,0,4H29.2l-3.6,3.6a1.9,1.9,0,0,0,.2,3,2.1,2.1,0,0,0,2.7-.2l6.9-7a1.9,1.9,0,0,0,0-2.8Z"></path> 
        <path d="M42,6V42a2,2,0,0,0,4,0V6a2,2,0,0,0-4,0Z"/>
        <path d="M6,42V6A2,2,0,0,0,2,6V42a2,2,0,0,0,4,0Z"/>
      </g>
    </g>
  </g>
</svg>
`;


const MOVE_ICON =
  `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
  <g id="SVGRepo_iconCarrier"> 
    <g id="Layer_2" data-name="Layer 2"> 
      <g id="invisible_box" data-name="invisible box"> 
        <rect width="48" height="48" fill="none"></rect> 
        <rect width="48" height="48" fill="none"></rect> 
        <rect width="48" height="48" fill="none"></rect> 
      </g> 
      <g id="Q3_icons" data-name="Q3 icons"> 
        <g> 
          <path d="M28.5,15.6a2.1,2.1,0,0,0-2.7-.2,1.9,1.9,0,0,0-.2,3L29.2,22H6a2,2,0,0,0,0,4H29.2l-3.6,3.6a1.9,1.9,0,0,0,.2,3,2.1,2.1,0,0,0,2.7-.2l6.9-7a1.9,1.9,0,0,0,0-2.8Z"></path> 
          <path d="M12,6V42a2,2,0,0,0,4,0V6a2,2,0,0,0-4,0Z"/>
          <path d="M6,42V6A2,2,0,0,0,2,6V42a2,2,0,0,0,4,0Z"/>
        </g> 
      </g> 
    </g> 
  </g>
</svg>
`;



@Component({
  selector: 'app-years-chart',
  imports: [NgxEchartsDirective, MatIconModule, MatButtonModule],
  templateUrl: './years-chart.component.html',
  styleUrl: './years-chart.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class YearsChartComponent {

  dateYearFacet = input<any>();
  onChangeLimits = output<[number, number]>();

  withAnimation = input<boolean>(false);
  onChangeRunning = output<boolean>();
  limits: [number, number];

  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  barColor: string;
  rokAxis: string[] = [];
  rokSeries: number[] = [];

  
  animation: ReturnType<typeof setInterval>;
  running: boolean = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
    private translation: TranslateService,
    public state: AppState
  ) {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);

    // Note that we provide the icon here as a string literal here due to a limitation in
    // Stackblitz. If you want to provide the icon from a URL, you can use:
    // `iconRegistry.addSvgIcon('thumbs-up', sanitizer.bypassSecurityTrustResourceUrl('icon.svg'));`
    iconRegistry.addSvgIconLiteral('expand-icon', sanitizer.bypassSecurityTrustHtml(EXPAND_ICON));
    iconRegistry.addSvgIconLiteral('move-icon', sanitizer.bypassSecurityTrustHtml(MOVE_ICON));
    effect(() => {
      const facet = this.dateYearFacet();
      this.limits = this.state.getTenantsRange();
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
      this.limits = this.state.getTenantsRange();
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
    this.chartRok.setOption({
      title: {
        show: true,
        text: this.limits[0] + ' - ' + this.limits[1]
      }
    })
  }

  setYearsChart(facet: { buckets: JSONFacet[], after: { count: number } }) {

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
      grid: {
        // left: 0,
        // right: 0,
        top: 30,
        bottom: 25
      },
      title: {
        show: true,
        left: 'center',
        top: 8,
        text: this.limits[0] + ' - ' + this.limits[1]
      },
      toolbox: { show: false },
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


  run2() {
this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: ['1900', '1903'],
            xAxisIndex: 0
          }
        ]
      });
  }

  run() {
    const startRok = this.state.getTenantsRange()[0];
    let endRok = startRok;
    const maxRok = this.state.getTenantsRange()[1];
    this.animation = setInterval(() => {
      this.limits = [startRok, endRok++];
      this.onChangeLimits.emit(this.limits);
      this.onChangeRunning.emit(true);
      this.setChartTitle();

      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [startRok + '', endRok+''],
            xAxisIndex: 0
          }
        ]
      });

      if (endRok >= maxRok) {
        clearInterval(this.animation);
        this.onChangeRunning.emit(false);
      }
    }, 500);
  }

  move() {
    let startRok = this.limits[0];
    let endRok = this.limits[1];
    const maxRok = this.state.getTenantsRange()[1];
    this.animation = setInterval(() => {
      this.limits = [startRok++, endRok++];
      this.onChangeLimits.emit(this.limits);
        this.running = true;
        this.onChangeRunning.emit(this.running);
      this.setChartTitle();

      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [startRok + '', endRok+''],
            xAxisIndex: 0
          }
        ]
      });

      if (endRok >= maxRok) {
        clearInterval(this.animation);
        this.running = false;
        this.onChangeRunning.emit(this.running);
      }
    }, 1500);
  }

  stop() {
        this.running = false;
        this.onChangeRunning.emit(this.running);
    clearInterval(this.animation);
  }
}
