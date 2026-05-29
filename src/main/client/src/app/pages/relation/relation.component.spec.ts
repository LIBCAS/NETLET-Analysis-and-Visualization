import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing';

import { RelationComponent } from './relation.component';

describe('RelationComponent', () => {
  let component: RelationComponent;
  let fixture: ComponentFixture<RelationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
