import { Component, effect, Inject, input, DOCUMENT, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService } from '../../app.service';
import { AppState, Tenant } from '../../app-state';
import { FacetFields, JSONFacet } from '../../shared/facet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { EChartsOption, ECharts } from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { TreemapChart, TreeChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';
import { YearsChartComponent } from "../../components/years-chart/years-chart.component";
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { FacetsComponent } from "../../components/facets/facets.component";

echarts.use([BarChart, CanvasRenderer, TreemapChart, TreeChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-keywords',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, MatProgressBarModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatListModule, MatExpansionModule, MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent, FacetsComponent],
  templateUrl: './periods.component.html',
  styleUrl: './periods.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class PeriodsComponent {
  loading: boolean;
  invalidTenant: boolean;
  solrResponse: any;
  facets = signal<FacetFields>({});
  limits: [Date, Date];

  periods: JSONFacet[];
  keyword_categories: JSONFacet[];
  selectedKeywords: string[] = [];


  pieOptions: EChartsOption = {};
  pieChart: ECharts;
  profOptions: EChartsOption = {};
  profChart: ECharts;

  identitiesChartOptions: EChartsOption = {};
  identitiesChart: ECharts;
  barColor: string;

  colors = [
    '#3531c2',
    '#c23531',
    '#c2c231',
    'rgb(234, 124, 204)',
    '#314656',
    '#61a0a8',
    'rgb(154, 96, 180)',
    '#dd8668',
    '#91c7ae',
    '#6e7074',
    '#61a0a8',
    '#bda29a',
    '#44525d',
    '#c4ccd3'
  ];

  chartHeight: number = 400;
  totalBuckets = 0;

  tenants: Tenant[] = [];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
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
        this.pieOptions = {};
        this.facets.set({});
      }
    });
  }

  ngOnInit(): void {

    this.translation.onLangChange.subscribe(() => { this.getData(true) });
    this.state.tenants().forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'keywords');
    this.barColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
    if (this.tenants.length > 0 && this.identitiesChart) {
      this.limits = this.state.getTenantsRange();
      this.getData(true);
    }
  }

  formatSliderLabel(value: number): string {
    if (value === 0) {
      return 'keywords -> identities';
    } else {
      return 'identities -> keywords';
    }
  }

  onChartInit(e: any) {
    this.identitiesChart = e;
  }

  onPieChartInit(e: any) {
    this.pieChart = e;
  }

  onProfChartInit(e: any) {
    this.profChart = e;
  }

  clickTenant(t: Tenant) {
    this.router.navigate([], { queryParams: { tenant: this.state.selectedTenants().map(t => t.val).toString() } });
  }

  changeTenant() {
    this.limits = this.state.getTenantsRange();
    this.selectedKeywords = [];
    this.getData(true);
  }

  changeLimits(limits: [Date, Date]) {
    this.limits = limits;
    this.getData(false);
  }

  getData(setResponse: boolean) {
    this.loading = true;
    this.invalidTenant = false;
    const p: any = {};
    p.tenant = this.state.selectedTenants().map(t => t.val);
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.tenant_year_range = this.state.getTenantsRange().toString();

    p.keyword = this.selectedKeywords;
    p.lang = this.translation.currentLang;
    this.service.getPeriods(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      this.facets.set(resp.facets);
      if (setResponse) {
        this.solrResponse = resp;
        const ts: JSONFacet[] = resp.facets.tenants.buckets;
        this.state.tenants().forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });
      }
      if (resp.response.numFound === 0) {
        this.loading = false;
        return;
      }

      this.periods = resp.facets.periods.buckets;
      this.keyword_categories = resp.facets.keywords.buckets;

      this.keyword_categories.forEach(k => {
        k.selected = this.selectedKeywords.includes(k.val);
      });

      this.pieOptions = this.setPieChart('keywords');
      this.profOptions = this.setPieChart('professions');


      this.loading = false;
    });
  }

  clickKeyword(k: JSONFacet) {
    k.selected = !k.selected;
    this.selectedKeywords = this.keyword_categories.filter(k => k.selected).map(k => k.val);
    this.getData(true);
  }

  activeIdentity: JSONFacet = null;
  clickMentioned(identity: JSONFacet) {
    if (identity === this.activeIdentity) {
      this.activeIdentity = null;
    } else {
      this.activeIdentity = identity;
    }
  }

  setPieChart(facetName: string): EChartsOption {
    const data: { [period: string]: any[] } = {
      '1':[],
      '2':[],
      '3':[]
    };

    this.periods.forEach((p: JSONFacet) => {
      const period = p.val;
      data[period] = [];
      p[facetName].buckets.forEach((k: JSONFacet) => {
        data[period].push({
          id: k.val,
          name: k.val,
          value: k.count
        })
      })
    });

    const op: EChartsOption = {
      title: [
        {
          show: true,
          text: this.translation.instant('field.'+facetName),
          left: 'center'
        },
        {
          show: true,
          text: "1. obdobi",
          left: '20%',
          bottom: '0',
          textAlign: 'center'
        },
        {
          show: true,
          text: "2. obdobi",
          left: '50%',
          bottom: '0',
          textAlign: 'center'
        },
        {
          show: true,
          text: "3. obdobi",
          left: '80%',
          bottom: '0',
          textAlign: 'center'
        }
      ],
      legend: {
        show: false,
        type: data['1'].length > 15 ? 'scroll' : 'plain',
        orient: 'vertical',
        right: 10,
        data: data['1'].map(a => a.name),
        formatter: name => {
          var series: any = this.pieChart.getOption()['series'];
          var value = series[0].data.filter((row: any) => row.name === name)[0].value
          return name + ' - ' + value;
        },
      },
      tooltip: {
        // formatter: (params: any) => {
        //   return params.dataType === 'edge' ?
        //     `${params.data.label} (${params.data.count})` :
        //     params.name
        // }
      },
      series: [
        {
          name: "1. obdobi",
          //color: this.colors,
          type: 'pie',
          radius: '40%',
          center: ['20%', '50%'],
          selectedMode: 'single',
          data: data['1']
        },
        {
          name: "2. obdobi",
          //color: this.colors,
          type: 'pie',
          radius: '40%',
          center: ['50%', '50%'],
          selectedMode: 'single',
          data: data['2']
        },
        {
          name: "3. obdobi",
          //color: this.colors,
          type: 'pie',
          radius: '40%',
          center: ['80%', '50%'],
          selectedMode: 'single',
          data: data['3']
        },
      ]
    }
    return op;
  }


}
