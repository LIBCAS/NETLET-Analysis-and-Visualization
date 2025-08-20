import { Component, effect, Inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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

import { EChartsOption, ECharts, color } from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { TreemapChart, TreeChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';
import { YearsChartComponent } from "../../components/years-chart/years-chart.component";
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';

echarts.use([BarChart, CanvasRenderer, TreemapChart, TreeChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-keywords',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, MatProgressBarModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatListModule, MatExpansionModule, MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent],
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
  limits: [Date, Date];

  includeAuthors: boolean = true;
  includeRecipients: boolean = false;
  authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];
  keyword_categories: JSONFacet[];
  selectedKeywords: string[] = [];


  pieOptions: EChartsOption = {};
  pieChart: ECharts;

  identitiesChartOptions: EChartsOption = {};
  identitiesChart: ECharts;
  barColor: string;

  treeMapOptions: EChartsOption = {};
  treeMapChartAutors: ECharts;
  treeMapChartRecipients: ECharts;
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
      this.tenants = this.state.selectedTenants();
      if (this.tenants.length > 0) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {

    this.translation.onLangChange.subscribe(() => { this.getData(true) });
    this.state.tenants.forEach(t => { t.available = true });
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

  onTreeMapChartAutorsInit(e: any) {
    this.treeMapChartAutors = e;
  }


  onTreeMapChartRecipientsInit(e: any) {
    this.treeMapChartRecipients = e;
  }

  onPieChartInit(e: any) {
    this.pieChart = e;
  }

  clickTenant(t: Tenant) {
    this.state.setSelectedTenants();
    this.router.navigate([], { queryParams: { tenant: this.state.tenants.filter(t => t.selected).map(t => t.val).toString() } });
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
    p.tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.tenant_date_range = this.state.getTenantsRangeISO().toString();

    p.keyword = this.selectedKeywords;
    p.lang = this.translation.currentLang;
    p.includeAuthors = this.includeAuthors;
    p.includeRecipients = this.includeRecipients;
    this.service.getKeywords(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
        const ts: JSONFacet[] = resp.facets.tenants.buckets;
        this.state.tenants.forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });
      }
      this.authors = resp.facets.authors.buckets;
      this.recipients = this.solrResponse.facets.recipients.buckets;
      // this.mentioned = resp.facets.mentioned.buckets;
      this.keyword_categories = resp.facets.keywords.buckets;

      this.keyword_categories.forEach(k => {
        k.selected = this.selectedKeywords.includes(k.val);
      });

      
    this.setPieChart();

      //const ops = this.setTreeMapChart();
      if (this.includeAuthors) {
        this.treeMapChartAutors.setOption(this.setTreeMapChart('authors'));
      }
      if (this.includeRecipients) {
        this.treeMapChartRecipients.setOption(this.setTreeMapChart('recipients'));
      }

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

  setPieChart() {
    const data: any[] = [];
    this.keyword_categories.forEach((p: JSONFacet) => {
      let i = 0;
      data.push({
        id: p.val,
        name: p.val,
        value: p.count
      })
    });

    this.pieOptions = {
      title: {
        show: true,
        text: 'Keywords categories',
        left: 'center'
      },
      legend: {
        type: data.length > 15 ? 'scroll' : 'plain',
        orient: 'vertical',
        right: 10,
        data: data.map(a => a.name),
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
          color: this.colors,
          type: 'pie',
          radius: '55%',
          center: ['30%', '50%'],
          selectedMode: 'single',
          data: data
        }
      ]
    }
  }

  setTreeMapChart(role: string): EChartsOption {
    const formatUtil = echarts.format;
    const data: any = [];
    this.totalBuckets = 0;
    this.keyword_categories.forEach((cat: any) => {
      const ks: any = [];
      const buckets = role === 'authors' ? cat.keywords_autor.buckets : cat.keywords_recipient.buckets;
      buckets.forEach((k: any) => {
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
        text: this.translation.instant('field.' + role) + ' ve vztahu ke specifickým tématům či debatám',
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
          roam: 'move',
          name: 'Keywords by categories',
          type: 'treemap',
          colorMappingBy: 'id',
          leafDepth: 2,
          drillDownIcon: '',
          visibleMin: 300,
          label: {
            show: true,
            formatter: '{b}'
          },
          itemStyle: {
            borderColor: '#fff'
          },
          levels: this.getLevelOption(),
          upperLabel: {
            show: true,
            height: 30
          },
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
        itemStyle: {
          borderWidth: 0,
          gapWidth: 5
        },
        upperLabel: {
          show: false
        }
      },
      {
        itemStyle: {
          borderColor: '#ddd',
          borderWidth: 5,
          gapWidth: 1
        },
        emphasis: {
          itemStyle: {
            borderColor: '#ddd'
          }
        }
      },
      {
        colorSaturation: [0.35, 0.5],
        itemStyle: {
          gapWidth: 1,
          borderColorSaturation: 0.6
        }
      }
    ];
  }
}
