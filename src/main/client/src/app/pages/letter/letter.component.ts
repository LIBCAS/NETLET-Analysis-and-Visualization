import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Letter, Place } from '../../shared/letter';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  LeafletComponent,
  LeafletComponentOption,
} from "@joakimono/echarts-extension-leaflet/src/export";


import L, { latLng, Map, tileLayer as LtileLayer, MapOptions } from "leaflet";

import { GraphSeriesOption } from 'echarts';
import { init, EChartsType, ComposeOption } from "echarts/core";

import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent, TitleComponentOption } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

type ECOption = ComposeOption<
  | TitleComponentOption
  | GraphSeriesOption
> &
  LeafletComponentOption<MapOptions>;

echarts.use([CanvasRenderer, GraphChart, TooltipComponent, LeafletComponent]);

@Component({
  selector: 'app-letter',
  imports: [DatePipe, TranslateModule, RouterModule],
  templateUrl: './letter.component.html',
  styleUrl: './letter.component.scss',
})
export class LetterComponent {

  letterId = signal('');
  private activatedRoute = inject(ActivatedRoute);

  letterRes: any = httpResource(() => ({
    url: `/api/data/get_letter`,
    method: 'GET',
    params: {
      'id': this.letterId()
    }
  }));

  letter = computed<any>(() => this.letterRes.value());

  authors = computed<any>(() => this.letter().identities.filter((i: any) => i.role === 'author'));
  recipients = computed<any>(() => this.letter().identities.filter((i: any) => i.role === 'recipient'));
  mentioned = computed<any>(() => this.letter().identities.filter((i: any) => i.role === 'mentioned'));
  origins = computed<any>(() => this.letter().places.filter((i: any) => i.role === 'origin'));
  destinations = computed<any>(() => this.letter().places.filter((i: any) => i.role === 'destination'));

  map: Map;
  // options = {
  //   layers: [
  //     LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
  //   ],
  //   zoom: 4,
  //   center: latLng(49.879966, 16.726909)
  // };

  graphOptions: ECOption = {};
  graphChart: EChartsType;

  nodes: { [id: string]: { coords: [number, number], name: string } } = {};
  links: {
    [id: string]: {
      node1: [number, number], node2: [number, number], count: number,
      letters: Letter[], authors: string[], recipients: string[]
    }
  } = {};

  graphData: {
    links: {
      source: string,
      target: string,
      authors: string[],
      recipients: string[]
    }[],
    nodes: {
      category: number,
      id: string,
      name: string
      symbolSize: number
      value: number
    }[],
    bounds: any
  }

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.letterId.set(params['id']);
    });

    effect(() => {
      const letter = this.letterRes.value();
      if (letter) {
        setTimeout(() => {
          this.setGraphData(letter);
          this.setMap();
        }, 100)
      }
    })
  }



  setGraphData(letter: Letter) {

    this.nodes = {};
    const nodes: any = [];
    this.links = {};
    const links: any[] = [];

    let latMax = -90;
    let latMin = 90;
    let lngMax = -180;
    let lngMin = 180;

    letter.places.forEach((place: Place) => {
      if (place.latitude && !this.nodes[place.id]) {
        this.nodes[place.id] = { coords: [place.latitude, place.longitude], name: place.name };
        nodes.push({ id: place.id, name: place.name, value: [place.longitude, place.latitude, 1] });
        latMax = Math.max(latMax, place.latitude);
        lngMax = Math.max(lngMax, place.longitude);
        latMin = Math.min(latMin, place.latitude);
        lngMin = Math.min(lngMin, place.longitude);
      }
    });

    const southWest = L.latLng(latMin, lngMin);
    const northEast = L.latLng(latMax, lngMax);
    const bounds = L.latLngBounds(southWest, northEast);

    const linkId = letter.origin_id + '_' + letter.destination_id;
    const place_origin = letter.places.find(p => p.role === 'origin');
    const place_destination = letter.places.find(p => p.role === 'destination');

    if (place_origin && place_destination && place_origin.latitude && place_destination.latitude) {
      if (!this.links[linkId]) {
        this.links[linkId] = {
          node1: [place_origin.latitude, place_origin.longitude],
          node2: [place_destination.latitude, place_destination.longitude],
          authors: letter.identity_author,
          recipients: letter.identity_recipient,
          count: 1,
          letters: [letter]
        };
        links.push({
          id: linkId,
          source: letter.origin_id,
          target: letter.destination_id,
          authors: letter.identity_author,
          recipients: letter.identity_recipient,
          label: place_origin.name + ' > ' + place_destination.name,
          labelReversed: place_destination.name + ' > ' + place_origin.name,
          count: this.links[linkId].count,
          lineStyle: {
            //color: this.config.tenant_colors[letter.tenant],
            width: 1,
            opacity: 1
          }
        });
      } else {
        this.links[linkId].count++;
        this.links[linkId].letters.push(letter);
        this.links[linkId].authors.concat(letter.identity_author)
        this.links[linkId].recipients.concat(letter.identity_recipient)
      }
    }


    links.forEach(link => {
      link.count = this.links[link.id].count
    })

    this.graphData = {
      links,
      nodes,
      bounds
    };

  }

  setMap() {
    const center = this.graphData.bounds.getCenter();
    console.log(center)
    this.graphOptions = {
      lmap: {
        // See https://leafletjs.com/reference.html#map-option for details
        // NOTE: note that this order is reversed from Leaflet's [lat, lng]!
        
        center: [center.lng, center.lat],     // [lng, lat]
        zoom: 10,

        resizeEnable: true,     // automatically handles browser window resize.
        // whether echarts layer should be rendered when the map is moving. Default is true.
        // if false, it will only be re-rendered after the map `moveend`.
        // It's better to set this option to false if data is large.
        renderOnMoving: true,
        echartsLayerInteractive: true, // Default: true
        largeMode: false               // Default: false
        // Note: Please DO NOT use the initial option `layers` to add Satellite/RoadNet/Other layers now.
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return params.dataType === 'edge' ?
            `${params.data.label} (${params.data.count})` :
            params.name
        }
      },
      series: [
        {
          type: 'graph',
          // use `lmap` as the coordinate system
          coordinateSystem: 'lmap',
          // data items [[lng, lat, value], [lng, lat, value], ...]
          data: this.graphData.nodes,
          links: this.graphData.links,

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
    }

    const d = document.getElementById("echarts-lmap");
    if (!this.graphChart) {
      this.graphChart = init(d);
    }

    this.graphChart.setOption(this.graphOptions);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmapComponent = this.graphChart.getModel().getComponent("lmap");
    // Get the instance of Leaflet
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lmap = lmapComponent.getLeaflet();

    LtileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMaps'  }).addTo(lmap);
    

    setTimeout(() => {
      lmap.fitBounds(this.graphData.bounds, { paddingTopLeft: [-20, -20], paddingBottomRight: [-20, -20] });
    }, 100)
    
  }
}
