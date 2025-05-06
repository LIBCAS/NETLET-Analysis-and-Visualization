import { Injectable } from "@angular/core";


export interface Tenant {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number
  }

@Injectable({
    providedIn: 'root'
}) export class AppState {

    public tenants: Tenant[] = [];
    public tenant: Tenant;
}