import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LettersInfoComponent } from './letters-info.component';

describe('LettersInfoComponent', () => {
  let component: LettersInfoComponent;
  let fixture: ComponentFixture<LettersInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LettersInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LettersInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
