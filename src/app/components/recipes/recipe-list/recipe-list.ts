import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { orderBy } from 'lodash-es';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Icon } from '../../utils/icon/icon';
import { RecipeCard } from '../recipe-card/recipe-card';
import { RecipeFilterService } from '../recipe-filter.service';
import { AuthService } from './../../../auth/auth.service';
import { RecipeStatus } from './../../../enums/recipes.enum';
import { RecipeDto } from './../../../models/recipe';
import { RecipeService } from './../recipe.service';
import { Option } from '../../../enums/enum-utils';

type RecipeSortOption = 'name_asc' | 'name_desc' | 'createdAt_desc' | 'preparationTime_asc' | 'preparationTime_desc';

@Component({
    selector: 'recipe-list',
    imports: [
        CommonModule,
        FormsModule,
        Icon,
        RecipeCard,
        NgSelectModule,
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

    public selectedSort = signal<RecipeSortOption>('name_asc');
    private selectedSort$ = new BehaviorSubject<RecipeSortOption>(this.selectedSort());
    protected sortOptions: Option<RecipeSortOption>[] = [
        { id: 'name_asc', label: 'Nom (A-Z)' },
        { id: 'name_desc', label: 'Nom (Z-A)' },
        { id: 'createdAt_desc', label: 'Derniers ajouts' },
        { id: 'preparationTime_asc', label: 'Recettes rapides' },
        { id: 'preparationTime_desc', label: 'Recettes longues' },
    ];

    constructor() {
        const recipes$ = this.filterService.filter$.pipe(
            switchMap((filter) => this.recipeService.search(filter))
        );

        this.approvedRecipes$ = combineLatest([recipes$, this.selectedSort$]).pipe(
            map(([recipes, sort]) => this.sortRecipes(recipes.filter(recipe => recipe.status === RecipeStatus.APPROVED), sort))
        );

        this.draftRecipes$ = combineLatest([recipes$, this.selectedSort$]).pipe(
            map(([recipes, sort]) => this.sortRecipes(recipes.filter(recipe => recipe.status === RecipeStatus.DRAFT), sort))
        );
    }

    public onSortChange(option: Option<RecipeSortOption>): void {
        if (!option) {
            return;
        }

        const id = (typeof option === 'string') ? option : (option.id ?? option);
        this.selectedSort.set(id as RecipeSortOption);
        this.selectedSort$.next(id as RecipeSortOption);
    }

    public sortRecipes(recipes: RecipeDto[], option?: RecipeSortOption): RecipeDto[] {
        if (!recipes || recipes.length === 0) {
            return [];
        }
        const opt = option || this.selectedSort();

        switch (opt) {
            case 'name_asc':
                return orderBy(recipes, [r => r.name?.toLowerCase()], ['asc']);
            case 'name_desc':
                return orderBy(recipes, [r => r.name?.toLowerCase()], ['desc']);
            case 'createdAt_desc':
                return orderBy(recipes, [r => r.createdAt ? new Date(r.createdAt).getTime() : 0], ['desc']);
            case 'preparationTime_asc':
                return orderBy(recipes, [r => r.preparationTime ?? Number.MAX_SAFE_INTEGER], ['asc']);
            case 'preparationTime_desc':
                return orderBy(recipes, [r => r.preparationTime ?? -1], ['desc']);
            default:
                return orderBy(recipes, [r => r.name?.toLowerCase()], ['asc']);
        }
    }

}
