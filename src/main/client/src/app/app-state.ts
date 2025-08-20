import { Injectable, signal } from "@angular/core";


export interface Tenant {
    val: string,
    count: number,
    //date_year_max: number,
    //date_year_min: number,
    date_computed_max_s: string,
    date_computed_min_s: string,
    date_computed_max: Date,
    date_computed_min: Date,
    available: boolean,
    selected: boolean,
  }

@Injectable({
    providedIn: 'root'
}) export class AppState {

    public tenants: Tenant[] = [];
    public tenant = signal<Tenant>(null);
    public selectedTenants = signal<Tenant[]>([]);
    views = [
    {
      header: '',
      text: 'Centralita aktérů korespondence v dané korespondenční síti',
      route: 'centrality'
    },
    {
      header: '',
      text: 'Míra jejich zprostředkovatelské pozice mezi dvěma a více sítěmi',
      route: 'relation'
    },
    {
      header: 'Keywords',
      text: 'Kocitační sítě mapující v dopisech zmiňované osoby ve vztahu ke specifickým tématům či debatám.',
      route: 'keywords'
    },
    {
      header: 'Map',
      text: 'Digitální vizualizace zaměřené na geografický horizont jednotlivých osobních korespondenčních souborů.',
      route: 'map'
    },
    {
      header: '',
      text: 'Komparativně pojatá mapová zobrazení v rámci tří hlavních období',
      route: ''
    },
    {
      header: '',
      text: 'Statisticky pojaté grafy a časové osy porovnávající dynamiku vývoje jednotlivých korespondenčních celků v časové dimenzi',
      route: ''
    },
    {
      header: '',
      text: 'Schémata zobrazující vztahy mezi jednotlivými pisateli a příjemci dopisů',
      route: 'identities'
    },
    {
      header: '',
      text: 'Schémata zobrazující korespondenční vztahy mezi různými profesními skupinami',
      route: 'professions'
    },
    {
      header: '',
      text: 'Schémata zobrazující tematická propojení dopisů a korespondenčních celků',
      route: ''
    },
    {
      header: '',
      text: 'Zobrazení dopisů v chronologickém pořadí na časové ose',
      route: 'timeline'
    },
  ];
  currentView: {header: string, text: string, route: string};

  changeMainTenant(t: Tenant) {
    this.tenants.forEach(te => te.selected = false);
    t.selected = true;
    this.tenant.set(t);
    this.setSelectedTenants();
  }

  setSelectedTenants() {
    this.selectedTenants.set(this.tenants.filter(t => t.selected));
  }

  getTenantsRange(): [Date, Date] {
    let min = new Date();
    let max = new Date('1000-01-01');
    this.tenants.forEach(t => {
      if (t.selected) {
        // min = Math.min(min, t.date_computed_min.getFullYear());
        // max = Math.max(max, t.date_computed_max.getFullYear());
        min = min > t.date_computed_min ? t.date_computed_min : min;
        max = max > t.date_computed_max ? max : t.date_computed_max;
      }
    });
    return [min,max];
  }

  getTenantsRangeISO(): [string, string] {
    let min = new Date();
    let max = new Date('1000-01-01');
    this.tenants.forEach(t => {
      if (t.selected) {
        // min = Math.min(min, t.date_computed_min.getFullYear());
        // max = Math.max(max, t.date_computed_max.getFullYear());
        min = min > t.date_computed_min ? t.date_computed_min : min;
        max = max > t.date_computed_max ? max : t.date_computed_max;
      }
    });
    return [min.toISOString(),max.toISOString()];
  }
}