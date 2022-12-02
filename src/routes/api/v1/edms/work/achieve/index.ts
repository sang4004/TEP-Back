/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * WorkAchieve
 * 성과물 관련 api
 * api :
 *  get_work_achieve : 성과물 리스트
 * project_no : 프로젝트 고유번호
 ******************************************************************************/
import fs from "fs";
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, Repository, In, createQueryBuilder, Not } from "typeorm";
import {
    WorkAchieve,
    EdmsDocument,
    EdmsCategory,
    EdmsFiles,
    EdmsStage,
    EdmsDiscipline,
    EdmsArea,
    EdmsAuthority,
    EdmsDocumentManager,
    EdmsUser,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { logger } from "@/lib/winston";
import { getFileTypeName, getMoment, getDateValue, getDownloadFilename } from "@/lib/utils";
import { GenerateZip } from "@/lib/zip";
import { EdmsDelBox } from "@/entity/EdmsDelBox";
import { globalWorkerObj } from "@/lib/mainWorker";
import path from "path";
import mime from "mime-types";

const router = express.Router();

router.get("/get_work_achieve", async (req: Request, res: Response) => {
    try {
        const { project_no } = req.query;
        let ach_list = await getConnection().query(`
        SELECT 
            wa.*, 
            ep.project_name,
            ec.cate_no,
            ec.cate_name,
            ed.docu_subject,
            ef.file_name,
            ef.repo_path,
            ef.file_type
        FROM work_achieve wa
            INNER JOIN edms_projects ep
                ON wa.project_no = ep.project_no
            INNER JOIN edms_category ec
                ON wa.cate_no = ec.cate_no
            INNER JOIN edms_document ed
                ON wa.docu_no = ed.docu_no
            INNER JOIN edms_files ef
                ON wa.file_no = ef.file_no
                AND ef.is_use = 1
        WHERE wa.project_no = ${project_no}
    `);
        return getSuccessResponse(res, ach_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_work_achieve_box_list", async (req: Request, res: Response) => {
    try {
        let _list = [];
        const docu_list = await getConnection().query(`
              select ed.docu_no, ed.docu_code, ed.docu_subject, ept.project_no, ept.p_project_no, ept.project_name as projtypename, ep.project_name, ec.discipline_id, ec.cate_no, ec.pcate_no, ec.cate_name, ec.dept
                from edms_document ed
                  inner join edms_project_type ept
                    on ed.project_no = ept.project_no
                  inner join edms_projects ep
                    on ept.p_project_no = ep.project_no
                  inner join edms_category ec
                    on ec.cate_no = ed.cate_no
                  where ed.is_use = 1
            `);
        let dcl_list = await getRepository(EdmsDiscipline).find({ is_use: 1 });
        let area_list = await getRepository(EdmsArea).find({ is_use: 1 });
        let files = await getRepository(EdmsFiles).find({ is_use: 1 });
        let stages = await getRepository(EdmsStage).find({ is_use: 1 });
        let cates = await getRepository(EdmsCategory).find({ is_use: 1 });

        for (var d of docu_list) {
            if (d.dept != 0) {
                let cate_no = d.pcate_no;
                let _list = [d.cate_no];
                for (var i = 0; i < d.dept; i++) {
                    let filtered = cates.find(raw => (raw.cate_no = cate_no));
                    _list.unshift(filtered.cate_name);
                    cate_no = filtered.pcate_no;
                }
                d.cate = _list;
            } else {
                d.cate = [d.cate_name];
            }

            let dcl = dcl_list.find(raw => raw.id == d.discipline_id);
            if (dcl) d.dcl = dcl.name;
            let area = area_list.find(raw => raw.id == d.area_id);
            if (area) d.area = area.name;
            let file = files.find(raw => raw.docu_no == d.docu_no);
            if (file) d.file = file;
            else continue;
            let stage = stages.filter(raw => raw.docu_no == d.docu_no);
            if (stage.length > 0) d.stage = stage;
            _list.push(d);
        }

        return getSuccessResponse(res, _list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_work_dcl_list", async (req: Request, res: Response) => {
    try {
        const dcl_id = req.query.discipline_id ? parseInt(req.query.discipline_id.toString()) : -1;
        const cate_no = req.query.cate_no ? parseInt(req.query.cate_no.toString()) : -1;
        const docu_no = req.query.docu_no ? parseInt(req.query.docu_no.toString()) : -1;
        const search_type = req.query.search_type ? parseInt(req.query.search_type.toString()) : -1; // 1 파일명, 2 문서제목, 3문서번호
        const search_text = req.query.search_text ? req.query.search_text.toString() : "";

        let project_no = 0;
        if (req.query.project_no) {
            project_no = parseInt(req.query.project_no.toString());
        }
        let is_vp = undefined;
        if (req.query.is_vp) {
            is_vp = parseInt(req.query.is_vp.toString());
        }
        let file_ext = [];
        if (globalWorkerObj.workExtResult[project_no]) {
            if (is_vp) file_ext = globalWorkerObj.workExtResult[project_no].vp;
            else file_ext = globalWorkerObj.workExtResult[project_no].dcl;
        }

        let result: any[] | null = null;
        if (is_vp) {
            if (globalWorkerObj.vpWorkResult[project_no]) {
                result = [...globalWorkerObj.vpWorkResult[project_no]];
            }
        } else {
            if (globalWorkerObj.dclWorkResult[project_no]) {
                result = [...globalWorkerObj.dclWorkResult[project_no]];
            }
        }
        let filterCnt = 0;
        if (dcl_id != -1) filterCnt += 1;
        if (cate_no != -1) filterCnt += 1;
        if (docu_no != -1) filterCnt += 1;
        if (search_type != -1 && search_text != "") filterCnt += 1;

        if (result && filterCnt > 0) {
            result = result.reduce((acc, val, idx, arr) => {
                let cnt = 0;
                if (dcl_id != -1 && val.discipline_id == dcl_id) cnt += 1;
                if (cate_no != -1 && val.cate_no == cate_no) cnt += 1;
                if (docu_no != -1 && val.docu_no == docu_no) cnt += 1;
                if (search_text.length > 0) {
                    if (search_type == 1 && val.file_name.toUpperCase().indexOf(search_text.toUpperCase()) != -1)
                        cnt += 1;
                    if (search_type == 2 && val.docu_subject.toUpperCase().indexOf(search_text.toUpperCase()) != -1)
                        cnt += 1;
                    if (search_type == 3 && val.docu_code.toUpperCase().indexOf(search_text.toUpperCase()) != -1)
                        cnt += 1;
                }

                if (cnt >= filterCnt) acc.push(val);
                return acc;
            }, []);
        }

        getSuccessResponse(res, { result: result, ext_list: file_ext });
    } catch (err) {
        logger.error(req.path + " || " + err);
        return getFailedResponse(res);
    }
});

router.get("/get_plant_list", async (req: Request, res: Response) => {
    try {
        const search_type = req.query.search_type ? parseInt(req.query.search_type.toString()) : -1; // 1 파일명, 2 제목, 3  Transmittal #
        const search_text = req.query.search_text ? req.query.search_text.toString() : "";

        let project_no = 0;
        if (req.query.project_no) {
            project_no = parseInt(req.query.project_no.toString());
        }

        let result: any[] | null = null;
        if (globalWorkerObj.plantWorkResult[project_no]) {
            result = [...globalWorkerObj.plantWorkResult[project_no]];
        }
        let filterCnt = 0;
        if (search_type != -1 && search_text != "") filterCnt += 1;

        if (result && filterCnt > 0) {
            result = result.reduce((acc, val, idx, arr) => {
                let cnt = 0;
                if (search_text.length > 0) {
                    if (
                        search_type == 1 &&
                        val.file_name &&
                        val.file_name.toUpperCase().indexOf(search_text.toUpperCase()) != -1
                    )
                        cnt += 1;
                    if (
                        search_type == 2 &&
                        val.title &&
                        val.title.toUpperCase().indexOf(search_text.toUpperCase()) != -1
                    )
                        cnt += 1;
                    if (
                        search_type == 3 &&
                        val.transmittal &&
                        val.transmittal.toUpperCase().indexOf(search_text.toUpperCase()) != -1
                    )
                        cnt += 1;
                }

                if (cnt >= filterCnt) acc.push(val);
                return acc;
            }, []);
        }

        getSuccessResponse(res, { result: result });
    } catch (err) {
        logger.error(req.path + " || " + err);
        return getFailedResponse(res);
    }
});

router.get("/work_review_list", async (req: Request, res: Response) => {
    try {
        let result = [];
        let review_list = await getConnection().query(`
            SELECT d.docu_code AS docu_code,
                f.file_name AS description,
                f.stage_code,
                review.page_sheet_no,
                review.code,
                review.contents,
                u.username,
                review.reply,
                review.is_change_design,
                d.docu_no,
                d.cate_no,
                d.project_no,
                pj.project_name,
                pt.project_name as projtypename,
                dis.name,
                dis.id AS discipline_id
            FROM   work_review review
                INNER JOIN edms_document d
                        ON d.docu_no = review.docu_no
                INNER JOIN edms_files f
                        ON f.file_no = review.file_no
                        AND f.is_use = 1
                INNER JOIN edms_user u
                        ON u.user_id = review.reviewer_id 
                INNER JOIN edms_project_type pt
                        ON pt.project_no = d.project_no
                INNER JOIN edms_category c
                        ON c.cate_no = d.cate_no
                INNER JOIN edms_discipline dis
                        ON dis.id = c.discipline_id
                INNER JOIN edms_projects pj
                        ON pj.project_no = pt.p_project_no
        `);
        let docu_no_list: number[] = review_list.map(raw => raw.docu_no);
        let stage_data = await getRepository(EdmsStage).find({ docu_no: In(docu_no_list), is_use: 1 });
        for (var review of review_list) {
            let stage_split = review.stage_code.split(" ");
            let stage = null;
            if (stage_split.length > 1) {
                stage = stage_data.find(
                    raw =>
                        raw.docu_no == review.docu_no &&
                        raw.stage_code == stage_split[0] &&
                        raw.stage_type == stage_split[1]
                );
            } else {
                stage = stage_data.find(raw => raw.docu_no == review.docu_no && raw.stage_code == stage_split[0]);
            }
            Object.assign(review, { stage });
            result.push(review);
        }

        return getSuccessResponse(res, result);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/achieve_download", async (req: Request, res: Response) => {
    const user_id = typeof req.query.user_id == "string" ? parseInt(req.query.user_id.toString()) : 0;
    const docu_no_list =
        typeof req.query.docu_no == "string" ? req.query.docu_no.split(",").filter(raw => raw != "") : [];
    const cate_no_list =
        typeof req.query.cate_no == "string" ? req.query.cate_no.split(",").filter(raw => raw != "") : [];
    const disc_no_list =
        typeof req.query.disc_no == "string" ? req.query.disc_no.split(",").filter(raw => raw != "") : [];
    if (docu_no_list.length > 0 || cate_no_list.length > 0 || disc_no_list.length > 0) {
        let query = [];
        if (docu_no_list.length > 0) {
            query.push(`ef.docu_no in (${docu_no_list.join(",")})`);
        }
        if (cate_no_list.length > 0) {
            query.push(`ec.cate_no in (${cate_no_list.join(",")})`);
        }
        if (disc_no_list.length > 0) {
            query.push(`ed.id in (${disc_no_list.join(",")})`);
        }

        if (query.length > 0) {
            let files = await getConnection().query(`
                SELECT 
                    CONCAT(ep.project_name, "/" , ec.cate_name ,"/",ef.original_file_name) AS dest_path, 
                    ef.repo_path 
                FROM edms_files ef 
                INNER JOIN edms_project_type ep
                    ON ep.project_no = ef.project_no
                INNER JOIN edms_category ec
                    ON ec.cate_no = ef.cate_no
                INNER JOIN edms_discipline ed
                    ON ed.id = ec.discipline_id
                WHERE 
                    ef.is_last_version = 'Y'
                    AND ef.is_use = 1
                    AND ( ${query.join(" OR ")} )
            ;`);
            if (files.length == 0) {
                return res.send("선택하신 도큐먼트의 Latest 성과물이 없습니다.");
            }
            let edms_user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
            });
            let repoPath = [],
                destPath = [];
            files.map(raw => {
                repoPath.push(raw.repo_path);
                destPath.push(raw.dest_path);
                if (edms_user)
                    logger.log(
                        "down",
                        `[id: ${edms_user.user_id}, User Email: ${edms_user.email}, File Path: ${raw.repo_path}]`
                    );
            });

            const _filename = `${getMoment(new Date()).format("YY-MM-DD SSS")}_성과물.zip`;

            res.setHeader("Content-disposition", "attachment; filename=" + encodeURI(_filename)); // 다운받아질 파일명 설정
            res.setHeader("Content-type", "application/vnd.ms-excel; charset=utf-8"); // 파일 형식 지정

            let output = await GenerateZip(_filename, repoPath, destPath);

            var filestream = fs.createReadStream(output);
            filestream.pipe(res);

            fs.unlinkSync(output);
            return res;
        }
        return res.send("잠시 후에 다시 시도해주세요.");
    }
    return res.send("잠시 후에 다시 시도해주세요.");
});

router.post("/update_dcl_data", async (req: Request, res: Response) => {
    const { docu_no, docu_code, cate_no, subject, wvRate, planRate, actualRate, palnDataList } = req.body;
    try {
        let docu = await getRepository(EdmsDocument).findOne({
            where: { docu_no: docu_no },
        });

        if (Array.isArray(palnDataList) && palnDataList != undefined) {
            let stage = await getConnection().query(`
                SELECT * FROM edms_stage es
                WHERE es.docu_no = ${docu_no} AND es.plan_dt IS NOT NULL
            `);

            for (var i = 0; i < stage.length; i++) {
                let now_stage = stage[i];
                let now_plan = palnDataList[i];

                await createQueryBuilder()
                    .update(EdmsStage)
                    .set({ plan_dt: now_plan })
                    .where("docu_no = :docu_no AND stage_no = :stage_no", {
                        docu_no: docu_no,
                        stage_no: now_stage.stage_no,
                    })
                    .execute();
            }
        }

        //cate_no의 변경이 있을 시
        if (docu.cate_no != cate_no) {
            let cate = await getRepository(EdmsCategory).findOne({
                where: { cate_no: cate_no },
            });

            await createQueryBuilder()
                .update(EdmsAuthority)
                .set({ cate_no: cate_no, discipline_id: cate.discipline_id })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            await createQueryBuilder()
                .update(EdmsDelBox)
                .set({ cate_no: cate_no })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            await createQueryBuilder()
                .update(EdmsDocumentManager)
                .set({ cate_no: cate_no, discipline_id: cate.discipline_id })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            await createQueryBuilder()
                .update(EdmsFiles)
                .set({ cate_no: cate_no })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            await createQueryBuilder()
                .update(WorkAchieve)
                .set({ cate_no: cate_no })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            if (docu) {
                await createQueryBuilder()
                    .update(EdmsDocument)
                    .set({
                        cate_no: cate_no,
                        docu_code: docu_code,
                        docu_subject: subject,
                        wv_rate: wvRate,
                        plan_rate: planRate,
                        actual_rate: actualRate,
                    })
                    .where("docu_no = :id", { id: docu_no })
                    .execute();
            }
            return getSuccessResponse(res, true);
        } else {
            // cate_no의 변경이 없을 시
            await createQueryBuilder()
                .update(EdmsDocument)
                .set({
                    docu_code: docu_code,
                    docu_subject: subject,
                    wv_rate: wvRate,
                    plan_rate: planRate,
                    actual_rate: actualRate,
                })
                .where("docu_no = :id", { id: docu_no })
                .execute();

            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/dcl_achieve_download", async (req: Request, res: Response) => {
    const _docu_no = req.query.docu_no;
    const _user_id = req.query.user_id;
    await getConnection().transaction(async tr => {
        try {
            if (typeof _docu_no == "string" && _docu_no != null) {
                let edms_user = await tr.getRepository(EdmsUser).findOne({ user_id: parseInt(_user_id.toString()) });
                let file = await tr.getRepository(EdmsFiles).findOne({
                    where: { docu_no: _docu_no, is_use: 1, is_last_version: "Y" },
                    order: { file_no: "DESC" },
                });

                let file_path = path.resolve(globalThis.HOME_PATH, file.repo_path);
                if (fs.existsSync(file_path)) {
                    // var filename = path.basename(file_path);
                    var mimetype = mime.lookup(file_path);

                    res.setHeader("access-control-allow-origin", "*");
                    res.setHeader(
                        "Content-disposition",
                        "attachment; filename=" + getDownloadFilename(req, file.original_file_name)
                    );
                    res.setHeader("Content-type", mimetype ? mimetype + "; charset=utf-8" : "");
                    res.download(file_path, file.original_file_name);
                    logger.log(
                        "down",
                        `[id: ${edms_user.user_id}, User Email: ${edms_user.email}, File Path: ${file_path}]`
                    );
                    return;
                } else {
                    res.sendFile("해당 파일이 존재하지 않습니다.");
                    return;
                }
            } else {
                res.send("파일을 다운로드하는 중에 에러가 발생하였습니다.");
                return;
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
            res.send("파일을 다운로드하는 중에 에러가 발생하였습니다.");
            return;
        }
    });
});

router.get("/vp_folder_list", async (req: Request, res: Response) => {
    const { project_no } = req.query;

    try {
        let tree_list: any;
        let _project_no = parseInt(project_no.toString());
        if (_project_no == 1 || _project_no == 42) {
            tree_list = globalWorkerObj.vpPlantFolderResult;
        } else if (_project_no == 2 || _project_no == 43) {
            tree_list = globalWorkerObj.vpLngFolderResult;
        }
        return getSuccessResponse(res, tree_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
