import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { JSONFacet } from '../../shared/facet';

import * as echarts from 'echarts/core';

//@ts-ignore
import langCZ from 'echarts/lib/i18n/langCS.js';
import { EChartsOption, ECharts } from 'echarts';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';


echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent, PieChart,
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
  private translation = inject(TranslateService);
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
  chart: ECharts;
  chartType: string = 'line';
  
  pieOptions: EChartsOption = {};
  pieChart: ECharts;

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.identityId.set(params['id']);
    });

    effect(() => {
      const identity = this.identityRes.value();
      if (identity) {
        setTimeout(() => {
          this.setOptions();
          this.setPieChart();
        }, 100)
      }
    })
  }

  onPieChartInit(e: any) {
    this.pieChart = e;
  }

  onChartInit(e: any) {
    this.chart = e;
  }

  setPieChart() {
    const data: any[] = [];

    this.identity().stats.tenant.buckets.forEach((p: JSONFacet) => {
      let i = 0;
      if (p.val) {
        data.push({
          id: p.val,
          name: p.val,
          value: p.count
        });
      }
    });

    this.pieOptions = {
      title: {
        show: true,
        text: this.translation.instant('field.tenant'),
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
      },
      series: [
        {
          //color: this.colors,
          type: 'pie',
          radius: '55%',
          center: ['30%', '50%'],
          selectedMode: 'single',
          data: data
        }
      ]
    }
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
