import { createRouter, createWebHistory } from 'vue-router';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/search', name: 'search', component: () => import('./views/SearchView.vue') },
    { path: '/library', name: 'library', component: () => import('./views/LibraryView.vue') },
    { path: '/liked', name: 'liked', component: () => import('./views/CollectionView.vue'), props: { kind: 'liked' } },
    { path: '/songs', name: 'songs', component: () => import('./views/CollectionView.vue'), props: { kind: 'all' } },
    { path: '/playlist/:id', name: 'playlist', component: () => import('./views/CollectionView.vue'), props: (r) => ({ kind: 'playlist', id: r.params.id }) },
    { path: '/album/:artist/:name', name: 'album', component: () => import('./views/CollectionView.vue'), props: (r) => ({ kind: 'album', id: r.params.name, artist: r.params.artist }) },
    { path: '/artist/:name', name: 'artist', component: () => import('./views/ArtistView.vue'), props: true },
    { path: '/:p(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
