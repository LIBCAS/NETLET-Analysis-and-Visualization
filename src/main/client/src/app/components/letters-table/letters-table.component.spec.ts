import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LettersTableComponent } from './letters-table.component';

describe('LettersTableComponent', () => {
  let component: LettersTableComponent;
  let fixture: ComponentFixture<LettersTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LettersTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LettersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
