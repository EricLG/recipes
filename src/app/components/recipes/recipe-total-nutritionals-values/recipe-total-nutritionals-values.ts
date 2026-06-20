import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { NutrientsDto } from '../../../models/food';

const BAD = 'bi-x-lg c-red';
const WARNING = 'bi-exclamation-lg c-orange';
const GOOD = 'bi-check-lg c-green';
const EXCELLENT = 'bi-heart-fill c-green';

@Component({
    selector: 'recipe-total-nutritionals-values',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './recipe-total-nutritionals-values.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeTotalNutritionalsValues {

    @Input() nutrients: NutrientsDto | null = null;

    public getProteinsStatus(value: number, energyKcal: number): string {
        const scaledValueFor1600KCal = value * 1600 / energyKcal;

        if (scaledValueFor1600KCal < 50) {
            return BAD;
        } else if (scaledValueFor1600KCal < 72) {
            return WARNING;
        } else if (scaledValueFor1600KCal < 96) {
            return GOOD;
        } else {
            return EXCELLENT;
        }
    }

    public getFatsStatus(value: number, energyKcal: number): string {
        const scaledValueFor1600KCal = value * 1600 / energyKcal;

        if (scaledValueFor1600KCal < 42) {
            return GOOD;
        } else if (scaledValueFor1600KCal < 63) {
            return EXCELLENT;
        } else if (scaledValueFor1600KCal < 71) {
            return WARNING;
        } else {
            return BAD;
        }
    }

    public getFibersStatus(value: number, energyKcal: number): string {
        const scaledValueFor1600KCal = value * 1600 / energyKcal;

        if (scaledValueFor1600KCal < 20) {
            return WARNING;
        } else if (scaledValueFor1600KCal < 30) {
            return GOOD;
        } else {
            return EXCELLENT;
        }
    }

    public getSaltStatus(value: number): string {
        if (value < 1.5) {
            return GOOD;
        } else if (value < 2.5) {
            return EXCELLENT;
        } else {
            return BAD;
        }
    }

}
