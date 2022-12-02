/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsModelFile
 * 3D 모델 관리
 * api :
 *
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Repository } from "typeorm";
import {
    EdmsAuthority,
    EdmsCategory,
    EdmsCompany,
    EdmsDiscipline,
    EdmsDocument,
    EdmsGroup,
    EdmsProjectType,
    EdmsUser,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import path from "path";
import { logger } from "@/lib/winston";

const router = express.Router();

router.get("/get_docu_authority", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        const user = await getRepository(EdmsUser).findOne({ user_id });
        let list = await getConnection().query(`
            SELECT 
                ea.docu_no, 
                ea.read,
                ea.write,
                ea.delete,
                ea.download
            FROM ( 
                SELECT 
                    docu_no,
                    ea.read,
                    ea.write,
                    ea.delete,
                    ea.download 
                FROM edms_authority ea WHERE ea.user_id = ${user.user_id} AND ea.is_delete = 0
                UNION DISTINCT 
                SELECT 
                    docu_no,
                    ea.read,
                    ea.write,
                    ea.delete,
                    ea.download 
                FROM edms_authority ea WHERE ea.company_id = ${user.company_id} AND ea.is_delete = 0 AND ea.group_id = -1 AND ea.user_id= -1
                UNION DISTINCT
                SELECT 
                    docu_no,
                    ea.read,
                    ea.write,
                    ea.delete,
                    ea.download 
                FROM edms_authority ea WHERE ea.group_id = ${user.group_id} AND ea.is_delete = 0 AND ea.user_id = -1
            )  ea
        `);
        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_auth_list", async (req: Request, res: Response) => {
    try {
        let edms_comp = await getRepository(EdmsCompany).find({ is_delete: false });
        let edms_group = await getRepository(EdmsGroup).find({ is_delete: false });
        let edms_user = await getConnection().query(`select * from edms_user eu WHERE eu.is_use = 1`);

        let edms_auth = await getRepository(EdmsAuthority).find({ is_delete: false });

        return getSuccessResponse(res, { edms_comp, edms_group, edms_user, edms_auth });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/edit_auth", async (req: Request, res: Response) => {
    try {
        let { auth_list, readAuth, writeAuth, downloadAuth, deleteAuth, company_id, group_id, user_id } = req.body;
        let new_auth_list = [];
        let edit_auth_list = [];
        for (var auth of auth_list) {
            if (auth.id) {
                let _auth = await await getRepository(EdmsAuthority).findOne({
                    id: auth.id,
                    is_delete: false,
                });
                if (_auth) {
                    edit_auth_list.push(_auth.id);
                }
            } else {
                let new_auth = new EdmsAuthority();
                let proj;
                if (auth.type == `project`) {
                    proj = await getRepository(EdmsProjectType).findOne({ project_no: auth.auth_id, is_use: 1 });
                } else if (auth.type == `discipline`) {
                    let dcl = await getRepository(EdmsDiscipline).findOne({ id: auth.auth_id, is_use: 1 });
                    proj = await getRepository(EdmsProjectType).findOne({ project_no: dcl.project_no, is_use: 1 });
                    new_auth.discipline_id = dcl.id;
                } else if (auth.type == `category`) {
                    let cate = await getRepository(EdmsCategory).findOne({ cate_no: auth.auth_id, is_use: 1 });
                    proj = await getRepository(EdmsProjectType).findOne({ project_no: cate.project_no });
                    new_auth.discipline_id = cate.discipline_id;
                    new_auth.cate_no = cate.cate_no;
                } else if (auth.type == `document`) {
                    let docu = await getRepository(EdmsDocument).findOne({ docu_no: auth.auth_id, is_use: 1 });
                    let cate = await getRepository(EdmsCategory).findOne({ cate_no: docu.cate_no, is_use: 1 });
                    proj = await getRepository(EdmsProjectType).findOne({ project_no: docu.project_no, is_use: 1 });
                    new_auth.discipline_id = cate.discipline_id;
                    new_auth.cate_no = cate.cate_no;
                    new_auth.docu_no = docu.docu_no;
                }
                new_auth.project_no = proj.p_project_no;
                new_auth.project_type_no = proj.project_no;
                new_auth.company_id = company_id;
                new_auth.group_id = group_id;
                new_auth.user_id = user_id;
                new_auth.read = readAuth ? 1 : 0;
                new_auth.write = writeAuth ? 1 : 0;
                new_auth.download = downloadAuth ? 1 : 0;
                new_auth.delete = deleteAuth ? 1 : 0;
                new_auth_list.push(new_auth);
            }
        }
        if (edit_auth_list.length > 0) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsAuthority)
                .set({
                    read: readAuth ? 1 : 0,
                    write: writeAuth ? 1 : 0,
                    download: downloadAuth ? 1 : 0,
                    delete: deleteAuth ? 1 : 0,
                })
                .where("id IN (:ids)", { ids: edit_auth_list.join(",") })
                .execute();
        }
        if (new_auth_list.length > 0) {
            await getRepository(EdmsAuthority).save(new_auth_list);
        }
        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
});

router.delete("/delete_auth", async (req: Request, res: Response) => {
    try {
        const auth_ids = req.query.auth_ids;
        if (auth_ids && Array.isArray(auth_ids)) {
            let del_auth_ids = auth_ids.map(raw => parseInt(raw));
            let auth = await getRepository(EdmsAuthority).findOne({
                id: In(del_auth_ids),
                is_delete: false,
            });
            if (auth) await getRepository(EdmsAuthority).delete({ id: In(del_auth_ids) });
            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res, true);
});

export default router;
