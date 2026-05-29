import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing';

import { IdentitiesComponent } from './identities.component';

describe('IdentitiesComponent', () => {
  let component: IdentitiesComponent;
  let fixture: ComponentFixture<IdentitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentitiesComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdentitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
