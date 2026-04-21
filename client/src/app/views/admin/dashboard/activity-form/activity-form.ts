import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-form.html',
  styleUrl: './activity-form.css',
})
export class ActivityFormComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input() isEditing = false;
  @Input() ngos: any[] = [];

  @Output() formValueChange = new EventEmitter<any>();
  @Output() formAction = new EventEmitter<'submit' | 'clear' | 'close'>();

  emitFormValueChange(): void {
    this.formValueChange.emit(this.formGroup.getRawValue());
  }

  submit(): void {
    this.emitFormValueChange();
    this.formAction.emit('submit');
  }

  clear(): void {
    this.formAction.emit('clear');
  }

  close(): void {
    this.formAction.emit('close');
  }
}
