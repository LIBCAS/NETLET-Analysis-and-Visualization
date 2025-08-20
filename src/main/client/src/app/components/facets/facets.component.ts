import { Component, effect, input, output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { FacetFields, JSONFacet } from '../../shared/facet';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-facets',
  imports: [TranslateModule, MatExpansionModule, MatListModule,
    MatCheckboxModule, MatTooltipModule, MatIconModule
  ],
  templateUrl: './facets.component.html',
  styleUrl: './facets.component.scss'
})
export class FacetsComponent {

  facets = input<FacetFields>();
  fields = input<string[]>([]);
  
  onFiltersChanged = output<{field: string, value: string}[]>();

  hasUsedFacets: boolean;
  usedFacets: {field: string, value: string}[] = [];

  constructor() {}

  isUsed(field: string, value: string) {
    return this.usedFacets.findIndex(f => f.field === field && f.value === value) > -1;
  }
  
  filter(field: string, value: string) {
    const uf = this.usedFacets.find(f => f.field === field && f.value === value);
    if (uf) {
      this.usedFacets = this.usedFacets.filter(f => !(f.field === field && f.value === value));
    } else {
      this.usedFacets.push({field, value});
    }
    this.hasUsedFacets = this.usedFacets.length > 0;
    this.onFiltersChanged.emit(this.usedFacets);
  }

  unfilter(field: string, value: string) {
    this.usedFacets = this.usedFacets.filter(f => !(f.field === field && f.value === value));
    this.onFiltersChanged.emit(this.usedFacets);
  }
}
