import { Component, Inject, input } from '@angular/core';
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
import {MatSliderModule} from '@angular/material/slider';
import {MatProgressBarModule} from '@angular/material/progress-bar';

import { EChartsOption, ECharts } from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';

echarts.use([BarChart, CanvasRenderer, LegendComponent, TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-keywords',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule, MatSliderModule
  ],
  templateUrl: './keywords.component.html',
  styleUrl: './keywords.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class KeywordsComponent {
  loading: boolean;
  solrResponse: any;
  mentioned: JSONFacet[] = [];
  keywords_cs: JSONFacet[] = [];
  selectedKeywords: string[] = [];

  identitiesChartOptions: EChartsOption = {};
  identitiesChart: ECharts;
  barColor: string;

  keywordsChartOptions: EChartsOption = {};
  keywordsChart: ECharts;

  chartType: number = 0; // 0:'keywords -> identities' --  1: 'identities -> keywords'

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService
  ) { }

  ngOnInit(): void {
    this.barColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
    if (this.state.tenant) {
      this.getData();
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

  onKeywordsChartInit(e: any) {
    this.keywordsChart = e;
  }

  changeTenant() {
    this.selectedKeywords = [];
    this.getData();
  }

  getData() {
    this.loading = true;
    const p: any = {};
    p.tenant = this.state.tenant.val;
    p.keyword = this.selectedKeywords;
    this.solrResponse = null;
    this.service.getKeywords(p as HttpParams).subscribe((resp: any) => {
      this.solrResponse = resp;

      if (!this.solrResponse) {
        return;
      }

      // this.recipients = this.solrResponse.facets.identity_recipient.buckets;
      this.mentioned = this.solrResponse.facets.identity_mentioned.buckets;
      this.keywords_cs = this.solrResponse.facets.keywords_categories.buckets;
      this.keywords_cs.forEach(k => {
        k.selected = this.selectedKeywords.includes(k.val);
      });

      this.setIdentitiesChart();
      this.loading = false;
    });
  }

  setIdentitiesChart() {

    this.identitiesChartOptions = {
      animation: false,
      title: {
        show: false,
        text: this.translation.instant('Identities')
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'value',
        axisLabel: { show: false },
      },
      series: [
        {
          name: 'identities',
          type: 'bar',
          barWidth: 36,
          color: this.barColor,
          barGap: 2,
          label: {
            show: true,
            align: 'left',
            position: 'insideLeft',
            formatter: '{b}'
          },
          data: this.mentioned.map(f => f.count).reverse()
        }
      ],
      yAxis: {
        type: 'category',
        data: this.mentioned.map(f => f.val).reverse(),
        axisLine: { show: false },
        axisLabel: { show: false },
        
      }
    }
  }

  clickKeyword(k: JSONFacet) {
    k.selected = !k.selected;
    this.selectedKeywords = this.keywords_cs.filter(k => k.selected).map(k => k.val);
    this.getData();
  }

  activeIdentity: JSONFacet = null;
  clickMentioned(identity: JSONFacet) {
    if (identity === this.activeIdentity) {
      this.activeIdentity = null;
    } else {
      this.activeIdentity = identity;
    }
  }

  setKeywordsChart() {

  }
}
