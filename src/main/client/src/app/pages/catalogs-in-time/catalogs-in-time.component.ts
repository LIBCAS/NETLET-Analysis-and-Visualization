import { Component, signal, effect, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AngularSplitModule } from "angular-split";
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { EChartsOption, ECharts } from 'echarts';
import { FacetFields, JSONFacet } from '../../shared/facet';
import { BarChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent, DataZoomComponent, ToolboxComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { AppConfiguration } from '../../app-configuration';
import { AppState } from '../../app-state';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FacetsComponent } from '../../components/facets/facets.component';
import { AppService } from '../../app.service';
echarts.use([BarChart, CanvasRenderer, LegendComponent, ToolboxComponent, DataZoomComponent,
  TooltipComponent, GridComponent, TitleComponent]);

@Component({
  selector: 'app-catalogs-in-time',
  imports: [TranslateModule, AngularSplitModule, NgxEchartsDirective,
    FacetsComponent,
    MatProgressBarModule, MatIconModule, MatButtonModule],
  templateUrl: './catalogs-in-time.component.html',
  styleUrl: './catalogs-in-time.component.scss',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class CatalogsInTimeComponent {

  private translation = inject(TranslateService);
  private service = inject(AppService);
  private config = inject(AppConfiguration);
  public state = inject(AppState);

  facets = signal<FacetFields>({});
  loading = signal(false);
  count: number;


  yearsChartOptions: EChartsOption | any;
  yearsChart: ECharts;

  constructor() {

    effect(() => {
      const sc = this.state.stateChanged();
      if (sc > 0) {
        this.getData();
      } else {
        this.loading.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.getData();
  }

  onYearsChartInit(e: any) {
    this.yearsChart = e;
  }

  onFiltersChanged(usedFacets: { field: string, value: string }[]) {
    this.getData();
  }

  getData() {
    this.loading.set(true);
    this.facets.set({});
    const p: any = {};
    p.tenant = this.state.selectedTenants().map(t => t.val);
    p.rows = 0;
    this.state.addFilters(p);


    this.service.getCatalogsInTime(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }

      //this.facets.set(resp.years);
      this.count = resp.count;

      // if (resp.facets['tenants']?.buckets.length > 0 && this.state.selectedTenants().length === 0) {
      //   this.state.tenants.update(ts => {
      //     ts.forEach(t => { t.selected = this.facets()['tenants']?.buckets.findIndex(b => b.val === t.val) > -1 });
      //     return [...ts]
      //   });
      // }
      this.setYearsChart(resp.tenant);
      this.loading.set(false);
    });
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
    const series: any[] = [];
    //const limits = this.getYearsLimits(facet.buckets);

    let maxCount = 0;facet.buckets.forEach((t: JSONFacet) => {
      
      t['years'].buckets.forEach((b: JSONFacet) => {
        maxCount = Math.max(maxCount, b.count);
      });
    });

    //const d = facet.buckets.filter((c: JSONFacet) => this.inLimits(c, limits));
    facet.buckets.forEach((t: JSONFacet) => {
          series.push({
            name: t.val,
            //color: this.config.tenant_colors[t.val],
            type: 'line',
            smooth: false,
            symbol: 'none',
            data: t['years'].buckets.map((b: JSONFacet) => [b.val, b.count])
          });
          

    });


    this.loading.set(false);

    this.yearsChartOptions = {
      tooltip: {
        trigger: 'axis',
        position: function (pt: any) {
          return [pt[0], '10%'];
        }
      },
      title: {
        left: 'center',
        text: this.translation.instant('home.catalogs_in_time.header')
      },
      grid: {
        left: 30,
        right: 30,
        top: 30
      },
      xAxis: {
        type: 'category',
        //data: facet.buckets.map(b => b.val)
      },
      yAxis: {
        show: true,
        type: 'value',
        //interval: Math.floor(maxCount / 4),
        axisLabel: {
          showMinLabel: false
        }
      },
      legend: {
        show: true,
        orient: 'vertical',
        top: 30,
        left: 30,
      },
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: 100,
          xAxisIndex: [0,1]
        }
      ],
      series: series

    };


  }

}
