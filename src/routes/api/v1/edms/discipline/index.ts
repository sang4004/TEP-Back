/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsCategory
 * 카테고리 관련 api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, In, Repository } from "typeorm";
import {
    EdmsProjectType,
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    EdmsUser,
    EdmsDiscipline,
    EdmsProjects,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { logger } from "@/lib/winston";
import { Procedure } from "@/lib/procedure";
import { globalWorkerObj } from "@/lib/mainWorker";

const router = express.Router();

router.post("/create_discipline", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    const { project_no, name, code, is_vp } = req.body;
    try {
        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: user_id },
        });
        let project_type = await getRepository(EdmsProjectType).findOne({
            where: { project_no: project_no },
        });
        let newDis = new EdmsDiscipline();
        newDis.code = code;
        newDis.project_no = project_type.project_no;
        newDis.name = name;
        newDis.is_vp = is_vp == 1 ? 1 : 0;
        newDis.user_id = user.user_id;
        let insertEmp = await getRepository(EdmsDiscipline).save(newDis);
        
        //refresh data
        globalWorkerObj.dclWorkerInstance.refreshData();
        return getSuccessResponse(res, {
            insert_category: {
                ...insertEmp,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_discipline", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    const { discipline_id, name, code, is_vp } = req.body;

    try {
        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: user_id },
        });

        if (discipline_id != undefined) {
            let edit_discipline = {};

            Object.assign(edit_discipline, { name: name });
            Object.assign(edit_discipline, { code: code });
            Object.assign(edit_discipline, { is_vp: is_vp });
            Object.assign(edit_discipline, { modify_by: user.username });
            Object.assign(edit_discipline, { modify_tm: new Date() });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsDiscipline)
                .set({ ...edit_discipline })
                .where("id=:id", { id: discipline_id })
                .execute();
            return getSuccessResponse(res, edit_discipline);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/delete_discipline", async (req: Request, res: Response) => {
    const { discipline_id } = req.body;
    try {
        let emps = await getRepository(EdmsDiscipline).find({ id: discipline_id });

        if (emps.length > 0) {
            let queries = Procedure.DeleteDiscStdInfo(emps[0].id).data;
            await getConnection().transaction(async tr => {
                for (var q of queries) {
                    await tr.query(q);
                }
                await tr
                    .createQueryBuilder()
                    .update(EdmsDiscipline)
                    .set({ is_use: 0 })
                    .where("id = :id ", { id: emps[0].id })
                    .execute();
            });
            //refresh data
            globalWorkerObj.dclWorkerInstance.refreshData();
        }
        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_discipline_list", async (req: Request, res: Response) => {
    try {
        let disciplines = await getConnection().query(`
            SELECT 
                ed.*, 
                ep.project_name
            FROM edms_discipline ed
            INNER JOIN edms_project_type ep
            ON ep.project_no = ed.project_no
            WHERE ed.is_use = 1
            ORDER BY ep.project_no ASC, ed.name ASC;
        `);
        let result = [];
        for (var disc of disciplines) {
            result.push({
                discipline_id: disc.id,
                name: disc.name,
                code: disc.code,
                is_vp: disc.is_vp,
                project_name: disc.project_name,
            });
        }
        return getSuccessResponse(res, disciplines);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
