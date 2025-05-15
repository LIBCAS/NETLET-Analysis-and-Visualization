import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppState } from '../../app-state';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, TranslateModule,
    MatCardModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  cards = [
    {
      header: '',
      text: 'Centralita aktérů korespondence v dané korespondenční síti',
      route: 'centrality'
    },
    {
      header: '',
      text: 'Míra jejich zprostředkovatelské pozice mezi dvěma a více sítěmi',
      route: ''
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

  constructor(public state: AppState){}

  ngOnInit() {
    this.state.tenants.forEach(t => {t.available = true});
  }

}
