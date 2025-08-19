import { Component, effect, input, output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { FacetFields, JSONFacet } from '../../shared/facet';

@Component({
  selector: 'app-facets',
  imports: [TranslateModule, MatExpansionModule, MatListModule

  ],
  templateUrl: './facets.component.html',
  styleUrl: './facets.component.scss'
})
export class FacetsComponent {

  facets = input<FacetFields>();

  hasUsedFacets: boolean;
  fields: string[];

  constructor() {
    effect(() => {
      const f = this.facets();
      this.fields = Object.keys(f);
      // this.fields
      
    })
  }
  
  onFiltersChanged = output<FacetFields>();
  
    filter(k: JSONFacet) {
      k.selected = !k.selected;
      this.onFiltersChanged.emit(this.facets());
    }
  
    unfilter(list: JSONFacet[], val: string) {
      const k: JSONFacet = list.find(f => f.val === val);
      k.selected = !k.selected;
      this.onFiltersChanged.emit(this.facets());
    }
}
