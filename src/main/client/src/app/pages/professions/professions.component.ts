import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, effect, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Tenant, AppState } from '../../app-state';
import { AppService } from '../../app.service';
import { YearsChartComponent } from '../../components/years-chart/years-chart.component';
import { JSONFacet } from '../../shared/facet';
import { Letter } from '../../shared/letter';

import * as echarts from 'echarts/core';
import { EChartsOption, ECharts } from 'echarts'; import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { GraphChart, PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout } from "echarts/features";
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';

echarts.use([CanvasRenderer, PieChart, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-professions',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule, MatCardModule,
    MatFormFieldModule, MatSelectModule, MatListModule, MatExpansionModule,
    MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent
  ],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './professions.component.html',
  styleUrl: './professions.component.scss'
})
export class ProfessionsComponent {
  loading: boolean;
  invalidTenant: boolean;
  solrResponse: any;
  limits: [number, number];
  tenants: Tenant[] = [];
  graphOptions: EChartsOption = {};
  graphChart: ECharts;


  pieOptions: EChartsOption = {};
  pieChart: ECharts;

  graphData: {
    categories: { name: string }[],
    links: {
      source: string,
      target: string
    }[],
    nodes: {
      category: number,
      id: string,
      name: string
      symbolSize: number
      value: number
    }[]
  }

  professions_author: JSONFacet[];
  professions_recipient: JSONFacet[];
  professions_mentioned: JSONFacet[];

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
    // this.translation.onLangChange.subscribe(() => { this.getData(true) });
    this.state.currentView = this.state.views.find(v => v.route === 'professions');
    if (this.tenants.length > 0) {
      this.limits = this.state.getTenantsRange();
      this.getData(true);
    }
  }

  onGraphChartInit(e: any) {
    this.graphChart = e;
  }

  onPieChartInit(e: any) {
    this.pieChart = e;
  }

  clickTenant(t: Tenant) {
    this.state.setSelectedTenants();
    this.router.navigate([], {queryParams: {tenant:this.state.tenants.filter(t => t.selected).map(t => t.val).toString()}});
  }

  changeTenant() {
    this.limits = this.state.getTenantsRange();
    this.getData(true);
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  showNode(identity: JSONFacet, category: string) {
    const idx = this.graphData.nodes.findIndex(n => n.id === identity.val + '_' + category);
    // currentIndex = (currentIndex + 1) % dataLen;
    this.graphChart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: idx
    });
    this.graphChart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: idx
    });
  }

  hideNode() {
    this.graphChart.dispatchAction({
      type: 'hideTip'
    });
    this.graphChart.dispatchAction({
      type: 'downplay'
    });

  }

  getData(setResponse: boolean) {
    this.loading = true;
    this.invalidTenant = false;
    const p: any = {};
    p.tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.tenant_date_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits.toString();
    p.lang = this.translation.currentLang;
    if (!setResponse) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }
    this.service.getProfessions(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (resp.response.numFound === 0) {
        this.invalidTenant = true;
        this.loading = false;
        return;
      }
      if (setResponse) {
        const ts: JSONFacet[] = resp.facets.tenants.buckets;
        this.state.tenants.forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });
        // if (!this.state.tenant().available) {
        //   // this.state.tenant.set(null);
        //   this.loading = false;
        //   this.invalidTenant = true;
        //   return;
        // }
        this.solrResponse = resp;
      }
      this.professions_author = resp.facets.professions_author ? resp.facets.professions_author.buckets : null;
      this.professions_recipient = resp.facets.professions_recipient ? resp.facets.professions_recipient.buckets : null;
      // this.professions_mentioned = resp.facets.professions_mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setPieChart() {
    const data: any[] = [];
    this.professions_author.forEach((p: JSONFacet) => {
      data.push({
        id: p.val,
        name: p.val,
        value: p.count
      })
    });

    this.pieOptions = {
      title: {
        show: true,
        text: 'Professions',
        left: 'center'
      },
      legend: {
        type: data.length > 45 ? 'scroll' : 'plain',
        orient: 'vertical',
        right: 10,
        data: data.map(a => a.name),
        formatter: name => {
          var series: any = this.pieChart.getOption()['series'];
          var value = series[0].data.filter((row:any) => row.name === name)[0].value
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
          type: 'pie',
          radius: '55%',
          center: ['30%', '50%'],
          selectedMode: 'single',
          data: data
        }
      ]
    }
  }

  processResponse() {

    if (this.solrResponse.response.numFound === 0) {
      return;
    }
    this.setPieChart();
    const categories = [{ name: 'author' }, { name: 'recipient' }];
    const links: any[] = [];
    const nodes: any[] = [];
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    const maxSize = 60;
    const minSize = 10;
    const maxCount: number = Math.max(
      this.professions_author[0].count,
      this.professions_recipient[0].count);
    this.professions_author.forEach((identity: JSONFacet) => {
      nodes.push({
        // id: identity.id + '',
        id: identity.val + '_author',
        name: identity.val,
        value: identity.count,
        category: 'author',
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: Math.random() * w,
        y: Math.random() * h
      })
    });
    this.professions_recipient.forEach((identity: JSONFacet) => {
      nodes.push({
        // id: identity.id + '',
        id: identity.val + '_recipient',
        name: identity.val,
        value: identity.count,
        category: 'recipient',
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: Math.random() * w,
        y: Math.random() * h
      })
    });

    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.identities) {
        const a = letter.identities.find(i => i.role === 'author').professions;
        const r = letter.identities.find(i => i.role === 'recipient').professions;
        if (a && r) {
          a.forEach(pa => {
            r.forEach(pr => {
              const id = pa.id + '_' + pr.id;
              const link = links.find(l => l.id === id);
              if (!link) {
                links.push({
                  id: id,
                  source: pa[this.translation.currentLang] + '_author',
                  target: pr[this.translation.currentLang] + '_recipient',
                  label: pa[this.translation.currentLang] + ' > ' + pr[this.translation.currentLang],
                  count: 1
                });
              } else {
                link.count++
              }
            });
          });
        }

      }
    });

    this.graphData = {
      categories,
      links,
      nodes
    };

    // console.log(this.graphData)
    this.graphOptions = {
      title: {
        show: true,
        text: 'Korespondenční vztahy mezi různými profesními skupinami',
        left: 'center'
      },
      tooltip: {
        formatter: (params: any) => {
          return params.dataType === 'edge' ?
            `${params.data.label} (${params.data.count})` :
            params.name
        }
      },
      legend: [
        {
          bottom: 10,
          // selectedMode: 'single',
          data: this.graphData.categories.map(function (a) {
            return a.name;
          })
        }
      ],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: 'Identities',
          type: 'graph',
          legendHoverLink: false,
          layout: 'none',
          data: this.graphData.nodes,
          links: this.graphData.links,
          categories: this.graphData.categories,
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [2, 6],

          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}'
          },
          labelLayout: {
            hideOverlap: true
          },
          scaleLimit: {
            min: 0.4,
            max: 2
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          }

        }
      ]
    };
  }
}
