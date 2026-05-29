
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppState } from '../../app-state';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-home',
  imports: [RouterModule, TranslateModule, FormsModule,
    MatCardModule, MatButtonModule, MatFormFieldModule,  MatInputModule,
    MatSelectModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  // searchModel = signal({
  //   tenants: [],
  //   identities: '',
  //   places: '',
  //   keywords: '',
  // });

  // searchForm = form(this.searchModel);

  identities: string;
  places: string;
  keywords: string;

  constructor(public state: AppState){}

  ngOnInit() {
    this.state.tenants.forEach(t => {t.available = true});
  }

  setFilters() {
    // const usedFacets: {field: string, value: string}[] = [];
    // if (uf) {
    //   this.usedFacets.push({field, value});
    // }
    // this.hasUsedFacets = this.usedFacets.length > 0;

    // this.state.usedFacets.update(f => [...this.usedFacets]);
    // this.router.navigate([], { queryParams: { s: this.state.encodeState() } });
  }

  search() {

  }

}
