import { DatePipe, DOCUMENT } from '@angular/common';
import { Component, effect, Inject, NgZone, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Tenant, AppState } from '../../app-state';
import { AppService } from '../../app.service';
import { JSONFacet } from '../../shared/facet';


import { EChartsOption, ECharts } from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { DataZoomComponent, LegendComponent } from 'echarts/components';
import { TooltipComponent } from 'echarts/components';
import { GridComponent } from 'echarts/components';
import { TitleComponent } from 'echarts/components';
import { BrushComponent } from 'echarts/components';
import { ToolboxComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { HttpParams } from '@angular/common/http';
import { Letter } from '../../shared/letter';
import { AppConfiguration } from '../../app-configuration';
import { MatButtonModule } from '@angular/material/button';
echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent,
  GridComponent, TitleComponent, BrushComponent, ToolboxComponent, DataZoomComponent]);

@Component({
  selector: 'app-timeline',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, DatePipe,
    MatProgressBarModule, MatExpansionModule, MatFormFieldModule, MatSelectModule, 
    MatButtonModule,
    MatListModule, MatIconModule, MatCheckboxModule, MatRadioModule, MatTooltipModule],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent {


  loading: boolean;
  solrResponse: any;
  letters = signal<Letter[]>([]);
  limits: [Date, Date];
  tenant: Tenant;
  chartOptions: EChartsOption | any;
  chart: ECharts;

  authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];

  date_facet: { buckets: JSONFacet[], after: { count: number } };

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private _ngZone: NgZone,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService,
    private config: AppConfiguration
  ) {
    effect(() => {
      this.tenant = this.state.selectedTenants()[0];
      if (this.tenant) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {
    this.state.tenants.forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'timeline');
    if (this.tenant) {
      this.limits = [this.tenant.date_computed_min, this.tenant.date_computed_max];
      this.getData(true);
    }
  }

  onChartInit(e: any) {
    this.chart = e;

    this.chart.on('dataZoom', () => {
      var option: any = this.chart.getOption();
      const letters = this.solrResponse.response.docs.filter((doc: Letter) => 
        (Date.parse(doc.date_computed) >= option.dataZoom[0].startValue) && (Date.parse(doc.date_computed) <= option.dataZoom[0].endValue));
      this.letters.set(letters);
    });

    this.getData(true);
  }

  onBrushChanged(e: any) {
    if (!e.areas || e.areas.length === 0) {
      return;
    }
    // this.limits = [parseInt(this.rokAxis[e.areas[0].coordRange[0]]), parseInt(this.rokAxis[e.areas[0].coordRange[1]])];
    // this.onChangeLimits.emit(this.limits);
    // this.setChartTitle();
  }

  changeTenant() {
    this.limits = [this.tenant.date_computed_min, this.tenant.date_computed_max];
    this.getData(true);

  }

  getData(setResponse: boolean) {
    this.loading = true;
    this.letters.set([]);
    if (this.chartOptions) {
      this.chart.setOption({series:{data: []}});
    }
    const p: any = {};
    p.tenant = this.tenant.val;
    p.other_tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.tenant_date_range = this.tenant.date_computed_min.toISOString() + ',' + this.tenant.date_computed_max.toISOString();
    if (!setResponse) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }
    this.service.getTimeline(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
      }
      //this.authors = resp.facets.identity_author.buckets;
      this.recipients = resp.facets.identity_recipient.buckets;
      this.mentioned = resp.facets.identity_mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  setOptions(data: any) {
    this.chartOptions = {
      tooltip: {
        trigger: 'axis',
        position: function (pt: any) {
          return [pt[0], '10%'];
        }
      },
      title: {
        left: 'center',
        text: 'Zobrazení dopisů v chronologickém pořadí'
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {},
          saveAsImage: {}
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ],
      series: [
        {
          name: 'Počet dopisů',
          type: 'line',
          smooth: true,
          symbol: 'none',
          areaStyle: {},
          data: data
        }
      ]

    };
  }

  processResponse() {
    this.date_facet = this.solrResponse.facets.date_computed_range;
    const data = this.date_facet.buckets.map(c => [Date.parse(c.val), c.count]);
    // console.log(data)
    this.setOptions(data);
  }

  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }

  letterPlaces(letter: Letter) {
    if (letter.places) {
      const place_origin = letter.places.find(p => p.role === 'origin');
      const place_destination = letter.places.find(p => p.role === 'destination');
      return `${place_origin?.name} -> ${place_destination?.name}`
    }
    return '';
  }
}
