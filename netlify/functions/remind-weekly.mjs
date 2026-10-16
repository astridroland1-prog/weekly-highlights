// Scheduled: every Thursday 11:45 UTC (13:45 in Swiss summer time, 12:45 in winter time).
import { sendReminder } from "../lib/remind.mjs";

export default async () => {
  const r = await sendReminder();
  console.log("weekly reminder", JSON.stringify(r));
};

export const config = { schedule: "45 11 * * 4" };
