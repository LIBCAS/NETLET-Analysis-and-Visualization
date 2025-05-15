import { Routes } from '@angular/router';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { HomeComponent } from './pages/home/home.component';
import { KeywordsComponent } from './pages/keywords/keywords.component';
import { IdentitiesComponent } from './pages/identities/identities.component';
import { ProfessionsComponent } from './pages/professions/professions.component';
import { CentralityComponent } from './pages/centrality/centrality.component';

export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'home', component: HomeComponent},
    {path: 'identities', component: IdentitiesComponent},
    {path: 'map', component: MapViewComponent},
    {path: 'professions', component: ProfessionsComponent},
    {path: 'centrality', component: CentralityComponent},
    {path: 'keywords', component: KeywordsComponent}
];
