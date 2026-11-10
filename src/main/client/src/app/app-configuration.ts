import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AppState } from './app-state';
import { Configuration } from './shared/config';


@Injectable({
    providedIn: 'root'
}) export class AppConfiguration {

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
public HOME_VIEW_ICONS: Record<string, string> = {
  timeline: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 19h20" />
    <path d="M4 19v2m5-2v2m5-2v2m5-2v2" />
    <path d="m4 14 5-5 5 3 5-7" />
    <circle cx="4" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
  </svg>`,
  map: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
    <path d="M15 5.764v15" />
    <path d="M9 3.236v15" />
  </svg>`,
  identities: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="19" cy="19" r="3" />
    <circle cx="5" cy="19" r="3" />
    <circle cx="12" cy="5" r="3" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
    <path d="M12 12V8" />
  </svg>`,
  centrality: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="9" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </svg>`,
  relation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5.68a7 7 0 0 1 0 12.64 7 7 0 0 1 0-12.64Z" fill="currentColor" fill-opacity=".18" stroke="none" />
    <circle cx="9" cy="12" r="7" />
    <circle cx="15" cy="12" r="7" />
  </svg>`,
  professions: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 12h.01" />
    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M22 13a18.15 18.15 0 0 1-20 0" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>`,
  keywords: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z" />
    <path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193" />
    <circle cx="10.5" cy="6.5" r=".5" fill="currentColor" />
  </svg>`,
  periods: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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



  readonly viewAppearance: Record<string, { icon: string; color: string }> = {
    timeline: { icon: 'timeline', color: '#b6463f' },
    map: { icon: 'map', color: '#2f6f73' },
    identities: { icon: 'identities', color: '#4457a6' },
    centrality: { icon: 'centrality', color: '#8b4a88' },
    relation: { icon: 'relation', color: '#a05c2f' },
    professions: { icon: 'professions', color: '#55713b' },
    keywords: { icon: 'keywords', color: '#967029' },
    periods: { icon: 'periods', color: '#385f8b' },
    catalogs_in_time: { icon: 'chart', color: '#6d6d76' }
  };


    public config: Configuration;
    public get context() {
        return this.config.context;
    }

    public get defaultLang() {
        return this.config.defaultLang;
    }

    public excluded_identities() {
        const ret: string[] = [];
        this.state.tenants().filter(t => t.selected).forEach(t => {
            ret.push(...this.config.excluded_identities[t.val]);
        })
        return ret;
    }

    public get colors() {
        return this.config.colors;
    }

    public get hikoUrl() {
        return this.config.hikoUrl;
    }

    public get isTest() {
        return this.config.isTest;
    }

    public get test_mappings() {
        return this.config.test_mappings;
    }

    public get tenant_colors() {
        return this.config.tenant_colors;
    }

    public get obdobi() {
        return this.config.obdobi;
    }

    public get geojsons() {
        return this.config.geojsons;
    }

    constructor(
        private http: HttpClient,
        public state: AppState) { }

    public configLoaded() {
        return this.config && true;
    }

    public load() {
        return this.http.get('assets/config.json').pipe(
            switchMap((cfg: any) => {
                this.config = cfg as Configuration;
                return this.http.get('api/data/get_dicts').pipe(tap((res: any) => {
                    const ts = res.tenants.buckets;
                    ts.sort((t1: any, t2: any) => t1.val.localeCompare(t2.val));
                    this.state.tenants.set(ts);
                    this.state.tenants().forEach(t => {
                        t.date_computed_max = new Date(t.date_computed_max_s);
                        t.date_computed_min = new Date(t.date_computed_min_s);
                        t.available = true
                    });
                    this.state.places.set(res.places);
                    this.state.identities.set(res.identities);
                    this.state.professions.set(res.professions);
                    this.state.lettersCount.set(res.lettersCount);
                }));
            }),
            catchError((err) => {
                // this.alertSubject.next(err);
                return of(err);
            })
        );
    }

}
