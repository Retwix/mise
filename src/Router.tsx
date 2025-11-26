import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PrivateRoutesWrapper } from './init/PrivateRoutesWrapper';
import { EmployeeIndex } from './pages/Employees';
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
      {
        path: '/employees',
        element: <EmployeeIndex />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
