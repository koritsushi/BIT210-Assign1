export interface notification {
    id: number,
    user_id: number,
    activity_id: number,
    type: string,
    message: string,
    sent_at: Date,
    scheduled_at: Date
}