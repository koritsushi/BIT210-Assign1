import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationForm } from './notification-form';

describe('NotificationForm', () => {
  let component: NotificationForm;
  let fixture: ComponentFixture<NotificationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationForm],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
