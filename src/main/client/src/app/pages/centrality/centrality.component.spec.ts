import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing';

import { CentralityComponent } from './centrality.component';

describe('CentralityComponent', () => {
  let component: CentralityComponent;
  let fixture: ComponentFixture<CentralityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentralityComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentralityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
