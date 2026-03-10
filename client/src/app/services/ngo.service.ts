import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ngo } from '../models/ngo.model';

@Injectable({
  providedIn: 'root'
})
export class NgoService {
  //private url = 'http://localhost:3000';
  private url = '';
  ngos$ = signal<Ngo[]>([]);
  ngo$ = signal<Ngo>({} as Ngo);
  
  constructor(private httpClient: HttpClient) { }

  private refreshNgo() {
    this.httpClient.get<Ngo[]>(`${this.url}/ngo`)
      .subscribe(ngos => {
        this.ngos$.set(ngos);
      });
  }

  getNgos() {
    this.refreshNgo();
    return this.ngos$();
  }

  getNgo(id: string) {
    this.httpClient.get<Ngo>(`${this.url}/ngo/${id}`).subscribe(ngo => {
      this.ngo$.set(ngo);
      return this.ngos$();
    });
  }

  createNgo(ngo: Ngo) {
    return this.httpClient.post(`${this.url}/ngo`, ngo, { responseType: 'text' });
  }

  updateNgo(id: string, ngo: Ngo) {
    return this.httpClient.put(`${this.url}/ngo/${id}`, ngo, { responseType: 'text' });
  }

  deleteNgo(id: string) {
    return this.httpClient.delete(`${this.url}/ngo/${id}`, { responseType: 'text' });
  }
}