import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogsInTimeComponent } from './catalogs-in-time.component';

describe('CatalogsInTimeComponent', () => {
  let component: CatalogsInTimeComponent;
  let fixture: ComponentFixture<CatalogsInTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogsInTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogsInTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
