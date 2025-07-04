import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AppState } from './app-state';
import { Configuration } from './shared/config';

@Injectable({
    providedIn: 'root'
}) export class AppConfiguration {

    public config: Configuration;
    public get context() {
        return this.config.context;
    }

    public get defaultLang() {
        return this.config.defaultLang;
    }

    public excluded_identities() {
        const ret: string[] = [];
        this.state.tenants.filter(t => t.selected).forEach(t => {
            ret.push(...this.config.excluded_identities[t.val]);
        })
        return ret;
    }

    public get colors() {
        return this.config.colors;
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
                return this.http.get('api/data/get_tenants').pipe(tap((res: any) => {
                    this.state.tenants = res.buckets;
                    this.state.tenants.forEach(t => {t.available = true});
                }));
            }),
            catchError((err) => {
                // this.alertSubject.next(err);
                return of(err);
            })
        );
    }

}
