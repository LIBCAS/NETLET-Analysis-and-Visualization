import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import L, { latLng, Map, tileLayer as LtileLayer, MapOptions, Marker, LayerGroup } from "leaflet";

import { Place } from '../../shared/letter';
import { LeafletModule } from '@bluehalo/ngx-leaflet';


@Component({
  selector: 'app-place',
  imports: [TranslateModule, LeafletModule],
  templateUrl: './place.component.html',
  styleUrl: './place.component.scss',
})
export class PlaceComponent {
  placeId = signal('');
  private activatedRoute = inject(ActivatedRoute);

  placeRes: any = httpResource(() => ({
    url: `/api/data/get_place`,
    method: 'GET',
    params: {
      'id': this.placeId()
    }
  }));

  place = computed<any>(() => this.placeRes.value());

  map: Map;
  options = {
    layers: [
      LtileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'OpenStreetMaps' })
    ],
    zoom: 8,
    center: latLng(49.879966, 16.726909)
  };

  nodeLayer: LayerGroup<Marker> = new L.LayerGroup();
  icon = L.divIcon({ className: 'map-pin', iconSize: null });

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.placeId.set(params['id']);
    });

    effect(() => {
      const place = this.placeRes.value();
      if (place) {
        setTimeout(() => {
          this.setMap(place);
        }, 100)
      }
    })
  }

  onMapReady(map: Map) {
    this.map = map;
    // setTimeout(() => {
    //   this.setMap(place);
    // }, 10);
  }

  setMap(place: Place) {

    if (place.latitude) {

      const m = L.marker([place.latitude, place.longitude], {
        icon: this.icon,
        riseOnHover: true
      });

      m.bindTooltip(place.name);
      m.addTo(this.nodeLayer);

      this.map.addLayer(this.nodeLayer);

      const c = L.latLng(place.latitude, place.longitude);
      this.map.panTo(c);

      // console.log(this.linkLayer.getLayers())
    }
  }
}
