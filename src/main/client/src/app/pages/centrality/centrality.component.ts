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
import { identity } from 'rxjs';

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-centrality',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent
  ],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './centrality.component.html',
  styleUrl: './centrality.component.scss'
})
export class CentralityComponent {


  loading: boolean;
  solrResponse: any;
  limits: [number, number];
  tenant: Tenant;
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

  // authors: JSONFacet[];
  recipients: JSONFacet[];
  mentioned: JSONFacet[];
  
  selectedRecipients: string[] = [];

  colors = [
    "#d87c7c",
    "#919e8b",
    "#d7ab82",
    "#6e7074",
    "#61a0a8",
    "#efa18d",
    "#787464",
    "#cc7e63",
    "#724e58",
    "#4b565b"
  ];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService
  ) {
    effect(() => {
      this.tenant = this.state.tenant();
      if (this.tenant) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {
    this.state.tenants.forEach(t => {t.available = true});
    if (this.tenant) {
      this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
      this.getData(true);
    }
  }

  onGraphChartInit(e: any) {
    this.graphChart = e;
  }

  changeTenant() {
    this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
    this.selectedRecipients = [];
    this.getData(true);
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  clickRecipient(k: JSONFacet) {
    k.selected = !k.selected;
    this.selectedRecipients = this.recipients.filter(k => k.selected).map(k => k.val);
    this.getData(true);
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
    const p: any = {};
    p.tenant = this.tenant.val;
    p.recipient = this.selectedRecipients;
    p.date_range = this.limits.toString();
    p.tenant_date_range = this.tenant.date_year_min + ',' + this.tenant.date_year_max;
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
      
      this.recipients = resp.facets.identity_recipient.buckets;

      this.recipients.forEach(k => {
        k.selected = this.selectedRecipients.includes(k.val);
      });

      this.mentioned = resp.facets.identity_mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setPosition(h: number, w: number, count: number, maxCount: number): { x: number, y: number } {
    let x = Math.random() * w,
      y = Math.random() * h;

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = ((maxCount - count) / (maxCount - 1));
    const angle = Math.random() * 2 * Math.PI;
    x = Math.cos(angle) * radius * centerX + centerX;
    y = Math.sin(angle) * radius * centerY + centerY;

    return { x, y }
  }

  processResponse() {
    const categories = [{ name: 'mentioned' }];
    const links: any[] = [];
    const nodes: any[] = [];
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    const maxSize = 60;
    const minSize = 10;
    let maxCount: number = Math.max(
      this.recipients[0].count);
    if (this.mentioned[0]) {
      maxCount = this.mentioned[0].count;
    }
    this.mentioned.forEach((identity: JSONFacet, index: number) => {
      const pos = this.setPosition(h, w, identity.count, maxCount);
      nodes.push({
        // id: identity.id + '',
        id: identity.val + '_mentioned',
        name: identity.val,
        value: identity.count,
        category: 'mentioned',
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: pos.x,
        y: pos.y,
        itemStyle: {
          color: this.colors[index % this.colors.length]
        }

      })
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
        text: this.translation.instant('field.mentioned'),
        // top: 'bottom',
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
          show: false,
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
