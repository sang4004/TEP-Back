/******************************************************************************
 * entity :
 * sendrecv
 * Send box & Recv box api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, Repository, In, Not } from "typeorm";
import { WorkProc, WorkSendRecvBox, User } from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { getDateValue } from "@/lib/utils";

const router = express.Router();

router.get("/get_send_list", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != -1) {
            const { project_no } = req.query;
            const tm_list = await getRepository(WorkProc).find({
                project_no: parseInt(project_no.toString()),
                wp_type: "TM",
            });
            let list = await getRepository(WorkSendRecvBox).find({
                wp_idx: In([...tm_list.map(raw => raw.wp_idx)]),
                sender: user_id,
            });
            let users = await getRepository(User).find();
            list.map(raw => {
                Object.assign(raw, { recever_name: users.find(user => user.id == raw.recver).username });
                Object.assign(raw, { subject: tm_list.find(list => list.wp_idx == raw.wp_idx).subject });
            });
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_recv_list", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != -1) {
            const { project_no } = req.query;
            const tm_list = await getRepository(WorkProc).find({
                project_no: parseInt(project_no.toString()),
                wp_type: "TM",
            });
            const list = await getRepository(WorkSendRecvBox).find({
                wp_idx: In([...tm_list.map(raw => raw.wp_idx)]),
                recver: user_id,
                sender: Not(user_id),
            });
            let users = await getRepository(User).find();
            list.map(raw => {
                Object.assign(raw, { sender_name: users.find(user => user.id == raw.sender).username });
                Object.assign(raw, { subject: tm_list.find(list => list.wp_idx == raw.wp_idx).subject });
            });
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

export default router;
