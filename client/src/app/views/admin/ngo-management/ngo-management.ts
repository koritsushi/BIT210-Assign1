import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Ngo } from '../../../models/ngo.model';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';

type NgoStatus = 'Active' | 'Inactive';

interface NgoFormValue {
  name: string;
  description: string;
  location: string;
  serviceType: string;
  status: NgoStatus;
}

@Component({
  selector: 'app-ngo-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ngo-management.html',
  styleUrl: './ngo-management.css',
})
export class NgoManagement implements OnInit {
  private activityService = inject(ActivityService);
  private ngoService = inject(NgoService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  activities = this.activityService.activities$;
  ngos = this.ngoService.ngos$;
  linkedNgoRefs = computed(() => {
    const ids = new Set<string>();
    const names = new Set<string>();

    for (const activity of this.activities()) {
      const ngoId = this.toText(activity.ngo_id);
      if (ngoId) {
        ids.add(ngoId);
        continue;
      }

      const ngoName = this.normalizeText(activity.ngo_name);
      if (ngoName) {
        names.add(ngoName);
      }
    }

    return { ids, names };
  });

  showForm = false;
  isEditing = false;
  isSubmitting = false;
  editingId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    location: ['', Validators.required],
    serviceType: ['', Validators.required],
    status: ['Active' as NgoStatus, Validators.required],
  });

  ngOnInit(): void {
    this.loadData();
  }

  openCreateForm(): void {
    this.isSubmitting = false;
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset({
      name: '',
      description: '',
      location: '',
      serviceType: '',
      status: 'Active',
    });
  }

  closeForm(): void {
    this.isSubmitting = false;
    this.showForm = false;
  }

  edit(ngo: Ngo): void {
    this.isSubmitting = false;
    this.showForm = true;
    this.isEditing = true;
    this.editingId = this.getNgoId(ngo);
    this.form.reset(toFormValue(ngo));
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please fill all required NGO fields before saving.');
      return;
    }

    const raw = this.form.getRawValue() as NgoFormValue;
    const payload = toNgoPayload(raw, this.editingId);
    const restoreEditingId = this.editingId;
    const restoreIsEditing = this.isEditing;
    const restoreFormValue = { ...raw };
    const request =
      this.isEditing && this.editingId
        ? this.ngoService.updateNgo(this.editingId, payload)
        : this.ngoService.createNgo(payload);

    this.isSubmitting = true;
    this.showForm = false;
    this.router.navigate(['/admin/ngos']);

    request.pipe(
      finalize(() => {
        this.isSubmitting = false;
      }),
    ).subscribe({
      next: () => {
        this.editingId = null;
        this.isEditing = false;
        this.loadData();
      },
      error: (error) => {
        this.showForm = true;
        this.editingId = restoreEditingId;
        this.isEditing = restoreIsEditing;
        this.form.reset(restoreFormValue);
        const fallback = this.isEditing ? 'Failed to update NGO.' : 'Failed to create NGO.';
        alert(this.getRequestErrorMessage(error, fallback));
      },
    });
  }

  remove(ngo: Ngo): void {
    const id = this.getNgoId(ngo);
    if (!id) return;

    if (this.isNgoInUse(ngo)) {
      alert('This NGO is linked to one or more activities and cannot be deleted.');
      return;
    }

    this.ngoService.deleteNgo(id).subscribe({
      next: () => {
        if (this.editingId === id) {
          this.closeForm();
        }
        this.loadData();
      },
      error: (error) => {
        alert(this.getRequestErrorMessage(error, 'Failed to delete NGO.'));
      },
    });
  }

  getNgoId(ngo: Ngo): string {
    return String(ngo._id ?? '').trim();
  }

  getStatusLabel(ngo: Ngo): NgoStatus {
    return ngo.is_active ? 'Active' : 'Inactive';
  }

  isNgoInUse(ngo: Ngo): boolean {
    const refs = this.linkedNgoRefs();
    const ngoId = this.getNgoId(ngo);

    if (ngoId && refs.ids.has(ngoId)) {
      return true;
    }

    const ngoName = this.normalizeText(ngo.name);
    return Boolean(ngoName && refs.names.has(ngoName));
  }

  getDeleteHint(ngo: Ngo): string {
    return this.isNgoInUse(ngo)
      ? 'This NGO is used by an activity and cannot be deleted.'
      : 'Delete NGO';
  }

  trackNgo(index: number, ngo: Ngo): string {
    return this.getNgoId(ngo) || String(index);
  }

  private loadData(): void {
    this.activityService.getActivities();
    this.ngoService.getNgos();
  }

  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeText(value: unknown): string {
    return this.toText(value).toLowerCase();
  }

  private getRequestErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverMessage =
        typeof error.error === 'string'
          ? error.error.trim()
          : typeof error.error?.message === 'string'
            ? error.error.message.trim()
            : '';

      return serverMessage || fallback;
    }

    return fallback;
  }
}

function toFormValue(ngo: Ngo): NgoFormValue {
  return {
    name: ngo.name,
    description: ngo.description ?? '',
    location: ngo.location,
    serviceType: ngo.service_type,
    status: ngo.is_active ? 'Active' : 'Inactive',
  };
}

function toNgoPayload(raw: NgoFormValue, editingId: string | null): Ngo {
  const ngo: Ngo = {
    name: String(raw.name ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    location: String(raw.location ?? '').trim(),
    service_type: String(raw.serviceType ?? '').trim(),
    is_active: raw.status === 'Active',
  };

  if (editingId) {
    ngo._id = editingId;
  }

  return ngo;
}
