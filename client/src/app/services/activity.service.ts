import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Activity } from '../models/activity.model';


//------------------------------------admin use only-------------------------------------------------
const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011'; // default NGO ID for new activities without a specified NGO

export interface ActivityFormValue { // represents the raw form values for creating/updating an activity
    activityName: string;
    cutoff: string;
    description: string;
    endTime: string;
    id: string;
    location: string;
    offered: number;
    startTime: string;
    whenDate: string;
}

export interface ActivityFormContext { // form context for CU an activity
    editingId: string | null;
    editingNgoId: string;
    editingQrCode: string;
    editingStatus: Activity['status'];
    editingTaken: number;
    isEditing: boolean;
}
//------------------------------------------------------------------------------------------------------


@Injectable({
  providedIn: 'root'
})
export class ActivityService {
    //private url = 'http://localhost:3000';
    private url = '';
    activities$ = signal<Activity[]>([]);
    activity$ = signal<Activity>({} as Activity);

    constructor(private httpClient: HttpClient) { }

    private refreshActivities() {
        this.httpClient.get<Activity[]>(`${this.url}/activity`)
        .subscribe(activities => {
            this.activities$.set(activities);
        });
    }

    getActivities() {
        this.refreshActivities();
        return this.activities$();
    }

    getActivity(id: string) {
        this.httpClient.get<Activity>(`${this.url}/activity/${id}`).subscribe(activity => {
        this.activity$.set(activity);
        return this.activity$();
        });
    }

    createActivity(activity: Activity) {
        return this.httpClient.post(`${this.url}/activity`, activity, { responseType: 'text' });
    }

    updateActivity(id: string, activity: Activity) {
        return this.httpClient.put(`${this.url}/activity/${id}`, activity, { responseType: 'text' });
    }

    deleteActivity(id: string) {
        return this.httpClient.delete(`${this.url}/activity/${id}`, { responseType: 'text' });
    }




    //------------------------------------admin use only-------------------------------------------------
    // combines raw form values and editing context to build a complete Activity object for API requests
    buildActivityPayload(raw: ActivityFormValue, context: ActivityFormContext): Activity {
        const date = this.normalizeDate(raw.whenDate);
        const id = context.isEditing && context.editingId ? context.editingId : this.generateId();

        const maxSlots = Math.max(1, Number(raw.offered || 1));
        const taken = Math.min(Number(context.editingTaken || 0), maxSlots);

        const startTime = this.toTimestamp(date, raw.startTime);
        const endTime = this.toTimestamp(date, raw.endTime);
        const cutoff = this.normalizeDateTime(raw.cutoff);

        const activity: Activity = {
            _id: id,
            ngo_id: context.editingNgoId || DEFAULT_NGO_ID,
            name: raw.activityName,
            date,
            start_time: startTime,
            end_time: endTime,
            max_slots: maxSlots,
            slots_taken: taken,
            cutoff_datetime: cutoff,
            status: 'Open',
            qr_code: context.editingQrCode || '',
            location: raw.location,
            description: raw.description || '',
            ngo_name: '',
            participant_user_ids: [],
        };

        activity.status = this.getStatus(activity, taken);
        return activity;
    }

    toFormValue(activity: Activity): ActivityFormValue {// converts activity data into form values for edit mode
        return {
            id: String(activity._id ?? '').trim(),
            activityName: activity.name,
            location: String(activity.location ?? '').trim(),
            whenDate: this.toDateOnly(activity.date),
            startTime: this.formatTime(activity.start_time),
            endTime: this.formatTime(activity.end_time),
            offered: Number(activity.max_slots ?? 1),
            description: String(activity.description ?? ''),
            cutoff: this.toDateTimeLocal(activity.cutoff_datetime),
        };
    }

    displayWhen(activity: Activity): string {
        return `${this.toDateOnly(activity.date)} ${this.formatTime(activity.start_time)}-${this.formatTime(activity.end_time)}`;
    }

    cutoffParts(cutoff: string | Date): { date: string; time: string } {
        const text = this.toDateTimeLocal(cutoff);
        const [date, time = ''] = text.split('T');
        return { date, time };
    }

    getRemainingSlots(activity: Activity, taken = Number(activity.slots_taken ?? 0)): number {
        return Math.max(0, Number(activity.max_slots ?? 0) - taken);
    }

    getStatus(activity: Activity, taken = Number(activity.slots_taken ?? 0)): Activity['status'] {
        const cutoffTime = new Date(String(activity.cutoff_datetime ?? '')).getTime();
        const maxSlots = Number(activity.max_slots ?? 0);

        if (!Number.isNaN(cutoffTime) && cutoffTime <= Date.now()) return 'Closed';
        if (taken >= maxSlots) return 'Full';
        return 'Open';
    }

    private toDateOnly(value: string | Date): string { // formats a date value to 'YYYY-MM-DD' 
        return this.normalizeDate(String(value ?? '')).split('T')[0] ?? '';
    }

    private toDateTimeLocal(value: string | Date): string { // formats a date-time value to 'YYYY-MM-DDTHH:MM' for use in datetime-local input fields
        const text = this.normalizeDateTime(String(value ?? ''));
        if (!text) return '';
        return text.includes('T') ? text.slice(0, 16) : text;
    }

    private formatTime(value: number | string): string { // formats a time value to 'HH:MM'
        if (typeof value === 'number') {
            return new Date(value).toTimeString().slice(0, 5);
        }

        const text = String(value ?? '').trim();
        if (!text) return '';
        if (/^\d{1,2}:\d{2}$/.test(text)) return text.padStart(5, '0');
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5).padStart(5, '0');

        const maybeNumber = Number(text);
        if (!Number.isNaN(maybeNumber) && text.length >= 10) {
            return new Date(maybeNumber).toTimeString().slice(0, 5);
        }

        return text.slice(0, 5).padStart(5, '0');
    }

    private toTimestamp(dateText: string, timeText: string): number { // converts date and time strings into a timestamp
        const time = (timeText || '00:00').padStart(5, '0');
        return new Date(`${dateText}T${time}:00`).getTime();
    }

    private normalizeDate(value: string): string { // normalizes a date string to 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' format
        return String(value ?? '').trim().replaceAll('/', '-');
    }

    private normalizeDateTime(value: string): string { // normalizes a date-time string to 'YYYY-MM-DDTHH:MM' format
        const text = String(value ?? '').trim().replaceAll('/', '-');
        if (!text) return '';
        return text.includes('T') ? text : text.replace(' ', 'T');
    }

    private generateId(): string { // generates a unique ID 
        const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
        let random = '';

        while (random.length < 16) {
            random += Math.random().toString(16).slice(2);
        }

        return (timestamp + random.slice(0, 16)).slice(0, 24);
    }
}