import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of, startWith } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { RecipeCategory, RecipeSeason, seasonTranslations, recipeCategoryTranslations, RecipeVegetarianStatus, recipeVegetarianStatusTranslations, RecipePreparationTime, recipePreparationTimeTranslations, RecipeStatus, recipeStatusTranslations } from '../../../enums/recipes.enum';
import { MeasureDto, NutrientsDto } from '../../../models/food';
import { DetailedRecipeDTO, RecipeDto } from '../../../models/recipe';
import { FoodService } from '../../foods/food.service';
import { MeasureService } from '../../foods/measure.service';
import { RecipeTotalNutritionalsValues } from '../recipe-total-nutritionals-values/recipe-total-nutritionals-values';
import { RecipeService } from '../recipe.service';

@Component({
    selector: 'recipe-form',
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        RecipeTotalNutritionalsValues,
    ],
    templateUrl: './recipe-form.html',
    styleUrl: './recipe-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeForm {

    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly svcRecipe = inject(RecipeService);
    private readonly svcFood = inject(FoodService);
    private readonly svcMeasure = inject(MeasureService);

    private readonly id$ = this.route.paramMap.pipe(
        map(p => p.get('id')),
        filter((id): id is string => id !== null)
    );
    public readonly id = toSignal(this.id$, { initialValue: null });

    private readonly recipe$ = this.id$.pipe(
        switchMap(id => id ? this.svcRecipe.getDetailRecipe(id) : of(null))
    );
    public readonly recipe = toSignal(this.recipe$, { initialValue: null });
    public readonly foods = toSignal(this.svcFood.getAll(), { initialValue: [] });
    private readonly allRecipes = toSignal(this.svcRecipe.getAll(), { initialValue: [] });

    // Fetch available recipes (excluding current one)
    public readonly recipes = computed(() => {
        const currentId = this.id();
        return this.allRecipes().filter(r => r.id !== currentId);
    });

    // Fetch available measures
    public readonly measures = toSignal(this.svcMeasure.getAll(), { initialValue: [] });

    // Dynamic title
    public readonly title = computed(() => this.id() ? 'Modifier une recette' : 'Ajouter une recette');

    // Enums
    public readonly seasons = Object.values(RecipeSeason);
    public readonly categories = Object.values(RecipeCategory)
    public readonly vegetarianStatuses = Object.values(RecipeVegetarianStatus);
    public readonly statuses = Object.values(RecipeStatus);
    public readonly preparationTimes = Object.values(RecipePreparationTime);

    // Enum translations
    protected readonly seasonTranslations = seasonTranslations;
    protected readonly categoryTranslations = recipeCategoryTranslations;
    protected readonly vegetarianStatusTranslations = recipeVegetarianStatusTranslations;
    protected readonly statusTranslations = recipeStatusTranslations;
    protected readonly preparationTimeTranslations = recipePreparationTimeTranslations;

    // Track forms visibility
    public readonly showNewRecipeFoodForm = signal(false);
    public readonly showNewSubRecipeForm = signal(false);

    public readonly recipeForm = this.fb.group({
        name: ['', Validators.required],
        status: RecipeStatus.DRAFT,
        instructions: [''],
        vegetarianStatus: RecipeVegetarianStatus.NON_VEGETARIAN,
        season: [[] as RecipeSeason[]],
        category: [RecipeCategory.MAIN],
        servings: [1, [Validators.required, Validators.min(1)]],
        preparationTime: [null as number | null],
        kitchenTools: [''],
        remark: [''],
        recipeFoods: this.fb.array<FormGroup>([]),
        recipeSubRecipes: this.fb.array<FormGroup>([]),
    });

    public readonly recipeFoodsArray = this.recipeForm.get('recipeFoods') as FormArray;
    public readonly recipeSubRecipesArray = this.recipeForm.get('recipeSubRecipes') as FormArray;

    private readonly formValue$ = this.recipeForm.valueChanges.pipe(
        startWith(this.recipeForm.value)
    );

    private readonly formValue = toSignal(this.formValue$, { initialValue: this.recipeForm.value as Record<string, unknown> });
    private readonly subRecipeDetails = signal<Record<string, DetailedRecipeDTO | null>>({});

    private createEmptyNutrients(): NutrientsDto {
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

    private addNutrients(target: NutrientsDto, source: NutrientsDto): void {
        target.energyKcal += source.energyKcal;
        target.proteins += source.proteins;
        target.fats += source.fats;
        target.carbohydrates += source.carbohydrates;
        target.sugars += source.sugars;
        target.fibers += source.fibers;
        target.salt += source.salt;
        target.saturatedFattyAcids += source.saturatedFattyAcids;
    }

    private computeNutrientsFromRecipe(
        recipe: DetailedRecipeDTO | null,
        subRecipeDetails: Record<string, DetailedRecipeDTO | null>,
        stack = new Set<string>(),
    ): NutrientsDto {
        if (!recipe) {
            return this.createEmptyNutrients();
        }

        if (stack.has(recipe.id)) {
            return this.createEmptyNutrients();
        }

        stack.add(recipe.id);
        const totals = this.createEmptyNutrients();

        recipe.recipeFoods?.forEach((recipeFood) => {
            const factor = (recipeFood.quantity * recipeFood.measure.grams) / 100;
            const nutrients = recipeFood.food.nutrientsPer100;

            totals.energyKcal += nutrients.energyKcal * factor;
            totals.proteins += nutrients.proteins * factor;
            totals.fats += nutrients.fats * factor;
            totals.carbohydrates += nutrients.carbohydrates * factor;
            totals.sugars += nutrients.sugars * factor;
            totals.fibers += nutrients.fibers * factor;
            totals.salt += nutrients.salt * factor;
            totals.saturatedFattyAcids += nutrients.saturatedFattyAcids * factor;
        });

        recipe.recipeSubRecipes?.forEach((subRecipe) => {
            const childRecipe = subRecipeDetails[subRecipe.childRecipeId] ?? subRecipe.childRecipe;
            if (!childRecipe) {
                return;
            }

            const childTotals = this.computeNutrientsFromRecipe(childRecipe, subRecipeDetails, stack);
            const scale = childRecipe.servings ? (subRecipe.quantity / childRecipe.servings) : subRecipe.quantity;
            this.addNutrients(totals, {
                ...childTotals,
                energyKcal: childTotals.energyKcal * scale,
                proteins: childTotals.proteins * scale,
                fats: childTotals.fats * scale,
                carbohydrates: childTotals.carbohydrates * scale,
                sugars: childTotals.sugars * scale,
                fibers: childTotals.fibers * scale,
                salt: childTotals.salt * scale,
                saturatedFattyAcids: childTotals.saturatedFattyAcids * scale,
            });
        });

        stack.delete(recipe.id);
        return totals;
    }

    public readonly recipeNutrients = computed(() => {
        const formValue = this.formValue() as {
            recipeFoods?: Array<{ foodId: string; measureId: string; quantity: number | null }>;
            recipeSubRecipes?: Array<{ childRecipeId: string; quantity: number | null }>;
            servings?: number;
        };
        const recipeFoods = formValue.recipeFoods || [];
        const recipeSubRecipes = formValue.recipeSubRecipes || [];
        const servings = formValue.servings && formValue.servings >= 1 ? formValue.servings : 1;

        if (recipeFoods.length === 0 && recipeSubRecipes.length === 0) {
            return null;
        }

        const totals = this.createEmptyNutrients();
        const foods = this.foods();
        const measures = this.measures();

        recipeFoods.forEach((recipeFood) => {
            const food = foods.find((item) => item.id === recipeFood.foodId);
            const measure = measures.find((item) => item.id === recipeFood.measureId);
            const quantity = recipeFood.quantity;

            if (!food || !measure || quantity == null) {
                return;
            }

            const factor = (quantity * measure.grams) / 100;
            const nutrients = food.nutrientsPer100;

            totals.energyKcal += nutrients.energyKcal * factor;
            totals.proteins += nutrients.proteins * factor;
            totals.fats += nutrients.fats * factor;
            totals.carbohydrates += nutrients.carbohydrates * factor;
            totals.sugars += nutrients.sugars * factor;
            totals.fibers += nutrients.fibers * factor;
            totals.salt += nutrients.salt * factor;
            totals.saturatedFattyAcids += nutrients.saturatedFattyAcids * factor;
        });

        recipeSubRecipes.forEach((recipeSubRecipe) => {
            const childRecipe = this.subRecipeDetails()[recipeSubRecipe.childRecipeId];
            if (!childRecipe || recipeSubRecipe.quantity == null) {
                return;
            }

            const childTotals = this.computeNutrientsFromRecipe(childRecipe, this.subRecipeDetails());
            const scale = childRecipe.servings ? (recipeSubRecipe.quantity / childRecipe.servings) : recipeSubRecipe.quantity;
            this.addNutrients(totals, {
                ...childTotals,
                energyKcal: childTotals.energyKcal * scale,
                proteins: childTotals.proteins * scale,
                fats: childTotals.fats * scale,
                carbohydrates: childTotals.carbohydrates * scale,
                sugars: childTotals.sugars * scale,
                fibers: childTotals.fibers * scale,
                salt: childTotals.salt * scale,
                saturatedFattyAcids: childTotals.saturatedFattyAcids * scale,
            });
        });

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

    // Populate form when recipe data is available
    constructor() {
        effect(() => {
            const recipe = this.recipe();
            if (recipe) {
                const { recipeFoods, recipeSubRecipes, ...recipeData } = recipe;
                this.recipeForm.patchValue(recipeData);

                if (recipe.imageUrl) {
                    this.imagePreview.set(`api/${recipe.imageUrl}`);
                }

                // Clear existing arrays
                this.recipeFoodsArray.clear();
                this.recipeSubRecipesArray.clear();

                // Add existing recipeFoods (include id for updates per Option C strict mode)
                if (recipeFoods && recipeFoods.length > 0) {
                    recipeFoods.forEach((rf) => {
                        this.recipeFoodsArray.push(this.fb.group({
                            id: [rf.id],  // Include ID for update operations
                            foodId: [rf.food.id, Validators.required],
                            measureId: [rf.measure.id, Validators.required],
                            quantity: [rf.quantity, [Validators.required, Validators.min(0.1)]],
                        }));
                    });
                }

                // Add existing recipeSubRecipes (include id for updates per Option C strict mode)
                if (recipeSubRecipes && recipeSubRecipes.length > 0) {
                    recipeSubRecipes.forEach((sr) => {
                        this.recipeSubRecipesArray.push(this.fb.group({
                            id: [sr.id],  // Include ID for update operations
                            childRecipeId: [sr.childRecipe.id, Validators.required],
                            quantity: [sr.quantity, [Validators.required, Validators.min(0.1)]],
                        }));
                    });
                }
            }
        });

        effect(() => {
            const formValue = this.formValue() as {
                recipeSubRecipes?: Array<{ childRecipeId?: string | null }>;
            };
            const recipeSubRecipes = formValue.recipeSubRecipes || [];
            const childRecipeIds = [
                ...new Set(
                    recipeSubRecipes
                        .map((recipeSubRecipe) => recipeSubRecipe.childRecipeId)
                        .filter((childRecipeId): childRecipeId is string => Boolean(childRecipeId))
                ),
            ];

            if (childRecipeIds.length === 0) {
                this.subRecipeDetails.set({});
                return;
            }

            const subscription = forkJoin(
                childRecipeIds.map((childRecipeId) => this.svcRecipe.getDetailRecipe(childRecipeId))
            ).subscribe({
                next: (details) => {
                    const resolvedDetails = Object.fromEntries(
                        childRecipeIds.map((childRecipeId, index) => [childRecipeId, details[index] ?? null])
                    ) as Record<string, DetailedRecipeDTO | null>;
                    this.subRecipeDetails.set(resolvedDetails);
                },
                error: (error) => {
                    console.error('Erreur chargement sous-recettes:', error);
                    this.subRecipeDetails.set({});
                }
            });

            return () => subscription.unsubscribe();
        });
    }

    public isSeasonChecked(season: RecipeSeason): boolean {
        const seasons = this.recipeForm.get('season')?.value || [];
        return seasons.includes(season);
    }

    public toggleSeason(season: RecipeSeason): void {
        const control = this.recipeForm.get('season');
        if (!control) return;

        const seasons = (control.value || []) as RecipeSeason[];
        if (seasons.includes(season)) {
            const updatedSeasons = seasons.filter(s => s !== season);
            control.setValue(updatedSeasons);
        } else {
            control.setValue([...seasons, season]);
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

    public getStatusLabel(status: string): string {
        return recipeStatusTranslations[status as RecipeStatus] || status;
    }

    public getPreparationTimeLabel(preparationTime: string): string {
        return recipePreparationTimeTranslations[preparationTime as RecipePreparationTime] || preparationTime;
    }

    private createRecipeFoodFormGroup(): FormGroup {
        return this.fb.group({
            id: [null],  // New items have no id; will be auto-assigned by backend
            foodId: ['', Validators.required],
            measureId: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(0.1)]],
        });
    }

    private createSubRecipeFormGroup(): FormGroup {
        return this.fb.group({
            id: [null],  // New items have no id; will be auto-assigned by backend
            childRecipeId: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(0.1)]],
        });
    }

    public addNewRecipeFood(): void {
        this.recipeFoodsArray.push(this.createRecipeFoodFormGroup());
        this.showNewRecipeFoodForm.set(true);
    }

    public removeRecipeFood(index: number): void {
        this.recipeFoodsArray.removeAt(index);
    }

    public addNewSubRecipe(): void {
        this.recipeSubRecipesArray.push(this.createSubRecipeFormGroup());
        this.showNewSubRecipeForm.set(true);
    }

    public removeSubRecipe(index: number): void {
        this.recipeSubRecipesArray.removeAt(index);
    }

    public getMeasuresForFood(foodId: string): MeasureDto[] {
        return this.measures().filter(m => m.foodId === foodId);
    }

    public onSubmit(): void {
        if (this.recipeForm.invalid) return;

        const data = this.recipeForm.value;
        const recipeData = {
            name: data.name,
            status: data.status,
            instructions: data.instructions,
            vegetarianStatus: data.vegetarianStatus,
            season: (data.season && data.season?.length > 0) ? data.season : [RecipeSeason.SPRING, RecipeSeason.SUMMER, RecipeSeason.AUTUMN, RecipeSeason.WINTER], // Default to all seasons if none selected
            category: data.category,
            servings: data.servings,
            preparationTime: data.preparationTime,
            kitchenTools: data.kitchenTools,
            remark: data.remark,
        } as Omit<RecipeDto, 'id'>;

        // Normalize recipeFoods: remove `id` property when null/undefined (REST best practice)
        type RecipeFoodFormValue = { id?: string | null; foodId: string; measureId: string; quantity: number };
        type RecipeSubRecipeFormValue = { id?: string | null; childRecipeId: string; quantity: number };

        const recipeFoods = (data.recipeFoods || []).map((rf: unknown) => {
            const recipeFood = rf as RecipeFoodFormValue;
            const copy: Record<string, unknown> = {
                foodId: recipeFood.foodId,
                measureId: recipeFood.measureId,
                quantity: recipeFood.quantity,
            };
            if (recipeFood.id !== null && recipeFood.id !== undefined && recipeFood.id !== '') {
                (copy as Record<string, string | number>)['id'] = recipeFood.id as string;
            }
            return copy;
        });

        // Normalize recipeSubRecipes: remove `id` property when null/undefined (REST best practice)
        const recipeSubRecipes = (data.recipeSubRecipes || []).map((sr: unknown) => {
            const subRecipe = sr as RecipeSubRecipeFormValue;
            const copy: Record<string, unknown> = {
                childRecipeId: subRecipe.childRecipeId,
                quantity: subRecipe.quantity,
            };
            if (subRecipe.id !== null && subRecipe.id !== undefined && subRecipe.id !== '') {
                (copy as Record<string, string | number>)['id'] = subRecipe.id as string;
            }
            return copy;
        });

        // ✅ Construit le FormData
        const formData = new FormData();

        // Sérialise les données JSON dans un champ "data"
        formData.append('data', JSON.stringify({
            ...recipeData,
            recipeFoods,
            recipeSubRecipes,
            ...(this.id() ? { id: this.id() } : {}),
        }));

        // Ajoute l'image si présente
        if (this.selectedFile) {
            formData.append('image', this.selectedFile);
        }

        const createOrUpdate$ = this.id()
            ? this.svcRecipe.updateWithRelations(this.id()!, formData)
            : this.svcRecipe.createWithRelations(formData);

        createOrUpdate$.subscribe({
            next: (recipe) => this.router.navigate(['/recipes', recipe.id]),
            error: (err) => console.error('Erreur sauvegarde:', err)
        });
    }


    // Gestion des images
    // Signal pour la prévisualisation de l'image
    public readonly imagePreview = signal<string | null>(null);
    private selectedFile: File | null = null;

    // Appelé quand l'utilisateur sélectionne un fichier
    public onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        this.selectedFile = file;

        if (file) {
            // Génère une URL de prévisualisation locale
            const reader = new FileReader();
            reader.onload = () => this.imagePreview.set(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            this.imagePreview.set(null);
        }
    }

    public removeImage(): void {
        this.selectedFile = null;
        this.imagePreview.set(null);
    }

}
