/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsDocument
 * 도큐먼트 관리
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Not, Repository } from "typeorm";
import {
    EdmsProjectType,
    EdmsCategory,
    EdmsDocument,
    EdmsStage,
    EdmsFiles,
    User,
    WorkTmpBox,
    EdmsProjects,
    EdmsDiscipline,
    EdmsArea,
    EdmsStageType,
    EdmsUser,
} from "@/entity";
import { getFailedResponse, getSuccessResponse, LANGUAGE_PACK } from "@/lib/format";
import { getDateValue, getFileTypeName, getMoment } from "@/lib/utils";
import { getDefaultStages } from "@/routes/api/v1/edms/utils";
import { CreateUploadFormExcelFile } from "./utils";
import { globalWorkerObj } from "@/lib/mainWorker";
import { logger } from "@/lib/winston";

const router = express.Router();

const get_docu_status_str = (status: string) => {
    switch (status) {
        case "1":
            return LANGUAGE_PACK.PROJECT.CONTINUED.kor;
        case "2":
            return LANGUAGE_PACK.PROJECT.COMPLETE.kor;
        case "0":
        default:
            return LANGUAGE_PACK.PROJECT.WAIT.kor;
    }
};

const get_docu_type = (docu_type: string) => {
    switch (docu_type) {
        case "001":
            return "설계 성과품";
        default:
            return "성과품이 없습니다.";
    }
};

const get_stage_type = (stage: string) => {
    switch (stage) {
        case "IFA Issue":
            return "i";
        case "IFA Approval":
            return "a";
        case "AFC Issue":
            return "i";
        case "AFC Approval":
            return "a";
        default:
            return "";
    }
};

router.get("/get_stage_codes", async (req: Request, res: Response) => {
    let result = await getDefaultStages();
    return getSuccessResponse(res, result);
});

router.get("/get_stage_type", async (req: Request, res: Response) => {
    let stage = await getRepository(EdmsStageType).find();
    return getSuccessResponse(res, stage);
});

router.post("/create_document", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    try {
        const {
            cate_no,
            docu_code,
            docu_subject,
            docu_type,
            explan,
            status,
            plan_submit_dt,
            real_submit_dt,
            plan_dates,
            actual_dates,
        } = req.body;

        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: user_id },
        });

        let cate = await getRepository(EdmsCategory).findOne({ cate_no });
        let newDocu = new EdmsDocument();
        newDocu.project_no = cate.project_no;
        newDocu.cate_no = cate_no;
        newDocu.docu_code = docu_code;
        newDocu.docu_type = docu_type;
        newDocu.docu_subject = docu_subject;
        newDocu.explan = explan;
        newDocu.process_code = "B";
        newDocu.plan_submit_dt = plan_submit_dt;
        newDocu.real_submit_dt = real_submit_dt;
        newDocu.status = status;
        newDocu.create_by = user.username;
        newDocu.create_tm = new Date();
        newDocu.area_id = -1; // -1 고정
        newDocu.is_vp = cate.is_vp;
        newDocu.user_id = user_id;

        let insertDocu = await getRepository(EdmsDocument).save(newDocu);

        let stage_type = await getRepository(EdmsStageType).find();

        //스테이지 데이터 생성
        let stages: EdmsStage[] = [];
        for (var i = 0; i < stage_type.length; i++) {
            let stage = new EdmsStage();
            stage.create_by = user.username;
            stage.create_tm = new Date();
            stage.docu_no = insertDocu.docu_no;
            stage.stage_code = stage_type[i].stage_name;
            stage.status = "001";
            stage.plan_dt = plan_dates[i] == undefined ? null : plan_dates[i];
            stage.actual_dt = actual_dates[i] == undefined ? null : actual_dates[i];
            stage.stage_type = stage_type[i].stage_name == "IFA" ? "a" : stage_type[i].stage_name == "AFC" ? "a" : "";
            stage.actual_rate = 0;
            stages.push(stage);
        }
        await getRepository(EdmsStage).save(stages);
        globalWorkerObj.dclWorkerInstance.refreshData();
        return getSuccessResponse(res, {
            insert_document: {
                ...insertDocu,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_document", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    try {
        const {
            docu_no,
            cate_no,
            docu_code,
            docu_subject,
            docu_type,
            explan,
            plan_submit_dt,
            real_submit_dt,
            plan_dates,
            actual_dates,
        } = req.body;

        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: user_id },
        });

        if (docu_no) {
            let edit_document = {};
            await getConnection().transaction(async tr => {
                let modify_tm = new Date();
                //#region document info edit

                if (cate_no) Object.assign(edit_document, { cate_no: cate_no });

                if (docu_code) Object.assign(edit_document, { docu_code: docu_code });

                if (docu_type) Object.assign(edit_document, { docu_type: docu_type });

                if (docu_subject) Object.assign(edit_document, { docu_subject: docu_subject });

                if (explan) Object.assign(edit_document, { explan: explan });

                if (plan_submit_dt)
                    Object.assign(edit_document, {
                        plan_submit_dt: plan_submit_dt,
                    });

                if (real_submit_dt)
                    Object.assign(edit_document, {
                        real_submit_dt: real_submit_dt,
                    });

                Object.assign(edit_document, { modify_by: user.username });
                Object.assign(edit_document, { modify_tm: modify_tm });

                await tr
                    .createQueryBuilder()
                    .update(EdmsDocument)
                    .set(edit_document)
                    .where("docu_no = :id", { id: docu_no })
                    .execute();
                //#endregion
                //#region stage info edit
                let stage_type_list = await getRepository(EdmsStageType).find();
                let stage_list = await getRepository(EdmsStage).find({
                    where: { docu_no: docu_no, stage_type: Not("i") },
                });

                let stages: EdmsStage[] = [];

                for (var i = 0; i < stage_type_list.length; i++) {
                    let stage = stage_type_list[i].stage_name;
                    let obj = {
                        plan_dt: plan_dates[i],
                        actual_dt: actual_dates[i],
                    };
                    if (stage_list.find(raw => raw.stage_code == stage) != undefined) {
                        if (stage == "IFA" || "AFC") {
                            await getConnection()
                                .createQueryBuilder()
                                .update(EdmsStage)
                                .set(obj)
                                .where("docu_no = :id AND stage_code = :code AND stage_type = 'a'", {
                                    id: docu_no,
                                    code: stage,
                                })
                                .execute();
                        }
                        if (stage == "Start" || "As-Built" || "As-Built(F)") {
                            await getConnection()
                                .createQueryBuilder()
                                .update(EdmsStage)
                                .set(obj)
                                .where("docu_no = :id AND stage_code = :code", {
                                    id: docu_no,
                                    code: stage,
                                })
                                .execute();
                        }
                    } else {
                        let stage_type = new EdmsStage();
                        stage_type.create_by = user.username;
                        stage_type.create_tm = new Date();
                        stage_type.docu_no = docu_no;
                        stage_type.stage_code = stage;
                        stage_type.status = "001";
                        stage_type.plan_dt = plan_dates[i] == undefined ? null : plan_dates[i];
                        stage_type.actual_dt = actual_dates[i] == undefined ? null : actual_dates[i];
                        stage_type.stage_type = stage == "IFA" ? "a" : stage == "AFC" ? "a" : "";
                        stage_type.actual_rate = 0;
                        stages.push(stage_type);
                    }

                    // Object.assign(stages[])
                }
                if (stages.length > 0) await getRepository(EdmsStage).save(stages);
                //#endregion
            });
            return getSuccessResponse(res, { document: edit_document });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
        console.log(err);
    }

    return getFailedResponse(res);
});

router.delete("/delete_document", async (req: Request, res: Response) => {
    try {
        let docu_no = req.query.docu_no;
        if (docu_no && docu_no.length > 0 && Array.isArray(docu_no)) {
            docu_no = docu_no.map(raw => parseInt(raw)).join(",");
            await getConnection()
                .createQueryBuilder()
                .update(EdmsDocument)
                .set({ is_use: 0 })
                .where(`docu_no IN (${docu_no})`)
                .execute();
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ is_use: 0 })
                .where(`docu_no IN(${docu_no})`)
                .execute();
            globalWorkerObj.dclWorkerInstance.refreshData();
        }
        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_document", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    try {
        if (docu_no) {
            let docu = await getRepository(EdmsDocument).findOne({
                docu_no: Number(docu_no),
                is_use: 1,
            });

            let stages = await getRepository(EdmsStage).find({
                where: { docu_no: docu_no, is_use: 1 },
                order: { stage_no: "DESC" },
            });
            let stage_code = "";
            for (var stage of stages) {
                if (stage.actual_dt != null) {
                    stage_code = stage.stage_code;
                    break;
                }
            }
            docu["stage_code"] = stage_code;
            return getSuccessResponse(res, docu);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_document_list", async (req: Request, res: Response) => {
    try {
        let emps = await getRepository(EdmsDocument).find({
            where: {
                cate_no: Number(req.query.cate_no),
                is_use: 1,
            },
            order: {
                docu_code: "ASC",
            },
        });
        let file_no: number[] = [];
        let file_list = await getRepository(EdmsFiles).find({ where: { is_use: 1 } });
        for (var l of emps) {
            let filtered = file_list.filter(raw => raw.docu_no == l.docu_no);
            if (filtered.length > 0) file_no = filtered.map(raw => raw.file_no);
            l.status = l.status ? get_docu_status_str(l.status) : l.status;
            l.docu_type = l.docu_type ? get_docu_type(l.docu_type) : l.docu_type;
        }
        let _stage_list = await getRepository(EdmsStage).find({
            file_no: In(file_no),
            is_use: 1,
        });
        let _file_list = await getRepository(EdmsFiles).find({
            file_no: In(file_no),
            is_use: 1,
        });
        let list = [];
        for (var item of emps) {
            let stage_res = {};
            // let docu_stage_list = _stage_list.filter(raw => raw.docu_no == item.docu_no);
            for (var stage of _stage_list) {
                let bool = 0;
                if (!stage.actual_dt || stage.actual_dt > stage.plan_dt) bool = 1;
                stage_res[stage.stage_code] = {
                    plan: stage.plan_dt,
                    action: stage.actual_dt,
                    flag: bool,
                };
            }
            let files = _file_list.filter(raw => raw.docu_no == item.docu_no).length;
            let files_res = { file_list: files };
            list.push({
                ...item,
                ...stage_res,
                ...files_res,
            });
        }
        // if(emps.length != 0){
        return getSuccessResponse(res, list);
        // }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_document_master_list", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            // mssql
            //case WHEN LEN(efile.stage_code) > 0
            // THEN efile.stage_code
            // ELSE "Start" END AS stage_code,
            let _list = await tr.query(`
                SELECT 
                    ed.docu_no,
                    ed.docu_code,
                    IF(file.stage_code != "", file.stage_code, "Start") as stage_code,
                    ed.docu_subject,
                    ed.docu_type,
                    ed.is_vp,
                    ed.is_bop,
                    ed.wv_rate,
                    ed.plan_rate,
                    ed.actual_rate,
                    ec.cate_name,
                    ept.project_name,
                    edp.name,
                    ed.cate_no,
                    ept.project_no
                FROM edms_document as ed
                INNER JOIN edms_category as ec
                    ON ec.cate_no = ed.cate_no
                INNER JOIN edms_project_type as ept
                    ON ept.project_no = ed.project_no
                INNER JOIN edms_discipline as edp
                    ON ec.discipline_id = edp.id
                LEFT JOIN (
                    SELECT 
                        docu.docu_no,
                        max(file.file_no) as file_no
                    FROM edms_document docu
                    INNER JOIN edms_files file
                        ON file.docu_no = docu.docu_no
                        AND file.is_use = 1
                    GROUP BY docu.docu_no
                ) ef
                    ON ef.docu_no = ed.docu_no
                LEFT JOIN edms_files file
                        ON file.file_no = ef.file_no
                            AND file.docu_no = ef.docu_no
                WHERE ed.is_use = 1
                ORDER BY ept.project_no ASC, edp.name ASC, ed.docu_code ASC, ed.docu_subject ASC;
            `);

            for (var l of _list) {
                l.status = l.status ? get_docu_status_str(l.status) : l.status;
                l.docu_type = l.docu_type ? get_docu_type(l.docu_type) : l.docu_type;
            }
            return getSuccessResponse(res, _list);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }

        return getFailedResponse(res);
    });
});

router.get("/get_document_manager", async (req: Request, res: Response) => {
    try {
        //통영에코파워 사람만 나오도록
        let pm = await getConnection().query(`
            SELECT 
                u.id, 
                u.username,
                o.id AS 'org_id',
                p_type.name AS 'position'
            FROM users u
            INNER JOIN organization o
                ON o.id = u.group_id
            INNER JOIN position_type p_type
                ON p_type.id = u.position
            WHERE o.group_id = 1
        `);
        return getSuccessResponse(res, pm);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

var category_list = [];
const getAllCate = (cate: any, all_list: any[]) => {
    let _filtered = all_list.filter(raw => {
        return raw.cate_no == cate.pcate_no;
    });
    if (_filtered.length > 0) {
        category_list = [...category_list, ..._filtered.map(raw => raw.cate_name)];
        for (var c of _filtered) {
            getAllCate(c, all_list);
        }
    }
};
router.get("/get_document_excel_file_upload_form", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != -1) {
            let data = [];
            let projects = await getRepository(EdmsProjectType).find({ is_use: 1 });
            for (var proj of projects) {
                if (globalWorkerObj.dclWorkResult[proj.project_no]) {
                    data = [...data, ...globalWorkerObj.dclWorkResult[proj.project_no]];
                }
                if (globalWorkerObj.vpWorkResult[proj.project_no]) {
                    data = [...data, ...globalWorkerObj.vpWorkResult[proj.project_no]];
                }
            }
            return await CreateUploadFormExcelFile(data, req, res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_docu_comparison", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    let owner_id = req.app.get("edms_user_id");
    try {
        let _docu = await getRepository(WorkTmpBox).findOne({
            where: { docu_no, owner_id },
        });
        if (_docu) {
            return getSuccessResponse(res, false);
        } else {
            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// document 권한 있는 유저
router.get("/get_document_auth_user", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");
            const { docu_list } = req.query;
            let list: any[] = [];

            for (let i = 0; i < docu_list.length; i++) {
                list.push(docu_list[i]);
            }

            let auth_user_list = await getRepository(EdmsDocument).find({
                docu_no: In(list),
                is_use: 1,
            });

            return getSuccessResponse(res, auth_user_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_docu_stage_data", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    await getConnection().transaction(async tr => {
        try {
            let stage_list = await tr.getRepository(EdmsStage).find({
                where: { docu_no: docu_no, stage_type: Not("i") },
            });

            return getSuccessResponse(res, stage_list);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

export default router;
