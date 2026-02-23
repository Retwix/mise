import { Badge, Group, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import type {
	Assignment,
	Employee,
	ScheduleMonth,
	ShiftType,
} from "../../../types";

dayjs.locale("fr");

type Props = {
	scheduleMonth: ScheduleMonth;
	employees: Array<Employee>;
	shiftTypes: Array<ShiftType>;
	assignments: Array<Assignment>;
	onRemove: (assignmentId: string) => void;
};

export function ScheduleGrid({
	scheduleMonth,
	employees,
	shiftTypes,
	assignments,
	onRemove,
}: Props) {
	const [year, month] = scheduleMonth.month.split("-").map(Number);
	const daysInMonth = dayjs(scheduleMonth.month).daysInMonth();

	return (
		<ScrollArea>
			<Stack gap={4}>
				{Array.from({ length: daysInMonth }, (_, i) => {
					const day = i + 1;
					const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const dayAssignments = assignments.filter((a) => a.date === date);
					return (
						<Paper key={date} withBorder p="xs">
							<Group gap="md" align="flex-start" wrap="nowrap">
								<Text w={80} size="sm" fw={600} c="dimmed">
									{dayjs(date).format("ddd D")}
								</Text>
								<Group gap={8} wrap="wrap" style={{ flex: 1 }}>
									{shiftTypes.map((st) => {
										const shiftAssigns = dayAssignments.filter(
											(a) => a.shift_type_id === st.id,
										);
										return (
											<Paper key={st.id} withBorder p={6} miw={120}>
												<Text size="xs" c="dimmed" mb={4}>
													{st.label}
												</Text>
												<Stack gap={4}>
													{shiftAssigns.map((a) => {
														const emp = employees.find(
															(e) => e.id === a.employee_id,
														);
														return (
															<Badge
																key={a.id}
																variant="light"
																style={{ cursor: "pointer" }}
																onClick={() => onRemove(a.id)}
																title="Cliquer pour retirer"
															>
																{emp?.name ?? "?"}
															</Badge>
														);
													})}
													{shiftAssigns.length < st.required_count && (
														<Text size="xs" c="red">
															{st.required_count - shiftAssigns.length} poste(s)
															manquant(s)
														</Text>
													)}
												</Stack>
											</Paper>
										);
									})}
								</Group>
							</Group>
						</Paper>
					);
				})}
			</Stack>
		</ScrollArea>
	);
}
