import { Activity } from '../../../models/activity.model';

export const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011';

export interface ActivityFormValue {
  activityName: string;
  ngoName: string;
  cutoff: string;
  description: string;
  endTime: string;
  id: string;
  location: string;
  offered: number;
  startTime: string;
  whenDate: string;
}

export interface ActivityFormContext {
  editingId: string | null;
  editingNgoId: string;
  editingQrCode: string;
  editingStatus: Activity['status'];
  editingTaken: number;
  isEditing: boolean;
}

export function buildActivityPayload(
  raw: ActivityFormValue,
  context: ActivityFormContext,
): Activity {
  const date = normalizeDate(raw.whenDate);
  const id = context.isEditing && context.editingId ? context.editingId : generateId();

  const maxSlots = Math.max(1, Number(raw.offered || 1));
  const taken = Math.min(Number(context.editingTaken || 0), maxSlots);

  const startTime = toTimestamp(date, raw.startTime);
  const endTime = toTimestamp(date, raw.endTime);
  const cutoff = normalizeDateTime(raw.cutoff);

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
    status: context.editingStatus || 'Open',
    qr_code: context.editingQrCode || '',
    location: raw.location,
    description: raw.description || '',
    ngo_name: raw.ngoName || '',
    participant_user_ids: [],
  };

  activity.status = getStatus(activity, taken);
  return activity;
}

export function toFormValue(activity: Activity): ActivityFormValue {
  return {
    id: String(activity._id ?? '').trim(),
    activityName: activity.name,
    ngoName: String(activity.ngo_name ?? '').trim(),
    location: String(activity.location ?? '').trim(),
    whenDate: toDateOnly(activity.date),
    startTime: formatTime(activity.start_time),
    endTime: formatTime(activity.end_time),
    offered: Number(activity.max_slots ?? 1),
    description: String(activity.description ?? ''),
    cutoff: toDateTimeLocal(activity.cutoff_datetime),
  };
}

export function displayWhen(activity: Activity): string {
  return `${toDateOnly(activity.date)} ${formatTime(activity.start_time)}-${formatTime(activity.end_time)}`;
}

export function cutoffParts(cutoff: string | Date): { date: string; time: string } {
  const text = toDateTimeLocal(cutoff);
  const [date, time = ''] = text.split('T');
  return { date, time };
}

export function getRemainingSlots(
  activity: Activity,
  taken = Number(activity.slots_taken ?? 0),
): number {
  return Math.max(0, Number(activity.max_slots ?? 0) - taken);
}

export function getStatus(
  activity: Activity,
  taken = Number(activity.slots_taken ?? 0),
): Activity['status'] {
  const cutoffTime = new Date(String(activity.cutoff_datetime ?? '')).getTime();
  const maxSlots = Number(activity.max_slots ?? 0);

  if (!Number.isNaN(cutoffTime) && cutoffTime <= Date.now()) return 'Closed';
  if (taken >= maxSlots) return 'Full';
  return 'Open';
}

function toDateOnly(value: string | Date): string {
  return normalizeDate(String(value ?? '')).split('T')[0] ?? '';
}

function toDateTimeLocal(value: string | Date): string {
  const text = normalizeDateTime(String(value ?? ''));
  if (!text) return '';
  return text.includes('T') ? text.slice(0, 16) : text;
}

function formatTime(value: number | string): string {
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

function toTimestamp(dateText: string, timeText: string): number {
  const time = (timeText || '00:00').padStart(5, '0');
  return new Date(`${dateText}T${time}:00`).getTime();
}

function normalizeDate(value: string): string {
  return String(value ?? '').trim().replaceAll('/', '-');
}

function normalizeDateTime(value: string): string {
  const text = String(value ?? '').trim().replaceAll('/', '-');
  if (!text) return '';
  return text.includes('T') ? text : text.replace(' ', 'T');
}

function generateId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  let random = '';

  while (random.length < 16) {
    random += Math.random().toString(16).slice(2);
  }

  return (timestamp + random.slice(0, 16)).slice(0, 24);
}
