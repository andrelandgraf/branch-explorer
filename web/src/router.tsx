import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { App } from './components/App';

export interface IndexSearch {
  b?: string;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    b: typeof search.b === 'string' ? search.b : undefined,
  }),
  component: App,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });
