/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 *
 * 프로젝트 설정
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Repository, MoreThan } from "typeorm";
import {
    EdmsDocument,
    EdmsUser,
    EdmsStage,
    EdmsProjects,
    EdmsProjectType,
    EdmsDiscipline,
    EdmsArea,
    EdmsCategory,
    EdmsStageType,
    EdmsPosition,
    EdmsDocumentManager,
    EdmsCompany,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { logger } from "@/lib/winston";
import { checkAdmin } from "@/lib/utils";
import { Procedure } from "@/lib/procedure";

const router = express.Router();

//#region 스테이지 데이터 가져오기
router.get("/get_stage_data", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    try {
        const user_id = req.app.get("edms_user_id");
        const is_admin = await checkAdmin(user_id);
        if (is_admin) {
            let data = await getRepository(EdmsStage).find({ where: { docu_no: docu_no, is_use: 1 } });
            return getSuccessResponse(res, data);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getSuccessResponse(res);
});
//#endregion
//#region 할증률 적용
router.post("/set_actual_rate", async (req: Request, res: Response) => {
    getConnection().transaction(async tr => {
        try {
            const user_id = req.app.get("edms_user_id");
            const is_admin = await checkAdmin(user_id);
            const { discipline_no, rate_data } = req.body;
            if (is_admin) {
                // 0 : start, 1 : IFA Issue, 2 : IFA Approval,
                // 3 : AFC Issue, 4 : AFC Approval, 5 : As-Built, 6 : As-Built(F)
                let stage_types = await Procedure.GetStageTypes();
                for (var i = 0; i < stage_types.data.length; i++) {
                    let stage = stage_types.data[i];
                    await tr.query(`
                        UPDATE edms_stage set actual_rate = ${rate_data ? rate_data[i] : 0}
                        WHERE stage_code = '${stage.stage_name}' AND stage_type = '${stage.stage_type}' AND
                            is_use = 1 AND docu_no 
                        IN(
                            SELECT docu_no FROM(
                                SELECT 
                                    ed.docu_no
                                FROM edms_discipline disc
                                INNER JOIN edms_category ec
                                    ON ec.discipline_id = disc.id
                                INNER JOIN edms_document ed
                                    ON ed.cate_no = ec.cate_no
                                WHERE disc.id = ${discipline_no})
                        a);
                `);
                }
                return getSuccessResponse(res, true);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
    });
});
//#endregion
//#region Get Index Data with keys
// 리스트 첫번째는 아이디값
const index_keys: any = {
    users: ["user_id", "userid", "password", "email", "username", "level"],
    position: ["id", "position_name", "company_id", "priority"],
    project: ["project_no", "project_name"],
    project_type: ["project_no", "project_code", "explan"],
    discipline: ["id", "name", "project_no"],
    area: ["id", "name"],
    category: ["cate_no", "cate_code", "cate_name", "explan", "discipline_id"],
    // document: ["docu_no", "cate_no", "docu_code", "docu_subject", "area_id"],
    stage_type: ["id", "stage_name"],
    document_manager: ["id", "project_type_no", "username", "user_id", "company_id", "discipline_id"],
};

const getIndexData = async () => {
    let index_data = {};
    await getConnection().transaction(async tr => {
        index_data["users"] = await getRepository(EdmsUser).find({ select: index_keys["users"], where: { is_use: 1 } });
        index_data["position"] = await getRepository(EdmsPosition).find({
            select: index_keys["position"],
            where: { is_delete: false },
        });
        index_data["project"] = await getRepository(EdmsProjects).find({
            select: index_keys["project"],
            where: { is_use: 1 },
        });
        index_data["project_type"] = await getRepository(EdmsProjectType).find({
            select: index_keys["project_type"],
            where: { is_use: 1 },
        });
        index_data["discipline"] = await getRepository(EdmsDiscipline).find({
            select: index_keys["discipline"],
            where: { is_use: 1 },
        });
        index_data["area"] = await getRepository(EdmsArea).find({ select: index_keys["area"], where: { is_use: 1 } });
        index_data["category"] = await getRepository(EdmsCategory).find({
            select: index_keys["category"],
            where: { is_use: 1 },
        });
        // index_data["document"] = await getRepository(EdmsDocument).find({ select: index_keys["document"], where: { is_use: 1 } });
        index_data["stage_type"] = await getRepository(EdmsStageType).find({ select: index_keys["stage_type"] });
        index_data["document_manager"] = await getRepository(EdmsDocumentManager).find({
            select: index_keys["document_manager"],
        });
    });
    return index_data;
};

const getIndexDataWithType = async (index_type: string) => {
    let index_data = null,
        data_key = [],
        entity = null;

    data_key = index_keys[index_type];
    switch (index_type) {
        case "users":
            entity = EdmsUser;
            break;
        case "position":
            entity = EdmsPosition;
            break;
        case "project":
            entity = EdmsProjects;
            break;
        case "project_type":
            entity = EdmsProjectType;
            break;
        case "discipline":
            entity = EdmsDiscipline;
            break;
        case "area":
            entity = EdmsArea;
            break;
        case "category":
            entity = EdmsCategory;
            break;
        case "document":
            entity = EdmsDocument;
            break;
        case "stage_type":
            entity = EdmsStageType;
        case "document_manager":
            entity = EdmsDocumentManager;
        default:
            break;
    }
    index_data = await getRepository(entity).find({
        select: [...data_key],
    });
    return { index_data, data_key, entity };
};
//#endregion
//#region 모든 인덱스 데이터 가져오기
router.get("/get_index_data", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        const is_admin = await checkAdmin(user_id);
        if (is_admin) {
            let datas = await getIndexData();
            return getSuccessResponse(res, { ...datas });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res);
});
//#endregion
//#region 인덱스 정보 업데이트
router.post("/set_index_data", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        const is_admin = await checkAdmin(user_id);
        const { index_type, data } = req.body;
        if (is_admin) {
            const { index_data, data_key, entity } = await getIndexDataWithType(index_type);

            if (data != null) {
                let add_data = [];
                let edit_data = [];
                let exist_ids = index_data.map(raw => raw[data_key[0]]);
                // 추가된 부분 검사
                data.map((d: any) => {
                    if (exist_ids.indexOf(d[data_key[0]]) == -1) add_data.push(d);
                });
                //변경된 부분 검사
                for (var d of index_data) {
                    let input_data = data.find(raw => raw[data_key[0]] == d[data_key[0]]);
                    if (input_data) {
                        for (var key of data_key) {
                            if (input_data[key] != d[key]) {
                                edit_data.push(input_data);
                                break;
                            }
                        }
                    }
                }
                // 데이터 반영
                await getConnection().transaction(async tr => {
                    for (var d of add_data) {
                        await tr.getRepository(entity).save(d);
                    }
                    for (var d of edit_data) {
                        let set_obj = {};
                        for (var i = 1; i < data_key.length; i++) {
                            Object.assign(set_obj, { [data_key[i]]: d[data_key[i]] });
                        }
                        let res = await tr
                            .createQueryBuilder()
                            .update(entity)
                            .set(set_obj)
                            .where({ [data_key[0]]: d[data_key[0]] })
                            .execute();
                    }
                });
                let affectedData = await getIndexDataWithType(index_type);
                return getSuccessResponse(res, { [index_type]: affectedData.index_data });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});
//#endregion
export default router;
