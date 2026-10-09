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
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent, DatasetComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import { MatProgressBarModule } from '@angular/material/progress-bar';


echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent, PieChart, DatasetComponent,
  GridComponent, TitleComponent]);
echarts.registerLocale("CZ", langCZ)

@Component({
  selector: 'app-identity',
  imports: [TranslateModule, NgxEchartsModule, NgxEchartsDirective, MatProgressBarModule],
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

  nameInTime = signal('');
  identityInTimeRes: any = httpResource(() => ({
    url: `/api/data/identity_in_time`,
    method: 'GET',
    params: {
      'id': this.identityId(), 'id2': this.nameInTime()
    }
  }));
  identityInTime = computed<any>(() => this.identityInTimeRes.value());

  limits: [Date, Date];
  yearsChartOptions: EChartsOption | any;
  yearsChart: ECharts;
  yearsChartType: string = 'line';

  tenantsPieOptions: EChartsOption = {};
  tenantsPieChart: ECharts;

  identitiesBarOptions: EChartsOption = {};
  identitiesBarChart: ECharts;

  identityYearsChartOptions: EChartsOption | any;
  identityYearsChart: ECharts;
  identityYearsChartType: string = 'line';

  loading = signal(false);

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.identityId.set(params['id']);
    });

    effect(() => {
      const identity = this.identityRes.value();
      if (identity) {
        setTimeout(() => {
          this.setYearsOptions();
          this.setTenantsPieChart();
          this.setIdentitiesPieChart();
        }, 100)
      }
    });

    effect(() => {
      const i = this.identityInTimeRes.value();
      if (i) {
        this.setIdentityYearsOptions();
      }
    });
  }

  excludedTenants: string[] = [];
  onTenantsPieChartInit(e: any) {
    this.tenantsPieChart = e;

    this.tenantsPieChart.on('click', (params: any) => {
      if (params.componentType === 'legend') {
        //this.excludedTenants.push(params.value);

        const i = this.excludedTenants.indexOf(params.value);
        if (i === -1){
            this.excludedTenants.push(params.value);
        } else {
            this.excludedTenants.splice(i,1);
        }
        const series: any = this.setYearsData();
        this.yearsChart.setOption({ series: series })
      }
    });
  }

  onIdentitiesBarChartInit(e: any) {
    this.identitiesBarChart = e;

    this.identitiesBarChart.on('click', (params: any) => {
      if (params.componentType === 'yAxis') {
        this.loading.set(true);
        this.nameInTime.set(params.value);
      } else if (params.componentType === 'series') {
        this.loading.set(true);
        this.nameInTime.set(params.name);
      }
    });

  }

  onYearsChartInit(e: any) {
    this.yearsChart = e;
  }

  onIdentityYearsChartInit(e: any) {
    this.identityYearsChart = e;
  }

  setTenantsPieChart() {
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

    this.tenantsPieOptions = {
      title: {
        show: true,
        text: this.translation.instant('field.tenant'),
        left: 'center'
      },
      legend: {
        triggerEvent: true,
        type: data.length > 15 ? 'scroll' : 'plain',
        orient: 'vertical',
        right: 10,
        data: data.map(a => a.name),
        formatter: name => {
          var series: any = this.tenantsPieChart.getOption()['series'];
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



  getYearsLimits(buckets: any[]): [number, number] {
    let min = 3000;
    let max = 1000;
    if (buckets) {
      buckets.forEach((t: any) => {
        if (t.date_year_min === 0) {
          const y = parseInt(t.date_computed_min_s.split('-')[0]);
          min = min > y ? y : min;
        } else {
          min = min > t.date_year_min ? t.date_year_min : min;
        }
        max = max > t.date_year_max ? max : t.date_year_max;
      });
    }
    return [min, max];
  }

  inLimits(c: JSONFacet, limits: [number, number]): boolean {
    const valAsInt: number = parseInt(c.val);
    return (limits[0] <= valAsInt) && (valAsInt <= limits[1]);
  }

  setYearsData() {
    const series: any = [];
    const limits = this.getYearsLimits(this.identity().stats.tenant.buckets);
    if (this.identity().stats.author?.years) {

      const d = this.identity().stats.author.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Author',
        type: this.yearsChartType + '',
        smooth: true,
        symbol: 'none',
        data: d.map((c: any) => {
          if (c.count === 0) {
            return [c.val, c.count]
          } else {
            const count = c.tenant.buckets.filter((t: JSONFacet) => !this.excludedTenants.includes(t.val)).reduce((n: any, {count}: any) => n + count, 0);
            return [c.val, count]
          }
        })
      });
    }
    if (this.identity().stats.recipient?.years) {
      
      const d = this.identity().stats.recipient.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Recipient',
        type: this.yearsChartType + '',
        smooth: true,
        symbol: 'none',
        data: d.map((c: any) => {
          if (c.count === 0) {
            return [c.val, c.count]
          } else {
            const count = c.tenant.buckets.filter((t: JSONFacet) => !this.excludedTenants.includes(t.val)).reduce((n: any, {count}: any) => n + count, 0);
            return [c.val, count]
          }
        })
      });
    }
    if (this.identity().stats.mentioned?.years) {
      
      const d = this.identity().stats.mentioned.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Mentioned',
        type: this.yearsChartType + '',
        smooth: true,
        symbol: 'none',
        data: d.map((c: any) => {
          if (c.count === 0) {
            return [c.val, c.count]
          } else {
            const count = c.tenant.buckets.filter((t: JSONFacet) => !this.excludedTenants.includes(t.val)).reduce((n: any, {count}: any) => n + count, 0);
            return [c.val, count]
          }
        })
      });
    }
    return series;
  }

  setYearsOptions() {
    const series: any = this.setYearsData();

    this.yearsChartOptions = {
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
        //triggerEvent: true,
      },
      yAxis: {
        type: 'value',
      },
      legend: {
        show: true,
        bottom: 10,
      },
      series: series

    };
  }

  identitiesPieHeight: string = '300px';
  setIdentitiesPieChart() {
    const recipients: any[] = [];
    if (this.identity().stats.author.recipients) {
      this.identity().stats.author.recipients.buckets.forEach((p: JSONFacet) => {
        let i = 0;
        if (p.val) {
          recipients.unshift([p.count, p.val]);
        }
      });
    }

    const authors: any[] = [];
    if (this.identity().stats.recipient.authors)
      this.identity().stats.recipient.authors.buckets.forEach((p: JSONFacet) => {
        let i = 0;
        if (p.val) {
          authors.push([p.count, p.val]);
        }
      });

    const dimensions = [...new Set([
      'names',
      ...this.identity().stats.recipient.authors.buckets.map((c: JSONFacet) => c.val), 
      ...this.identity().stats.author.recipients.buckets.map((c: JSONFacet) => c.val)])];

    const source: any[] = [];
    this.identity().stats.author.recipients.buckets.forEach((c: JSONFacet) => {
      const s: any = {names: c.val};
      s['recipient']= c.count;
      source.push(s)
    });
    //const s2: any = {names: 'author'};
    this.identity().stats.recipient.authors.buckets.forEach((c: JSONFacet) => {
      const s: any = {names: c.val};
      s['author']= c.count;
      source.push(s)
    });

    const dataset = {
        dimensions: ['names', 'author', 'recipient'],
        source: source
      };

    //this.identitiesPieHeight = Math.max(recipients.length, authors.length) * 30 + 'px';
    this.identitiesPieHeight = dimensions.length * 30 + 'px';

    this.identitiesBarOptions = {

      dataset: dataset,
      series: [{ type: 'bar', seriesLayoutBy: 'row' }, { type: 'bar', seriesLayoutBy: 'row' }],

      // series: [
      //   {
      //     //stack: 'total',
      //     type: 'bar',
      //     name: 'jako adresat',
      //     data: recipients
      //   },
      //   {
      //     //stack: 'total',
      //     type: 'bar',
      //     name: 'jako autor',
      //     data: authors
      //   },
      // ],


      title: {
        show: false,
        text: this.translation.instant('field.recipients'),
        left: 'center'
      },
      legend: {
        show: true,
      },
      tooltip: {
        // formatter: '{a0}<br />${this.identity().stats.identities[${b0}].name}: {c0}'
        formatter: (params: any) => {
          //console.log(params)
          return params.seriesName + '<br/>' + this.identity().stats.identities[params.name].name + ' <strong>' + params.value[0] + '</strong>'
        }
      },
      grid: {
        containLabel: true
      },
      yAxis: {
        type: 'category',
        inverse: true,
        triggerEvent: true,
        axisLabel: {
          interval: 0,
          formatter: (name: string) => {
            return this.identity().stats.identities[name].name;
          },
        },
      },
      xAxis: {
        //type: 'value'
      }
    }

  }

  setIdentityYearsOptions() {
    const series = [];
    const limits = this.getYearsLimits(this.identityInTime().tenant?.buckets);
    if (this.identityInTime().recipient?.years) {
      const d = this.identityInTime().recipient.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'jako adresat',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: d.map((c: JSONFacet) => [c.val, c.count])
      });
    }
    if (this.identityInTime().author?.years) {
      const d = this.identityInTime().author.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'jako autor',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: d.map((c: JSONFacet) => [c.val, c.count])
      });
    }
    this.loading.set(false);

    this.identityYearsChartOptions = {
      tooltip: {
        trigger: 'axis',
        position: function (pt: any) {
          return [pt[0], '10%'];
        }
      },
      title: {
        left: 'center',
        text: this.identity()?.stats?.identities[this.nameInTime()]?.name
      },
      grid: {
        left: 30,
        right: 30,
        top: 30
      },
      xAxis: {
        type: 'category',
      },
      yAxis: {
        type: 'value',
      },
      legend: {
        show: true,
        bottom: 10,
      },
      series: series

    };
  }


}
