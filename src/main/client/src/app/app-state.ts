import { Injectable, signal } from "@angular/core";


export interface Tenant {
    val: string,
    count: number,
    date_year_max: number,
    date_year_min: number,
    available: boolean,
    selected: boolean,
  }

@Injectable({
    providedIn: 'root'
}) export class AppState {

    public tenants: Tenant[] = [];
    public tenant = signal<Tenant>(null);
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
  ];
  currentView: {header: string, text: string, route: string};
}