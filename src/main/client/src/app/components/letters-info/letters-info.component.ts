import { Component, computed, effect, Inject, input, output, signal } from '@angular/core';
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
import { LettersTableComponent } from '../letters-table/letters-table.component';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';


@Component({
  selector: 'app-letters-info',
  imports: [TranslateModule, FormsModule, MatFormFieldModule,
    MatTooltipModule, MatIconModule, MatDialogModule,
    MatCardModule, MatButtonModule, MatTableModule, MatCheckbox, LettersTableComponent],
  templateUrl: './letters-info.component.html',
  styleUrl: './letters-info.component.scss'
})
export class LettersInfoComponent {

  // type = input<string>(''); // typ zobrazeni place|link
  // typeData = input<any>(null); // typ zobrazeni place|link
  // header = input<string>('');
  // content = input<string>('');
  // fields = input<string[]>([]);
  // data = input<Letter[]>([]);
  onClose = output<boolean>();

  filteredData = signal<Letter[]>([]);
  computedHeader = signal<string>('');
  showFrom = true;
  showTo = true;

  constructor(
    public dialogRef: MatDialogRef<LettersInfoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      type?: string,
      typeData?: any,
      header: string,
      content: any,
      fields: string[],
      data: Letter[]
    },
    public config: AppConfiguration,
    public state: AppState
  ){
    effect(() => {
      //console.log(this.data());
      this.filter();
    })
  }



  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }
  
  linkSwaped = false;
  swapLink() {
    this.linkSwaped = !this.linkSwaped;
    this.filter();
  }

  filter() {
    if (this.data.type === 'place') {
      const f = this.data.data.filter((letter: Letter) => { return (letter.origin_id?.includes(this.data.typeData) && this.showFrom) || 
        (letter.destination_id?.includes(this.data.typeData()) && this.showTo)});
      this.filteredData.set([...f]);
      this.computedHeader.set(this.data.header);
    } else if (this.data.type === 'link') {
      if (this.linkSwaped) {
        this.filteredData.set([...this.data.typeData().docs]);
        this.computedHeader.set(this.data.typeData().header);
      } else {
        this.filteredData.set([...this.data.data]);
        this.computedHeader.set(this.data.header);
      }
      
    } else {
      this.filteredData.set([...this.data.data]);
      this.computedHeader.set(this.data.header);
    }
    
  }
}
