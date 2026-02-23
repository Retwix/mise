import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import type { Employee } from "../../../types";

type Props = {
	employees: Employee[];
	closingCounts: Record<string, number>;
	maxClosings: number;
	minClosings: number;
};

export function ClosingStatsSidebar({
	employees,
	closingCounts,
	maxClosings,
	minClosings,
}: Props) {
	return (
		<Paper withBorder p="md" pos="sticky" top={16}>
			<Title order={5} mb="sm">
				Fermetures
			</Title>
			<Text size="xs" c="dimmed" mb="md">
				Écart max: {maxClosings - minClosings}
			</Text>
			<Stack gap={6}>
				{[...employees]
					.sort(
						(a, b) => (closingCounts[b.id] ?? 0) - (closingCounts[a.id] ?? 0),
					)
					.map((emp) => {
						const count = closingCounts[emp.id] ?? 0;
						const isHigh =
							count === maxClosings && maxClosings - minClosings > 2;
						return (
							<Group key={emp.id} justify="space-between">
								<Text size="sm">{emp.name}</Text>
								<Badge color={isHigh ? "red" : "green"}>{count}</Badge>
							</Group>
						);
					})}
			</Stack>
		</Paper>
	);
}
