
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppState, Tenant } from '../../app-state';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule, MatCheckboxModule, FormsModule, RouterModule, TranslateModule, MatMenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  constructor(
    private router: Router,
    public dialog: MatDialog,
    public translator: TranslateService,
    public state: AppState
  ) { }

  onLanguageChanged(lang: string) {
    //localStorage.setItem('lang', lang);
    this.translator.use(lang);
  }

  ngOnInit(): void {
    this.onLanguageChanged('cs');
  }

  changeTenant(t: Tenant) {
    this.state.changeMainTenant(t);
    this.router.navigate([], {queryParams: {tenant:t.val}});
    //this.state.tenant.set(t);
  }

  selectTenant(t: Tenant) {
    this.state.setSelectedTenants();
    this.router.navigate([], {queryParams: {tenant:this.state.tenants.filter(t => t.selected).map(t => t.val).toString()}});
    //this.state.tenant.set(t);
  }

  formatTenants() {
    return this.state.selectedTenants().map(t => t.val)
  }
}
