
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppState, Tenant } from '../../app-state';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter } from '@angular/material/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
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

/*
Ikony ze statického redesignu: Lucide (https://lucide.dev).
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const HOME_VIEW_ICONS: Record<string, string> = {
  timeline: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12h.01" />
    <path d="M4 16h.01" />
    <path d="M4 20h.01" />
    <path d="M4 4h.01" />
    <path d="M4 8h.01" />
    <path d="M9.414 13.414a2 2 0 0 0 1.414.586H19a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-8.172a2 2 0 0 0-1.414.586L8 12z" />
    <path d="M9.414 21.414a2 2 0 0 0 1.414.586H19a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-8.172a2 2 0 0 0-1.414.586L8 20z" />
    <path d="M9.414 5.414A2 2 0 0 0 10.828 6H19a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-8.172a2 2 0 0 0-1.414.586L8 4z" />
  </svg>`,
  map: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
    <path d="M15 5.764v15" />
    <path d="M9 3.236v15" />
  </svg>`,
  network: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
    <path d="M12 12V8" />
  </svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>`,
  split: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 3h5v5" />
    <path d="M8 3H3v5" />
    <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
    <path d="m15 9 6-6" />
  </svg>`,
  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 12h.01" />
    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M22 13a18.15 18.15 0 0 1-20 0" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>`,
  tags: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z" />
    <path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193" />
    <circle cx="10.5" cy="6.5" r=".5" fill="currentColor" />
  </svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
  </svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" />
  </svg>`,
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </svg>`,
  arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>`,
  'badge-info': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  </svg>`
};

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

  readonly viewAppearance: Record<string, { icon: string; color: string }> = {
    timeline: { icon: 'timeline', color: '#b6463f' },
    map: { icon: 'map', color: '#2f6f73' },
    identities: { icon: 'network', color: '#4457a6' },
    centrality: { icon: 'activity', color: '#8b4a88' },
    relation: { icon: 'split', color: '#a05c2f' },
    professions: { icon: 'briefcase', color: '#55713b' },
    keywords: { icon: 'tags', color: '#967029' },
    periods: { icon: 'layers', color: '#385f8b' },
    catalogs_in_time: { icon: 'chart', color: '#6d6d76' },
    themes: { icon: 'sparkles', color: '#6d6d76' }
  };

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
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (const [name, svg] of Object.entries(HOME_VIEW_ICONS)) {
      iconRegistry.addSvgIconLiteralInNamespace('app-home', name, sanitizer.bypassSecurityTrustHtml(svg));
    }

    
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
