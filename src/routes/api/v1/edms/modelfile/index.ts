/******************************************************************************
 * entity :
 * EdmsModelFile
 * 3D 모델 관리
 * api :
 *
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Repository } from "typeorm";
import { EdmsModelFiles, User, ImodelEntity } from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { edmsFileDir } from "../../../../../constant";
import { logger } from "@/lib/winston";

const router = express.Router();

router.get("/get_model_file_list", async (req: Request, res: Response) => {
    try {
        const { project_no } = req.query;
        if (req.app.get("edms_user_id") != null && typeof project_no == "string") {
            let list = await getRepository(EdmsModelFiles).find({
                project_no: parseInt(project_no),
            });
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// 3D 모델 업로드 API
router.post("/upload_model_file", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1 && req.files.length > 0) {
            const file = req.files[0];
            let user = await getRepository(User).findOne({
                id: req.app.get("edms_user_id"),
            });
            let newModelFile = new EdmsModelFiles();
            newModelFile.project_no = req.body.project_no;
            newModelFile.subject = req.body.subject;
            newModelFile.explan = req.body.explan;
            newModelFile.root_path = `${edmsFileDir}${file.filename}`;
            newModelFile.repo_path = ``;
            newModelFile.file_name = file.filename;
            newModelFile.original_file_name = file.originalname;
            newModelFile.create_by = user.username;
            let insertEmp = await getRepository(EdmsModelFiles).save(newModelFile);

            return getSuccessResponse(res, file);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_imodel_elements", async (req: Request, res: Response) => {
    try {
        let imodels = await getRepository(ImodelEntity).find();
        return getSuccessResponse(res, imodels);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
