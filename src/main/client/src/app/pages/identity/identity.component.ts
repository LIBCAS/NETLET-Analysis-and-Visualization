import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { JSONFacet } from '../../shared/facet';

import * as echarts from 'echarts/core';

//@ts-ignore
import langCZ from 'echarts/lib/i18n/langCS.js';
import { EChartsOption } from 'echarts';
import { BarChart, LineChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';


echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent,
  GridComponent, TitleComponent]);
echarts.registerLocale("CZ", langCZ)

@Component({
  selector: 'app-identity',
  imports: [TranslateModule, NgxEchartsModule, NgxEchartsDirective],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './identity.component.html',
  styleUrl: './identity.component.scss',
})
export class IdentityComponent {

  identityId = signal('');
  private activatedRoute = inject(ActivatedRoute);

  identityRes: any = httpResource(() => ({
    url: `/api/data/get_identity`,
    method: 'GET',
    params: {
      'id': this.identityId()
    }
  }));

  identity = computed<any>(() => this.identityRes.value());


  
  limits: [Date, Date];
  chartOptions: EChartsOption | any;
  chart: echarts.ECharts;
  chartType: string = 'line';

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.identityId.set(params['id']);
    });

    effect(() => {
      const identity = this.identityRes.value();
      if (identity) {
        setTimeout(() => {
          this.setOptions();
        }, 100)
      }
    })
  }

  onChartInit(e: any) {
    this.chart = e;
  }

  setOptions() {
    const series = [];
    if (this.identity().stats.author.years) {
      series.push({
          name: 'Author',
          type: this.chartType + '',
          smooth: true,
          symbol: 'none',
          data: this.identity().stats.author.years.buckets.map((c: JSONFacet) => [c.val, c.count])
        });
    }
    if (this.identity().stats.recipient.years) {
      series.push({
          name: 'Recipient',
          type: this.chartType + '',
          smooth: true,
          symbol: 'none',
          data: this.identity().stats.recipient.years.buckets.map((c: JSONFacet) => [c.val, c.count])
        });
    }
    if (this.identity().stats.mentioned.years) {
      series.push({
          name: 'Mentioned',
          type: this.chartType + '',
          smooth: true,
          symbol: 'none',
          data: this.identity().stats.mentioned.years.buckets.map((c: JSONFacet) => [c.val, c.count])
        });
    }
    this.chartOptions = {
      tooltip: {
        trigger: 'axis',
        position: function (pt: any) {
          return [pt[0], '10%'];
        }
      },
      title: {
        left: 'center',
        text: 'Počet dopisů'
      },
      grid: {
        left: 30,
        right: 30,
        top: 30
      },
      xAxis: {
        type: 'category',
        //boundaryGap: ['5%', '5%'],
        triggerEvent: true,
      },
      yAxis: {
        type: 'value',
      },
      legend: {
        show: true,
        orient: 'vertical',
        right: 10,
      },
      series: series

    };
  }
}
