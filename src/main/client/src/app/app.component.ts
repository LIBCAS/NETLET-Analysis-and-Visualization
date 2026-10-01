import { Component, inject, Inject, DOCUMENT } from '@angular/core';
import { ActivatedRoute, Router, RouterModule  } from '@angular/router';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { FooterComponent } from "./components/footer/footer.component";
import { AppState } from './app-state';

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
  private router = inject(Router);
  
  title = 'netlet-analysis';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public state: AppState
  ){}

  ngOnInit() {
    const s = this.route.queryParams.pipe(
      switchMap(p => {
        this.state.isHome.set(false);
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
