
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppState, Tenant } from '../../app-state';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter } from '@angular/material/core';
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
    MatCheckboxModule, MatIconModule, MatAutocompleteModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  readonly router = inject(Router);

  readonly dateAdapter = inject(DateAdapter);

  readonly activeViewsCount = computed(() => this.state.views.filter(view => view.route).length);
  readonly timeRange = computed(() => {
    const tenants = this.state.tenants();
    const firstYears = tenants.map(tenant => tenant.date_year_min).filter(Number.isFinite);
    const lastYears = tenants.map(tenant => tenant.date_year_max).filter(Number.isFinite);
    return firstYears.length && lastYears.length
      ? `${Math.min(...firstYears)}–${Math.max(...lastYears)}`
      : '—';
  });

  year_min = this.dateAdapter.today();
  year_max = this.dateAdapter.today();
  date_from: unknown;
  date_to: unknown;

  searchModel = signal({
    tenants: [] as Tenant[],
    year_from: '',
    year_to: '',
    identities: '',
    places: ''
  });

  searchForm = form(this.searchModel);
  selectedKeyword = {type: '', value: ''};
  selectedLanguage = '';
  
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
  languages = signal<{val: string,count: number}[]>([]);
  keywords = signal<{value: string,type: string}[]>([]);
  categories = signal<{value: string,type: string}[]>([]);

  constructor(public state: AppState, private service: AppService){
    
    effect(() => {
      if (this.searchModel().places) {
        this.checkPlaces(this.searchModel().places);
      }
      const p: any = {};
      this.service.searchLanguages(p).subscribe((resp: any) => {
        this.languages.set(resp.languages);
      });
      
    });
  }

  ngOnInit() {
    this.state.isHome.set(true);
    this.state.tenants().forEach(t => {t.available = true});
    const mins: number[] = this.state.tenants().map(t => t.date_year_min);
    const maxs: number[] = this.state.tenants().map(t => t.date_year_max);
    if (mins.length) {
      this.year_min = this.dateAdapter.createDate(Math.min(...mins), 0, 1);
      this.year_max = this.dateAdapter.createDate(Math.max(...maxs), 0, 1);
    }
    this.searchForm().reset();
  }

  isTenantSelected(tenant: Tenant): boolean {
    return this.searchModel().tenants.some(t => t.val === tenant.val);
  }

  toggleTenant(tenant: Tenant, checked: boolean) {
    this.searchModel.update(model => ({
      ...model,
      tenants: checked
        ? [...model.tenants.filter(t => t.val !== tenant.val), tenant]
        : model.tenants.filter(t => t.val !== tenant.val)
    }));
    this.searchForm().markAsDirty();
  }

  doDateFromByYear(date: unknown) {
    this.date_from = this.dateAdapter.createDate(this.dateAdapter.getYear(date), 0, 1);
    this.searchForm().markAsDirty();
  }

  doDateToByYear(date: unknown) {
    this.date_to = this.dateAdapter.createDate(this.dateAdapter.getYear(date), 0, 1);
    this.searchForm().markAsDirty();
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

  checkLanguages(val: any) {
    const p: any = {};
    p.prefix = val.target.value;
    this.service.searchLanguages(p).subscribe((resp: any) => {
      this.languages.set(resp.languages);
    });
  }

  setLanguage(e: any) {
    this.selectedLanguage = e.option.value;
    this.searchForm().markAsDirty();
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
    this.selectedKeyword = {type: e.option.value.type, value: e.option.value.value};
    this.searchForm().markAsDirty();
  }

  setFilters() {

    this.state.tenants().forEach(t => {
      t.selected = this.isTenantSelected(t);
    });

    const usedFacets: {field: string, value: string, op: string}[] = [];
    if (this.selectedKeyword.type === 'category') {
      usedFacets.push({field: 'keyword_categories', value: this.selectedKeyword.value, op: ''});
    } else if(this.selectedKeyword.type === 'keyword') {
      usedFacets.push({field: 'keywords', value: this.selectedKeyword.value, op: ''});
    }
    // if(this.searchModel().keywords) {
    //   usedFacets.push({field: 'keywords', value: this.searchModel().keywords});
    // }
    
    if(this.selectedLanguage) {
      usedFacets.push({field: 'languages', value: this.selectedLanguage, op: ''});
    }
    if(this.searchModel().places) {
      usedFacets.push({field: 'places', value: this.searchModel().places, op: ''});
    }
    if(this.searchModel().identities) {
      usedFacets.push({field: 'identities', value: this.searchModel().identities, op: ''});
    }
    if(this.searchModel().year_from) {
      usedFacets.push({field: 'year_from', value: this.searchModel().year_from, op: ''});
    }
    if(this.searchModel().year_to) {
      usedFacets.push({field: 'year_to', value: this.searchModel().year_to, op: ''});
    }
    
    if(this.date_from) {
      usedFacets.push({field: 'date_from', value: this.dateAdapter.toIso8601(this.date_from).substring(0, 10), op: ''});
    }
    if(this.date_to) {
      usedFacets.push({field: 'date_to', value: this.dateAdapter.toIso8601(this.date_to).substring(0, 10), op: ''});
    }

    this.state.usedFacets.set([...usedFacets]);
  }

  search() {
    this.setFilters();
    if (this.state.hasStateInUrl()) {
      this.router.navigate(['timeline'], { queryParams: { s: this.state.encodeState() } });
    }
    
  }

  gotoView(view: string) {
    this.setFilters();
    if (this.state.hasStateInUrl()) {
      this.router.navigate([view], { queryParams: { s: this.state.encodeState() } });
    }
    
  }


}
