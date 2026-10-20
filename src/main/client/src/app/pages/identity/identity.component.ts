import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, PRIMARY_OUTLET, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
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
import { AppState } from '../../app-state';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppConfiguration } from '../../app-configuration';


echarts.use([BarChart, LineChart, CanvasRenderer, LegendComponent, TooltipComponent, PieChart, DatasetComponent,
  GridComponent, TitleComponent]);
echarts.registerLocale("CZ", langCZ)

@Component({
  selector: 'app-identity',
  imports: [TranslateModule, RouterLink, NgxEchartsModule, NgxEchartsDirective, MatProgressBarModule, MatButtonModule, MatIconModule],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './identity.component.html',
  styleUrl: './identity.component.scss',
})
export class IdentityComponent {

  identityId = signal('');
  readonly router = inject(Router);
  private translation = inject(TranslateService);
  private activatedRoute = inject(ActivatedRoute);
  private config = inject(AppConfiguration);
  private state = inject(AppState);

  readonly source = this.getSource();
  readonly searchUrl = this.router.createUrlTree(['/'], {
    queryParams: this.source?.url.queryParams ?? this.activatedRoute.snapshot.queryParams,
  });
  readonly language = toSignal(this.translation.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.translation.currentLang || 'cs',
  });

  identityRes: any = httpResource(() => this.identityId() ? ({
    url: `/api/data/get_identity`,
    method: 'GET',
    params: {
      'id': this.identityId()
    }
  }) : undefined);
  identity = computed<any>(() => this.identityRes.hasValue() ? this.identityRes.value() : undefined);

  nameInTime = signal('');
  identityInTimeRes: any = httpResource(() => this.identityId() && this.nameInTime() ? ({
    url: `/api/data/identity_in_time`,
    method: 'GET',
    params: {
      'id': this.identityId(), 'id2': this.nameInTime()
    }
  }) : undefined);
  identityInTime = computed<any>(() => this.identityInTimeRes.hasValue() ? this.identityInTimeRes.value() : undefined);

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

  loading = computed(() => this.identityInTimeRes.isLoading());

  constructor() {
    this.activatedRoute.params.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.nameInTime.set('');
      this.excludedTenants = [];
      this.identityId.set(params['id']);
    });

    effect(() => {
      const identity = this.identity();
      if (identity) {
        this.setYearsOptions();
        this.setTenantsPieChart();
        this.setIdentitiesPieChart();
      }
    });

    effect(() => {
      const i = this.identityInTime();
      if (i) {
        this.setIdentityYearsOptions();
      }
    });
  }

  search(field: string) {

    this.state.usedFacets.set([{ field, value: this.identity()?.name, op: '' }]);
    this.router.navigate(['timeline'], { queryParams: { s: this.state.encodeState() } });

  }

  private getSource() {
    const previous = this.router.currentNavigation()?.previousNavigation ?? this.router.lastSuccessfulNavigation();
    const url = previous?.finalUrl ?? previous?.extractedUrl;
    const segments = url?.root.children[PRIMARY_OUTLET]?.segments.map(segment => segment.path) ?? [];
    const view = this.state.views.find(view => view.route && view.route === segments.join('/'));
    const label = view ? `home.${view.header}.header` :
      segments[0] === 'letter' ? 'letter.detail' :
      segments[0] === 'catalog' ? 'field.tenant' : null;
    return label && url ? { label, url } : null;
  }

  identityType(value: string): string {
    this.language();
    const key = `identity_detail.types.${value}`;
    const translated = this.translation.instant(key);
    return translated === key ? value : translated;
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
        this.nameInTime.set(params.value);
      } else if (params.componentType === 'series') {
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

    (this.identity().stats?.tenant?.buckets ?? []).forEach((p: JSONFacet) => {
      let i = 0;
      if (p.val) {
        data.push({
          id: p.val,
          name: p.val,
          value: p.count,
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
          const value = data.find(row => row.name === name)?.value ?? 0;
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
    const limits = this.getYearsLimits((this.identity().stats?.tenant?.buckets ?? []));
    if (this.identity().stats?.author?.years) {

      const d = this.identity().stats.author.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Author',
        type: this.yearsChartType + '',
        smooth: true,
        symbol: 'none',
        color: this.config.colors['author'],
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
    if (this.identity().stats?.recipient?.years) {

      const d = this.identity().stats.recipient.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Recipient',
        type: this.yearsChartType + '',
        smooth: true,
        color: this.config.colors['recipient'],
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
    if (this.identity().stats?.mentioned?.years) {

      const d = this.identity().stats.mentioned.years.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
      series.push({
        name: 'Mentioned',
        type: this.yearsChartType + '',
        smooth: true,
        color: this.config.colors['mentioned'],
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
    if (this.identity().stats?.author?.recipients) {
      (this.identity().stats?.author?.recipients?.buckets ?? []).forEach((p: JSONFacet) => {
        let i = 0;
        if (p.val) {
          recipients.unshift([p.count, p.val]);
        }
      });
    }

    const authors: any[] = [];
    if (this.identity().stats?.recipient?.authors)
      (this.identity().stats?.recipient?.authors?.buckets ?? []).forEach((p: JSONFacet) => {
        let i = 0;
        if (p.val) {
          authors.push([p.count, p.val]);
        }
      });

    const dimensions = [...new Set([
      'names',
      ...(this.identity().stats?.recipient?.authors?.buckets ?? []).map((c: JSONFacet) => c.val),
      ...(this.identity().stats?.author?.recipients?.buckets ?? []).map((c: JSONFacet) => c.val)])];

    const source: any[] = [];
    (this.identity().stats?.author?.recipients?.buckets ?? []).forEach((c: JSONFacet) => {
      const s: any = {names: c.val};
      s['recipient']= c.count;
      source.push(s)
    });
    //const s2: any = {names: 'author'};
    (this.identity().stats?.recipient?.authors?.buckets ?? []).forEach((c: JSONFacet) => {
      const s: any = {names: c.val};
      s['author']= c.count;
      source.push(s)
    });

    const dataset = {
        dimensions: ['names', 'author', 'recipient'],
        source: source
      };

    //this.identitiesPieHeight = Math.max(recipients.length, authors.length) * 30 + 'px';
    this.identitiesPieHeight = Math.max(300, dimensions.length * 30) + 'px';

    this.identitiesBarOptions = {

      dataset: dataset,
      series: [{
        type: 'bar', seriesLayoutBy: 'row',
          itemStyle: this.state.getBarItemStyle(this.config.colors['author'], this.config.colors['author1'], true)
        },
           {
            type: 'bar', seriesLayoutBy: 'row' ,
          itemStyle: this.state.getBarItemStyle(this.config.colors['recipient'], this.config.colors['recipient1'], true)
          }
          ],

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
          return params.seriesName + '<br/>' + (this.identity().stats?.identities?.[params.name]?.name ?? params.name) + ' <strong>' + params.value[0] + '</strong>'
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
            return this.identity().stats?.identities?.[name]?.name ?? name;
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
        color: this.config.colors['recipient'],
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
        color: this.config.colors['author'],
        smooth: true,
        symbol: 'none',
        data: d.map((c: JSONFacet) => [c.val, c.count])
      });
    }

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
