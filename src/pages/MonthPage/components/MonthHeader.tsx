import { Badge, Button, Group, Stack, Title } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import type { ScheduleMonth } from "../../../types";

dayjs.locale("fr");

type Props = {
	scheduleMonth: ScheduleMonth;
	onGenerate: () => void;
	onPublish: () => void;
	generating: boolean;
	publishing: boolean;
};

export function MonthHeader({
	scheduleMonth,
	onGenerate,
	onPublish,
	generating,
	publishing,
}: Props) {
	return (
		<Group justify="space-between" mb="md">
			<Stack gap={0}>
				<Title order={3}>
					{dayjs(scheduleMonth.month).format("MMMM YYYY")}
				</Title>
				<Badge
					color={scheduleMonth.status === "published" ? "green" : "yellow"}
				>
					{scheduleMonth.status === "published" ? "Publié" : "Brouillon"}
				</Badge>
			</Stack>
			<Group>
				<Button onClick={onGenerate} loading={generating} variant="outline">
					Générer le planning
				</Button>
				{scheduleMonth.status === "draft" && (
					<Button onClick={onPublish} loading={publishing} color="green">
						Publier
					</Button>
				)}
			</Group>
		</Group>
	);
}
