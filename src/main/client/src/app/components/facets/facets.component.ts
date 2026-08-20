import { Component, effect, inject, input, output, signal } from '@angular/core';
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
import { AppConfiguration } from '../../app-configuration';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-facets',
  imports: [TranslateModule, MatExpansionModule, MatListModule,
    MatCheckboxModule, MatTooltipModule, MatIconModule, MatButtonModule,
    MatAutocompleteModule, MatInputModule, MatFormFieldModule,
    FormsModule, ReactiveFormsModule],
  templateUrl: './facets.component.html',
  styleUrl: './facets.component.scss'
})
export class FacetsComponent {

  readonly router = inject(Router);

  showTenants = input<boolean>(true);
  renderLists = input<boolean>(true);
  colored = input<boolean>(false);
  facets = input<FacetFields>();
  fields = input<string[]>([]);
  sub_fields = input<{ [key: string]: string }>({});

  onFiltersChanged = output<{ field: string, value: string, op: string }[]>();
  onMouserOver = output<{ field: string, value: string }>();
  onMouseOut = output<{ field: string, value: string }>();

  hasUsedFacets: boolean;
  usedFacets: { field: string, value: string, op: string }[] = [];

  //filteredOptions: Observable<string[]>;
  filteredOptions: string[];
  controls: { [name: string]: FormControl<string> } = {};

  allSelected: undefined;
  facetsFiltered = signal<FacetFields>({});

  log(e: any) {
    console.log(e)
  }

  constructor(public config: AppConfiguration, public state: AppState) {

    effect(() => {
      this.usedFacets = this.state.usedFacets();
      this.hasUsedFacets = this.usedFacets.length > 0;
    })

    effect(() => {
      const fs = this.fields();
      this.facetsFiltered.set({...this.facets()});
      if (fs && this.facets()) {
        fs.forEach(f => {
          if (this.facets()[f]) {
            const c = new FormControl();
            c.valueChanges.subscribe(v => {
              //this.filteredOptions = this._filter(v, f);
              const filteredOptions: JSONFacet[] = this._filter(v, f);
              this.facetsFiltered.update((ff: FacetFields) => ({
                ...ff,
                [f]: {buckets : filteredOptions}
              }));
            });
            this.controls[f] = c;
          }
        })
      }

    })
  } 

  normalize(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  

  private _filter(value: string, f: string): JSONFacet[] {
    //const options = this.facets()[f].buckets.map(b => b.val);
    const options = this.facets()[f].buckets;
    const filterValue = this.normalize(value);
    return options.filter(option => this.normalize(option.val).includes(filterValue));
  }

  someSelected() {
    const sel = this.state.selectedTenants().length;
    return sel > 0 && sel < this.state.tenants().length;
  }

  toggleAll() {
    this.state.tenants().forEach(t => t.selected = this.allSelected);
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });
  }

  clickTenant(t: Tenant) {
    this.router.navigate([], { queryParams: { s: this.state.encodeState() } });
  }

  isUsed(field: string, value: string) {
    return this.usedFacets.findIndex(f => f.field === field && f.value === value) > -1;
  }

  clearAuto(f: string) {
    this.controls[f].setValue('')
  }

  selectAuto(e: MatAutocompleteSelectedEvent, f: string) {
    this.filter(f, e.option.value, '')
  }

  filter(field: string, value: string, op: string) {
    const uf = this.usedFacets.find(f => f.field === field && f.value === value);
    if (uf) {
      this.usedFacets = this.usedFacets.filter(f => !(f.field === field && f.value === value));
    } else {
      this.usedFacets.push({ field, value, op });
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

  clickHeader(e: any, field: string, value: string, op: string) {
    e.stopPropagation();
    this.filter(field, value, op);
  }
}
