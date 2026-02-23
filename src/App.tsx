import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { DispoPage } from "./pages/DispoPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { LoginPage } from "./pages/LoginPage";
import { MonthPage } from "./pages/MonthPage";
import { PlanningPage } from "./pages/PlanningPage";
import { ShiftTypesPage } from "./pages/ShiftTypesPage";

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/dispo/:token" element={<DispoPage />} />
				<Route path="/planning/:token" element={<PlanningPage />} />

				<Route element={<RequireAuth />}>
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/month/:monthId" element={<MonthPage />} />
					<Route path="/employees" element={<EmployeesPage />} />
					<Route path="/shift-types" element={<ShiftTypesPage />} />
				</Route>

				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
