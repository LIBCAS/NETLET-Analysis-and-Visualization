import { Component, effect, Inject, input } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService } from '../../app.service';
import { AppState, Tenant } from '../../app-state';
import { Facet, JSONFacet } from '../../shared/facet';
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

echarts.use([BarChart, CanvasRenderer, TreemapChart, TreeChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-keywords',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule, MatCardModule,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent
  ],
  templateUrl: './keywords.component.html',
  styleUrl: './keywords.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class KeywordsComponent {
  loading: boolean;
  invalidTenant: boolean;
  solrResponse: any;
  limits: [number, number];

  mentioned: JSONFacet[];
  keywords_cs: JSONFacet[];
  selectedKeywords: string[] = [];


  identitiesChartOptions: EChartsOption = {};
  identitiesChart: ECharts;
  barColor: string;

  treeMapOptions: EChartsOption = {};
  treeMapChart: ECharts;
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

  tenant: Tenant;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService
  ) {
    effect(() => {
      this.tenant = this.state.tenant();
      if (this.tenant) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {
    
    this.translation.onLangChange.subscribe(() => { this.getData(true) });
    this.state.tenants.forEach(t => {t.available = true});
    this.barColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
    if (this.tenant) {
      this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
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

  onTreeMapChartInit(e: any) {
    this.treeMapChart = e;
  }

  onChangeChartType() {
    this.loading = true;
    this.identitiesChartOptions = {};
    setTimeout(() => {
      this.setTreeMapChart();
      this.loading = false;
    }, 1000);

  }

  changeTenant() {
    this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
    this.selectedKeywords = [];
    this.getData(true);
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  getData(setResponse: boolean) {
    this.loading = true;
    this.invalidTenant = false;
    const p: any = {};
    p.tenant = this.tenant.val;
    p.keyword = this.selectedKeywords;
    p.date_range = this.limits.toString();
    p.tenant_date_range = this.tenant.date_year_min + ',' + this.tenant.date_year_max;
    p.lang = this.translation.currentLang;
    this.service.getKeywords(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
        const ts: JSONFacet[] = resp.facets.tenants.buckets;
        this.state.tenants.forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });
        if (!this.state.tenant().available) {
          // this.state.tenant.set(null);
          this.loading = false;
          this.invalidTenant = true;
          return;
        }
      }
      // this.recipients = this.solrResponse.facets.identity_recipient.buckets;
      // this.mentioned = resp.facets.identity_mentioned.buckets;
      this.keywords_cs = resp.facets.keywords_categories.buckets;

      this.keywords_cs.forEach(k => {
        k.selected = this.selectedKeywords.includes(k.val);
      });

        const ops = this.setTreeMapChart();
        // this.treeMapOptions = this.setTreeMapChart();
        this.treeMapChart.setOption(ops);

      this.loading = false;
    });
  }

  clickKeyword(k: JSONFacet) {
    k.selected = !k.selected;
    this.selectedKeywords = this.keywords_cs.filter(k => k.selected).map(k => k.val);
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

  setTreeMapChart(): EChartsOption {
    const formatUtil = echarts.format;
    const data: any = [];
    this.totalBuckets = 0;
    this.keywords_cs.forEach((cat: any) => {
      const ks: any = [];
      cat.keywords.buckets.forEach((k: any) => {
        const ids: any = [];
        this.totalBuckets += k.identities.buckets.length;
        k.identities.buckets.forEach((i: any) => {
          ids.push({
            value: i.count,
            name: i.val
          })
        });
        ks.push({
          value: k.count,
          children: ids,
          name: k.val
        })
      });
      data.push({
        value: cat.count,
        children: ks,
        name: cat.val,
        id: cat.val
      })
    });

    this.chartHeight = 500;
    return {
      title: {
        text: 'Zmiňované osoby ve vztahu ke specifickým tématům či debatám',
        left: 'center'
      },
      tooltip: {
        formatter: function (info: any) {
          var value = info.value;
          var treePathInfo = info.treePathInfo;
          var treePath = [];
          for (var i = 1; i < treePathInfo.length; i++) {
            treePath.push(treePathInfo[i].name);
          }
          return [
            '<div class="tooltip-title">' +
            formatUtil.encodeHTML(treePath.join('->')) +
            '</div>',
            'Category: ' + value + ' letter' + (value > 1 ? 's' : '')
          ].join('');
        }
      },
      series: [
        {
          name: 'Categories',
          type: 'treemap',
          colorMappingBy: 'id',
          visibleMin: 300,
          label: {
            show: true,
            formatter: '{b}'
          },
          itemStyle: {
            borderColor: '#fff'
          },
          levels: this.getLevelOption(),
          data: data
        }
      ]
    }

    // console.log((this.treeMapChart as any).getModel().option.color);
  }

  getLevelOption() {
    return [
      {
        color: this.colors,
        // colorMappingBy: 'id',
        itemStyle: {
          borderWidth: 0,
          gapWidth: 5
        }
      },
      {
        //colorMappingBy: 'id',
        itemStyle: {
          gapWidth: 1
        }
      },
      {
        //colorMappingBy: 'id',
        colorSaturation: [0.35, 0.5],
        itemStyle: {
          gapWidth: 1,
          borderColorSaturation: 0.6
        }
      }
    ];
  }
}
