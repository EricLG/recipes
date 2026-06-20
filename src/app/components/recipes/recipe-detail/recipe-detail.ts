import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../auth/auth.service';
import { FoodCategory, categoryTranslations } from '../../../enums/food.enum';
import { RecipeCategory, RecipeSeason, seasonTranslations, recipeCategoryTranslations, recipeVegetarianStatusTranslations, RecipeVegetarianStatus } from '../../../enums/recipes.enum';
import { NutrientsDto } from '../../../models/food';
import { DetailedRecipeDTO } from '../../../models/recipe';
import { Icon } from '../../utils/icon/icon';
import { RecipeTotalNutritionalsValues } from '../recipe-total-nutritionals-values/recipe-total-nutritionals-values';
import { RecipeService } from '../recipe.service';

// Order of food categories for displaying recipe foods
const FOOD_CATEGORY_ORDER: FoodCategory[] = [
    FoodCategory.STARCHES,
    FoodCategory.ANIMAL_PROTEINS,
    FoodCategory.SEAFOOD,
    FoodCategory.PLANT_BASED,
    FoodCategory.LEGUMES,
    FoodCategory.VEGETABLES,
    FoodCategory.FRUITS,
    FoodCategory.FATS,
    FoodCategory.DAIRY,
    FoodCategory.SWEET_PRODUCTS,
    FoodCategory.BEVERAGES,
    FoodCategory.CONDIMENTS,
    FoodCategory.SUPPLEMENTS,
    FoodCategory.OTHER,
];

@Component({
    selector: 'recipe-detail',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        Icon,
        RecipeTotalNutritionalsValues,
    ],
    templateUrl: './recipe-detail.html',
    styleUrls: ['./recipe-detail.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDetail implements OnDestroy {

    private svc = inject(RecipeService);
    private svcAuth = inject(AuthService)
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    public isAdmin = this.svcAuth.isAdmin();
    public wakeLock = false;
    public convUnity: {[measure: string]: string} = { g: 'Kg', ml: 'L' };

    private wakeLockSentinel: WakeLockSentinel | null = null;


    private async requestWakeLock(): Promise<void> {
        try {
            this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.log('Wake Lock error:', err);
        }
    }

    private releaseWakeLock(): void {
        if (this.wakeLockSentinel) {
            this.wakeLockSentinel.release();
            this.wakeLockSentinel = null;
        }
    }

    public toggleWakeLock(event: Event): void {
        const target = event.target as HTMLInputElement;

        this.wakeLock = target.checked;
        if (this.wakeLock) {
            this.requestWakeLock();
        } else {
            this.releaseWakeLock();
        }
    }

    ngOnDestroy(): void {
        this.releaseWakeLock();
    }


    // Get recipe ID from route parameters
    private readonly id$ = this.route.paramMap.pipe(
        map(p => p.get('id')),
        filter((id): id is string => id !== null)
    );
    public readonly id = toSignal(this.id$, { initialValue: null });

    // Fetch detailed recipe data
    private readonly recipe$ = this.id$.pipe(
        switchMap(id => id ? this.svc.getDetailRecipe(id) : of(null))
    );
    public readonly recipe = toSignal<DetailedRecipeDTO | null>(this.recipe$, { initialValue: null });

    // Compute total nutrients
    public readonly totalNutrients = computed(() => {
        const recipe = this.recipe();
        if (!recipe || !recipe.recipeFoods) return null;

        const totals: NutrientsDto = {
            energyKcal: 0,
            proteins: 0,
            fats: 0,
            carbohydrates: 0,
            sugars: 0,
            fibers: 0,
            salt: 0,
            saturatedFattyAcids: 0,
        };

        // Compute totals for a recipe (including nested sub-recipes)
        const computeTotalsForRecipe = (r: DetailedRecipeDTO, stack = new Set<string>()): NutrientsDto => {
            if (!r) return {
                energyKcal: 0,
                proteins: 0,
                fats: 0,
                carbohydrates: 0,
                sugars: 0,
                fibers: 0,
                salt: 0,
                saturatedFattyAcids: 0,
            };

            if (stack.has(r.id)) {
                return {
                    energyKcal: 0,
                    proteins: 0,
                    fats: 0,
                    carbohydrates: 0,
                    sugars: 0,
                    fibers: 0,
                    salt: 0,
                    saturatedFattyAcids: 0,
                };
            }

            stack.add(r.id);

            const local: NutrientsDto = {
                energyKcal: 0,
                proteins: 0,
                fats: 0,
                carbohydrates: 0,
                sugars: 0,
                fibers: 0,
                salt: 0,
                saturatedFattyAcids: 0,
            };

            r.recipeFoods?.forEach(recipeFood => {
                const factor = (recipeFood.quantity * recipeFood.measure.grams) / 100;
                const n = recipeFood.food.nutrientsPer100;

                local.energyKcal += n.energyKcal * factor;
                local.proteins += n.proteins * factor;
                local.fats += n.fats * factor;
                local.carbohydrates += n.carbohydrates * factor;
                local.sugars += n.sugars * factor;
                local.fibers += n.fibers * factor;
                local.salt += n.salt * factor;
                local.saturatedFattyAcids += n.saturatedFattyAcids * factor;
            });

            r.recipeSubRecipes?.forEach(sub => {
                const child = sub.childRecipe;
                if (!child) return;
                if (stack.has(child.id)) return;

                const childTotals = computeTotalsForRecipe(child, stack);
                const scale = child.servings ? (sub.quantity / child.servings) : sub.quantity;

                local.energyKcal += childTotals.energyKcal * scale;
                local.proteins += childTotals.proteins * scale;
                local.fats += childTotals.fats * scale;
                local.carbohydrates += childTotals.carbohydrates * scale;
                local.sugars += childTotals.sugars * scale;
                local.fibers += childTotals.fibers * scale;
                local.salt += childTotals.salt * scale;
                local.saturatedFattyAcids += childTotals.saturatedFattyAcids * scale;
            });

            stack.delete(r.id);
            return local;
        };

        const recipeTotals = computeTotalsForRecipe(recipe);

        totals.energyKcal = recipeTotals.energyKcal;
        totals.proteins = recipeTotals.proteins;
        totals.fats = recipeTotals.fats;
        totals.carbohydrates = recipeTotals.carbohydrates;
        totals.sugars = recipeTotals.sugars;
        totals.fibers = recipeTotals.fibers;
        totals.salt = recipeTotals.salt;
        totals.saturatedFattyAcids = recipeTotals.saturatedFattyAcids;

        // Divide by servings to get nutrients per serving
        const servings = recipe.servings;
        totals.energyKcal /= servings;
        totals.proteins /= servings;
        totals.fats /= servings;
        totals.carbohydrates /= servings;
        totals.sugars /= servings;
        totals.fibers /= servings;
        totals.salt /= servings;
        totals.saturatedFattyAcids /= servings;

        return totals;
    });

    // Group recipe foods by category and sort by the defined order
    public readonly groupedRecipeFoods = computed(() => {
        const recipe = this.recipe();
        if (!recipe || !recipe.recipeFoods || recipe.recipeFoods.length === 0) {
            return [];
        }

        // Group foods by category
        const grouped = new Map<FoodCategory, typeof recipe.recipeFoods>();

        recipe.recipeFoods.forEach(recipeFood => {
            const category = recipeFood.food.category;
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(recipeFood);
        });

        // Sort categories according to FOOD_CATEGORY_ORDER
        const sortedCategories = FOOD_CATEGORY_ORDER.filter(cat => grouped.has(cat));

        // Return array of {category, label, foods}
        return sortedCategories.map(category => ({
            category,
            label: categoryTranslations[category] || category,
            foods: grouped.get(category) || []
        }));
    });

    // Group foods for any recipe by category and sort by the defined order
    public getGroupedFoodsForRecipe(recipeToGroup: DetailedRecipeDTO) {
        if (!recipeToGroup || !recipeToGroup.recipeFoods || recipeToGroup.recipeFoods.length === 0) {
            return [];
        }

        // Group foods by category
        const grouped = new Map<FoodCategory, typeof recipeToGroup.recipeFoods>();

        recipeToGroup.recipeFoods.forEach(recipeFood => {
            const category = recipeFood.food.category;
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(recipeFood);
        });

        // Sort categories according to FOOD_CATEGORY_ORDER
        const sortedCategories = FOOD_CATEGORY_ORDER.filter(cat => grouped.has(cat));

        // Return array of {category, label, foods}
        return sortedCategories.map(category => ({
            category,
            label: categoryTranslations[category] || category,
            foods: grouped.get(category) || []
        }));
    }

    public edit(): void {
        const recipe = this.recipe();

        if (!recipe) return;
        this.router.navigate(['/recipes/edit', recipe.id]);
    }

    public remove(): void {
        const recipe = this.recipe();
        if (!recipe) return;
        if (confirm('Supprimer cette recette ?')) {
            this.svc.delete(recipe.id).subscribe({
                next: () => this.router.navigate(['/recipes']),
                error: (err) => console.error('Erreur suppression:', err)
            });
        }
    }

    public getSeasonLabel(season: string): string {
        return seasonTranslations[season as RecipeSeason] || season;
    }

    public getCategoryLabel(category: string): string {
        return recipeCategoryTranslations[category as RecipeCategory] || category;
    }

    public getVegetarianStatusLabel(status: string): string {
        return recipeVegetarianStatusTranslations[status as RecipeVegetarianStatus] || status;
    }

    public servingMapping: {[k: string]: string} = {
        '=0': 'Aucune part',
        '=1': '1 part',
        'other': '# parts'
    }

}
