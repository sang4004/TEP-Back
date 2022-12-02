import { getRepository, Not } from "typeorm";
import cron from "node-cron";
import { EdmsUser } from "@/entity";
import { send_mail_notification } from "@/routes/api/v1/edms/etc";
import { DclWorker } from "@/lib/mainWorker";

// cron job function
export default async () => {
    cron.schedule("59 23 * * 0", async () => {
        let users = await getRepository(EdmsUser).find({ is_use: 1, approved: 1, level: Not(1) });
        await send_mail_notification(users.map(raw => raw.user_id));
    });
};
