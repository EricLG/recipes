import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';
import { FoodDetail } from './components/foods/food-detail/food-detail';
import { FoodForm } from './components/foods/food-form/food-form';
import { FoodsList } from './components/foods/foods-list/foods-list';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { ComingSoon } from './components/misc/coming-soon/coming-soon';
import { NotFound } from './components/misc/not-found/not-found';
import { RecipeDetail } from './components/recipes/recipe-detail/recipe-detail';
import { RecipeForm } from './components/recipes/recipe-form/recipe-form';
import { RecipeList } from './components/recipes/recipe-list/recipe-list';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'login', component: Login },
    { path: 'recipes', component: RecipeList },
    { path: 'recipes/add', component: RecipeForm, canActivate: [authGuard] },
    { path: 'recipes/edit/:id', component: RecipeForm, canActivate: [authGuard] },
    { path: 'recipes/:id', component: RecipeDetail },
    { path: 'foods', component: FoodsList },
    { path: 'foods/add', component: FoodForm, canActivate: [authGuard] },
    { path: 'foods/edit/:id', component: FoodForm, canActivate: [authGuard] },
    { path: 'foods/:id', component: FoodDetail },
    { path: 'coming-soon', component: ComingSoon },
    { path: '**', component: NotFound },
];
