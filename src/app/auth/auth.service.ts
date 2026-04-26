import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthResponse } from '../models/auth';

export interface User {
    email: string;
    role: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
    public readonly currentUser$ = this.currentUserSubject.asObservable();

    constructor() {
        const token = this.getToken();
        if (token) {
            try {
                const user = this.decodeToken(token);
                this.currentUserSubject.next(user);
            } catch (error) {
                // Invalid token, clear it
                localStorage.removeItem('auth_token');
            }
        }
    }

    public login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>('/api/auth/login', { email, password });
    }

    public logout(): void {
        localStorage.removeItem('auth_token');
        this.currentUserSubject.next(null);
        this.router.navigate(['/']);
    }

    public isLoggedIn(): boolean {
        return !!this.currentUserSubject.value;
    }

    public isAdmin(): boolean {
        return this.currentUserSubject.value?.role === 'admin';
    }

    public getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    private decodeToken(token: string): User {
        const payload = token.split('.')[1];
        // JWT uses base64url, convert to base64
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const decoded = atob(paddedBase64);
        const user = JSON.parse(decoded);
        return { email: user.email, role: user.role };
    }

    public setToken(token: string): void {
        localStorage.setItem('auth_token', token);
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
    }

}
