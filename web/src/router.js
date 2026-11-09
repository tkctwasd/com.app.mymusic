import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'listen', component: () => import('./views/ListenView.vue') },
    { path: '/shelf', name: 'shelf', component: () => import('./views/ShelfView.vue') },
    { path: '/explore', name: 'explore', component: () => import('./views/ExploreView.vue') },
    { path: '/liked', name: 'liked', component: () => import('./views/CollectionView.vue'), props: { kind: 'liked' } },
    { path: '/songs', name: 'songs', component: () => import('./views/CollectionView.vue'), props: { kind: 'all' } },
    { path: '/offline', name: 'offline', component: () => import('./views/OfflineView.vue') },
    { path: '/playlist/:id', name: 'playlist', component: () => import('./views/CollectionView.vue'), props: (r) => ({ kind: 'playlist', id: r.params.id }) },
    { path: '/album/:artist/:name', name: 'album', component: () => import('./views/CollectionView.vue'), props: (r) => ({ kind: 'album', id: r.params.name, artist: r.params.artist }) },
    { path: '/artist/:name', name: 'artist', component: () => import('./views/ArtistView.vue'), props: true },
    // Đường dẫn cũ của v1
    { path: '/search', redirect: (r) => ({ path: '/explore', query: r.query }) },
    { path: '/library', redirect: '/shelf' },
    { path: '/:p(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

// Tải sẵn mọi trang khi rảnh: lần đầu bấm chuyển trang không phải chờ tải file JS (cảm giác như trang bị nạp lại)
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
router.isReady().then(() => idle(() => router.getRoutes().forEach((r) => {
  const c = r.components?.default;
  if (typeof c === 'function') c().catch(() => {});
})));

export default router;
