// Router — simple hash-based SPA router with view transitions

const routes = {};
let currentView = null;
let currentCleanup = null;
let navigationStack = [];
let viewDataStore = {};

export function registerRoute(path, viewFactory) {
  routes[path] = viewFactory;
}

export function navigate(path, data = null, options = {}) {
  const { replace = false, animate = true } = options;
  if (data) viewDataStore[path] = data;
  if (!replace) {
    navigationStack.push(window.location.hash.slice(1) || '/');
  }
  window.location.hash = path;
}

export function goBack() {
  if (navigationStack.length > 0) {
    const prev = navigationStack.pop();
    window.location.hash = prev;
  } else {
    navigate('/', null, { replace: true });
  }
}

export function getViewData(path) {
  return viewDataStore[path || window.location.hash.slice(1)] || null;
}

export function setViewData(path, data) {
  viewDataStore[path] = data;
}

export function resetToHome() {
  navigationStack = [];
  viewDataStore = {};
  navigate('/', null, { replace: true });
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const viewFactory = routes[hash];
  if (!viewFactory) {
    console.warn(`No route for: ${hash}`);
    return;
  }
  const app = document.getElementById('app');

  // Cleanup previous view
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // Create new view
  const { element, cleanup } = viewFactory(getViewData(hash));
  currentCleanup = cleanup || null;

  // Transition
  if (currentView) {
    const oldView = currentView;
    oldView.classList.add('view-exit');
    element.classList.add('view-enter');
    app.appendChild(element);
    setTimeout(() => {
      oldView.remove();
      element.classList.remove('view-enter');
    }, 300);
  } else {
    app.innerHTML = '';
    app.appendChild(element);
  }
  currentView = element;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash) window.location.hash = '/';
  handleRoute();
}
