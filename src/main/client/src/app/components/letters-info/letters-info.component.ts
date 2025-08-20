import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfiguration } from '../../app-configuration';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-letters-info',
  imports: [TranslateModule, MatTooltipModule, MatIconModule,
    MatCardModule, MatButtonModule, MatTableModule],
  templateUrl: './letters-info.component.html',
  styleUrl: './letters-info.component.scss'
})
export class LettersInfoComponent {
  header = input<string>('');
  content = input<string>('');
  fields = input<string[]>([]);
  data = input<any[]>([]);
  onClose = output<boolean>();

  constructor(public config: AppConfiguration){}

  close() {
    this.onClose.emit(true)
  }

  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }
}
