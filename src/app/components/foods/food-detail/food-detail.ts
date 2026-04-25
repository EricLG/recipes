import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, filter, map, shareReplay, switchMap } from 'rxjs';

import { AuthService } from '../../../auth/auth.service';
import { categoryTranslations, FoodCategory } from './../../../enums/food.enum';
import { FoodWithMeasuresDto } from './../../../models/food';
import { FoodService } from './../food.service';

@Component({
    selector: 'app-food-detail',
    imports: [CommonModule, RouterModule],
    templateUrl: './food-detail.html',
    styleUrl: './food-detail.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodDetail {

    private route = inject(ActivatedRoute);
    private foodSvc = inject(FoodService);
    private router = inject(Router);
    private svcAuth = inject(AuthService)

    public isAdmin = this.svcAuth.isAdmin();

    private readonly foodId$ = this.route.paramMap.pipe(
        map(params => params.get('id')),
        filter((id): id is string => id !== null),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    public readonly food = toSignal<FoodWithMeasuresDto | undefined>(
        this.foodId$.pipe(
            switchMap(id => this.foodSvc.getByIdWithMeasures(id))
        ),
        { initialValue: undefined }
    );

    public remove(): void {
        const food = this.food();
        if (!food) return;

        if (confirm('Supprimer cet ingrédient et toutes ses portions ?')) {
            this.foodSvc.delete(food.id).subscribe({
                next: () => this.router.navigate(['/foods']),
                error: (err) => console.error('Erreur suppression:', err)
            });
        }
    }

    public edit(): void {
        const food = this.food();
        if (!food) return;

        this.router.navigate(['/foods/edit', food.id]);
    }

    public getCategoryLabel(category: string): string {
        return categoryTranslations[category as FoodCategory] || category;
    }

}
