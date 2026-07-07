import { Injectable, signal } from "@angular/core";


export interface Tenant {
  val: string,
  count: number,
  date_year_max: number,
  date_year_min: number,
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

  public showInfo = signal<boolean>(false);
  public tenants = signal<Tenant[]>([]);

  // public selectedTenants = signal<Tenant[]>([]);

  stateChanged = signal<number>(0);

  public q: string = '';
  public usedFacets = signal<{ field: string, value: string }[]>([]);

  views = [
    {
      header: 'centrality',
      text: 'Centralita aktérů korespondence v dané korespondenční síti',
      route: 'centrality'
    },
    {
      header: 'relation',
      text: 'Míra jejich zprostředkovatelské pozice mezi dvěma a více sítěmi',
      route: 'relation'
    },
    {
      header: 'keywords',
      text: 'Kocitační sítě mapující v dopisech zmiňované osoby ve vztahu ke specifickým tématům či debatám.',
      route: 'keywords'
    },
    {
      header: 'map',
      text: 'Digitální vizualizace zaměřené na geografický horizont jednotlivých osobních korespondenčních souborů.',
      route: 'map'
    },
    {
      header: 'periods',
      text: 'Komparativně pojatá zobrazení v rámci tří hlavních období',
      route: 'periods'
    },
    {
      header: 'map_dynamika',
      text: 'Statisticky pojaté grafy a časové osy porovnávající dynamiku vývoje jednotlivých korespondenčních celků v časové dimenzi',
      route: ''
    },
    {
      header: 'identities',
      text: 'Schémata zobrazující vztahy mezi jednotlivými pisateli a příjemci dopisů',
      route: 'identities'
    },
    {
      header: 'professions',
      text: 'Schémata zobrazující korespondenční vztahy mezi různými profesními skupinami',
      route: 'professions'
    },
    {
      header: 'themes',
      text: 'Schémata zobrazující tematická propojení dopisů a korespondenčních celků',
      route: ''
    },
    {
      header: 'timeline',
      text: 'Zobrazení dopisů v chronologickém pořadí na časové ose',
      route: 'timeline'
    },
  ];
  currentView: { header: string, text: string, route: string };

  // changeMainTenant(t: Tenant) {
  //   this.tenants.forEach(te => te.selected = false);
  //   t.selected = true;
  //   this.setSelectedTenants();
  // }

  // setSelectedTenants() {
  //   this.selectedTenants.set(this.tenants.filter(t => t.selected));
  // }

  getTenantsRange(): [Date, Date] {
    let min = new Date();
    let max = new Date('1000-01-01');
    const hasSelected = this.tenants().filter(t => t.selected).length > 0;
    this.tenants().forEach(t => {
      if (!hasSelected || t.selected) {
        min = min > new Date(t.date_computed_min_s) ? new Date(t.date_computed_min_s) : min;
        max = max > new Date(t.date_computed_max_s) ? max : new Date(t.date_computed_max_s);
      }
    });
    return [min, max];
  }

  getTenantsRangeNumber(): [number, number] {
    let min = 3000;
    let max = 1000;
    this.tenants().forEach(t => {
      if (t.selected) {
        // min = Math.min(min, t.date_computed_min.getFullYear());
        // max = Math.max(max, t.date_computed_max.getFullYear());
        min = min > t.date_year_min ? t.date_year_min : min;
        max = max > t.date_year_max ? max : t.date_year_max;
      }
    });
    return [min, max];
  }

  getTenantsRangeISO(): [string, string] {
    let min = new Date();
    let max = new Date('1000-01-01');
    this.tenants().forEach(t => {
      if (t.selected) {
        // min = Math.min(min, t.date_computed_min.getFullYear());
        // max = Math.max(max, t.date_computed_max.getFullYear());
        min = min > new Date(t.date_computed_min_s) ? new Date(t.date_computed_min_s) : min;
        max = max > new Date(t.date_computed_max_s) ? max : new Date(t.date_computed_max_s);
      }
    });
    return [min.toISOString(), max.toISOString()];
  }

  addFilters(p: any) {
    p.author = this.usedFacets().filter(k => k.field === 'authors').map(k => k.value);
    p.recipient = this.usedFacets().filter(k => k.field === 'recipients').map(k => k.value);
    p.mentioned = this.usedFacets().filter(k => k.field === 'mentioned').map(k => k.value);
    p.keyword_categories = this.usedFacets().filter(k => k.field === 'keyword_categories').map(k => k.value);
    p.keyword = this.usedFacets().filter(k => k.field === 'keywords').map(k => k.value);
    p.profession = this.usedFacets().filter(k => k.field === 'professions').map(k => k.value);
    p.origin = this.usedFacets().filter(k => k.field === 'origins').map(k => k.value);
    p.destination = this.usedFacets().filter(k => k.field === 'destinations').map(k => k.value);
    p.places = this.usedFacets().filter(k => k.field === 'places').map(k => k.value);
    p.identities = this.usedFacets().filter(k => k.field === 'identities').map(k => k.value);
    p.year_from = this.usedFacets().filter(k => k.field === 'year_from').map(k => k.value);
    p.year_to = this.usedFacets().filter(k => k.field === 'year_to').map(k => k.value);
    p.date_from = this.usedFacets().filter(k => k.field === 'date_from').map(k => k.value);
    p.date_to = this.usedFacets().filter(k => k.field === 'date_to').map(k => k.value);
  }

  selectedTenants() {
    return this.tenants().filter(t => t.selected)
  }

  unselectTenants() {
    this.tenants.update(ts => {
        ts.forEach(t => {t.selected = false});
        return [...ts]
      })
  }

  encodeState() {
    const obj = { q: this.q, f: this.usedFacets(), t: this.tenants().filter(t => t.selected).map(t => t.val)};
    return btoa(encodeURIComponent(JSON.stringify(obj)));
  }

  decodeState(s: string) {
    if (s) {
      const obj = JSON.parse(decodeURIComponent(atob(s)));
      //console.log(obj)
      this.q = obj.q;
      this.usedFacets.set(obj.f);
      //this.tenants().forEach(t => {t.selected = false});
      this.unselectTenants();
      if (obj.t) {
        obj.t.forEach((tenant: string) =>  {
          const st = this.tenants().find(t => t.val === tenant);
          if (st) {
            st.selected = true;
          }
        });
      } 
      // this.setSelectedTenants();

    } else {
      this.q = '';
      this.usedFacets.set([]);
      this.unselectTenants();
    }
    this.stateChanged.set(this.usedFacets().length + this.selectedTenants().length)
  }
}