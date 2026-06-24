
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
import { MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'app-home',
  imports: [RouterModule, TranslateModule, FormsModule, FormField, MatDatepickerModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatAutocompleteModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  readonly router = inject(Router);

  year_min: Date = new Date();
  year_max: Date = new Date();
  date_from: Date;
  date_to: Date;

  searchModel = signal({
    tenants: [],
    year_from: '',
    year_to: '',
    identities: '',
    places: ''
  });

  searchForm = form(this.searchModel);
  selectedKeyword = {type: '', value: ''};
  
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
  keywords = signal<{value: string,type: string}[]>([]);
  categories = signal<{value: string,type: string}[]>([]);

  constructor(public state: AppState, private service: AppService){

    // effect(() => {
    //   this.checkIdentities(this.searchForm.identities().value());
    // // });
    // effect(() => {
    //   if (this.searchModel().keywords) {
    //     this.checkKeywords(this.searchModel().keywords);
    //   }
      
    // });
    effect(() => {
      if (this.searchModel().places) {
        this.checkPlaces(this.searchModel().places);
      }
      
    });
  }

  ngOnInit() {
    this.state.tenants().forEach(t => {t.available = true});
    const mins: number[] = this.state.tenants().map(t => t.date_year_min);
    const maxs: number[] = this.state.tenants().map(t => t.date_year_max);
    this.year_min = new Date(Math.min(...mins), 0, 1);
    this.year_max = new Date(Math.max(...maxs), 0, 1);
  }

  doDateFromByYear(e: any) {
    this.date_from = new Date(e.c.year+'-01-01');
  }

  doDateToByYear(e: any) {
    this.date_to = new Date(e.c.year+'-01-01');
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

  displayFn(val: {value: string,type: string}): string {
    return val && val.value ? val.value : '';
  }

  checkKeywords(val: any) {
    const p: any = {};
    p.prefix = val.target.value;
    this.service.searchKeywords(p).subscribe((resp: any) => {
      this.keywords.set(resp.keywords);
      this.categories.set(resp.categories);
    });
  }

  setKeyword(e: any) {
    console.log(e)
    this.selectedKeyword = {type: e.option.value.type, value: e.option.value.value}
  }

  setFilters() {

    this.searchModel().tenants.forEach(t => {
      this.state.tenants().find(st => st.val === t.val).selected = true;
    });

    const usedFacets: {field: string, value: string}[] = [];
    if (this.selectedKeyword.type === 'category') {
      usedFacets.push({field: 'keyword_categories', value: this.selectedKeyword.value});
    } else if(this.selectedKeyword.type === 'keyword') {
      usedFacets.push({field: 'keywords', value: this.selectedKeyword.value});
    }
    // if(this.searchModel().keywords) {
    //   usedFacets.push({field: 'keywords', value: this.searchModel().keywords});
    // }
    if(this.searchModel().places) {
      usedFacets.push({field: 'places', value: this.searchModel().places});
    }
    if(this.searchModel().identities) {
      usedFacets.push({field: 'identities', value: this.searchModel().identities});
    }
    if(this.searchModel().year_from) {
      usedFacets.push({field: 'year_from', value: this.searchModel().year_from});
    }
    if(this.searchModel().year_to) {
      usedFacets.push({field: 'year_to', value: this.searchModel().year_to});
    }
    
    if(this.date_from) {
      usedFacets.push({field: 'date_from', value: this.date_from.toISOString()});
    }
    if(this.date_to) {
      usedFacets.push({field: 'date_to', value: this.date_to.toISOString()});
    }

    this.state.usedFacets.set([...usedFacets]);
  }

  search() {
    this.setFilters();
    this.router.navigate(['timeline'], { queryParams: { s: this.state.encodeState() } });
  }

}
