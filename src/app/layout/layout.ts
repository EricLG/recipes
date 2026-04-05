import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { NgbDropdownModule, NgbNavModule, NgbOffcanvasModule } from "@ng-bootstrap/ng-bootstrap";

import { AuthService } from "../auth/auth.service";
import { RecipeFilterService } from "../components/recipes/recipe-filter.service";
import { SearchFilters } from "../components/search-filters/search-filters";
import { environment } from './../../environments/environment';
import { Link } from "../components/utils/link/link";

@Component({
    selector: 'layout',
    templateUrl: './layout.html',
    styleUrls: ['./layout.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        NgbNavModule,
        NgbDropdownModule,
        NgbOffcanvasModule,
        SearchFilters,
        Link
    ]
})
export class Layout {

    private readonly filterService = inject(RecipeFilterService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    public readonly showLayout = input(true);

    public readonly bgColor = environment.backgroundColor
    public readonly links = [
        { title: 'Recettes', path: 'recipes', icon: 'list_recipes.png' },
        { title: 'Ingrédients', path: 'foods', icon: 'list_food.png' },
        { title: 'Planifier ma semaine', path: 'coming-soon', icon: 'planning_week.png' },
        { title: 'Liste de courses', path: 'coming-soon', icon: 'shopping_list.png' },
    ];

    constructor(
        public route: ActivatedRoute
    ) {}

    public goToAllRecipes(path: string): void {
        if (path === 'recipes') {
            this.filterService.resetFilter();
        }
    }

    public closeMenu(toggle: HTMLInputElement) {
        toggle.checked = false;
    }

    public isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    public isLoggedIn(): boolean {
        return this.authService.isLoggedIn();
    }

    public getCurrentUserEmail(): string | null {
        return (this.authService.currentUser$ as any).value?.email || null;
    }

    public logout(): void {
        this.authService.logout();
    }
}
