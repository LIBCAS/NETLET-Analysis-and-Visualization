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
import { NgxEchartsDirective, NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
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
import { MatTableModule } from '@angular/material/table';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import { AngularSplitModule } from 'angular-split';
echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent,
  GridComponent, TitleComponent, BrushComponent, ToolboxComponent, DataZoomComponent]);

//@ts-ignore
import langCZ from 'echarts/lib/i18n/langCS.js';
import { debounceTime, Subject } from 'rxjs';
import { FacetsComponent } from "../../components/facets/facets.component";

echarts.registerLocale("CZ", langCZ)

@Component({
  selector: 'app-timeline',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, DatePipe,
    NgxEchartsModule, AngularSplitModule,
    MatProgressBarModule, MatExpansionModule, MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatTableModule, MatPaginatorModule,
    MatListModule, MatIconModule, MatCheckboxModule, MatRadioModule, MatTooltipModule, FacetsComponent],
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
  showLetters = signal<boolean>(false);
  hasFacets = signal<boolean>(false);
  limits: [Date, Date];
  tenant: Tenant;
  chartOptions: EChartsOption | any;
  chart: ECharts;

  // authors: JSONFacet[] = [];
  // selectedAuthors: string[] = [];
  // recipients: JSONFacet[] = [];
  // selectedRecipients: string[] = [];
  // mentioned: JSONFacet[] = [];
  // selectedMentioned: string[] = [];
  // keyword_categories: JSONFacet[] = [];
  // selectedKeywords: string[] = [];
  // professions: JSONFacet[] = [];
  // selectedProfessions: string[] = [];
  // origins: JSONFacet[] = [];
  // selectedOrigins: string[] = [];
  // destinations: JSONFacet[] = [];
  // selectedDestinations: string[] = [];

  date_facet: { buckets: JSONFacet[], after: { count: number } };

  displayedColumns = ['id', 'author', 'recipient', 'origin', 'destination', 'date', 'action'];
  rows = 100;
  numFound: number = 0;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 100];

  getTimelineSubject = new Subject<boolean>();

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
    this.getTimelineSubject.pipe(debounceTime(300)).subscribe(setGraph => {
      this.getData2(setGraph)
    });
    if (this.tenant && this.chart) {
      this.limits = [this.tenant.date_computed_min, this.tenant.date_computed_max];
      this.getData(true);
    }
  }

  onChartInit(e: any) {
    this.chart = e;
    this.chart.on('dataZoom', () => {
      var option: any = this.chart.getOption();
      // const letters = this.solrResponse.response.docs.filter((doc: Letter) => 
      //   (Date.parse(doc.date_computed) >= option.dataZoom[0].startValue) && (Date.parse(doc.date_computed) <= option.dataZoom[0].endValue));
      // this.letters.set(letters);
      
      // this.showLetters.set(true);

      this.limits = [new Date(option.dataZoom[0].startValue), new Date(option.dataZoom[0].endValue)];
      this.getData(false);
    });

    this.chart.on('click', (params: any) => {
      if (params.componentType === 'xAxis') {
        const year = parseInt(params.value.split('-')[0]);
        this.getData(false);
        this.chart.dispatchAction({
          type: 'dataZoom',
          startValue: new Date(year +'-01-01').getTime(),
          endValue: new Date(year +'-12-31').getTime()
        });
      }
    })

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

  usedFacets: {field: string, value: string}[] = [];
  onFiltersChanged(usedFacets: {field: string, value: string}[]) {
    this.usedFacets = usedFacets;
    this.getData(true);
  }

  filter(k: JSONFacet) {
    k.selected = !k.selected;
    this.getData(true);
  }

  unfilter(list: JSONFacet[], val: string) {
    const k: JSONFacet = list.find(f => f.val === val);
    k.selected = !k.selected;
    this.getData(true);
  }

  handlePageEvent(e: PageEvent) {
    this.rows = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.getData(true);
  }

  getData(setGraph: boolean) {
    this.getTimelineSubject.next(setGraph);
  }

  getData2(setGraph: boolean) {
    this.loading = true;
    this.letters.set([]);
    this.showLetters.set(false);
      if (setGraph) {
        this.setOptions([])
      }
    const p: any = {};
    p.tenant = this.tenant.val;
    p.other_tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.tenant_date_range = this.tenant.date_computed_min.toISOString() + ',' + this.tenant.date_computed_max.toISOString();
    
      p.rows = this.rows;

    p.offset = this.pageIndex * p.rows;
    this.state.addFilters(p, this.usedFacets);


    this.service.getTimeline(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      
      this.solrResponse = resp;
      this.numFound = this.solrResponse.response.numFound;

      const letters = this.solrResponse.response.docs;
      this.letters.set(letters);
      this.showLetters.set(true);
      if (setGraph) {
        this.processResponse();
      }
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
      grid: {
        left: 30,
        right: 30,
        top: 30
      },
      toolbox: {
        orient: 'vertical',
        left: 'right',
        rigth: '50px',
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {}
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        triggerEvent: true
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
          //triggerLineEvent: true,
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

  letterPlaces(letter: Letter, role: string) {
    if (letter.places) {
      const place = letter.places.find(p => p.role === role);
      return place?.name
    }
    return '';
  }
}
