import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PrivateRoutesWrapper } from './init/PrivateRoutesWrapper';
import { HomePage } from './pages/Homepage/Homepage';
import { Schedule } from './pages/Schedule';

const router = createBrowserRouter([
  {
    element: <PrivateRoutesWrapper />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/schedule',
        element: <Schedule />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
