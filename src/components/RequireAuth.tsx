import { Center, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function RequireAuth() {
	const [session, setSession] = useState<
		"loading" | "authenticated" | "unauthenticated"
	>("loading");

	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session ? "authenticated" : "unauthenticated");
		});
	}, []);

	if (session === "loading")
		return (
			<Center h="100vh">
				<Loader />
			</Center>
		);

	if (session === "unauthenticated") return <Navigate to="/login" replace />;

	return <Outlet />;
}
