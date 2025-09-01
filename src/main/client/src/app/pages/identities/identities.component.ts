import { DOCUMENT } from '@angular/common';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { AppConfiguration } from '../../app-configuration';
import { FacetsComponent } from "../../components/facets/facets.component";
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-identities',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, MatProgressBarModule, MatExpansionModule, MatFormFieldModule, MatSelectModule, MatListModule, MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent, FacetsComponent, LettersInfoComponent],
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
  limits: [Date, Date];
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
    private _ngZone: NgZone,
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

    this.graphChart.on('click', (params: any) => {
      if (params.dataType === 'node'){
        if (params.data.category === 'mentioned') {
          this.mentionedLabel(params.data.name);
        } else if (params.data.category === 'authors') {
          this.authorLabel(params.data.name);
        } else if (params.data.category === 'recipients') {
          this.recipientLabel(params.data.name);
        } 
      }
    })
  }

  
  infoContent: string;
  infoHeader: string;
  infoData: any[];
  infoFields: string[];

  closeInfo() {
    this.infoContent = null;
    this.infoHeader = null;
  }

  authorLabel(identity: string) {
    this._ngZone.run(() => {
      this.infoData = this.solrResponse.response.docs.filter((doc: any) => doc.identity_author?.includes(identity));
      this.infoFields = ['letter_id', 'identity_recipient', 'date_year', 'action'];
      this.infoHeader = `${identity} wrote letters to:`;
      this.state.showInfo.set(true);
    });
  }

  recipientLabel(identity: string) {
    this._ngZone.run(() => {
      this.infoData = this.solrResponse.response.docs.filter((doc: any) => doc.identity_recipient?.includes(identity));
      this.infoFields = ['letter_id', 'identity_author', 'date_year', 'action'];
      this.infoHeader = `${identity} received letters from:`;
      this.state.showInfo.set(true);
    });
  }

  mentionedLabel(identity: string) {
    this._ngZone.run(() => {
      this.infoData = this.solrResponse.response.docs.filter((doc: any) => doc.identity_mentioned?.includes(identity));
      this.infoFields = ['letter_id', 'identity_author', 'identity_recipient', 'date_year', 'action'];
      this.infoHeader = `${identity} is mentioned in:`;
      this.state.showInfo.set(true);
    });
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

  usedFacets: {field: string, value: string}[] = [];
  onFiltersChanged(usedFacets: {field: string, value: string}[]) {
    this.usedFacets = usedFacets;
    this.getData(true);
  }

  changeLimits(limits: [Date, Date]) {
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

  showNode(e: {field: string, value: string}) {
    if (e.field === 'mentioned') {
      return;
    }
    const idx = this.graphData.nodes.findIndex(n => n.id === e.value);
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
    p.tenant_date_range = this.state.getTenantsRangeISO().toString();
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    if (!setResponse) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }
    this.state.addFilters(p, this.usedFacets);
    this.service.getIdentities(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
      }
      this.authors = resp.facets.authors.buckets;
      this.recipients = resp.facets.recipients.buckets;
      this.mentioned = resp.facets.mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0].getFullYear() && n <= this.limits[1].getFullYear();
  }

  setPosition(id: string) {
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    if (!this.positions[id]) {
      this.positions[id] = { x: Math.random() * w, y: Math.random() * h }
    }
    return this.positions[id];
  }

  getNodeSymbol(dist: number) {
    if (dist > .8) {
      return 'image://assets/img/pie8515.png';
    } else if (dist > .7) {
      return 'image://assets/img/pie7525.png';
    } else if (dist > .4) {
      return 'image://assets/img/pie5050.png';
    } else if (dist > .2) {
      return 'image://assets/img/pie2575.png';
    } else {
      return 'image://assets/img/pie1585.png';
    }
    
  }

  processResponse() {
    const categories = [{
      name: 'authors', itemStyle: {
        color: this.config.colors['author']
      }
    }, {
      name: 'recipients', itemStyle: {
        color: this.config.colors['recipient']
      }
    } 
    // {
    //   name: 'mentioned', itemStyle: {
    //     color: this.config.colors['mentioned']
    //   }
    // }
  ];
    const links: any[] = [];
    const nodes: any[] = [];
    const maxSize = 60;
    const minSize = 10;
    let maxCount = Math.max(...this.authors.map(r => r.count), ...this.recipients.map(r => r.count));


    this.authors.forEach((identity: JSONFacet) => {
      const pos = this.setPosition(identity.val);
      nodes.push({
        id: identity.val + '',
        // id: identity.val + '_author',
        name: identity.val,
        value: identity.count,
        authorCount: identity.count,
        label: identity.val + '<br/>author: ' + identity.count,
        category: 'authors',
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
        // const red = dist * (255 - 6) + 6;
        // const green = dist * 40 + 120;
        // const blue = 0;
       //node.itemStyle.color = `rgb(${red},${green},${blue})`;
        node.symbolSize = maxSize * (node.value + identity.count) / maxCount + minSize;
        node.symbol = this.getNodeSymbol(dist);
        node.recipientCount = identity.count;
        node.label = node.label + '<br/>recipient: ' + identity.count;
      } else {
        nodes.push({
          id: identity.val + '',
          // id: identity.val + '_recipient',
          name: identity.val,
          value: identity.count,
          recipientCount: identity.count,
          label: identity.val + '<br/>recipient: ' + identity.count,
          category: 'recipients',
          symbolSize: maxSize * identity.count / maxCount + minSize,
          x: pos.x,
          y: pos.y,
          itemStyle: {
            color: this.config.colors['recipient']
          }
        })
      }
    });

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
            params.data.label
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
}
