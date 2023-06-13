/******************************************************************************
 * entity :
 * DIN
 * DIN work api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, Repository } from "typeorm";
import {
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    WorkDocu,
    WorkAttach,
    WorkTmpBox,
    User,
    EdmsUser,
} from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { edmsFileDir, edmsUploadFolder } from "../../../../../../constant";

const router = express.Router();

router.post("/upload_attach_files", async (req: Request, res: Response) => {
    try {
        const { wp_idx } = req.body;
        const user_id = req.app.get("edms_user_id");
        if (user_id != -1) {
            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });
            for (var file_key of Object.keys(req.files)) {
                let new_attach = new WorkAttach();
                new_attach.wp_idx = wp_idx;
                new_attach.create_by = user.username;
                new_attach.create_tm = new Date();
                new_attach.file_name = req.files[file_key].originalname;
                new_attach.file_path = edmsFileDir + req.files[file_key].filename;
                new_attach.repo_path = edmsUploadFolder + req.files[file_key].filename;
                await getRepository(WorkAttach).save(new_attach);
            }

            let attach_list = await getRepository(WorkAttach).find({
                wp_idx: wp_idx,
            });
            return getSuccessResponse(res, attach_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_attach_files", async (req: Request, res: Response) => {
    try {
        const { wp_idx } = req.query;
        if (req.app.get("edms_user_id") != -1) {
            let _wp_idx = typeof wp_idx == "string" ? parseInt(wp_idx) : typeof wp_idx == "number" ? wp_idx : 0;
            let attach_list = await getRepository(WorkAttach).find({
                wp_idx: _wp_idx,
            });
            return getSuccessResponse(res, attach_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.delete("/delete_attach_file", async (req: Request, res: Response) => {
    try {
        const { wat_idx } = req.query;
        // console.log(wat_idx);
        if (req.app.get("edms_user_id") != -1) {
            await getConnection()
                .createQueryBuilder()
                .update(WorkAttach)
                .set({ is_use: 0 })
                .where("wat_idx = :id", { id: parseInt(wat_idx.toString()) })
                .execute();
        }
        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
