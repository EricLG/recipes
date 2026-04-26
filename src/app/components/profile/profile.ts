import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { ProfileService, UserProfile } from '../../auth/profile.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile.html',
    styleUrls: ['./profile.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {

    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);

    public readonly profile = signal<UserProfile | null>(null);
    public readonly updating = signal(false);
    public readonly successMessage = signal<string | null>(null);
    public readonly errorMessage = signal<string | null>(null);

    public readonly profileForm = this.fb.group({
        oldPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    }, { validators: this.passwordsMatch });

    constructor() {
        this.loadProfile();
    }

    public onSubmit(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        const { oldPassword, newPassword } = this.profileForm.value;
        if (!oldPassword || !newPassword) {
            return;
        }

        this.updating.set(true);
        this.successMessage.set(null);
        this.errorMessage.set(null);

        this.profileService.updatePassword(oldPassword, newPassword).subscribe({
            next: () => {
                this.successMessage.set('Mot de passe modifié avec succès.');
                this.profileForm.reset();
                this.updating.set(false);
            },
            error: (error) => {
                if (error.status === 400 || error.status === 401) {
                    this.errorMessage.set('Mot de passe actuel incorrect.');
                } else {
                    this.errorMessage.set('Erreur lors de la modification du mot de passe.');
                }
                this.updating.set(false);
            }
        });
    }

    public logout(): void {
        this.authService.logout();
    }

    private loadProfile(): void {
        this.profileService.getMyProfile().subscribe({
            next: (profile) => this.profile.set(profile),
            error: () => this.errorMessage.set('Impossible de récupérer les informations de profil.'),
        });
    }

    private passwordsMatch(control: AbstractControl) {
        const newPassword = control.get('newPassword')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;
        return newPassword && confirmPassword && newPassword !== confirmPassword
            ? { passwordMismatch: true }
            : null;
    }

}
