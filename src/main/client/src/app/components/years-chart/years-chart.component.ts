import { Component, effect, inject, Inject, input, NgZone, output, DOCUMENT } from '@angular/core';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { EChartsOption, ECharts } from 'echarts';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { LegendComponent, MarkAreaComponent, VisualMapComponent } from 'echarts/components';
import { TooltipComponent } from 'echarts/components';
import { GridComponent } from 'echarts/components';
import { TitleComponent } from 'echarts/components';
import { BrushComponent } from 'echarts/components';
import { ToolboxComponent } from 'echarts/components';
import { JSONFacet } from '../../shared/facet';

import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { AppState } from '../../app-state';
import { TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
echarts.use([BarChart, CanvasRenderer, LegendComponent, 
  TooltipComponent, GridComponent, TitleComponent, BrushComponent, 
  ToolboxComponent, VisualMapComponent, MarkAreaComponent]);

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
  onChangeLimits = output<[Date, Date]>();

  withAnimation = input<boolean>(false);
  onChangeRunning = output<boolean>();
  limits: [number, number];

  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  barColor: string;
  rokAxis: string[] = [];
  rokSeries: { value: number, itemStyle?: { color: string } }[] = [];


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
      const l = this.state.getTenantsRange();
      this.limits = [l[0].getFullYear(), l[1].getFullYear(),];
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

  fireChangeLimits() {
    this.onChangeLimits.emit([new Date(this.limits[0] + '-01-01'), new Date(this.limits[1] + '-12-31')]);
  }

  onSetYears(e: any) {
    if (!e.areas || e.areas.length === 0) {
      return;
    }
    this.limits = [parseInt(this.rokAxis[e.areas[0].coordRange[0]]), parseInt(this.rokAxis[e.areas[0].coordRange[1]])];
    this.fireChangeLimits();
    this.setChartTitle();
  }

  onClearSelection(e: any) {
    if (e.batch[0].areas.length === 0) {

      const l = this.state.getTenantsRange();
      this.limits = [l[0].getFullYear(), l[1].getFullYear(),];
      this.fireChangeLimits();
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
        text: this.limits[0] + '–' + this.limits[1]
      }
    })
  }

  setYearsChart(facet: { buckets: JSONFacet[], after: { count: number } }) {
    this.rokSeries = facet.buckets.map(c => {
      const color = c.val < '1670' ? '#155605' : (c.val < '1939' ? 'rgb(68, 110, 136)' : '#00c');
      return {
        value: c.count, //itemStyle: { color: color }
      }
    });
    this.rokSeries.push({ value: facet.after.count, 
      //itemStyle: { color: '#00c' } 
    });
    this.rokAxis = facet.buckets.map(c => new Date(c.val).getFullYear() + '');
    this.rokAxis.push(this.limits[1] + '');


    let minRokWithValue = '1000';
    let maxRokWithValue = '2025';

    minRokWithValue = this.limits[0] + '';
    maxRokWithValue = this.limits[1] + '';


    const markAreaData: any = [];

    if (this.limits[0] < 1670) {
      markAreaData.push([
              {
                name: '1. období',
                xAxis: minRokWithValue,
                itemStyle: {
                  color: '#155605',
                  opacity: 0.5
                },
              },
              {
                xAxis: Math.min(this.limits[1], 1670) + ''
              }
            ]
          )
    }

    if (this.limits[0] < 1939 && this.limits[1] > 1670) {
      markAreaData.push([
              {
                name: '2. období',
                //xAxis: '1670',
                xAxis: Math.max(this.limits[0], 1670) + '',
                itemStyle: {
                  color: 'rgb(68, 110, 136)',
                  opacity: 0.4
                }
              },
              {
                xAxis: Math.min(this.limits[1], 1939) + ''
              }
            ]
          )
    }

    if (this.limits[1] > 1939) {
      markAreaData.push([
              {
                name: '3. období',
                // xAxis: '1939',
                xAxis: Math.max(this.limits[0], 1939) + '',
                itemStyle: {
                  color: '#00c',
                  opacity: 0.3
                }
              },
              {
                xAxis: maxRokWithValue
              }
            ]
          )
    }

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
        text: this.limits[0] + '–' + this.limits[1]
      },
        toolbox: {
          show: true,
          feature: {
            myTool1: {
                show: this.withAnimation(),
                title: 'run',
                icon: 'path://m354.2,247.4l-135.1-92.4c-4.2-3.1-15.4-3.1-16.3,8.6v184.8c1,11.7 12.4,11.9 16.3,8.6l135.1-92.4c3.5-2.1 8.3-10.7 0-17.2zm-130.5,81.3v-145.4l106.1,72.7-106.1,72.7z,path://M256,11C120.9,11,11,120.9,11,256s109.9,245,245,245s245-109.9,245-245S391.1,11,256,11z M256,480.1    C132.4,480.1,31.9,379.6,31.9,256S132.4,31.9,256,31.9S480.1,132.4,480.1,256S379.6,480.1,256,480.1z',
                onclick: () => {
                    this.run()
                }
            },
            myTool2: {
                show: this.withAnimation(),
                title: 'move',
                icon: `path://M28.5,15.6a2.1,2.1,0,0,0-2.7-.2,1.9,1.9,0,0,0-.2,3L29.2,22H6a2,2,0,0,0,0,4H29.2l-3.6,3.6a1.9,1.9,0,0,0,.2,3,2.1,2.1,0,0,0,2.7-.2l6.9-7a1.9,1.9,0,0,0,0-2.8Z,
                        path://M42,6V42a2,2,0,0,0,4,0V6a2,2,0,0,0-4,0Z,
                        path://M6,42V6A2,2,0,0,0,2,6V42a2,2,0,0,0,4,0Z`,
                onclick: () => {
                    this.move()
                }
            },
            myTool3: {
                show: this.withAnimation(),
                title: 'pause',
                icon: `path://M12,22 C6.4771525,22 2,17.5228475 2,12 C2,6.4771525 6.4771525,2 12,2 C17.5228475,2 22,6.4771525 22,12 C22,17.5228475 17.5228475,22 12,22 Z M12,21 C16.9705627,21 21,16.9705627 21,12 C21,7.02943725 16.9705627,3 12,3 C7.02943725,3 3,7.02943725 3,12 C3,16.9705627 7.02943725,21 12,21 Z M9,7 C10.1045695,7 11,7.8954305 11,9 L11,15 C11,16.1045695 10.1045695,17 9,17 C7.8954305,17 7,16.1045695 7,15 L7,9 C7,7.8954305 7.8954305,7 9,7 Z M9,8 C8.44771525,8 8,8.44771525 8,9 L8,15 C8,15.5522847 8.44771525,16 9,16 C9.55228475,16 10,15.5522847 10,15 L10,9 C10,8.44771525 9.55228475,8 9,8 Z M15,7 C16.1045695,7 17,7.8954305 17,9 L17,15 C17,16.1045695 16.1045695,17 15,17 C13.8954305,17 13,16.1045695 13,15 L13,9 C13,7.8954305 13.8954305,7 15,7 Z M15,8 C14.4477153,8 14,8.44771525 14,9 L14,15 C14,15.5522847 14.4477153,16 15,16 C15.5522847,16 16,15.5522847 16,15 L16,9 C16,8.44771525 15.5522847,8 15,8 Z`,
                onclick: () => {
                    this.stop()
                }
            }
        }
      },
      brush: {
        toolbox: ['clear'],
        brushType: 'lineX',
        brushMode: 'single',
        removeOnClick: true,
        xAxisIndex: 0,
        z: 1,
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
        show: false,
        type: 'value',
      },
      series: [{
        name: '',
        type: 'bar',
        data: this.rokSeries,
        barCategoryGap: 0,
        color: this.barColor,

        markArea: {
          
          label: {
            position: 'insideTop',
            color: '#000'
          },
          silent: true,
          data: markAreaData,
          // data: [
          //   [
          //     { xAxis: minRokWithValue },
          //     { xAxis: maxRokWithValue }
          //   ]
          // ],
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
        this.fireChangeLimits();
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
    const startRok = this.state.getTenantsRange()[0].getFullYear();
    let endRok = startRok;
    const maxRok = this.state.getTenantsRange()[1].getFullYear();
    this.animation = setInterval(() => {
      this.limits = [startRok, endRok++];
      this.fireChangeLimits();
      this.onChangeRunning.emit(true);
      this.setChartTitle();

      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [startRok + '', endRok + ''],
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
    const maxRok = this.state.getTenantsRange()[1].getFullYear();
    this.animation = setInterval(() => {
      this.limits = [startRok++, endRok++];
      this.fireChangeLimits();
      this.running = true;
      this.onChangeRunning.emit(this.running);
      this.setChartTitle();

      this.chartRok.dispatchAction({
        type: 'brush',
        areas: [
          {
            brushType: 'lineX',
            coordRange: [startRok + '', endRok + ''],
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
