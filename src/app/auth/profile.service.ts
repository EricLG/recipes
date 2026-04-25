import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserProfile {
    name: string;
    email: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProfileService {

    private readonly http = inject(HttpClient);

    public getMyProfile(): Observable<UserProfile> {
        return this.http.get<UserProfile>('/api/users/my-profile');
    }

    public updatePassword(oldPassword: string, newPassword: string): Observable<void> {
        return this.http.put<void>('/api/users/my-profile/password', { oldPassword, newPassword });
    }

}
