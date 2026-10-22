import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing';

import { DialogLettersInfoComponent } from './dialog-letters-info.component';

describe('DialogLettersInfoComponent', () => {
  let component: DialogLettersInfoComponent;
  let fixture: ComponentFixture<DialogLettersInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogLettersInfoComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogLettersInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
