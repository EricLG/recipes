import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { AuthResponse } from '../../models/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.html',
    styleUrls: ['./login.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {

    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    public readonly loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    public errorMessage: string | null = null;

    public onSubmit(): void {
        if (this.loginForm.valid) {
            const { email, password } = this.loginForm.value;
            this.authService.login(email, password).subscribe({
                next: (response: AuthResponse) => {
                    this.authService.setToken(response.access_token);
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                    console.log('Login successful, navigating to:', returnUrl);
                    this.router.navigate([returnUrl]);
                },
                error: (error) => {
                    if (error.status === 401) {
                        this.errorMessage = 'Identifiants incorrects';
                    } else {
                        this.errorMessage = 'Erreur de connexion';
                    }
                }
            });
        }
    }

}
