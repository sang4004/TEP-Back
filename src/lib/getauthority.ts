import { getRepository, getConnection } from "typeorm";
import { EdmsUser, EdmsStageType, EdmsCategory, WorkAssign, EdmsStage, WorkTmCode } from "@/entity";
import { logger } from "./winston";
const isLive = process.env.NODE_ENV == "live";

// const edmsAuthorityQuery = `
// (
//     SELECT docu_no FROM edms_authority ea WHERE ea.user_id = @user_id AND ea.is_delete = 0 AND ea.@auth_type = 1
//     UNION DISTINCT
//     SELECT docu_no FROM edms_authority ea WHERE ea.company_id = @company_id AND ea.is_delete = 0 AND ea.group_id = -1 AND ea.user_id= -1 AND ea.@auth_type = 1
//     UNION DISTINCT
//     SELECT docu_no FROM edms_authority ea WHERE ea.group_id = @group_id AND ea.is_delete = 0 AND ea.user_id = -1 AND ea.@auth_type = 1
// )  ea
// `;

const edmsAuthorityQuery = `
(
    SELECT docu_no FROM edms_document WHERE is_use = 1 AND project_no @project_no
) ea
`;

const edmsAuthorityAdminQuery = `
(
    SELECT docu_no FROM edms_document WHERE is_use = 1
) ea
`;

const getProjectNo = async (company_id: number) => {
    let workTmCode = await getRepository(WorkTmCode).find({ company_id });
    return workTmCode.map(raw => raw.project_no);
};

export const GetAuthority = async (
    user_id: number,
    // auth_type?: "read" | "write" | "download" | "delete", // 읽기 권한 부분 삭제
    isPaging?: boolean,
    skip?: number,
    page?: number,
    filter?: {
        project_no?: number;
        cate_no?: number;
        docu_no?: number;
        original_name?: string;
        docu_subject?: string;
    }
) => {
    // 읽기 권한 부분 삭제
    // if (auth_type == undefined) auth_type = "read";
    if (user_id != undefined) {
        try {
            // user 테이블의 user_id 와 edms_user 테이블의 doc_user_id 와 매칭
            let edms_user: EdmsUser;
            let project_no_list = [];
            let project_type_list = [];
            let discipline_ids = [];
            let area_ids = [];
            let cate_no_list = [];
            let docu_no_list = [];
            let allData = [];
            let allDataLength = 0;
            await getConnection().transaction(async tr => {
                edms_user = await tr.getRepository(EdmsUser).findOne({
                    where: { user_id: user_id },
                });
                // let query = edmsAuthorityQuery
                //     .replace("@user_id", edms_user.user_id.toString())
                //     .replace("@company_id", edms_user.company_id.toString())
                //     .replace("@group_id", edms_user.group_id.toString())
                //     .replace(/\@auth_type/gi, auth_type);
                let _projects = await getProjectNo(edms_user.company_id);
                let query = edmsAuthorityQuery.replace(
                    "@project_no",
                    _projects.length == 0 ? `> 0` : `IN (${_projects.join(",")})`
                );
                
                if (edms_user.level == 1) query = edmsAuthorityAdminQuery;
                let searchQuery = ``;
                if (filter != undefined) {
                    let filterList = [];
                    if (filter.project_no) filterList.push(`ed.project_no = ${filter.project_no}`);
                    if (filter.cate_no) filterList.push(`ed.cate_no = ${filter.cate_no}`);
                    if (filter.docu_no) filterList.push(`ed.docu_no = ${filter.docu_no}`);
                    if (filter.original_name) filterList.push(`ef.original_file_name LIKE '%${filter.original_name}%'`);
                    if (filter.docu_subject) filterList.push(`ed.docu_subject LIKE '%${filter.docu_subject}%'`);
                    if (filterList.length > 0)
                        searchQuery = `
                            WHERE ${filterList.join(" AND ")}
                        `;
                }
                let pagingQuery : string;
                if(skip !== undefined && page !== undefined){
                    pagingQuery = isLive ? `OFFSET ${skip} ROW
                                                FETCH NEXT ${page} ROW ONLY`
                                        : `LIMIT ${page} OFFSET ${skip}`
                }
                allData = await tr.query(`
                    SELECT
                        ep.project_no,
                        ep.p_project_no,
                        ep.project_name,
                        ep.state,
                        edms_area.id as 'area_id',
                        edms_area.name as 'area_name',
                        edms_disc.id as 'discipline_id',
                        edms_disc.name as 'discipline_name',
                        edms_disc.is_vp as 'disc_is_vp',
                        ec.cate_no,
                        ec.pcate_no,
                        ec.cate_code,
                        ec.cate_name,
                        ec.dir_path,
                        ec.dept,
                        ec.is_vp as 'cate_is_vp',
                        ed.docu_no,
                        ed.docu_code,
                        ed.docu_type,
                        ed.docu_subject,
                        ed.wv_rate,
                        ed.plan_rate,
                        ed.actual_rate,
                        ed.is_vp as 'docu_is_vp',
                        ed.is_bop as 'docu_is_bop',
                        ed.create_tm as 'docu_create_tm',
                        ed.user_id,
                        ef.file_no,
                        ef.file_code,
                        ef.file_type,
                        ef.is_last_version,
                        ef.regi_dt,
                        ef.create_tm as 'file_create_tm',
                        ef.fversion,
                        ef.origin_file_code,
                        ef.history as 'file_history',
                        ef.stage_code,
                        ef.file_name,
                        ef.original_file_name,
                        ef.root_path,
                        ef.repo_path,
                        ef.user_id as 'file_user_id',
                        ef.create_tm as 'file_create_tm',
                        ef.revision
                    FROM ${query}
                    INNER JOIN edms_document ed
                        ON ed.docu_no = ea.docu_no
                    INNER JOIN edms_category ec
                        ON ec.cate_no = ed.cate_no
                    INNER JOIN edms_project_type ep
                        ON ep.project_no = ed.project_no
                    JOIN (
                        SELECT 
                            max(ef.file_no) as file_no, 
                            docu_no
                        FROM edms_files ef 
                        WHERE ef.is_last_version = 'Y' 
                        AND ef.is_use = 1
                        GROUP BY ef.docu_no
                    ) eff
                        ON eff.docu_no = ed.docu_no
                    INNER JOIN edms_files ef ON ef.file_no = eff.file_no
                    LEFT JOIN edms_area edms_area
                        ON edms_area.id = ed.area_id
                    LEFT JOIN edms_discipline edms_disc
                        ON edms_disc.id = ec.discipline_id
                    ${searchQuery}
                    ORDER BY ef.create_tm DESC
                    ${pagingQuery}
                `);
                allDataLength = await tr.query(`
                    SELECT 
                        COUNT(*) as length
                    FROM ${query}
                    INNER JOIN edms_document ed
                        ON ed.docu_no = ea.docu_no
                    INNER JOIN edms_category ec
                        ON ec.cate_no = ed.cate_no
                    INNER JOIN edms_project_type ep
                        ON ep.project_no = ed.project_no
                    INNER JOIN (
                        SELECT 
                            max(ef.file_no) as file_no, 
                            docu_no
                        FROM edms_files ef 
                        WHERE ef.is_last_version = 'Y' 
                        GROUP BY ef.docu_no
                    ) eff
                        ON eff.docu_no = ed.docu_no
                    INNER JOIN edms_files ef ON ef.file_no = eff.file_no
                    LEFT JOIN edms_area edms_area
                        ON edms_area.id = ed.area_id
                    LEFT JOIN edms_discipline edms_disc
                        ON edms_disc.id = ec.discipline_id
                    ${searchQuery}
                `);
            });
            //
            // 중복처리
            let _project_no_list = new Set(allData.map(raw => raw.p_project_no));
            let _project_type_list = new Set(allData.map(raw => raw.project_no));
            let _discipline_ids = new Set(allData.map(raw => raw.discipline_id));
            let _area_ids = new Set(allData.map(raw => raw.area_id));
            let _cate_no_list = new Set(allData.map(raw => raw.cate_no));
            let _docu_no_list = new Set(allData.map(raw => raw.docu_no));

            project_no_list = [..._project_no_list];
            project_type_list = [..._project_type_list];
            discipline_ids = [..._discipline_ids];
            area_ids = [..._area_ids];
            cate_no_list = [..._cate_no_list];
            docu_no_list = [..._docu_no_list];
            //
            return {
                project_no: project_no_list,
                project_type: project_type_list,
                discipline_id: discipline_ids,
                area_id: area_ids,
                cate_no: cate_no_list,
                docu_no: docu_no_list,
                all_data: allData,
                allDataLength: allDataLength[0].length,
            };
        } catch (err) {
            logger.error(err);
        }
        return null;
    }
};