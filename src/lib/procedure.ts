import { EntityManager, getConnection, getRepository } from "typeorm";
import { EdmsStageType } from "@/entity";

interface ProcedureResult {
    result: boolean;
    data: any;
}

export const Procedure = {
    async GetLatestTMFile(docu_no: number): Promise<ProcedureResult> {
        let res = await getConnection().query(`
            SELECT ef.* FROM edms_files ef
            JOIN(
                SELECT MAX(file_no) AS file_no
                FROM edms_files 
                WHERE docu_no IN (${docu_no})
                    AND wp_idx != 0 
                ORDER BY file_no DESC
            ) as find_ef
            WHERE ef.file_no = find_ef.file_no
        `);
        if (res.length == 0) return { result: false, data: null };
        return {
            result: true,
            data: res[0],
        };
    },
    async GetLatestTMFiles(docu_no: number[]): Promise<ProcedureResult> {
        if (docu_no.length == 0) return { result: false, data: null };
        let res = await getConnection().query(`
            SELECT ef.* FROM edms_files ef
            JOIN(
                SELECT docu_no, MAX(file_no) AS file_no
                FROM edms_files 
                WHERE docu_no IN (${docu_no.join(",")})
                    AND wp_idx != 0 
                GROUP BY docu_no
                ORDER BY file_no DESC
            ) as find_ef
            WHERE ef.file_no = find_ef.file_no
        `);
        if (res.length == 0) return { result: false, data: null };
        return {
            result: true,
            data: res,
        };
    },
    async GetLatestFile(docu_no: number): Promise<ProcedureResult> {
        let res = await getConnection().query(`
            SELECT ef.* FROM edms_files ef
            JOIN(
                SELECT MAX(file_no) AS file_no
                FROM edms_files 
                WHERE docu_no IN (${docu_no})
                ORDER BY file_no DESC
            ) as find_ef
            WHERE ef.file_no = find_ef.file_no
        `);
        if (res.length == 0) return { result: false, data: null };
        return {
            result: true,
            data: res[0],
        };
    },
    async GetStageTypes(): Promise<ProcedureResult> {
        let stages = [];
        let _data = await getRepository(EdmsStageType).find();
        for (var d of _data) {
            if (d.is_type) {
                stages.push({ ...d, stage_type: "i" });
                stages.push({ ...d, stage_type: "a" });
            } else {
                stages.push({ ...d, stage_type: "" });
            }
        }
        return {
            result: true,
            data: stages,
        };
    },
    DeleteProjStdInfo(project_no: number): ProcedureResult {
        const delDocu = globalThis.IS_LIVE
            ? `DELETE edms_document from edms_document a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;`
            : `DELETE a from edms_document a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;\n`;

        const delCate = globalThis.IS_LIVE
            ? `DELETE edms_category from edms_category a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;`
            : `DELETE a from edms_category a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;\n`;

        const delDisc = globalThis.IS_LIVE
            ? `DELETE edms_discipline from edms_discipline a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;`
            : `DELETE a from edms_discipline a
                INNER JOIN edms_project_type b ON b.project_no = ${project_no}
                WHERE a.project_no = b.project_no;\n`;

        return {
            result: true,
            data: [delDocu, delCate, delDisc],
        };
    },
    DeleteDiscStdInfo(disc_id: number): ProcedureResult {
        const delDocu = globalThis.IS_LIVE
            ? `DELETE edms_document from edms_document a
                INNER JOIN edms_category b ON b.discipline_id = ${disc_id}
                WHERE a.cate_no = b.cate_no;`
            : `DELETE a from edms_document a
                INNER JOIN edms_category b ON b.discipline_id = ${disc_id}
                WHERE a.cate_no = b.cate_no;`;

        const delCate = globalThis.IS_LIVE
            ? `DELETE edms_category from edms_category a
                INNER JOIN edms_discipline b ON b.id = ${disc_id}
                WHERE a.discipline_id = b.id;`
            : `DELETE a from edms_category a
                INNER JOIN edms_discipline b ON b.id = ${disc_id}
                WHERE a.discipline_id = b.id;`;

        return {
            result: true,
            data: [delDocu, delCate],
        };
    },
    DeleteCateStdInfo(cate_no: number): ProcedureResult {
        const delDocu = globalThis.IS_LIVE
            ? `DELETE edms_document from edms_document a
                INNER JOIN edms_category b ON b.cate_no = ${cate_no}
                WHERE a.cate_no = b.cate_no;`
            : `DELETE a from edms_document a
                INNER JOIN edms_category b ON b.cate_no = ${cate_no}
                WHERE a.cate_no = b.cate_no;`;
        return {
            result: true,
            data: [delDocu],
        };
    },
};
