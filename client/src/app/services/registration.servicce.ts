import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Registration } from '../models/registration.model';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  //private url = 'http://localhost:3000';
    private url = '';
    registrations$ = signal<Registration[]>([]);
    registration$ = signal<Registration>({} as Registration);
    
    constructor(private httpClient: HttpClient) { }

    private refreshRegistration() {
        this.httpClient.get<Registration[]>(`${this.url}/registration`)
        .subscribe(registration => {
            this.registrations$.set(registration);
        });
    }

    getRegistrations() {
        this.refreshRegistration();
        return this.registrations$();
    }

    getRegistration(id: string) {
        this.httpClient.get<Registration>(`${this.url}/registration/${id}`).subscribe(registration => {
        this.registration$.set(registration);
        return this.registrations$();
        });
    }

    createRegistration(registration: Registration) {
        return this.httpClient.post(`${this.url}/registration`, registration, { responseType: 'text' });
    }

    updateRegistration(id: string, registration: Registration) {
        return this.httpClient.put(`${this.url}/registration/${id}`, registration, { responseType: 'text' });
    }

    deleteRegistration(id: string) {
        return this.httpClient.delete(`${this.url}/registration/${id}`, { responseType: 'text' });
    }
}