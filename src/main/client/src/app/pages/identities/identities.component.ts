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


import { EChartsOption, ECharts } from 'echarts';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Letter } from '../../shared/letter';
import { JSONFacet } from '../../shared/facet';
import { LabelLayout } from "echarts/features";
import { MatExpansionModule } from '@angular/material/expansion';
import { AppConfiguration } from '../../app-configuration';

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-identities',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule, MatExpansionModule,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent
  ],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './identities.component.html',
  styleUrl: './identities.component.scss'
})
export class IdentitiesComponent {


  loading: boolean;
  running: boolean;
  solrResponse: any;
  limits: [number, number];
  tenants: Tenant[] = [];
  graphOptions: EChartsOption = {};
  graphChart: ECharts;

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

  authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];

  positions: { [id: string]: { x: number, y: number } } = {};

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
    private config: AppConfiguration,
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
    this.state.tenants.forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'identities');
    if (this.tenants.length > 0) {
      this.limits = this.state.getTenantsRange();
      this.getData(true);
    }
  }

  onGraphChartInit(e: any) {
    this.graphChart = e;
  }

  clickTenant(t: Tenant) {
    this.state.setSelectedTenants();
    this.router.navigate([], {queryParams: {tenant:this.state.tenants.filter(t => t.selected).map(t => t.val).toString()}});
  }

  changeTenant() {
    this.limits = this.state.getTenantsRange();
    //this.selectedKeywords = [];
    this.getData(true);
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  changeRunning(r: boolean) {
    this.running = r;
    this.graphChart.setOption({series: [
            {
              animation: !this.running
            }
          ]});
  }

  showNode(identity: JSONFacet, category: string) {
    //const idx = this.graphData.nodes.findIndex(n => n.id === identity.val + '_' + category);
    const idx = this.graphData.nodes.findIndex(n => n.id === identity.val);
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
    const p: any = {};
    p.tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.tenant_date_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits.toString();
    if (!setResponse) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }
    this.service.getIdentities(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
      }
      this.authors = resp.facets.identity_author.buckets;
      this.recipients = resp.facets.identity_recipient.buckets;
      this.mentioned = resp.facets.identity_mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setPosition(id: string) {
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    if (!this.positions[id]) {
      this.positions[id] = { x: Math.random() * w, y: Math.random() * h }
    }
    return this.positions[id];
  }

  processResponse() {
    const categories = [{ name: 'author' }, { name: 'recipient' }, { name: 'mentioned' }];
    const links: any[] = [];
    const nodes: any[] = [];
    const maxSize = 60;
    const minSize = 10;
    let maxCount = Math.max(...this.authors.map(r => r.count), ...this.recipients.map(r => r.count));

    // const maxCount: number = Math.max(
    //   this.authors[0].count,
    //   this.recipients[0].count);
    this.authors.forEach((identity: JSONFacet) => {
      const pos = this.setPosition(identity.val);
      nodes.push({
        id: identity.val + '',
        // id: identity.val + '_author',
        name: identity.val,
        value: identity.count,
        category: 'author',
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: pos.x,
        y: pos.y,

        itemStyle: {
          color: this.config.colors['author']
        }
      })
    });
    this.recipients.forEach((identity: JSONFacet) => {
      const pos = this.setPosition(identity.val);
      const node = nodes.find(n => n.id === identity.val);
      if (node) {
        //  const green = identity.count / (node.value + identity.count) * 255;
        const dist = node.value / (node.value + identity.count);
        const red = dist * (255 - 6) + 6;
        const green = dist * 40 + 120;
        const blue = 0;
        node.itemStyle.color = `rgb(${red},${green},${blue})`;
        node.symbolSize = maxSize * (node.value + identity.count) / maxCount + minSize;
      } else {
        nodes.push({
          id: identity.val + '',
          // id: identity.val + '_recipient',
          name: identity.val,
          value: identity.count,
          category: 'recipient',
          symbolSize: maxSize * identity.count / maxCount + minSize,
          x: pos.x,
          y: pos.y,

          itemStyle: {
            color: this.config.colors['recipient']
          }
        })
      }
    });
    // this.mentioned.forEach((identity: JSONFacet) => {
    //   nodes.push({
    //     // id: identity.id + '',
    //     id: identity.val + '_mentioned',
    //     name: identity.val,
    //     value: identity.count,
    //     category: 'mentioned',
    //     symbolSize: maxSize * identity.count / maxCount + minSize,
    //     x: Math.random() * w,
    //     y: Math.random() * h
    //   })
    // });

    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.identities) {
        const a = letter.identities.find(i => i.role === 'author');
        const r = letter.identities.find(i => i.role === 'recipient');
        const id = a.id + '_' + r.id;
        const link = links.find(l => l.id === id);
        if (!link) {
          links.push({
            id: id,
            // source: a.name + '_author',
            // target: r.name + '_recipient',
            source: a.name,
            target: r.name,
            label: a.name + ' > ' + r.name,
            count: 1
          });
        } else {
          link.count++
        }
      }
    });

    this.graphData = {
      categories,
      links,
      nodes
    };

    //console.log(this.graphData)
    this.graphOptions = {
      title: {
        show: true,
        text: 'Vztahy mezi jednotlivými pisateli a příjemci dopisů',
        left: 'center',
        top: 10
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
          show: false,
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
