import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
    users$ = signal<User[]>([]);
    user$ = signal<User>({} as User);
    
    constructor(private httpClient: HttpClient) { }

    private refreshUsers() {
        this.httpClient.get<User[]>(`/users`)
        .subscribe(users => {
            this.users$.set(users);
        });
    }

    getUsers() {
        this.refreshUsers();
        return this.users$();
    }

    getUser(id: string) {
        this.httpClient.get<User>(`/users/${id}`).subscribe(user => {
        this.user$.set(user);
        return this.user$();
        });
    }

    createUser(user: User) {
        return this.httpClient.post(`/users`, user, { responseType: 'text' });
    }

    updateUser(id: string, user: User) {
        return this.httpClient.put(`/users/${id}`, user, { responseType: 'text' });
    }

    deleteUser(id: string) {
        return this.httpClient.delete(`/users/${id}`, { responseType: 'text' });
    }
}
