import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Letter } from '../../shared/letter';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-letters-info',
  imports: [CommonModule,
    MatCardModule, MatButtonModule],
  templateUrl: './letters-info.component.html',
  styleUrl: './letters-info.component.scss'
})
export class LettersInfoComponent {
  header = input<string>('');
  content = input<string>('');
  onClose = output<boolean>()

  close() {
    this.onClose.emit(true)
  }
}
