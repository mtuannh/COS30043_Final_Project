import { createWebHashHistory, createWebHistory } from 'vue-router';

const PROJECT_BASE_KEY = 'novatech-project-base';
const SPA_ROOT_PATHS = /^\/(login|register|products|cart|profile|admin|about|contact)(\/.*)?$/i;

export function mercuryProjectPath() {
  if (typeof window !== 'undefined' && window.__NOVATECH_PROJECT_BASE__) {
    const inline = window.__NOVATECH_PROJECT_BASE__;
    return inline.endsWith('/') ? inline : `${inline}/`;
  }

  const configured = import.meta.env.VITE_MERCURY_PROJECT_PATH || '';
  if (configured) {
    return configured.endsWith('/') ? configured : `${configured}/`;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const match = window.location.pathname.match(/^(.+\/project)\/?/i);
  if (!match) {
    return '';
  }

  return match[1].endsWith('/') ? match[1] : `${match[1]}/`;
}

export function saveProjectBase() {
  const base = mercuryProjectPath();
  if (!base) {
    return;
  }

  sessionStorage.setItem(PROJECT_BASE_KEY, base);
}

export function shouldUseHashRouter() {
  return !import.meta.env.DEV;
}

export function createAppHistory() {
  if (!shouldUseHashRouter()) {
    return createWebHistory(import.meta.env.BASE_URL);
  }

  // Let vue-router use location.pathname + "#" (reliable on Mercury subfolders).
  return createWebHashHistory();
}

export function routePathFromHash() {
  if (typeof window === 'undefined') {
    return '/';
  }

  const raw = window.location.hash.replace(/^#/, '').split('?')[0];
  if (!raw || raw === '/') {
    return '/';
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function ensureMercuryHashRoute() {
  if (!shouldUseHashRouter() || typeof window === 'undefined') {
    return;
  }

  const { pathname, search, hash, origin } = window.location;
  const projectPath = mercuryProjectPath();
  const rootSpa = pathname.match(SPA_ROOT_PATHS);

  if (rootSpa && projectPath) {
    window.location.replace(
      `${origin}${projectPath}#/${rootSpa[1]}${rootSpa[2] || ''}${search}`
    );
    return;
  }

  if (pathname.includes('/project') && (!hash || hash === '#')) {
    window.location.hash = '#/';
  }
}
