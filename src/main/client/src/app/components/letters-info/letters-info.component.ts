import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-letters-info',
  imports: [MatCardModule, MatButtonModule],
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
