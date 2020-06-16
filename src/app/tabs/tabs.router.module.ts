import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'filer',
        children: [
          {
            path: '',
            loadChildren: () => import('../filer/filer.module').then((m) => m.FilterPageModule)
          }
        ]
      },
      {
        path: 'movie',
        children: [
          {
            path: '',
            loadChildren: () => import('../movie/movie.module').then((m) => m.MoviePageModule)
          }
        ]
      },
      {
        path: 'episode',
        children: [
          {
            path: '',
            loadChildren: () => import('../episode/episode.module').then((m) => m.EpisodePageModule)
          }
        ]
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadChildren: () => import('../settings/settings.module').then((m) => m.SettingsPageModule)
          }
        ]
      },
      {
        path: '',
        redirectTo: '/tabs/movie',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/movie',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {}
