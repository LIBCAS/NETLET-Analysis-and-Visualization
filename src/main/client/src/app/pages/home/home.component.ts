
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppState } from '../../app-state';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {form, FormField} from '@angular/forms/signals';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { map, Observable, tap } from 'rxjs';
import {AsyncPipe} from '@angular/common';
import { AppService } from '../../app.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-home',
  imports: [RouterModule, TranslateModule, FormsModule, FormField, AsyncPipe,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatAutocompleteModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  readonly router = inject(Router);

  searchModel = signal({
    tenants: [],
    identities: '',
    places: '',
    keywords: '',
  });

  searchForm = form(this.searchModel);
  
  //identities = signal<{id: string,table_id: number,name: string,tenant: string}[]>([]);

  identitiesRes: any = httpResource(() => ({
    url: `/api/data/search_identities`,
    method: 'GET',
    params: {
      'prefix': this.searchForm ? this.searchForm.identities().value() : '',
    }
  }));

  identities = computed<any>(() => this.identitiesRes.value() ? this.identitiesRes.value().identities : [] );

  places = signal<{id: string,table_id: number,name: string,tenant: string}[]>([]);
  keywords = signal<{id: string,table_id: number,name_cs: string,name_en: string,tenant: string}[]>([]);
  categories = signal<{id: string,table_id: number,category_cs: string,category_en: string,tenant: string}[]>([]);

  constructor(public state: AppState, private service: AppService){

    // effect(() => {
    //   this.checkIdentities(this.searchForm.identities().value());
    // });
    effect(() => {
      if (this.searchModel().keywords) {
        this.checkKeywords(this.searchModel().keywords);
      }
      
    });
    effect(() => {
      if (this.searchModel().places) {
        this.checkPlaces(this.searchModel().places);
      }
      
    });
  }

  ngOnInit() {
    this.state.tenants().forEach(t => {t.available = true});
  }

  // checkIdentities(val: any) {
  //   console.log(val)
  //   const p: any = {};
  //   p.prefix = val;
  //   this.service.searchIdentities(p).subscribe((resp: any) => {
  //     this.identities.set(resp.places);
  //   });
  // }

  checkPlaces(val: any) {
    console.log(val)
    const p: any = {};
    p.prefix = val;
    this.service.searchPlaces(p).subscribe((resp: any) => {
      this.places.set(resp.places);
    });
  }

  checkKeywords(val: any) {
    console.log(val)
    const p: any = {};
    p.prefix = val;
    this.service.searchKeywords(p).subscribe((resp: any) => {
      this.keywords.set(resp.keywords);
      this.categories.set(resp.categories);
    });
  }

  setFilters() {
    console.log(this.searchModel());
    const usedFacets: {field: string, value: string}[] = [];
    if(this.searchModel().keywords) {
      usedFacets.push({field: 'keywords', value: this.searchModel().keywords});
    }
    if(this.searchModel().places) {
      usedFacets.push({field: 'places', value: this.searchModel().places});
    }
    if(this.searchModel().identities) {
      usedFacets.push({field: 'identities', value: this.searchModel().identities});
    }

    this.state.usedFacets.update(f => [...usedFacets]);
  }

  search() {
    this.setFilters();
    this.router.navigate(['timeline'], { queryParams: { s: this.state.encodeState() } });
  }

}
