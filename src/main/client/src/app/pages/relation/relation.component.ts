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
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EChartsOption, ECharts } from 'echarts';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, GridComponent, TitleComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { Tenant, AppState } from '../../app-state';
import { AppService } from '../../app.service';
import { YearsChartComponent } from '../../components/years-chart/years-chart.component';
import { JSONFacet } from '../../shared/facet';
import { Letter } from '../../shared/letter';
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";

echarts.use([CanvasRenderer, GraphChart, LegendComponent, TooltipComponent, GridComponent, TitleComponent, LabelLayout]);

@Component({
  selector: 'app-relation',
  imports: [TranslateModule, FormsModule, NgxEchartsDirective, MatProgressBarModule, MatExpansionModule, MatFormFieldModule, MatSelectModule, MatListModule, MatIconModule, MatCheckboxModule, MatRadioModule, YearsChartComponent, LettersInfoComponent],
  providers: [
    provideEchartsCore({ echarts }),
  ],
  templateUrl: './relation.component.html',
  styleUrl: './relation.component.scss'
})
export class RelationComponent {
  loading: boolean;
  solrResponse: any;
  limits: [Date, Date];
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

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private _ngZone: NgZone,
    private translation: TranslateService,
    public state: AppState,
    private service: AppService
  ) {
    effect(() => {
      this.tenant = this.state.selectedTenants()[0];
      if (this.tenant) {
        this.changeTenant();
      }
    })
  }

  ngOnInit(): void {
    this.state.tenants.forEach(t => { t.available = true });
    this.state.currentView = this.state.views.find(v => v.route === 'relation');
    if (this.tenant) {
      this.limits = [this.tenant.date_computed_min, this.tenant.date_computed_max];
      this.getData(true);
    }
  }


  infoContent: string;
  infoHeader: string;
  closeInfo() {
    this.infoHeader = null;
    this.infoContent = null;
  }

  onGraphChartInit(e: any) {
    this.graphChart = e;

    this.graphChart.on('click', (params: any) => {
      if (params.data) {
        this._ngZone.run(() => {
          const identity = params.data.name;

          this.infoContent = '';
          const letters: Letter[] = this.solrResponse.response.docs.filter((letter: Letter) => { return letter.identity_mentioned?.includes(identity) });
          this.infoHeader = 'Letters in which ' + identity + ' is mentioned (' + letters.length + ')';
          letters.forEach(letter => {
            this.infoContent += `<div>${letter.identity_author?.[0]} -> ${letter.identity_recipient?.[0]}: ${letter.date_year}</div>`;
            // if (letter.places) {
            //   const origin = letter.places.find(p => p.role === 'origin').name;
            //   const destination = letter.places.find(p => p.role === 'destination').name;
            // } else {

            // }

            // if (letter.keywords_category_cs?.length > 0) {
            //   this.infoContent += ` (${letter.keywords_category_cs.join(', ')})</div>`;
            // } else if (letter.keywords_cs?.length > 0) {
            //   this.infoContent += ` (${letter.keywords_cs.join(', ')})</div>`;
            // } else {
            //   this.infoContent += `</div>`;
            // }

          });
        });

      }
    })

  } 
  
  changeTenant() {
    this.limits = [this.tenant.date_computed_min, this.tenant.date_computed_max];
    //this.selectedKeywords = [];
    this.getData(true);
  }

  changeLimits(limits: [Date, Date]) {
    this.limits = limits;
    this.getData(false);
  }

  clickTenant(k: Tenant) {
    this.closeInfo();
    this.state.tenants.forEach(t => t.selected = false);
    // k.selected = !k.selected;
    k.selected = true;
    this.getData(true);
  }

  showNode(identity: JSONFacet, category: string) {
    const idx = this.graphData.nodes.findIndex(n => n.id === identity.val);
    //const idx = this.graphData.nodes.findIndex(n => n.id === identity.val + '_' + category);
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
    p.other_tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.date_range = this.limits[0].toISOString() + ',' + this.limits[1].toISOString();
    p.tenant_date_range = this.state.getTenantsRangeISO().toString();
    if (!setResponse) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }
    this.service.getRelation(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      if (setResponse) {
        this.solrResponse = resp;
      }
      //this.authors = resp.facets.identity_author.buckets;
      this.recipients = resp.facets.identity_recipient.buckets;
      this.mentioned = resp.facets.identity_mentioned.buckets;
      this.processResponse();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0].getFullYear() && n <= this.limits[1].getFullYear();
  }


  isDisabled(t: Tenant): boolean {
    return t.date_computed_min.getFullYear() > this.tenant.date_computed_min.getFullYear();
  }

  setPosition(h: number, w: number, count: number, maxCount: number, zone: number): { x: number, y: number, radius: number } {
    let x = Math.random() * w,
      y = Math.random() * h;

    const centerX = w / 2; // - (zone * w / 10.0);
    const centerY = h / 2;
    let radius = ((maxCount - count) / (maxCount - 1));
    radius = radius * zone + (Math.random() * .1 * radius);
    // const angle = (Math.random() * Math.PI) + (zone * Math.PI / 2.0);
    // x = Math.cos(angle) * radius * centerX + centerX;
    // y = Math.sin(angle) * radius * centerY + centerY;

    x = radius * centerX + centerX;

    return { x, y, radius }
  }

  intersection(t: Tenant): { start: number, end: number } {


    //get the range with the smaller starting point (min) and greater start (max)
    let min = (t.date_computed_min.getFullYear() < this.tenant.date_computed_min.getFullYear() ? t : this.tenant)
    let max = (min === t ? this.tenant : t)

    //min ends before max starts -> no intersection
    if (min.date_computed_max.getFullYear() < max.date_computed_min.getFullYear()) {
      return { start: 0, end: 0 }; //the ranges don't intersect
    }

    return { start: max.date_computed_min.getFullYear(), end: (min.date_computed_max.getFullYear() < max.date_computed_max.getFullYear() ? min.date_computed_max.getFullYear() : max.date_computed_max.getFullYear()) }
  }

  processResponse() {
    const categories = [{ name: this.tenant.val }];
    const other = this.state.tenants.find(t => t.selected);
    if (other) {
      categories.push({ name: other.val });
    }
    categories.push({ name: 'both' });
    const links: any[] = [];
    const nodes: any[] = [];
    const h = this.graphChart.getHeight();
    const w = this.graphChart.getWidth() - 20;
    const maxSize = 60;
    const minSize = 10;
    // let maxCount = Math.max(...this.authors.map(r => r.count), ...this.recipients.map(r => r.count));
    let maxCount = Math.max(...this.mentioned.map(r => r.count));
    // this.authors.forEach((identity: JSONFacet) => {
    //   const pos = this.setPosition(h, w, identity.count, maxCount, 1);
    //   nodes.push({
    //     // id: identity.id + '',
    //     id: identity.val + '_author',
    //     name: identity.val + ' ' + identity.count,
    //     value: identity.count,
    //     category: 'author',
    //     symbolSize: maxSize * identity.count / maxCount + minSize,
    //     angle: pos.angle,
    //     x: pos.x,
    //     y: pos.y,
    //   })
    // });
    // this.recipients.forEach((identity: JSONFacet) => {
    //   const pos = this.setPosition(h, w, identity.count, maxCount, - 1);
    //   nodes.push({
    //     // id: identity.id + '',
    //     id: identity.val + '_recipient',
    //     name: identity.val + ' ' + identity.count,
    //     value: identity.count,
    //     category: 'recipient',
    //     symbolSize: maxSize * identity.count / maxCount + minSize,
    //     angle: pos.angle,
    //     x: pos.x,
    //     y: pos.y,
    //   })
    // });
    this.recipients.forEach((identity: JSONFacet) => {
      let zone = 0;
      let category = null;

      if (identity['tenant'].buckets) {
        const tenants: JSONFacet[] = identity['tenant'].buckets;
        if (tenants.length > 1) {
          category = 'both';
        } else {
          category = tenants[0].val;
          zone = category === this.tenant.val ? -1 : 1;
        }
      }
      // const t1 = this.solrResponse.response.docs.find((letter: Letter) => { return letter.tenant === this.tenant.val && letter.identity_mentioned?.includes(identity.val)  });
      // if (t1) {
      //   category = this.tenant.val;
      //   zone = 1;
      // }
      // if (other) {
      //   const t2 = this.solrResponse.response.docs.find((letter: Letter) => { return letter.tenant === other.val && letter.identity_mentioned?.includes(identity.val) });
      //   if (t2 && t1) {
      //     category = 'both';
      //     zone = 0;
      //   } else if (t2) {
      //     category = other.val;
      //     zone = -1;
      //   }
      // }
      const pos = this.setPosition(h, w, identity.count, maxCount, zone);
      nodes.push({
        id: identity.val,
        name: identity.val,
        value: identity.count,
        category: category,
        symbolSize: maxSize * identity.count / maxCount + minSize,
        x: pos.x,
        y: pos.y,
      })
    });

    // this.solrResponse.response.docs.forEach((letter: Letter) => {
    //   if (this.inLimits(letter.date_year) && letter.identities) {
    //     const a = letter.identities.find(i => i.role === 'author');
    //     const r = letter.identities.find(i => i.role === 'recipient');
    //     const id = a.id + '_' + r.id;
    //     const link = links.find(l => l.id === id);
    //     if (!link) {
    //       links.push({
    //         id: id,
    //         source: a.name + '_author',
    //         target: r.name + '_recipient',
    //         label: a.name + ' > ' + r.name,
    //         count: 1
    //       });
    //     } else {
    //       link.count++
    //     }
    //   }
    // });

    this.graphData = {
      categories,
      links,
      nodes
    };

    // console.log(this.graphData)
    this.graphOptions = {
      title: {
        show: false,
        text: 'Identities',
        top: 'bottom',
        left: 'right'
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
