import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppState } from '../../app-state';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { AppConfiguration } from '../../app-configuration';


@Component({
  selector: 'app-navbar',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, RouterModule, TranslateModule, MatMenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  readonly menuOpen = signal(false);

  readonly viewAppearance: Record<string, { icon: string; color: string }> = {
    timeline: { icon: 'timeline', color: '#b6463f' },
    map: { icon: 'map', color: '#2f6f73' },
    identities: { icon: 'network', color: '#4457a6' },
    centrality: { icon: 'activity', color: '#8b4a88' },
    relation: { icon: 'split', color: '#a05c2f' },
    professions: { icon: 'briefcase', color: '#55713b' },
    keywords: { icon: 'tags', color: '#967029' },
    periods: { icon: 'layers', color: '#385f8b' },
    catalogs_in_time: { icon: 'chart', color: '#6d6d76' }
  };

  showViews = computed<boolean>(() => !this.state.isHome());
  window = window;

  constructor(
    private router: Router,
    breakpoints: BreakpointObserver,
    public translator: TranslateService,
    public config: AppConfiguration,
    public state: AppState,
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer
  ) {
    router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => this.menuOpen.set(false));

    breakpoints.observe('(max-width: 1040px)').pipe(
      takeUntilDestroyed()
    ).subscribe(() => this.menuOpen.set(false));

    for (const [name, svg] of Object.entries(this.config.HOME_VIEW_ICONS)) {
      iconRegistry.addSvgIconLiteralInNamespace('app-navbar', name, sanitizer.bypassSecurityTrustHtml(svg));
    }
  }

  closeMenu(toggle: MatIconButton): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      toggle.focus();
    }
  }

  onLanguageChanged(lang: string) {
    this.translator.use(lang);
  }

  ngOnInit(): void {
    this.onLanguageChanged('cs');
  }

  gotoView(view: {header: string, text: string, route: string}) {
    window.scroll(0, 0);
    this.state.currentView = view;
    //this.setFilters();
    //if (this.state.hasStateInUrl()) {
      this.router.navigate([view.route], { queryParams: { s: this.state.encodeState() } });
    //}
  }
}
