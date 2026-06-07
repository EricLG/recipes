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
import { of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { RecipeCategory, RecipeSeason, seasonTranslations, recipeCategoryTranslations, RecipeVegetarianStatus, recipeVegetarianStatusTranslations, RecipePreparationTime, recipePreparationTimeTranslations, RecipeStatus, recipeStatusTranslations } from '../../../enums/recipes.enum';
import { MeasureDto } from '../../../models/food';
import { RecipeDto } from '../../../models/recipe';
import { FoodService } from '../../foods/food.service';
import { MeasureService } from '../../foods/measure.service';
import { RecipeService } from '../recipe.service';

@Component({
    selector: 'recipe-form',
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
    ],
    templateUrl: './recipe-form.html',
    styleUrl: './recipe-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeForm {

    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private svcRecipe = inject(RecipeService);
    private svcFood = inject(FoodService);
    private svcMeasure = inject(MeasureService);

    // Get recipe ID from route parameters
    private readonly id$ = this.route.paramMap.pipe(
        map(p => p.get('id')),
        filter((id): id is string => id !== null)
    );
    public readonly id = toSignal(this.id$, { initialValue: null });

    // Fetch recipe data if editing
    private readonly recipe$ = this.id$.pipe(
        switchMap(id => id ? this.svcRecipe.getDetailRecipe(id) : of(null))
    );
    public readonly recipe = toSignal(this.recipe$, { initialValue: null });

    // Fetch available foods
    public readonly foods = toSignal(this.svcFood.getAll(), { initialValue: [] });

    // Fetch all recipes
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
        recipeFoods: this.fb.array([]),
        recipeSubRecipes: this.fb.array([]),
    });

    public readonly recipeFoodsArray = this.recipeForm.get('recipeFoods') as FormArray;
    public readonly recipeSubRecipesArray = this.recipeForm.get('recipeSubRecipes') as FormArray;

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
                    recipeFoods.forEach(rf => {
                        console.log('Adding recipe food to form array:', rf); // Debug log
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
                    recipeSubRecipes.forEach(sr => {
                        this.recipeSubRecipesArray.push(this.fb.group({
                            id: [sr.id],  // Include ID for update operations
                            childRecipeId: [sr.childRecipe.id, Validators.required],
                            quantity: [sr.quantity, [Validators.required, Validators.min(0.1)]],
                        }));
                    });
                }
            }
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
        const recipeFoods = (data.recipeFoods || []).map((rf: any) => {
            const copy: any = {
                foodId: rf.foodId,
                measureId: rf.measureId,
                quantity: rf.quantity,
            };
            if (rf.id !== null && rf.id !== undefined && rf.id !== '') {
                copy.id = rf.id;
            }
            return copy;
        });

        // Normalize recipeSubRecipes: remove `id` property when null/undefined (REST best practice)
        const recipeSubRecipes = (data.recipeSubRecipes || []).map((sr: any) => {
            const copy: any = {
                childRecipeId: sr.childRecipeId,
                quantity: sr.quantity,
            };
            if (sr.id !== null && sr.id !== undefined && sr.id !== '') {
                copy.id = sr.id;
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
