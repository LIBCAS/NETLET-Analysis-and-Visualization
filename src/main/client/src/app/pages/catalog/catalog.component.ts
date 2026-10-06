import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import L from 'leaflet';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { EChartsOption, ECharts } from 'echarts';
import { JSONFacet } from '../../shared/facet';
import { BarChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, CanvasRenderer, LegendComponent,
  TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-catalog',
  imports: [TranslateModule, LeafletModule, NgxEchartsDirective, MatProgressBarModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class CatalogComponent {

  private activatedRoute = inject(ActivatedRoute);
  private translation = inject(TranslateService);
  catalogId = signal('');

  catalogRes: any = httpResource(() => ({
    url: `/api/data/get_catalog`,
    method: 'GET',
    params: {
      'id': this.catalogId()
    }
  }));

  catalog = computed<any>(() => this.catalogRes.value());



  chartOptionsRok: EChartsOption = {};
  chartRok: ECharts;
  barColor: string;
  rokAxis: string[] = [];
  rokSeries: { value: number, itemStyle?: { color: string } }[] = [];


  authorInTime = signal('');
  identityInTimeRes: any = httpResource(() => ({
    url: `/api/data/identity_in_time`,
    method: 'GET',
    params: {
      'id2': this.authorInTime()
    }
  }));
  identityInTime = computed<any>(() => this.identityInTimeRes.value());
  identityYearsChartOptions: EChartsOption | any;
  identityYearsChart: ECharts;

  loading = signal(false);


  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.catalogId.set(params['id']);
    });

    effect(() => {
      const tenant = this.catalogRes.value();
      if (tenant) {
        setTimeout(() => {
          this.setData(tenant);
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

  setData(tenant: any) {
    this.setYearsChart(this.catalog().facets.years);
  }

  onChartRokInit(e: any) {
    this.chartRok = e;
    //this.setYearsChart(this.catalog().facets.years);
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

  setYearsChart(facet: { buckets: JSONFacet[], after: { count: number } }) {
    let maxCount = 0;
    const limits = this.getYearsLimits(this.catalog().facets.tenant.buckets);
    const d = facet.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
    this.rokSeries = d.map(c => {
      const color = c.val < '1670' ? '#155605' : (c.val < '1939' ? 'rgb(68, 110, 136)' : '#00c');
      maxCount = Math.max(maxCount, c.count)
      return {
        value: c.count, //itemStyle: { color: color }
      }
    });
    // this.rokSeries.push({
    //   value: d.after.count,
    // });

    this.rokAxis = d.map(c => c.val + '');


    this.chartOptionsRok = {

      grid: {
        // left: 0,
        // right: 0,
        top: 30,
        bottom: 25
      },
      title: {
        show: true,
        left: 'center',
        top: 8,
        text: this.translation.instant('letters_count_by_year')
      },
      tooltip: {
        trigger: 'axis',
        position: function (point, params, dom, rect, size) {
          // fixed at top
          return [point[0], '70%'];
        }
      },
      xAxis: {
        type: 'category',
        data: this.rokAxis,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisPointer: {
          z: 100
        }
      },
      yAxis: {
        show: true,
        type: 'value',
        interval: Math.floor(maxCount / 4),
        // allowDecimals: false,
        axisLabel: {
          showMinLabel: false
        }
      },
      series: [{
        name: '',
        type: 'bar',
        data: this.rokSeries,
        barCategoryGap: 0,
        color: this.barColor,

      }]
    }



  }

  onIdentityYearsChartInit(e: any) {
    this.identityYearsChart = e;
  }

  showCorrespondence(id: string) {
    this.loading.set(true);
    this.authorInTime.set(id);
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
        text: this.catalog()?.identities[this.authorInTime()]?.name
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
