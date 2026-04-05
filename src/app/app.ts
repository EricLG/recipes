import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { Layout } from './layout/layout';

@Component({
    selector: 'app-root',
    imports: [Layout],
    templateUrl: './app.html',
    styles: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {

    private readonly router = inject(Router);

    protected readonly title = signal('La taverne de May');
    protected readonly showLayout = signal(true);

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.showLayout.set(event.url !== '/login');
        });
    }
}
