import { Component, Inject } from '@angular/core';
import { RouterModule  } from '@angular/router';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { FooterComponent } from "./components/footer/footer.component";
import { AppState } from './app-state';
import { CommonModule, DOCUMENT } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterModule, CommonModule, TranslateModule, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'netlet-analysis';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public state: AppState
  ){}

  ngOnInit() {
    const urlParams = new URLSearchParams(this.document.location.search);
    const tenant = urlParams.get('tenant');
    if (tenant) {
      const st = this.state.tenants.find(t => t.val === tenant);
      if (st) {
        this.state.tenant.set(st);
      }
    }
  }
}
