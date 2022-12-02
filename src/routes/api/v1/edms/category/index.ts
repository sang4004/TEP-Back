/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsCategory
 * 카테고리 관련 api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, In, Repository, createQueryBuilder } from "typeorm";
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
import { getFailedResponse, getSuccessResponse, LANGUAGE_PACK } from "@/lib/format";
import { getDateValue, PathCheck } from "@/lib/utils";
import { logger } from "@/lib/winston";
import { Procedure } from "@/lib/procedure";
import { globalWorkerObj } from "@/lib/mainWorker";

const router = express.Router();

router.post("/create_category", async (req: Request, res: Response) => {
    const { pcate_no, project_no, cate_code, cate_name, isVp, discipline_id } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        let insertCate: EdmsCategory;
        await getConnection().transaction(async tr => {
            let user = await tr.getRepository(EdmsUser).findOne({
                where: { user_id: user_id },
            });
            let newCate = new EdmsCategory();
            let pcate = await tr.getRepository(EdmsCategory).findOne({
                cate_no: pcate_no,
                is_use: 1,
            });
            let project_type = await tr.getRepository(EdmsProjectType).findOne({
                where: { project_no: project_no },
            });

            let dept = pcate ? pcate.dept + 1 : 0;
            let isRoot = true;
            let pcateNo = 0;
            if (pcate_no != -1 && pcate_no) {
                isRoot = false;
                pcateNo = pcate_no;
            }

            newCate.project_no = project_no;
            newCate.is_root = isRoot;
            newCate.pm_id = user_id;
            newCate.pcate_no = pcateNo;
            newCate.cate_code = cate_code;
            newCate.cate_name = cate_name;
            newCate.explan = "";
            newCate.status = "0";
            newCate.is_approval = false;
            newCate.create_by = user.username;
            newCate.create_tm = new Date();
            newCate.dept = dept;
            newCate.is_vp = isVp;
            newCate.p_project_no = project_type.p_project_no;
            newCate.discipline_id = discipline_id;
            newCate.user_id = user.user_id;

            let _path = `${project_type.p_project_no}/`;
            let _cates = ``;
            for (var i = 0; i < dept; i++) {
                if (pcate) {
                    _cates = `${pcate.cate_no}/` + _cates;
                    pcate = await tr.getRepository(EdmsCategory).findOne({
                        cate_no: pcate.pcate_no,
                        is_use: 1,
                    });
                }
            }
            newCate.dir_path = _path + _cates;
            let insertCate = await tr.getRepository(EdmsCategory).save(newCate);
            await PathCheck(_path + _cates + `${insertCate.cate_no}/`);
            //refresh data
            globalWorkerObj.dclWorkerInstance.refreshData();
        });
        return getSuccessResponse(res, {
            insert_category: {
                ...insertCate,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_category", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    const { pcate_no, cate_no, cate_code, cate_name, isVp, discipline_id } = req.body;
    try {
        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: user_id },
        });

        if (cate_no != undefined) {
            let pcate = await getRepository(EdmsCategory).findOne({
                cate_no: pcate_no,
                is_use: 1,
            });
            let dept = pcate ? pcate.dept + 1 : 0;

            let edit_category = {};

            Object.assign(edit_category, { cate_code: cate_code });
            Object.assign(edit_category, { cate_name: cate_name });
            Object.assign(edit_category, { discipline_id: discipline_id });
            Object.assign(edit_category, { is_vp: isVp });
            Object.assign(edit_category, { modify_by: user.username });
            Object.assign(edit_category, { modify_tm: new Date() });
            Object.assign(edit_category, { dept });
            Object.assign(edit_category, { pcate_no });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsCategory)
                .set({ ...edit_category })
                .where("cate_no=:id", { id: req.body.cate_no })
                .execute();
            return getSuccessResponse(res, edit_category);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/delete_category", async (req: Request, res: Response) => {
    const { cate_no } = req.body;

    try {
        let emps = await getRepository(EdmsCategory)
            .createQueryBuilder()
            .where("cate_no IN (:...cate_no)", { cate_no: cate_no })
            .getMany();
        if (emps.length > 0) {
            let _query = Procedure.DeleteCateStdInfo(emps[0].cate_no).data;
            await getConnection().query(_query);
            await getConnection()
                .createQueryBuilder()
                .update(EdmsCategory)
                .set({ is_use: 0 })
                .where("cate_no = :id ", { id: cate_no[0] })
                .execute();
            //refresh data
            globalWorkerObj.dclWorkerInstance.refreshData();
        }
        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
    // try{
    //     let emps = await getRepository(EdmsCategory).findOne({ cate_no : req.body.cate_no});
    //     if(emps){
    //         await getRepository(EdmsCategory).remove(emps);
    //     }
    //     return getSuccessResponse(res, true);
    // } catch(err){ logger.error(req.path + " || " + err); }

    // return getFailedResponse(res);
});

router.get("/get_category", async (req: Request, res: Response) => {
    try {
        if (req.query.cate_no) {
            let emp = await getRepository(EdmsCategory).findOne({
                cate_no: Number(req.query.cate_no),
                is_use: 1,
            });

            return getSuccessResponse(res, emp);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_categories", async (req: Request, res: Response) => {
    const { cate_no_list } = req.query;
    try {
        if (Array.isArray(cate_no_list)) {
            let emp = await getRepository(EdmsCategory).find({
                where: { cate_no: In(cate_no_list.map(raw => parseInt(raw))), is_use: 1 },
            });

            return getSuccessResponse(res, emp);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getSuccessResponse(res);
});

var category_list = [];
const getAllCate = (cate_no: number, all_list: any[]) => {
    let _filtered = all_list.filter(raw => raw.pcate_no == cate_no);
    if (_filtered.length > 0) {
        category_list = [..._filtered];
        for (var c of _filtered) {
            getAllCate(c.cate_no, all_list);
        }
    }
};

const get_cate_status_str = (status: string) => {
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
// get category code need
const fnc_cate_level = async (project_no: number[], cate_no: number[], root_type?: boolean, is_min?: boolean) => {
    let filter_root_cate: any[];
    let filter_child_cate: any[];
    let totalCnts;
    let disciplines: EdmsDiscipline[];
    let projects: EdmsProjectType[];
    await getConnection().transaction(async tr => {
        disciplines = await getRepository(EdmsDiscipline).find({ is_use: 1 });
        projects = await getRepository(EdmsProjectType).find({ is_use: 1 });
        //for all cate 모든 카테고리에 대한 project_type_no 를 먼저 가져와야한다.
        let _ = await tr.getRepository(EdmsCategory).find({
            cate_no: In(cate_no),
            is_use: 1,
        });
        project_no = [...project_no, ..._.map(raw => raw.project_no)];
        project_no = [...new Set(project_no)];
        //
        // root_type : false인 경우 is_root 조건 빼기
        let cate: EdmsCategory[] = [];
        if (root_type == false) {
            cate = await tr.getRepository(EdmsCategory).find({
                where: { project_no: In(project_no), cate_no: In(cate_no), is_use: 1 },
                order: { cate_no: "ASC" },
            });
        } else {
            cate = await tr.getRepository(EdmsCategory).find({
                where: { project_no: In(project_no), cate_no: In(cate_no), is_root: true, is_use: 1 },
                order: { cate_no: "ASC" },
            });
        }
        if (cate.length == 0) {
            let all = await tr.getRepository(EdmsCategory).find({
                where: { project_no: In(project_no), cate_no: In(cate_no), is_use: 1 },
            });

            let pcate = all.map((raw: any) => raw.pcate_no);
            // //for root
            let root_filtered = await tr.getRepository(EdmsCategory).find({
                where: { project_no: In(project_no), cate_no: In(pcate), is_use: 1 },
                order: { cate_no: "ASC" },
            });
            // for child
            // let child_filtered = await tr.getRepository(EdmsCategory).find({
            //     where: { project_no: In(project_no), cate_no: In(cate_no), is_root: false, is_use: 1 },
            //     order: { dept: "ASC", pcate_no: "ASC", cate_no: "ASC" },
            // });

            filter_root_cate = root_filtered;
            // filter_child_cate = child_filtered;
        } else {
            // let child_filtered = await tr.getRepository(EdmsCategory).find({
            //     where: { project_no: In(project_no), pcate_no: In(cate_no), is_use: 1 },
            //     order: { dept: "ASC", pcate_no: "ASC", cate_no: "ASC" },
            // });
            filter_root_cate = cate;
            // filter_child_cate = child_filtered;
        }

        totalCnts = await tr.query(`
            SELECT cate.cate_no,
                (SELECT COUNT(*) FROM edms_document WHERE cate_no = cate.cate_no) AS end_cnts,
                (SELECT COUNT(*) FROM edms_files WHERE cate_no = cate.cate_no) AS file_cnts,
                (SELECT COUNT(*) FROM work_achieve WHERE cate_no = cate.cate_no) AS achieve_cnts,
                (
                    SELECT COUNT(*) / COUNT(CASE WHEN es.actual_dt THEN 1 END)
                    FROM edms_document ed 
                    INNER JOIN edms_stage es
                        ON es.docu_no = ed.docu_no
                    WHERE ed.cate_no = cate.cate_no
                ) AS rate
            FROM edms_category cate
            WHERE cate.project_no IN (${project_no}) AND cate.is_use = 1
            GROUP BY cate.cate_no
            ORDER BY cate.dept ASC, cate.pcate_no ASC, cate.cate_no ASC;
        `);
    });

    let cate_list: EdmsCategory[] = []; // result
    let result = [];
    for (var c of filter_root_cate) {
        // loop root
        //root add
        cate_list.push(c);
        // getAllCate(c.cate_no, filter_child_cate);
        if (category_list.length > 0) cate_list = [...cate_list, ...category_list];
        category_list = [];
    }
    console.log(totalCnts.length, cate_list.length);
    for (var _cate of cate_list) {
        let cntData = totalCnts.find(raw => raw.cate_no === _cate.cate_no);
        if (cntData) {
            let end_cnt = cntData.end_cnts;
            let file_cnt = cntData.file_cnts;
            let achieve_cnt = cntData.achieve_cnts;
            let rate = cntData.rate;
            let forward_str = _cate.dept > 0 ? "┗ ".repeat(_cate.dept) : "";
            let find_discipline = disciplines.find(raw => raw.id == _cate.discipline_id);
            let find_project = projects.find(raw => raw.project_no == _cate.project_no);
            // string data set
            const level_cate_name = forward_str + _cate.cate_name;
            const project_name = find_project ? find_project.project_name : "";
            const discipline_id = find_discipline ? find_discipline.id : -1;
            const discipline_name = find_discipline ? find_discipline.name : "";
            //

            let defaultValue = {
                cate_name: _cate.cate_name,
                level_cate_name,
                cate_code: _cate.cate_code,
                cate_no: _cate.cate_no,
                level: _cate.dept + 1,
                discipline_name,
                project_name,
                discipline_id,
                display_cate_name: `${project_name} - ${discipline_name} - ${level_cate_name}`,
                project_no: _cate.project_no,
                is_vp: _cate.is_vp,
            };
            if (!is_min) {
                Object.assign(defaultValue, {
                    pcate_no: _cate.pcate_no,
                    dept: _cate.dept,
                    weight: _cate.weight,
                    explan: _cate.explan,
                    is_approval: _cate.is_approval,
                    pm_id: _cate.pm_id,
                    create_by: _cate.create_by,
                    status: get_cate_status_str(_cate.status),
                    end_cnt: end_cnt,
                    file_cnt: file_cnt,
                    achieve_cnt: achieve_cnt,
                    rate: rate,
                    project_no: _cate.project_no,
                    is_vp: _cate.is_vp,
                });
            }
            result.push(defaultValue);
        }
    }
    return result;
};

router.get("/get_category_status_list", async (req: Request, res: Response) => {
    try {
        let all_cate = await getRepository(EdmsCategory).find({
            where: { is_use: 1 },
            order: { project_no: "ASC", cate_name: "ASC" },
        });
        let all_proj = await getRepository(EdmsProjectType).find({
            where: { is_use: 1 },
            order: { project_no: "ASC" },
        });
        let disciplines = await getRepository(EdmsDiscipline).find({ where: { is_use: 1 }, order: { name: "ASC" } });
        let list = await fnc_cate_level(
            all_proj.map(raw => raw.project_no),
            all_cate.map(raw => raw.cate_no)
        );

        return getSuccessResponse(res, {
            category_list: list,
            discipline_list: disciplines,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_category_projects", async (req: Request, res: Response) => {
    try {
        let emps = await getRepository(EdmsProjectType).find({
            where: { is_use: 1 },
            order: { project_no: "ASC" },
        });
        if (emps.length != 0) {
            return getSuccessResponse(res, emps);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_category_manager", async (req: Request, res: Response) => {
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

router.get("/get_category_level_list", async (req: Request, res: Response) => {
    let project_no = undefined;
    if (req.query.project_no) project_no = parseInt(req.query.project_no.toString());
    try {
        let all_cate = await getConnection().query(`
            SELECT 
                ec.*, 
                CONCAT(ed.name, '-', ec.cate_name) as level_cate_name,
                ep.project_name,
                ed.name AS 'discipline_name'
            FROM edms_category ec
            INNER JOIN edms_discipline ed
            ON ed.id = ec.discipline_id
            INNER JOIN edms_project_type ep
            ON ep.project_no = ec.project_no
            WHERE ec.is_use = 1
            ${project_no != undefined ? `AND ec.project_no = ${project_no}` : ``};
        `);
        let all_discipline = await getRepository(EdmsDiscipline).find({ is_use: 1 });
        all_discipline.map(raw => {
            raw.name = raw.is_vp ? "VP - " + raw.name : "DCL - " + raw.name;
        });
        let list = [];
        for (var cate of all_cate) {
            list.push({
                cate_name: cate.cate_name,
                level_cate_name: cate.is_vp == 1 ? "VP - " + cate.level_cate_name : "DCL - " + cate.level_cate_name,
                cate_code: cate.cate_code,
                cate_no: cate.cate_no,
                pcate_no: cate.pcate_no,
                dept: cate.dept,
                level: cate.dept + 1,
                weight: cate.weight,
                explan: cate.explan,
                is_approval: cate.is_approval,
                pm_id: cate.pm_id,
                create_by: cate.create_by,
                status: get_cate_status_str(cate.status),
                is_vp: cate.is_vp,
                project_no: cate.project_no,
                discipline_id: cate.discipline_id,
                project_name: cate.project_name,
                discipline_name: cate.discipline_name,
            });
        }
        return getSuccessResponse(res, { category_list: list, discipline_list: all_discipline });
        // }
        //}
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_project_cate_list", async (req: Request, res: Response) => {
    const { project_no } = req.query;
    await getConnection().transaction(async tr => {
        try {
            if (typeof project_no == "string" && project_no) {
                let cate_list = await tr.getRepository(EdmsCategory).find({
                    where: { project_no: project_no },
                });
                let cate_no_list = cate_list.map(raw => raw.cate_no);
                let list = await fnc_cate_level([parseInt(project_no)], cate_no_list);

                return getSuccessResponse(res, list);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_search_category_list", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            let cate_list = await tr.getRepository(EdmsCategory).find({
                where: { is_use: 1 },
                order: { project_no: "ASC", cate_name: "ASC" },
            });
            let project_list = await tr.getRepository(EdmsProjectType).find({
                where: { is_use: 1 },
                order: { project_no: "ASC" },
            });

            let list = await fnc_cate_level(
                project_list.map(raw => raw.project_no),
                cate_list.map(raw => raw.cate_no),
                false
            );

            return getSuccessResponse(res, list);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
    });
});

export default router;
