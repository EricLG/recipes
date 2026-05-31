import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy } from "@angular/core";
import { ReactiveFormsModule, FormGroup, FormControl, FormsModule, NonNullableFormBuilder } from "@angular/forms";
import { Router } from "@angular/router";
import { NgMultiLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from "@ng-select/ng-select";
import { debounceTime, Subscription } from "rxjs";

import { Option, toOptions } from "../../enums/enum-utils";
import { RecipeCategory, RecipeSeason, RecipeVegetarianStatus, recipeCategoryTranslations, seasonTranslations, recipeVegetarianStatusTranslations } from "../../enums/recipes.enum";
import { RecipeFilterService } from "../recipes/recipe-filter.service";
import { Icon } from "../utils/icon/icon";
import { RecipeFilterDto } from './../../models/recipe';

interface RecipeFilterDtoFormgroup {
    text: FormControl<string | undefined>,
    category: FormControl<RecipeCategory | undefined>,
    seasons: FormControl<RecipeSeason[] | undefined>,
    vegetarianStatus: FormControl<RecipeVegetarianStatus[] | undefined>,
}

@Component({
    selector: 'app-search-filters',
    templateUrl: './search-filters.html',
    styleUrls: ['./search-filters.scss'],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        Icon,
        NgSelectComponent,
        NgOptionTemplateDirective,
        NgMultiLabelTemplateDirective,
    ]
})
export class SearchFilters implements OnDestroy {

    protected categories: Option<RecipeCategory>[] = toOptions(recipeCategoryTranslations);
    protected seasons: Option<RecipeSeason>[] = toOptions(seasonTranslations);
    protected vegetarianStatusOptions: Option<RecipeVegetarianStatus>[] = toOptions(recipeVegetarianStatusTranslations);

    protected filterForm: FormGroup<RecipeFilterDtoFormgroup>;

    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly filterService = inject(RecipeFilterService);
    private readonly filterFormValueChanges$: Subscription
    private readonly filterSvc$: Subscription

    constructor() {
        this.filterForm = this.fb.group({
            text: new FormControl<string | undefined>(undefined, { nonNullable: true }),
            category: new FormControl<RecipeCategory | undefined>(undefined, { nonNullable: true } ),
            seasons: new FormControl<RecipeSeason[] | undefined>(undefined, { nonNullable: true }),
            vegetarianStatus: new FormControl<RecipeVegetarianStatus[] | undefined>(undefined, { nonNullable: true }),
        }, { });
        this.filterFormValueChanges$ = this.filterForm.valueChanges.pipe(
            debounceTime(500)
        ).subscribe(() => {
            this.onSearch();
        });

        this.filterSvc$ = this.filterService.filter$.subscribe(filter => {
            this.filterForm.patchValue({
                text: filter.text || undefined,
                category: filter.category || undefined,
                seasons: filter.seasons || undefined,
                vegetarianStatus: filter.vegetarianStatus || undefined
            }, { emitEvent: false });
        });
    }

    ngOnDestroy(): void {
        this.filterFormValueChanges$.unsubscribe();
        this.filterSvc$.unsubscribe();
    }

    protected onSearch(): void {
        const filter = this.buildFilter();
        this.filterService.setFilter(filter);
        this.router.navigate(['/recipes']);
    }

    private buildFilter(): RecipeFilterDto {
        const filter: RecipeFilterDto = {};
        const formValue = this.filterForm.getRawValue() as RecipeFilterDto;

        const cleanedText = formValue.text?.trim().slice(0, 40);
        if (cleanedText) {
            filter.text = cleanedText;
        }

        if (formValue.category) {
            filter.category = formValue.category as RecipeCategory;
        }

        if (formValue.seasons && formValue.seasons.length > 0) {
            filter.seasons = formValue.seasons as RecipeSeason[];
        }

        if (formValue.vegetarianStatus && formValue.vegetarianStatus.length > 0) {
            filter.vegetarianStatus = formValue.vegetarianStatus as RecipeVegetarianStatus[];
        }

        return filter;
    }

    optionsMapping: {[k: string]: string} = {
        '=0': '(0)',
        '=1': '(1)',
        'other': '(#)'
    }

}
