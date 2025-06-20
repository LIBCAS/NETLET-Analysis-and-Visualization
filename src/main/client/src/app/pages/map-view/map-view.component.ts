import { Component, computed, effect, Inject, input, NgZone, OnInit, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import L, { circle, CircleMarker, LatLng, latLng, LatLngBounds, Layer, LayerGroup, Map, Marker, polygon, tileLayer } from 'leaflet';
import '@elfalem/leaflet-curve';
import { CurveLatLngExpression, CurvePathDataElement } from '@elfalem/leaflet-curve';
import { AppService } from '../../app.service';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Facet, JSONFacet } from '../../shared/facet';
import { HttpParams } from '@angular/common/http';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Letter, Place } from '../../shared/letter';
import { MatIconModule } from '@angular/material/icon';
import { AppState, Tenant } from '../../app-state';
import { YearsChartComponent } from "../../components/years-chart/years-chart.component";
import { LettersInfoComponent } from "../../components/letters-info/letters-info.component";
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-map-view',
  imports: [TranslateModule, FormsModule, CommonModule,
    LeafletModule, MatCardModule, MatExpansionModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatListModule,
    MatIconModule, MatProgressBarModule, YearsChartComponent, LettersInfoComponent],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss'
})
export class MapViewComponent implements OnInit {

  loading: boolean;
  invalidTenant: boolean;
  map: Map;
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
    ],
    zoom: 4,
    center: latLng(49.879966, 16.726909)
  };

  linkColor = '#5470c6';
  activeLinkColor = '#f00';

  solrResponse: any;
  recipients: JSONFacet[];
  mentioned: JSONFacet[];

  nodeLayer: LayerGroup<CircleMarker> = new L.LayerGroup();
  linkLayer: LayerGroup<CircleMarker> = new L.LayerGroup();

  nodes: { [id: number]: { coords: [number, number], name: string } } = {};
  links: { [id: string]: { node1: [number, number], node2: [number, number], count: number, letters: Letter[] } } = {};
  limits: [number, number];

  infoContent: string;
  infoHeader: string;

  tenants: Tenant[] = [];
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _ngZone: NgZone,
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
    this.state.tenants.forEach(t => { t.available = true });
    this.linkColor = this.document.body.computedStyleMap().get('--app-color-map-link').toString();
    this.activeLinkColor = this.document.body.computedStyleMap().get('--app-color-map-link-active').toString();
  }

  onMapReady(map: Map) {
    this.map = map;
    if (this.tenants.length > 0) {
      setTimeout(() => {

        this.limits = this.state.getTenantsRange();
        this.getData(true);
      }, 10)
    }
  }

  changeTenant() {
    this.limits = this.state.getTenantsRange();
    this.getData(true);
  }

  getData(withMap: boolean) {
    this.loading = true;
    this.invalidTenant = false;
    this.closeInfo();
    if (withMap) {
      this.nodes = {};
      this.nodeLayer.clearLayers();
      this.links = {};
      this.linkLayer.clearLayers();
    }
    const p: any = {};
    p.tenant = this.state.tenants.filter(t => t.selected).map(t => t.val);
    p.tenant_date_range = this.state.getTenantsRange().toString();
    p.date_range = this.limits.toString();
    if (!withMap) {
      p.rows = 0;
    } else {
      p.rows = 10000;
    }

    this.service.getMap(p as HttpParams).subscribe((resp: any) => {
      if (!resp) {
        return;
      }
      const ts: JSONFacet[] = resp.facets.tenants.buckets;
      this.state.tenants.forEach(t => { t.available = !!ts.find(ta => ta.val === t.val) });
      // if (!this.state.tenant().available) {
      //   // this.state.tenant.set(null);
      //   this.loading = false;
      //   this.invalidTenant = true;
      //   return;
      // }
      if (resp.stats?.stats_fields.latitude) {
        const lat = resp.stats.stats_fields.latitude;
        const lon = resp.stats.stats_fields.longitude;
        this.map.fitBounds(L.latLngBounds([lat.max, lon.min], [lat.min, lon.max]))
      }
      this.recipients = resp.facets.identity_recipient ? resp.facets.identity_recipient.buckets : [];
      this.mentioned = resp.facets.identity_mentioned ? resp.facets.identity_mentioned.buckets : [];
      if (withMap) {
        this.solrResponse = resp;
        // this.setYearsChart(this.solrResponse.facet_counts.facet_ranges.date_year);
      }
      this.setMap();
      this.loading = false;
    });
  }

  inLimits(n: number): boolean {
    return n >= this.limits[0] && n <= this.limits[1];
  }

  setMap() {
    this.nodes = {};
    this.nodeLayer.clearLayers();
    this.links = {};
    this.linkLayer.clearLayers();
    this.solrResponse.response.docs.forEach((letter: Letter) => {
      if (this.inLimits(letter.date_year) && letter.places && letter.origin) {
        letter.places.forEach((place: Place) => {
          if (place.latitude && !this.nodes[place.place_id]) {
            this.nodes[place.place_id] = { coords: [place.latitude, place.longitude], name: place.name };
            const m = L.circleMarker([place.latitude, place.longitude], {
              color: '#795548',
              radius: 5,
              weight: 1
            });
            m.on('click', () => {
              this._ngZone.run(() => {
                let popup = '';
                let lettersFrom = 0;
                let lettersTo = 0;
                this.linkLayer.getLayers().forEach((layer: any) => {
                  lettersFrom += layer.options.letters.filter((l: Letter) => l.origin === place.place_id).length;
                  lettersTo += layer.options.letters.filter((l: Letter) => l.destination === place.place_id).length;
                  // letters.forEach(letter => {
                  //   popup += `<div>${letter.identity_author} -> ${letter.identity_recipient}. ${letter.date_year}`;
                  //   if (letter.keywords_category_cs?.length > 0) {
                  //     popup += ` (${letter.keywords_category_cs.join(', ')})</div>`;
                  //   } else if (letter.keywords_cs?.length > 0) {
                  //     popup += ` (${letter.keywords_cs.join(', ')})</div>`;
                  //   } else {
                  //     popup += `</div>`;
                  //   }
                  // });

                });
                this.infoContent = `<div>From: ${lettersFrom}</div><div>To: ${lettersTo}</div>`;
                this.infoHeader = `Letters from/to ${place.name}`;
              });
            });
            m.bindTooltip(place.name);
            m.addTo(this.nodeLayer);
          }
        });

        const linkId = letter.origin + '_' + letter.destination;
        const place_origin = letter.places.find(p => p.role === 'origin');
        const place_destination = letter.places.find(p => p.role === 'destination');

        if (place_origin && place_destination && place_origin.latitude && place_destination.latitude) {
          if (!this.links[linkId]) {
            this.links[linkId] = {
              node1: [place_origin.latitude, place_origin.longitude],
              node2: [place_destination.latitude, place_destination.longitude],
              count: 1,
              letters: [letter]
            };
          } else {
            this.links[linkId].count = this.links[linkId].count + 1;
            this.links[linkId].letters.push(letter);
          }
        }
      };

    });


    Object.keys(this.links).forEach(key => {
      const link = this.links[key];
      this.linkNodes(link.node1, link.node2, link.count, link.letters);
    });

    // this.linkNodes(this.links[letter.letter_id].node1, this.links[letter.letter_id].node2, this.links[letter.letter_id].count, letter.identities, letter.date_year);

    this.map.addLayer(this.linkLayer);
    this.map.addLayer(this.nodeLayer);

    // console.log(this.linkLayer.getLayers())
  }

  activeIdentity: JSONFacet = null;
  clickRecipient(identity: JSONFacet) {
    if (identity === this.activeIdentity) {
      this.activeIdentity = null;
      this.clearHighlight();
    } else {
      this.activeIdentity = identity;
      this.highlightRecipients(identity)
    }
  }

  highlightRecipients(identity: JSONFacet) {
    this.infoContent = '';
    this.infoHeader = 'Letters to ' + identity.val;
    let bounds: LatLngBounds = null;
    this.linkLayer.getLayers().forEach((layer: any) => {
      const letters: Letter[] = layer.options.letters.filter((l: Letter) => l.identity_recipient && l.identity_recipient.includes(identity.val));
      if (letters.length > 0) {
        letters.forEach(letter => {
          this.infoContent += `<div>${this.nodes[letter.origin].name} -> ${this.nodes[letter.destination].name}: ${letter.date_year}`;

          if (letter.keywords_category_cs?.length > 0) {
            this.infoContent += ` (${letter.keywords_category_cs.join(', ')})</div>`;
          } else if (letter.keywords_cs?.length > 0) {
            this.infoContent += ` (${letter.keywords_cs.join(', ')})</div>`;
          } else {
            this.infoContent += `</div>`;
          }

        });

        layer.setStyle({ color: this.activeLinkColor });
        layer.bringToFront();
        if (bounds) {
          bounds = bounds.extend(layer.getBounds());
        } else {
          bounds = layer.getBounds();
        }

      } else {
        layer.setStyle({ color: this.linkColor });
      }
    });

    if (bounds) {
      this.map.fitBounds(bounds);
    }


  }

  highlightLinks(identity: JSONFacet) {
    this.infoContent = '';
    this.infoHeader = 'Letters to ' + identity.val;
    this.linkLayer.getLayers().forEach((layer: any) => {
      const hit = layer.options.letters.find((l: Letter) => l.identity_recipient && l.identity_recipient.includes(identity.val));
      if (hit) {
        this.infoContent += `<div>${hit.date_year}</div>`;
        layer.setStyle({ color: this.activeLinkColor });
        layer.bringToFront();
      } else {
        layer.setStyle({ color: this.linkColor });
      }
    })

  }

  clearHighlight() {
    this.infoContent = '';
    this.infoHeader = '';
    this.linkLayer.getLayers().forEach((layer: any) => {
      layer.setStyle({ color: this.linkColor });
    });
  }

  linkNodes(node1: [number, number], node2: [number, number], count: number, letters: Letter[]) {
    const offsetX: any = node2[1] - node1[1];
    const offsetY: any = node2[0] - node1[0];

    var r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
      theta = Math.atan2(offsetY, offsetX);

    var thetaOffset = (3.14 / 10);

    var r2 = (r / 2) / (Math.cos(thetaOffset)),
      theta2 = theta + thetaOffset;

    var midpointX = (r2 * Math.cos(theta2)) + node1[1],
      midpointY = (r2 * Math.sin(theta2)) + node1[0];

    var midpointLatLng: CurvePathDataElement = [midpointY, midpointX];

    const m = L.curve(['M', node1,
      'Q', midpointLatLng,
      node2],
      { color: this.linkColor, fill: false, weight: Math.min(count, 4), fillColor: '#fff', fillOpacity: 0 }
    );

    L.setOptions(m, { letters: letters })

    m.on('mouseover', () => {
      m.setStyle({ color: this.activeLinkColor });
    });

    m.on('mouseout', () => {
      m.setStyle({ color: this.linkColor });
    });
    m.on('click', () => {
      this._ngZone.run(() => {
        let popup = '';
        letters.forEach(letter => {
          popup += `<div>${letter.identity_author} -> ${letter.identity_recipient}. ${letter.date_year}`;
          if (letter.keywords_category_cs?.length > 0) {
            popup += ` (${letter.keywords_category_cs.join(', ')})</div>`;
          } else if (letter.keywords_cs?.length > 0) {
            popup += ` (${letter.keywords_cs.join(', ')})</div>`;
          } else {
            popup += `</div>`;
          }
        });

        this.infoContent = popup;
        this.infoHeader = `Letters from ${this.nodes[letters[0].origin].name} -> ${this.nodes[letters[0].destination].name} (${letters.length})`;
      });
    });

    // let popup = '<div>' + this.nodes[letters[0].origin].name + ' -> ' + this.nodes[letters[0].destination].name + '</div><div>Count:' + count + '</div>';
    // const roky: number[] = [];
    // letters.forEach(letter => {
    //   if (!roky.includes(letter.date_year)) {
    //     roky.push(letter.date_year)
    //   }
    // });
    // popup += '<div>' + roky.join(', ') + '</div>';
    // m.bindTooltip(popup, { sticky: true });
    m.addTo(this.linkLayer);
  }

  changeLimits(limits: [number, number]) {
    this.limits = limits;
    this.getData(false);
  }

  closeInfo() {
    this.clearHighlight();
    this.activeIdentity = null;
  }

}
