import { Component, inject, Inject } from '@angular/core';
import { ActivatedRoute, RouterModule  } from '@angular/router';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { FooterComponent } from "./components/footer/footer.component";
import { AppState } from './app-state';
import { DOCUMENT } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap, of } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterModule, TranslateModule, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly route = inject(ActivatedRoute);
  title = 'netlet-analysis';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public state: AppState
  ){}

  // ngOnInit() {
  //   const urlParams = new URLSearchParams(this.document.location.search);
  //   const tenant = urlParams.get('tenant');
  //   let mainTenant = false;
  //   if (tenant) {
  //     tenant.split(',').forEach(tenant =>  {
  //       const st = this.state.tenants.find(t => t.val === tenant);
  //       if (st) {
  //         st.selected = true;
  //       }
  //     });
  //     this.state.setSelectedTenants();
  //   }
  // }

  ngOnInit() {
    const s = this.route.queryParams.pipe(
      switchMap(p => {
        this.processParams(p);
        return of(true);
      })
    );
    s.subscribe();
  }

  processParams(p: any) {
    this.state.decodeState(p['s'])
  }
}
