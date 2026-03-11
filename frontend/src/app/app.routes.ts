import type { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'questions',
    loadComponent: () =>
      import('@components/questions/questions-list.component').then(
        (m) => m.QuestionsListComponent,
      ),
  },
  {
    path: 'questions/:id',
    loadComponent: () =>
      import('@components/questions/question-detail.component').then(
        (m) => m.QuestionDetailComponent,
      ),
  },
  {
    path: 'my-predictions',
    loadComponent: () =>
      import('@components/my-predictions/my-predictions.component').then(
        (m) => m.MyPredictionsComponent,
      ),
  },
  {
    path: 'calibration',
    loadComponent: () =>
      import('@components/calibration/calibration.component').then(
        (m) => m.CalibrationComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('@components/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
]
