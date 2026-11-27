import { Routes } from '@angular/router';

const name = '賢文 Worthy Words';

export const routes: Routes = [
  {
    path: '',
    title: `${name}: 增廣賢文 for everyday life`,
    loadComponent: () => import('./pages/today/today').then((m) => m.TodayPage),
  },
  {
    path: 'lessons',
    title: `課文 Lessons · ${name}`,
    loadComponent: () => import('./pages/lessons/lessons').then((m) => m.LessonsPage),
  },
  {
    path: 'lessons/:id',
    title: `課文 Lesson · ${name}`,
    loadComponent: () => import('./pages/lesson/lesson').then((m) => m.LessonPage),
  },
  {
    path: 'themes',
    title: `主題 Themes · ${name}`,
    loadComponent: () => import('./pages/themes/themes').then((m) => m.ThemesPage),
  },
  {
    path: 'themes/:id',
    title: `主題 Theme · ${name}`,
    loadComponent: () => import('./pages/theme/theme').then((m) => m.ThemePage),
  },
  {
    path: 'saved',
    title: `收藏 Saved · ${name}`,
    loadComponent: () => import('./pages/saved/saved').then((m) => m.SavedPage),
  },
  {
    path: 'settings',
    title: `設定 Settings · ${name}`,
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  {
    path: 'guide',
    title: `讀音 How to read · ${name}`,
    loadComponent: () => import('./pages/guide/guide').then((m) => m.GuidePage),
  },
  {
    path: 'review',
    title: `審稿 Review · ${name}`,
    loadComponent: () => import('./pages/review/review').then((m) => m.ReviewPage),
  },
  {
    path: 'review/:lesson',
    title: `審稿 Review · ${name}`,
    loadComponent: () => import('./pages/review/review').then((m) => m.ReviewPage),
  },
  { path: '**', redirectTo: '' },
];
