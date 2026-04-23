import { Component, computed, effect, input, output, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfiguration } from '../../app-configuration';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { AppState } from '../../app-state';
import { MatCheckbox } from "@angular/material/checkbox";
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Letter } from '../../shared/letter';


@Component({
  selector: 'app-letters-info',
  imports: [TranslateModule, FormsModule, MatFormFieldModule,
    MatTooltipModule, MatIconModule,
    MatCardModule, MatButtonModule, MatTableModule, MatCheckbox],
  templateUrl: './letters-info.component.html',
  styleUrl: './letters-info.component.scss'
})
export class LettersInfoComponent {
  type = input<string>(''); // typ zobrazeni place|link
  typeData = input<any>(null); // typ zobrazeni place|link
  header = input<string>('');
  content = input<string>('');
  fields = input<string[]>([]);
  data = input<Letter[]>([]);
  onClose = output<boolean>();

  filteredData = signal<Letter[]>([]);
  showFrom = true;
  showTo = true;

  constructor(public config: AppConfiguration,
    public state: AppState
  ){
    effect(() => {
      this.filter();
      const show = this.state.showInfo();
      if (!show) {
        this.onClose.emit(true)
      }
    })
  }

  close() {
    this.onClose.emit(true)
  }

  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }

  filter() {
    if (this.type() === 'place') {
      const f = this.data().filter((letter: Letter) => { return (letter.origin_name +'' === this.typeData() && this.showFrom) || 
        (letter.destination_name +'' === this.typeData() && this.showTo)});
      this.filteredData.set([...f]);
    } else {
      this.filteredData.set([...this.data()]);
    }
    
  }
}
