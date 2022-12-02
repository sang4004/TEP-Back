/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 ******************************************************************************
 * connect_plant_files : 주기기 파일 연결
 *** POST
 *** plant_id : edms_plant_files -> id
 *** file_no : edms_other_files -> file_no
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Transaction } from "typeorm";
import moment from "moment";
import { EdmsPlantFiles, EdmsOtherFiles, EdmsUser } from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { globalWorkerObj } from "@/lib/mainWorker";

const router = express.Router();

//
router.post("/connect_plant_files", async (req: Request, res: Response) => {
    const { plant_id, file_no } = req.body;
    try {
        const user_id = req.app.get("edms_user_id");
        const user = await getRepository(EdmsUser).findOne({ user_id: user_id });
        if (user.level <= 2) {
            let epf = await getRepository(EdmsPlantFiles).findOne({ id: plant_id });
            let eof = await getRepository(EdmsOtherFiles).findOne({ file_no: file_no });
            if (epf !== undefined && eof !== undefined) {
                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsPlantFiles)
                    .set({ file_no: eof.file_no, wp_idx: eof.wp_idx })
                    .where("id = :id", { id: epf.id })
                    .execute();

                globalWorkerObj.dclWorkerInstance.refreshData();
                return getSuccessResponse(res, true);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
