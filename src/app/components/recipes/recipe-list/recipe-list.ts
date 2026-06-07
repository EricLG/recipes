import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Icon } from '../../utils/icon/icon';
import { RecipeCard } from '../recipe-card/recipe-card';
import { RecipeFilterService } from '../recipe-filter.service';
import { AuthService } from './../../../auth/auth.service';
import { RecipeStatus } from './../../../enums/recipes.enum';
import { RecipeDto } from './../../../models/recipe';
import { RecipeService } from './../recipe.service';

@Component({
    selector: 'recipe-list',
    imports: [
        CommonModule,
        Icon,
        RecipeCard,
    ],
    templateUrl: './recipe-list.html',
    styleUrls: ['./recipe-list.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeList {

    private readonly authService = inject(AuthService);
    private readonly recipeService = inject(RecipeService);
    private readonly filterService = inject(RecipeFilterService);

    public isAdmin = this.authService.isAdmin();
    public approvedRecipes$!: Observable<RecipeDto[]>;
    public draftRecipes$!: Observable<RecipeDto[]>;

    constructor() {
        const recipes$ = this.filterService.filter$.pipe(
            switchMap((filter) => this.recipeService.search(filter))
        );

        this.approvedRecipes$ = recipes$.pipe(
            map((recipes) => recipes.filter(recipe => recipe.status === RecipeStatus.APPROVED))
        );

        this.draftRecipes$ = recipes$.pipe(
            map((recipes) => recipes.filter(recipe => recipe.status === RecipeStatus.DRAFT))
        );
    }


}
