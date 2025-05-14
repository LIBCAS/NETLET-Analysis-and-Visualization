import { Routes } from '@angular/router';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { HomeComponent } from './pages/home/home.component';
import { KeywordsComponent } from './pages/keywords/keywords.component';
import { IdentitiesComponent } from './pages/identities/identities.component';

export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'home', component: HomeComponent},
    {path: 'identities', component: IdentitiesComponent},
    {path: 'map', component: MapViewComponent},
    {path: 'keywords', component: KeywordsComponent}
];
