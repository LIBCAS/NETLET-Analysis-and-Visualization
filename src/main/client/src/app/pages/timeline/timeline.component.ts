import { DatePipe } from '@angular/common';
import { Component, effect, Inject, NgZone, signal, DOCUMENT, Injectable } from '@angular/core';
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
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Tenant, AppState } from '../../app-state';
import { AppService } from '../../app.service';
import { FacetFields, JSONFacet } from '../../shared/facet';


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
import { Identity, Letter, Place } from '../../shared/letter';
import { AppConfiguration } from '../../app-configuration';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AngularSplitModule } from 'angular-split';
echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent,
  GridComponent, TitleComponent, BrushComponent, ToolboxComponent, DataZoomComponent]);

//@ts-ignore
import langCZ from 'echarts/lib/i18n/langCS.js';
import { debounceTime, Subject } from 'rxjs';
import { FacetsComponent } from "../../components/facets/facets.component";

echarts.registerLocale("CZ", langCZ);



@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = `First page`;
  itemsPerPageLabel = `Počet dopisů na stránku:`;
  lastPageLabel = `Last page`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0) {
      return `Stránka 1 z 1`;
    }
    const amountPages = Math.ceil(length / pageSize);
    return `Stránka ${page + 1} z ${amountPages}`;
  }
}

@Component({
  selector: 'app-timeline',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, DatePipe,
    NgxEchartsModule, AngularSplitModule, RouterModule,
    MatProgressBarModule, MatExpansionModule, MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatTableModule, MatPaginatorModule,
    MatListModule, MatIconModule, MatCheckboxModule, MatRadioModule, MatTooltipModule, FacetsComponent],
  providers: [
    provideEchartsCore({ echarts }),
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl },
  ],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent {


  loading: boolean;
  solrResponse: any;
  facets = signal<FacetFields>({});
  letters = signal<Letter[]>([]);
  showLetters = signal<boolean>(false);
  hasFacets = signal<boolean>(false);
  tenants: Tenant[] = [];
  limits: [Date, Date];
  chartOptions: EChartsOption | any;
  chart: ECharts;
  chartType: string = 'bar';
  gridInverse = true;

  date_facet: { buckets: JSONFacet[], after: { count: number } };
  years_facet: { buckets: JSONFacet[], after: { count: number } };

  displayedColumns = ['id', 'tenant', 'author', 'recipient', 'origin', 'destination', 'date', 'action'];
  rows = 100;
  numFound: number = 0;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 100];

  getTimelineSubject = new Subject<boolean>();
  excludeDate = true;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private _ngZone: NgZone,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService,
    private config: AppConfiguration,
    private datePipe: DatePipe
  ) {
    effect(() => {
      const sc = this.state.stateChanged();
      if (sc > 0) {
        this.limits = this.state.getTenantsRange();
        this.getData(true);
      } else {
        this.loading = false;
        this.letters.set([]);
        this.facets.set({});
        this.years_facet = null;
        this.setOptions([], []);
      }
    })
  }

  ngOnInit(): void {
    this.state.tenants().forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'timeline');
    this.getTimelineSubject.pipe(debounceTime(300)).subscribe(setGraph => {
      this.getData2(setGraph)
    });

    this.limits = this.state.getTenantsRange();
    this.tenants = this.state.selectedTenants();
    if (this.tenants.length > 0 || this.state.usedFacets().length > 0) {
      this.getData(true);
    }

  }

  clickTenant(t: Tenant) {
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });
    //this.router.navigate([], { queryParams: { tenant: this.state.selectedTenants().map(t => t.val).toString() } });
  }

  onChartInit(e: any) {
    this.chart = e;
    this.chart.on('dataZoom', (params: any) => {
      var option: any = this.chart.getOption();


  // var axis = myChart.getModel().option.xAxis[0];
  // var starttime = axis.data[axis.rangeStart];
  // var endtime = axis.data[axis.rangeEnd];
  // console.log(starttime,endtime);

      this.excludeDate = false;
      
      this.limits = [new Date(option.dataZoom[1].startValue), new Date(option.dataZoom[1].endValue)];
      this.getData(false);
    });

    this.chart.on('click', (params: any) => {
      if (params.componentType === 'xAxis') {
        const year = parseInt(params.value.split('-')[0]);
        this.getData(false);
        this.chart.dispatchAction({
          type: 'dataZoom',
          startValue: new Date(year + '-01-01').getTime(),
          endValue: new Date(year + '-12-31').getTime()
        });
      }
    })
    //this.getData(true);
  }

  changeTenant() {
    this.excludeDate = true;
    this.limits = this.state.getTenantsRange();
    this.getData(true);
  }

  //usedFacets: { field: string, value: string }[] = [];
  onFiltersChanged(usedFacets: { field: string, value: string }[]) {
    //this.usedFacets = usedFacets;
    this.limits = this.state.getTenantsRange();
    console.log(this.limits)
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
    this.facets.set({});
    this.showLetters.set(false);
    if (setGraph) {
      this.setOptions([], [])
    }
    const p: any = {};
    p.tenant = this.state.selectedTenants().map(t => t.val);
    //p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.date_range = this.datePipe.transform(this.limits[0], 'yyyy-01-01') + ',' + this.datePipe.transform(this.limits[1], 'yyyy-01-01');

    p.rows = this.rows;

    p.excludeDate = this.excludeDate;

    p.offset = this.pageIndex * p.rows;
    this.state.addFilters(p);


    this.service.getTimeline(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }

      this.solrResponse = resp;
      this.facets.set(resp.facets);

      if (resp.facets['tenants']?.buckets.length > 0 && this.state.selectedTenants().length === 0) {
        this.state.tenants.update(ts => {
          ts.forEach(t => { t.selected = this.facets()['tenants']?.buckets.findIndex(b => b.val === t.val) > -1 });
          return [...ts]
        });
      }

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

  setOptions(data: any, date: any) {
    const dataZoomStart = data.length > 0 ? data[0][0] : 0;
    const dataZoomEnd = data.length > 0 ? data[data.length-1][0] : 100;
    this.chartOptions = {
      legend: {
        show: false,
        bottom: 10
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          animation: false
        }
      },
      title: {
        show: false,
        left: 'center',
        text: 'Zobrazení dopisů v chronologickém pořadí'
      },

      grid: [
        {
          left: 60,
          rigth: '50px',
          height: this.gridInverse ? '20%' : 'auto', 
        },
        {
          left: 60,
          rigth: this.gridInverse ? '50px' : '-50px',
          top: this.gridInverse ? '40%' : '60',
          height: this.gridInverse ? '35%' : 'auto', 
        }
      ],


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
      xAxis: [

        {
          show: false,
          type: 'category',
          boundaryGap: true,
          triggerEvent: true,
          axisLabel: {
            hideOverlap: true // Prevents dense labels from crashing into each other
          },
          position: 'top',
          //data: this.years_facet ? this.years_facet.buckets.map(c => c.val) : []
        },
        {
          gridIndex: 1,
          type: 'time',
          //type: 'category',
          //data: date,
          boundaryGap: true,
          triggerEvent: true,
          axisLabel: {
            hideOverlap: true // Prevents dense labels from crashing into each other
          }
        }
      ],
      yAxis: [
        {
          name: 'Počet dopisů za rok',
          type: 'value',
          axisLabel: {
            showMinLabel: false
          },
           splitLine:{show: false}
        },
        {
          name: 'Počet dopisů za den',
          gridIndex: 1,
          allowDecimals: false,
          minInterval: 1,
          position: this.gridInverse ? 'left' : 'right',
          inverse: this.gridInverse,
          axisLabel: {
            showMinLabel: false
          },
           splitLine:{show: false}
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: dataZoomStart,
          end: dataZoomEnd,
          xAxisIndex: [0,1]
        },
        {
          start: dataZoomStart,
          end: dataZoomEnd,
          xAxisIndex: [0,1]
        }
      ],
      series: [
        {

          name: 'Počet dopisů za rok',
          type: this.chartType + '',
          //triggerLineEvent: true,
          barCategoryGap: 0,
          barGap: '-100%',
          itemStyle: {
            opacity: .5,
            color: '#f80'
          },

          smooth: true,
          symbol: 'none',
          areaStyle: {},
          data: this.years_facet ? this.years_facet.buckets.map(c => [c.val, c.count]) : []
        },
        {
          name: 'Počet dopisů za den',
          type: this.chartType + '',
          
          itemStyle: {
            color: '#00c'
          },
          barWidth: '3px',
          xAxisIndex: 1,
          yAxisIndex: 1,
          //triggerLineEvent: true,

          smooth: true,
          symbol: 'none',
          areaStyle: {},

          data: data
        },
      ]

    };
  }

  changeChartType() {
    this.loading = true;
    this.chart.clear();
    setTimeout(() => {
      this.processResponse();
      // const data = this.date_facet.buckets.map(c => [Date.parse(c.val), c.count]);
      // //  const data = this.date_facet.buckets.map(c => c.count);
      // const date = this.date_facet.buckets.map(c => this.datePipe.transform(c.val, 'd. M. yyyy'));
      // this.setOptions(data, date);
      this.loading = false;

    }, 100);
  }

  processResponse() {
    this.date_facet = this.solrResponse.facets.date_computed_range;
    this.years_facet = this.solrResponse.facets.years;
    //const data = this.date_facet.buckets.map(c => [Date.parse(c.val), c.count]);
    const data = this.date_facet.buckets.map(c => [c.val.substring(0, 10), c.count]);
    //const data = this.date_facet.buckets.map(c => c.count);
    const date = this.date_facet.buckets.map(c => this.datePipe.transform(c.val, 'd. M. yyyy'));
    // console.log(data)
    this.setOptions(data, date);
  }

  viewLetter(id: number, t: string) {
    this.router.navigate(['/letter', id])
  }

  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }

  letterIdentities(letter: Letter, role: string): Identity[] {
    if (letter.identities) {
      return letter.identities.filter(p => p.role === role);
    }
    return [];
  }

  letterPlaces(letter: Letter, role: string): Place[] {
    if (letter.places) {
      return letter.places.filter(p => p.role === role);
    }
    return [];
  }
}
