import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, effect, Inject, NgZone } from '@angular/core';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { AppConfiguration } from '../../app-configuration';
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-centrality',
  imports: [TranslateModule, FormsModule, CommonModule,
    NgxEchartsDirective, MatProgressBarModule, MatExpansionModule,
    MatFormFieldModule, MatSelectModule, MatListModule,
    MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent, LettersInfoComponent],
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

  authors: JSONFacet[];
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

  infoContent: string;
  infoHeader: string;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
    private router: Router,
    private translation: TranslateService,
    private config: AppConfiguration,
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
    this.state.tenants.forEach(t => { t.available = true });
    if (this.tenant) {
      this.limits = [this.tenant.date_year_min, this.tenant.date_year_max];
      this.getData(true);
    }
  }

  onGraphChartInit(e: any) {
    this.graphChart = e;

    this.graphChart.on('click', (params: any) => {
      if (params.dataType === 'node' && params.data.category === 'mentioned') {
        this.mentionedLabel(params.data.name);
      }
    })
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
    this.closeInfo();
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

      this.authors = resp.facets.identity_author.buckets;
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

  setPosition(h: number, w: number, count: number, maxCount: number): { x: number, y: number, radius: number, angle: number } {
    let x = Math.random() * w,
      y = Math.random() * h;

    const centerX = w / 2;
    const centerY = h / 2;
    let radius = ((maxCount - count) / (maxCount - 1));
    radius = radius + (Math.random() * .1 * radius);
    const angle = Math.random() * 2 * Math.PI;
    x = Math.cos(angle) * radius * centerX + centerX;
    y = Math.sin(angle) * radius * centerY + centerY;

    return { x, y, radius, angle }
  }

  mentionedLabel(identity: string) {
    this._ngZone.run(() => {
      const letters = this.solrResponse.response.docs.filter((doc: any) => doc.identity_mentioned?.includes(identity));

      let popup = '';
      letters.forEach((letter: Letter) => {
        popup += `<div>${letter.identity_author} -> ${letter.identity_recipient}. ${letter.date_year}`;
        if (letter.keywords_category_cs?.length > 0) {
          popup += ` (${letter.keywords_category_cs.join(', ')})</div>`;
        } else if (letter.keywords_cs?.length > 0) {
          popup += ` (${letter.keywords_cs.join(', ')})</div>`;
        } else {
          popup += `</div>`;
        }

        this.infoHeader = `${identity} is mentioned in:`;
        this.infoContent = popup;
      });
    });
  }

  processResponse() {
    const categories = [{ name: 'mentioned' }, { name: 'recipients' }, { name: 'authors' }];
    const links: any[] = [];
    const nodes: any[] = [];
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    const maxSize = 60;
    const minSize = 10;
    let maxCount = Math.max(
      ...this.mentioned.filter(i => !this.config.tenants_identities[this.tenant.val].includes(i.val)).map(r => r.count),
      ...this.recipients.filter(i => !this.config.tenants_identities[this.tenant.val].includes(i.val)).map(r => r.count),
      ...this.authors.filter(i => !this.config.tenants_identities[this.tenant.val].includes(i.val)).map(r => r.count)
    );

    // if (this.mentioned[0]) {
    //   maxCount = Math.max(...this.mentioned.map(r => r.count));
    // }
    this.mentioned.forEach((identity: JSONFacet, index: number) => {
      const pos = this.setPosition(h, w, identity.count, maxCount);
      nodes.push({
        // id: identity.id + '',
        id: identity.val + '_mentioned',
        name: identity.val,
        value: identity.count,
        //label: this.mentionedLabel(identity.val);
        category: 'mentioned',
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: pos.x,
        y: pos.y,
        // radiusAxis: pos.radius,
        // angleAxis: pos.angle,
        // itemStyle: {
        //   color: this.colors[index % this.colors.length]
        // }

      })
    });
    this.recipients.forEach((identity: JSONFacet, index: number) => {
      if (!this.config.tenants_identities[this.tenant.val].includes(identity.val)) {
        const pos = this.setPosition(h, w, identity.count, maxCount);
        nodes.push({
          // id: identity.id + '',
          id: identity.val + '_recipient',
          name: identity.val,
          value: identity.count,
          category: 'recipients',
          symbolSize: maxSize * identity.count / maxCount + minSize,
          x: pos.x,
          y: pos.y,
          // radiusAxis: pos.radius,
          // angleAxis: pos.angle,
          // itemStyle: {
          //   color: this.colors[index % this.colors.length]
          // }

        })
      }
    });
    this.authors.forEach((identity: JSONFacet, index: number) => {
      if (!this.config.tenants_identities[this.tenant.val].includes(identity.val)) {
        const pos = this.setPosition(h, w, identity.count, maxCount);
        nodes.push({
          // id: identity.id + '',
          id: identity.val + '_author',
          name: identity.val,
          value: identity.count,
          category: 'authors',
          symbolSize: maxSize * identity.count / maxCount + minSize,
          x: pos.x,
          y: pos.y,
          // radiusAxis: pos.radius,
          // angleAxis: pos.angle,
          // itemStyle: {
          //   color: this.colors[index % this.colors.length]
          // }

        })
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
        text: this.translation.instant('Centralita'),
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
          show: true,
          bottom: 5,
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

  closeInfo() {
    this.infoContent = null;
    this.infoHeader = null;
  }
}
