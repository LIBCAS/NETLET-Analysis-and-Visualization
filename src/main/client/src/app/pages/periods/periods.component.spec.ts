import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodsComponent } from './periods.component';

describe('KeywordsComponent', () => {
  let component: PeriodsComponent;
  let fixture: ComponentFixture<PeriodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeriodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
