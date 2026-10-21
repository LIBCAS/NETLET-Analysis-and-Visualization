import { Component, inject, input } from '@angular/core';
import { Identity, Letter, Place } from '../../shared/letter';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfiguration } from '../../app-configuration';

@Component({
  selector: 'app-letters-table',
  imports: [TranslateModule, DatePipe, RouterModule,
    MatProgressBarModule,
    MatButtonModule, MatTableModule, MatPaginatorModule,
    MatListModule, MatIconModule, MatTooltipModule],
  templateUrl: './letters-table.component.html',
  styleUrl: './letters-table.component.scss',
})
export class LettersTableComponent {

  private router = inject<Router>(Router)
  private config = inject<AppConfiguration>(AppConfiguration)

  letters = input.required<Letter[]>();
  displayedColumns = input.required<string[]>();
  target = input<string>('_self');

  viewLetter(id: number, t: string) {
    this.router.navigate(['/letter', id])
  }

  viewLetterInHIKO(id: number, t: string) {
    const tenant = this.config.isTest ? this.config.test_mappings[t] : t;
    window.open(this.config.hikoUrl.replace('{tenant}', tenant).replace('{id}', id + ''), 'hiko');
  }

  letterIdentities(letter: Letter, role: string): Identity[] {
    if (letter.identities) {
      return letter.identities.filter(p => p.role === role);
    }
    return [];
  }

  letterPlaces(letter: Letter, role: string): Place[] {
    if (letter.places) {
      return letter.places.filter(p => p.role === role);
    }
    return [];
  }

}
