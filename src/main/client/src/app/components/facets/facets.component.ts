import { Component, effect, inject, input, output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { FacetFields, JSONFacet } from '../../shared/facet';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormArray, FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { map, Observable, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AppState, Tenant } from '../../app-state';
import { Router } from '@angular/router';

@Component({
  selector: 'app-facets',
  imports: [TranslateModule, MatExpansionModule, MatListModule,
    MatCheckboxModule, MatTooltipModule, MatIconModule,
    MatAutocompleteModule, MatInputModule, MatFormFieldModule,
    FormsModule, ReactiveFormsModule],
  templateUrl: './facets.component.html',
  styleUrl: './facets.component.scss'
})
export class FacetsComponent {

  readonly router = inject(Router);

  showTenants = input<boolean>(true);
  renderLists = input<boolean>(true);
  facets = input<FacetFields>();
  fields = input<string[]>([]);
  sub_fields = input<{ [key: string]: string }>({});

  onFiltersChanged = output<{ field: string, value: string }[]>();
  onMouserOver = output<{ field: string, value: string }>();
  onMouseOut = output<{ field: string, value: string }>();

  hasUsedFacets: boolean;
  usedFacets: { field: string, value: string }[] = [];

  //filteredOptions: Observable<string[]>;
  filteredOptions: string[];
  controls: { [name: string]: FormControl<string> } = {};

  log(e: any) {
    console.log(e)
  }

  constructor(public state: AppState) {

    effect(() => {
      this.usedFacets = this.state.usedFacets();
      this.hasUsedFacets = this.usedFacets.length > 0;
    })

    effect(() => {
      const fs = this.fields();
      if (fs && this.facets()) {
        fs.forEach(f => {
          if (this.facets()[f]) {
            const c = new FormControl();
            c.valueChanges.subscribe(v => {
              this.filteredOptions = this._filter(v, f);
            });
            // this.filteredOptions = c.valueChanges.pipe(
            //   startWith(''),
            //   map(value => this._filter(value || '', f)),
            // );
            this.controls[f] = c;
          }
        })
      }

      // this.state.tenants().forEach(t => {
      //   if (this.facets()['tenants']?.buckets.find(b => b.val === t.val)) {
      //     t.selected = true;
      //   }
      // })
    })
  }

  private _filter(value: string, f: string): string[] {
    const options = this.facets()[f].buckets.map(b => b.val);
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }

  clickTenant(t: Tenant) {
    // this.state.setSelectedTenants();
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });
  }

  isUsed(field: string, value: string) {
    return this.usedFacets.findIndex(f => f.field === field && f.value === value) > -1;
  }

  clearAuto(f: string) {
    this.controls[f].setValue('')
  }

  selectAuto(e: MatAutocompleteSelectedEvent, f: string) {
    this.filter(f, e.option.value)
  }

  filter(field: string, value: string) {
    const uf = this.usedFacets.find(f => f.field === field && f.value === value);
    if (uf) {
      this.usedFacets = this.usedFacets.filter(f => !(f.field === field && f.value === value));
    } else {
      this.usedFacets.push({ field, value });
    }
    this.hasUsedFacets = this.usedFacets.length > 0;

    this.state.usedFacets.update(f => [...this.usedFacets]);
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });

    // this.onFiltersChanged.emit(this.usedFacets);
  }

  unfilter(field: string, value: string) {
    this.usedFacets = this.usedFacets.filter(f => !(f.field === field && f.value === value));
    this.hasUsedFacets = this.usedFacets.length > 0;

    this.state.usedFacets.update(f => [...this.usedFacets]);
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });


    // this.onFiltersChanged.emit(this.usedFacets);
  }

  fireMouserOver(field: string, value: string) {
    this.onMouserOver.emit({ field, value });
  }

  fireMouseOut(field: string, value: string) {
    this.onMouseOut.emit({ field, value });
  }

  clickHeader(e: any, field: string, value: string) {
    e.stopPropagation();
    this.filter(field, value);
  }
}
