/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EDMS PDFData
 * PDF Data 핸들링
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Repository } from "typeorm";
import { EdmsFiles, PDFData, EdmsDocument, EdmsStage, OtherPDFData } from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import * as _ from "lodash";
import { logger } from "@/lib/winston";

const router = express.Router();

const replaceAll = (origin: string, find: string, replace: string) => {
    while (true) {
        origin = origin.replace(find, replace);
        if (origin.indexOf(find) != -1) continue;
        return origin;
    }
};

const getJsonPath = (repo_path: string) => {
    let json_path = repo_path.split("/");
    json_path.pop();
    return json_path.join("/");
};

const getRealJsonPath = (json_path: string, file_no: number) => {
    return path.resolve(globalThis.HOME_PATH, json_path) + file_no.toString();
};

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            }
            if (Array.isArray(source[key])) {
                for (var s of source[key]) {
                    mergeDeep(source[key], s);
                }
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

const getStringOfAnnot = (data: object) => {
    let result = replaceAll(JSON.stringify(data), "\\", "").replace(/\\['"]+/g, "");

    return result;
};

router.get("/get_pdf_data", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != null) {
            const { file_no } = req.query;
            if (typeof file_no == "string") {
                let data = await getRepository(PDFData).findOne({ file_no: parseInt(file_no.toString()) });
                // if (data) {
                //     let json_path = getJsonPath(data.repo_path);
                //     let file = readFileSync(getRealJsonPath(json_path, data.file_no)); //.toString().replace(/['"]+/g,'')
                //     Object.assign(data, { annotation: file.toString() });
                // }
                return getSuccessResponse(res, data);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_other_pdf_data", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != null) {
            const { file_no } = req.query;
            if (typeof file_no == "string") {
                let data = await getRepository(OtherPDFData).findOne({ file_no: parseInt(file_no.toString()) });
                return getSuccessResponse(res, data);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

var worker = [];
// repo path params -> file_no 로 변경 필요
router.post("/set_pdf_data", async (req: Request, res: Response) => {
    try {
        // if (req.app.get("user_id") != null) {
        const { data, annotation, file_no } = req.body;
        let existAnnot = await getRepository(PDFData).findOne({ file_no });
        let file = await getRepository(EdmsFiles).findOne({ file_no: file_no, is_use: 1 });

        let json_path = getJsonPath(file.repo_path);
        if (existAnnot) {
            worker.push({
                file_no: existAnnot.file_no,
                annotation,
                repo_path: existAnnot.repo_path,
                type: "update",
            });
        } else {
            let new_pdf_data = new PDFData();
            // new_pdf_data.annotation = deserializeAnnotation(annotation);
            new_pdf_data.repo_path = file.repo_path;
            new_pdf_data.data = data;
            new_pdf_data.file_no = file.file_no;
            let insert_pdf = await getRepository(PDFData).save(new_pdf_data);

            let new_pdf_json = writeFileSync(getRealJsonPath(json_path, insert_pdf.file_no), annotation);
        }
        return getSuccessResponse(res);
        // }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

(async function () {
    while (true) {
        if (worker.length > 0) {
            let d = worker[worker.length - 1];
            let diff = null;
            if (d.type == "update") {
                let file: string = readFileSync(getRealJsonPath(getJsonPath(d.repo_path), d.file_no)).toString();
                // diff = mergeDeep(JSON.parse(file), JSON.parse(replaceAll(d.annotation, "\\", "")));
                diff = _.mergeWith(JSON.parse(file), JSON.parse(d.annotation), (a1, a2) => {
                    return _.isObject(a1) && _.isObject(a2) ? undefined : a1 || a2;
                });
                //(JSON.parse(file), JSON.parse(d.annotation));
            } else if (d.type == "delete") {
                // delete el
            }
            unlinkSync(getRealJsonPath(getJsonPath(d.repo_path), d.file_no));
            writeFileSync(
                getRealJsonPath(getJsonPath(d.repo_path), d.file_no),
                // getStringOfAnnot(diff)
                JSON.stringify(diff),
                { encoding: "utf8", flag: "w" }
            );
            worker.pop();
        } else {
            await new Promise(r => setTimeout(() => r(null), 500));
        }
    }
})();

router.post("/pdf_edit_document", async (req: Request, res: Response) => {
    const { docu_no, docu_subject, stage_code, explan, plan_submit_dt, real_submit_dt, modify_by } = req.body;
    try {
        if (docu_no) {
            let docu = await getRepository(EdmsDocument).findOne({
                where: { docu_no, is_use: 1 },
            });
            let modify_tm = new Date();
            let edit_docu = {};

            if (docu_subject) Object.assign(edit_docu, { docu_subject: docu_subject });

            if (explan) Object.assign(edit_docu, { explan: explan });

            if (plan_submit_dt) Object.assign(edit_docu, { plan_submit_dt: plan_submit_dt });

            if (real_submit_dt) Object.assign(edit_docu, { real_submit_dt: real_submit_dt });

            Object.assign(edit_docu, { modify_by: modify_by });
            Object.assign(edit_docu, { modify_tm: modify_tm });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsDocument)
                .set(edit_docu)
                .where("docu_no = :id", { id: docu_no })
                .execute();

            let stage = await getRepository(EdmsStage).findOne({
                docu_no: docu_no,
                stage_code: stage_code,
            });

            if (stage.actual_dt == null) {
                let actual_dt = new Date();
                let stages = {};

                Object.assign(stages, { actual_dt: actual_dt });
                Object.assign(stages, { modify_by: modify_by });
                Object.assign(stages, { modify_tm: modify_tm });

                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsStage)
                    .set(stages)
                    .where("docu_no = :id AND stage_code = :code", {
                        id: docu_no,
                        code: stage_code,
                    })
                    .execute();
            }
            return getSuccessResponse(res, { docu });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
