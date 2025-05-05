import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService } from '../../app.service';
import { Facet } from '../../shared/facet';
import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    NgxEchartsDirective,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule
  ],
  templateUrl: './keywords.component.html',
  styleUrl: './keywords.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class KeywordsComponent {

  tenants: {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number
  }[] = [];
  tenant: {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number
  };

  solrResponse: any;
  recipients: Facet[] = [];
  mentioned: Facet[] = [];
  keywords_cs: Facet[] = [];
  selectedKeywords: string[] = [];

  chartOptions: EChartsOption = {};
  chart: ECharts;
  barColor: string;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
    private service: AppService
  ) { }

  ngOnInit(): void {
    this.getTenants();
    this.barColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();

  }

  onChartInit(e: any) {
    this.chart = e;
  }

  getTenants() {
    this.service.getTenants().subscribe((resp: any) => {
      this.tenants = resp.buckets;
    });
  }

  changeTenant() {
    this.selectedKeywords = [];
    this.getData();
  }

  getData() {
    const p: any = {};
    p.tenant = this.tenant.val;
    p.keyword = this.selectedKeywords;
    this.solrResponse = null;
    this.service.getLetters(p as HttpParams).subscribe((resp: any) => {
      this.solrResponse = resp;

      if (!this.solrResponse) {
        return;
      }

      this.recipients = this.solrResponse.facet_counts.facet_fields.identity_recipient;
      this.mentioned = this.solrResponse.facet_counts.facet_fields.identity_mentioned;
      this.keywords_cs = this.solrResponse.facet_counts.facet_fields.keywords_cs;
      this.keywords_cs.forEach(k => {
        k.selected = this.selectedKeywords.includes(k.name);
      });

      this.setChart();

    });
  }

  setChart() {

    this.chartOptions = {
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
          data: this.mentioned.map(f => f.value).reverse()
        }
      ],
      yAxis: {
        type: 'category',
        data: this.mentioned.map(f => f.name).reverse(),
        axisLine: { show: false },
        axisLabel: { show: false },
        
      }
    }
  }

  clickKeyword(k: Facet) {
    k.selected = !k.selected;
    this.selectedKeywords = this.keywords_cs.filter(k => k.selected).map(k => k.name);
    this.getData();
  }

  activeIdentity: Facet = null;
  clickMentioned(identity: Facet) {
    if (identity === this.activeIdentity) {
      this.activeIdentity = null;
    } else {
      this.activeIdentity = identity;
    }
  }
}
