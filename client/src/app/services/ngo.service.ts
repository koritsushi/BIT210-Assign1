import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ngo } from '../models/ngo.model';

@Injectable({
  providedIn: 'root'
})
export class NgoService {
    ngos$ = signal<Ngo[]>([]);
    ngo$ = signal<Ngo>({} as Ngo);
    
    constructor(private httpClient: HttpClient) { }

    private refreshNgo() {
        this.httpClient.get<Ngo[]>(`/ngo`)
        .subscribe(ngos => {
            this.ngos$.set(ngos);
        });
    }

    getNgos() {
        this.refreshNgo();
        return this.ngos$();
    }

    getNgo(id: string) {
        this.httpClient.get<Ngo>(`/ngo/${id}`).subscribe(ngo => {
        this.ngo$.set(ngo);
        return this.ngos$();
        });
    }

    createNgo(ngo: Ngo) {
        return this.httpClient.post(`/ngo`, ngo, { responseType: 'text' });
    }

    updateNgo(id: string, ngo: Ngo) {
        return this.httpClient.put(`/ngo/${id}`, ngo, { responseType: 'text' });
    }

    deleteNgo(id: string) {
        return this.httpClient.delete(`/ngo/${id}`, { responseType: 'text' });
    }
}
