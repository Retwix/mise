import { Badge, Button, Group, Stack, Title } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import type { ScheduleMonth } from "../../../types";

dayjs.locale("fr");

type Props = {
	scheduleMonth: ScheduleMonth;
	onGenerate: () => void;
	onGenerateWithPython: () => void;
	onPublish: () => void;
	generating: boolean;
	generatingWithPython: boolean;
	publishing: boolean;
};

export function MonthHeader({
	scheduleMonth,
	onGenerate,
	onGenerateWithPython,
	onPublish,
	generating,
	generatingWithPython,
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
					Générer (JS)
				</Button>
				<Button onClick={onGenerateWithPython} loading={generatingWithPython} variant="outline" color="violet">
					Générer (OR-Tools)
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
