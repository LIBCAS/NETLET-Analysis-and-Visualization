import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearsChartComponent } from './years-chart.component';

describe('YearsChartComponent', () => {
  let component: YearsChartComponent;
  let fixture: ComponentFixture<YearsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YearsChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YearsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
