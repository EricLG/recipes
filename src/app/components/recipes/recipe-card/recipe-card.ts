import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { RecipeCategory, RecipeSeason, RecipeStatus, recipeCategoryTranslations, recipeStatusTranslations, seasonTranslations } from '../../../enums/recipes.enum';
import { RecipeDto } from '../../../models/recipe';

@Component({
    selector: 'recipe-card',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './recipe-card.html',
    styleUrls: ['./recipe-card.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeCard {

    @Input() public recipe!: RecipeDto;

    public readonly defaultImages = {
        vegetarian: { url: 'assets/recipe_vege.png', alt: 'Plat végétarien' },
        non_vegetarian: { url: 'assets/recipe_meat.png', alt: 'Plat non végétarien' },
        flexible: { url: 'assets/recipe_flexible.png', alt: 'Plat flexible' },
    };

    public readonly servingMapping: { [k: string]: string } = {
        '=0': 'Aucune part',
        '=1': '1 part',
        other: '# parts',
    };

    public getCategoryLabel(category: string): string {
        return recipeCategoryTranslations[category as RecipeCategory] || category;
    }

    public getSeasonLabel(season: string): string {
        return seasonTranslations[season as RecipeSeason] || season;
    }

    public getStatusLabel(status: string): string {
        return recipeStatusTranslations[status as RecipeStatus] || status;
    }

}
