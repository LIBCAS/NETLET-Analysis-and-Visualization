import { Component, computed, inject, Inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Letter } from '../../shared/letter';
import { LettersTableComponent } from '../letters-table/letters-table.component';

interface DialogLettersInfoData {
  type?: string;
  typeData?: string | { header: string; docs: Letter[] };
  header: string;
  content?: string | null;
  fields: string[];
  data: Letter[];
}

@Component({
  selector: 'app-dialog-letters-info',
  imports: [
    TranslateModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckbox,
    LettersTableComponent,
  ],
  templateUrl: './dialog-letters-info.component.html',
  styleUrl: './dialog-letters-info.component.scss',
})
export class DialogLettersInfoComponent {
  private translation = inject(TranslateService);
  private language = toSignal(this.translation.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.translation.currentLang,
  });

  readonly showFrom = signal(true);
  readonly showTo = signal(true);
  readonly linkSwapped = signal(false);
  readonly reversedLink = computed(() => this.data.typeData && typeof this.data.typeData === 'object'
    ? this.data.typeData : null);
  readonly filteredData = computed(() => {
    if (this.data.type === 'place') {
      const place = this.data.typeData;
      return this.data.data.filter(letter =>
        (this.showFrom() && this.matchesPlace(letter.origin_id, place)) ||
        (this.showTo() && this.matchesPlace(letter.destination_id, place)));
    }
    return this.linkSwapped() ? this.reversedLink()?.docs ?? [] : this.data.data;
  });
  readonly computedHeader = computed(() => {
    this.language();
    const header = this.linkSwapped() ? this.reversedLink()?.header ?? this.data.header : this.data.header;
    if (this.data.type === 'place') {
      const place = this.data.data.flatMap(letter => letter.places ?? [])
        .find(place => this.matchesPlace(String(place.id), this.data.typeData));
      return this.translation.instant('letters_info.place_title', {
        place: place?.name ?? header.replace(/^Letters from\/to\s+/, ''),
        count: this.filteredData().length,
      });
    }
    if (this.data.type === 'link') {
      return this.translation.instant('letters_info.link_title', {
        route: header.replace(/^Letters from\s+/, '').replace(/\s+\(\d+\)$/, '').replace(/ > /g, ' → '),
        count: this.filteredData().length,
      });
    }
    return header;
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogLettersInfoData) {}

  swapLink() {
    this.linkSwapped.update(swapped => !swapped);
  }

  private matchesPlace(value: string | string[] | undefined, place: DialogLettersInfoData['typeData']): boolean {
    return typeof place === 'string' && (Array.isArray(value) ? value.includes(place) : value === place);
  }
}
