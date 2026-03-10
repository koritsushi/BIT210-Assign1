import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageNgo } from './manage-ngo';

describe('ManageNgo', () => {
  let component: ManageNgo;
  let fixture: ComponentFixture<ManageNgo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageNgo],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageNgo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
