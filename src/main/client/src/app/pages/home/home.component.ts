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

  

  constructor(public state: AppState){}

  ngOnInit() {
    this.state.tenants.forEach(t => {t.available = true});
  }

}
