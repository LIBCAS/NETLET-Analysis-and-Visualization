import { Routes } from '@angular/router';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { HomeComponent } from './pages/home/home.component';
import { KeywordsComponent } from './pages/keywords/keywords.component';
import { IdentitiesComponent } from './pages/identities/identities.component';
import { ProfessionsComponent } from './pages/professions/professions.component';
import { CentralityComponent } from './pages/centrality/centrality.component';
import { RelationComponent } from './pages/relation/relation.component';
import { MapComponent } from './pages/map/map.component';
import { TimelineComponent } from './pages/timeline/timeline.component';

export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'home', component: HomeComponent},
    {path: 'centrality', component: CentralityComponent},
    {path: 'relation', component: RelationComponent},
    {path: 'identities', component: IdentitiesComponent},
    {path: 'map', component: MapComponent},
    {path: 'map-view', component: MapViewComponent},
    {path: 'professions', component: ProfessionsComponent},
    {path: 'keywords', component: KeywordsComponent},
    {path: 'timeline', component: TimelineComponent}
];
