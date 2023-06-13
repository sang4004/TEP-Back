/******************************************************************************
 * entity :
 * EdmsEtc
 * 기타 api 관리
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { TransactionManager, getConnection, getRepository, In, Repository, Not, IsNull, Index, Like } from "typeorm";
import {
    EdmsProjectType,
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    EdmsStage,
    WorkAssign,
    WorkDeploy,
    WorkTmpBox,
    WorkSendRecvBox,
    WorkAchieve,
    User,
    EdmsUser,
    EdmsDiscipline,
    EdmsProjects,
    WorkTmCode,
} from "@/entity";
import { getFailedResponse, getSuccessResponse, LANGUAGE_PACK } from "@/lib/format";
import { logger } from "@/lib/winston";
import moment, { Moment } from "moment";
import { sendMail } from "@/lib/mailer";
import { getDiffDate, getMoment, getProjectNo } from "@/lib/utils";
import { globalWorkerObj } from "@/lib/mainWorker";

const router = express.Router();

const CheckTopCateNo = (cate_no: number, data: any[]) => {
    let _list = data.filter((obj: any) => obj.cate_no == cate_no);
    if (_list.length == 0) return cate_no;

    let pcate_no = _list[0].pcate_no;
    if (pcate_no == 0) return cate_no;
    else return CheckTopCateNo(pcate_no, data);
};

const get_assign_state = (assign_state: number) => {
    switch (assign_state) {
        case 2:
            return LANGUAGE_PACK.WORK_PROC.SIGNATURE.WAIT.kor;
        case 4:
            return LANGUAGE_PACK.WORK_PROC.REPLY.default.kor;
        case 8:
            return LANGUAGE_PACK.WORK_PROC.REGIST.WAIT.kor;
        case 10:
            return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
        case 12:
            return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
        case 16:
            return LANGUAGE_PACK.WORK_PROC.CC.CONFIRM.kor;
        default:
            return LANGUAGE_PACK.WORK_PROC.SIGNATURE.ERROR.kor;
    }
};

const get_docu_type = (type: string) => {
    switch (type) {
        case "DIN":
            return "din";
        case "DRN":
            return "drn";
        case "TM":
            return "tm";
    }
};

const EXPIRED_DATE_LIMIT = 5;
export const send_mail_notification = async (user_ids: number[]) => {
    let datas: {
        wp_idx: number;
        title: string;
        explan: string;
        due_date: string;
        assign_state: string;
        create_by: string;
        wp_type: string;
    }[] = [];
    if (user_ids.length == 0) return;

    let users = await getRepository(EdmsUser).find({
        where: { user_id: In(user_ids), is_use: 1 },
    });

    let due_work_proc = await getConnection().query(`
        SELECT * FROM 
            work_proc wp 
            INNER JOIN work_assign wa 
                ON wa.wp_idx = wp.wp_idx 
                AND wa.assign_to_id IN (${user_ids.join(",")})
                AND wa.assign_from_id != wa.assign_to_id  
            WHERE DATE(wp.due_date) < CURDATE() + INTERVAL ${EXPIRED_DATE_LIMIT} DAY;
    `);

    for (var user of users) {
        datas = [];
        for (var wp of due_work_proc) {
            if (wp.assign_to_id != user.user_id) continue;
            if (
                wp.assign_state == 2 ||
                wp.assign_state == 4 ||
                wp.assign_state == 8 ||
                wp.assign_state == 10 ||
                wp.assign_state == 12 ||
                wp.assign_state == 16
            ) {
                datas.push({
                    wp_idx: wp.wp_idx,
                    title: wp.subject,
                    explan: wp.explan,
                    due_date: moment(wp.due_date).format("YYYY-MM-DD"),
                    assign_state: get_assign_state(parseInt(wp.assign_state)),
                    create_by: wp.create_by,
                    wp_type: wp.wp_type,
                });
            }
        }
        if (datas.length > 0) {
            await sendMail(
                user.email,
                `현재 검토해야할 문서들 목록입니다.`,
                `
                <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="utf-8" />
            <title></title>
            <style>
            .layout_div {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 60%;
                height: 100%;
            }
            .inner {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: auto;
            }
            table {
                width: 100%;
                border: 1px solid #444444;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid #444444;
                text-align: center;
                font-size: 13px;
                font-weight: 500;
                height: 26px;
            }
            tr {
                height: 48px;
            }
            .text_div {
                width: 100%;
                height: 10%;
                text-align: center;
                font-size : 13px;
                font-weight : 600;
            }
            </style>
        </head>
        <body>
            <div class="layout_div">
                <div class="inner">
                    
                    <table class="table">
                        <th>문서타입</th>
                        <th>제목</th>
                        <th>내용</th>
                        <th>승인기한</th>
                        <th>결재상태</th>
                        <th>기안자</th>
                        ${datas
                            .map((raw: any, idx: number) => {
                                return `<tr key="${idx}">
                                    <td>${raw.wp_type}</td>
                                    <td><a href="${process.env.ORIGIN}/edms/${get_docu_type(raw.wp_type)}/detail/${
                                    raw.wp_idx
                                }">${raw.title}</a></td>
                                    <td>${raw.explan}</td>
                                    <td>${raw.due_date}</td>
                                    <td>${raw.assign_state}</td>
                                    <td>${raw.create_by}</td>
                                </tr>`;
                            })
                            .join("")}
                    </table>
                </div>
            </div>
        </body>
    </html>
                `
            );
        }
    }
};

export const getWorkProcMainDataFromUser = async (
    user_id?: number,
    start_date?: Moment,
    end_date?: Moment,
    project_no?: number,
    comp_id?: number
) => {
    // const _userIdQuery = user_id
    //     ? `wa.assign_to_id = ${user_id} OR wa.assign_from_id = ${user_id}`
    //     : `wa.assign_to_id > 0`;
    const _userIdQuery = `wa.assign_to_id > 0`;
    const _dateQuery =
        start_date && end_date
            ? `AND wa.create_tm > '${start_date.format("YYYY-MM-DD HH:mm:ss")}'
                AND wa.create_tm < '${end_date.format("YYYY-MM-DD HH:mm:ss")}'`
            : ``;
    const _projects = await getProjectNo(comp_id);
    // const _projectQuery = project_no ? `AND wp.project_no = ${project_no}` : ``;
    let _projectQuery = _projects.length > 0 ? `AND wp.project_no IN (${_projects.join(",")})` : ``;
    if (project_no && _projects.indexOf(project_no) == -1) _projectQuery = `AND wp.project_no = -1`;

    const drnQuery = `
        SELECT 
            MAX(wa.wa_idx) as wa_idx, 
            MAX(wa.assign_state) as assign_state,
            MAX(wa.is_fin) as is_fin, 
            MAX(wa.due_to_date) as due_to_date, 
            MAX(wp.wp_idx) as wp_idx,
            MAX(wp.project_no) as project_no
        FROM work_proc wp
        INNER JOIN work_assign wa
            ON ${_userIdQuery}
        WHERE wp.wp_type = 'drn'
            AND wp.wp_idx = wa.wp_idx
        ${_dateQuery}
        ${_projectQuery}
        GROUP BY wa.wp_idx
    `;

    const trQuery = `
        SELECT 
            MAX(wa.wa_idx) as wa_idx, 
            MAX(wa.assign_state) as assign_state,
            MAX(wa.is_fin) as is_fin, 
            MAX(wa.due_to_date) as due_to_date, 
            MAX(wp.wp_idx) as wp_idx,
            MAX(wp.project_no) as project_no
        FROM work_proc wp
        INNER JOIN work_assign wa
            ON wa.wp_idx = wp.wp_idx
        LEFT JOIN ( SELECT 
                        DISTINCT wp.original_tm_id
                    FROM work_proc wp
                    INNER JOIN work_assign wa
                        ON ${_userIdQuery}
                    WHERE wp.wp_type = 'DRN'
                        AND wp.original_tm_id != 0
                        AND wp.wp_idx = wa.wp_idx
                ) drn ON drn.original_tm_id = wp.wp_idx
        WHERE ((wp.wp_type = 'tm'
            AND (${_userIdQuery}) 
            AND wp.wp_idx = wa.wp_idx) 
            OR (wp.wp_idx = drn.original_tm_id))
            ${_dateQuery}
            ${_projectQuery}
        GROUP BY wa.wp_idx
    `;
    const allQuery = `
        SELECT 
            MAX(wa.wa_idx) as wa_idx, 
            MAX(wa.assign_state) as assign_state,
            MAX(wa.is_fin) as is_fin, 
            MAX(wa.due_to_date) as due_to_date, 
            MAX(wp.wp_idx) as wp_idx,
            MAX(wp.project_no) as project_no
        FROM work_proc wp
        INNER JOIN work_assign wa
            ON wa.wp_idx = wp.wp_idx
        LEFT JOIN ( 
            SELECT 
                    DISTINCT wp.original_tm_id
                FROM work_proc wp
                INNER JOIN work_assign wa
                    ON ${_userIdQuery}
                WHERE wp.wp_type = 'DRN'
                    AND wp.original_tm_id != 0
                    AND wp.wp_idx = wa.wp_idx
            ) drn ON drn.original_tm_id = wp.wp_idx
        WHERE (((${_userIdQuery}) 
            AND wp.wp_idx = wa.wp_idx) 
            OR (wp.wp_idx = drn.original_tm_id))
            ${_dateQuery}
            ${_projectQuery}
        GROUP BY wa.wp_idx
    `;
    return {
        drn: drnQuery,
        tr: trQuery,
        all: allQuery,
    };
};

// worker 통해서 개선필요
router.get("/get_main_top", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    const { path, start, end } = req.query;
    try {
        let datas: {
            DRN: number[];
            TM: number[];
            project_name: string;
            project_no: number;
        }[] = [];
        let is_drn_flag: boolean;

        let start_date: Moment | null = null;
        let end_date: Moment | null = null;
        if (start != null && end != null) {
            start_date = getMoment(start.toString());
            end_date = getMoment(end.toString());
        }
        await getConnection().transaction(async tr => {
            const all_proj = await tr.getRepository(EdmsProjectType).find({
                where: { is_use: 1 },
            });

            //한화건설 사람은 drn 카드 제외
            let user = await tr.getRepository(EdmsUser).findOne({
                where: { user_id: user_id },
            });

            if (user.company_id == 4) {
                is_drn_flag = false;
            } else {
                is_drn_flag = true;
            }

            for (var proj of all_proj) {
                let drn_data: any;
                let tr_data: any;
                let query = await getWorkProcMainDataFromUser(
                    user.level == 1 ? null : user_id,
                    start_date,
                    end_date,
                    proj.project_no,
                    user.company_id
                );
                drn_data = await tr.query(`
                    SELECT 
                        COUNT( case when wp_idx is not null AND project_no = ${proj.project_no} then 1 end ) as 'drn_count'
                    FROM 
                    ( 
                        ${query.drn}
                    ) AS res;
                `);
                tr_data = await tr.query(`
                    SELECT 
                        COUNT( case when wp_idx is not null AND project_no = ${proj.project_no} then 1 end ) as 'tr_count'
                    FROM 
                    ( 
                        ${query.tr}
                    ) AS res;
                `);

                if (drn_data.length > 0 && tr_data.length > 0) {
                    datas.push({
                        project_no: proj.project_no,
                        project_name: proj.project_name,
                        DRN: drn_data[0].drn_count,
                        TM: tr_data[0].tr_count,
                    });
                }
            }
        });
        return getSuccessResponse(res, { datas, is_drn_flag });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_main_middle", async (req: Request, res: Response) => {
    try {
        // 완료된 EDMS 파일 리스트
        // 프로젝트 타입 가져오기
        let datas = await getConnection().query(`
            SELECT 
            docu.project_no,
            COUNT(docu.docu_no) as allCnt,
            project.project_name,
            SUM(
                case 
                    when files.stage_code like '%As-Built%' then 1 
                    when files.stage_code != '' then 0.9 
                    ELSE 0.1 end) as cnt
            FROM edms_document docu 
            INNER JOIN edms_project_type project
                ON project.project_no = docu.project_no
            LEFT JOIN edms_files files
                ON files.docu_no = docu.docu_no
                AND files.is_last_version = 'Y'
                AND files.is_use = 1
            GROUP BY docu.project_no, project.project_name
            ORDER BY docu.project_no ASC;
        `);

        return getSuccessResponse(res, datas);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res);
});

router.get("/get_main_bottom", async (req: Request, res: Response) => {
    try {
        let allData: {
            project_name: string;
            project_no: number;
            discipline_name: string;
            discipline_id: number;

            start_plan: 0;
            start_actual: 0;
            start_forecast: 0;

            IFA_plan: 0;
            IFA_actual: 0;
            IFA_forecast: 0;

            AFC_plan: 0;
            AFC_actual: 0;
            AFC_forecast: 0;

            As_B_A_plan: 0;
            As_B_A_actual: 0;
            As_B_A_forecast: 0;

            Total: 0;
        }[] = await getConnection().query(`
            SELECT 
                result.project_name,
                result.project_no,
                result.discipline_name,
                result.discipline_id,
                result.is_vp,
                result.start_plan,
                result.start_actual,
                result.start_forecast,
                result.IFA_plan,
                result.IFA_actual,
                result.IFA_forecast,
                result.AFC_plan,
                result.AFC_actual,
                result.AFC_forecast,
                result.As_B_A_plan,
                result.As_B_A_actual,
                result.As_B_A_forecast,
                    result.start_plan+
                    result.start_actual+
                    result.start_forecast+
                    result.IFA_plan+
                    result.IFA_actual+
                    result.IFA_forecast+
                    result.AFC_plan+
                    result.AFC_actual+
                    result.AFC_forecast+
                    result.As_B_A_plan+
                    result.As_B_A_actual+
                    result.As_B_A_forecast AS 'Total'
                FROM (
                    SELECT 
                        ed.project_no,
                        ed.name AS discipline_name,
                        ed.id AS discipline_id,
                        ed.is_vp,
                        pt.project_name,
                        count(
                            case when es.stage_code = 'Start' AND es.plan_dt is not NULL then 1 end
                        ) as 'start_plan',
                        count(
                            case when es.stage_code = 'Start' AND es.actual_dt is not NULL then 1 end
                        ) as 'start_actual',
                        count(
                            case when es.stage_code = 'Start' AND es.forecast_dt is not NULL then 1 end
                        ) as 'start_forecast',
                    
                        count(
                            case when es.stage_code = 'IFA' AND es.plan_dt is not NULL then 1 end
                        ) as 'IFA_plan',
                        count(
                            case when es.stage_code = 'IFA' AND es.actual_dt is not NULL then 1 end
                        ) as 'IFA_actual',
                        count(
                            case when es.stage_code = 'IFA' AND es.forecast_dt is not NULL then 1 end
                        ) as 'IFA_forecast',
                    
                        count(
                            case when es.stage_code = 'AFC' AND es.plan_dt is not NULL then 1 end
                        ) as 'AFC_plan',
                        count(
                            case when es.stage_code = 'AFC' AND es.actual_dt is not NULL then 1 end
                        ) as 'AFC_actual',
                        count(
                            case when es.stage_code = 'AFC' AND es.forecast_dt is not NULL then 1 end
                        ) as 'AFC_forecast',
                    
                        count(
                            case when es.stage_code = 'As-Built' AND es.plan_dt is not NULL then 1 end
                        ) as 'As_B_A_plan',
                        count(
                            case when es.stage_code = 'As-Built' AND es.actual_dt is not NULL then 1 end
                        ) as 'As_B_A_actual',
                        count(
                            case when es.stage_code = 'As-Built' AND es.forecast_dt is not NULL then 1 end
                        ) as 'As_B_A_forecast'
                    FROM edms_discipline ed
                    INNER JOIN edms_project_type pt
                        ON pt.project_no = ed.project_no
                    INNER JOIN edms_files as ef
                        ON ef.is_use = 1
                            AND ef.is_last_version = 'Y'
                    INNER JOIN edms_category as ec
                        ON ec.cate_no = ef.cate_no
                    INNER JOIN edms_document edocu
                        ON edocu.docu_no = ef.docu_no
                    INNER JOIN edms_stage es
                        ON es.docu_no = ef.docu_no
                    WHERE ed.is_use = 1 AND ed.id = ec.discipline_id
                    GROUP BY ed.id, ed.project_no, ed.name, pt.project_name, ed.is_vp
                ) result
                ORDER BY result.project_no ASC, result.discipline_name ASC;
        `);

        return getSuccessResponse(res, allData);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_count_ping_edms", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    let data = { DIN: 0, DRN: 0, TM: 0, SEND: 0, RECV: 0 };
    try {
        await getConnection().transaction(async tr => {
            if (user_id != -1) {
                if (globalWorkerObj.edmsWorkerResult.drn.length > 0 && globalWorkerObj.edmsWorkerResult.tr.length > 0) {
                    const drn = globalWorkerObj.edmsWorkerResult.drn.find(raw => raw.user_id == user_id);
                    const tr = globalWorkerObj.edmsWorkerResult.tr.find(raw => raw.user_id == user_id);
                    data.DRN = drn ? parseInt(drn.count) : 0;
                    data.TM = tr ? parseInt(tr.count) : 0;
                }
            }
        });
    } catch (err) {
        console.log(req);
        logger.error(req.path + " || " + err);
    }
    Object.assign(data, { time: new Date().getTime() });
    return getSuccessResponse(res, data);
});

router.get("/get_main_chart_list", async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        let list: {
            DIN: number[];
            DRN: number[];
            TM: number[];
        }[] = [];
        const user_id = req.app.get("edms_user_id");
        let start_date: Moment | null = null;
        let end_date: Moment | null = null;
        if (start != null && end != null) {
            start_date = getMoment(start.toString());
            end_date = getMoment(end.toString());
        }
        if (user_id != null) {
            await getConnection().transaction(async tr => {
                let tr_assign_numbers = [3, 8, 13, 16];
                let tr_complete_numbers = [11, 14];
                let user = await tr.getRepository(EdmsUser).findOne({ user_id });
                let query = await getWorkProcMainDataFromUser(
                    user.level == 1 ? null : user_id,
                    start_date,
                    end_date,
                    null,
                    user.company_id
                );
                let tr_data = await tr.query(`
                    SELECT 
                        COUNT( case when assign_state in (${tr_assign_numbers.join(
                            ","
                        )}) then 1 end ) as 'continue_count',
                        COUNT( case when assign_state in (${tr_complete_numbers.join(
                            ","
                        )}) then 1 end ) as 'complete_count',
                        COUNT( case when assign_state in (${tr_assign_numbers.join(
                            ","
                        )}) and due_to_date > NOW() then 1 end ) as 'over_count'
                    FROM 
                    ( 
                        ${query.tr}
                    ) AS res;
                `);
                let drn_data = await tr.query(`
                    SELECT 
                        COUNT( case when is_fin = 0 then 1 end ) as 'continue_count',
                        COUNT( case when is_fin = 1 then 1 end ) as 'complete_count',
                        COUNT( case when is_fin = 0 and due_to_date > NOW() then 1 end ) as 'over_count'
                    FROM 
                    ( 
                        ${query.drn}
                    ) AS res;
                `);
                if (drn_data.length > 0 && tr_data.length > 0) {
                    let drn = drn_data[0];
                    let tr = tr_data[0];
                    list.push({
                        DIN: [],
                        DRN: [drn.continue_count, drn.complete_count, drn.over_count],
                        TM: [tr.continue_count, tr.complete_count, tr.over_count],
                    });
                }
            });
        }
        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

const getWpTypeText = (wp_type: string) => {
    switch (wp_type) {
        case "TM":
            return "TR";
        case "DRN":
            return LANGUAGE_PACK.DRN.kor;
        default:
            return wp_type;
    }
};

router.get("/get_main_my_task_list", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            const { type, start, end, keyword, orderType } = req.query;
            let list: {
                wp_idx: number;
                wp_type: string;
                subject: string;
                send: string;
                due_date: string;
                create_tm: string;
                tm_code: string;
            }[] = [];
            const user_id = req.app.get("edms_user_id");
            if (user_id != null) {
                let user = await getRepository(EdmsUser).findOne({ user_id: user_id });
                let orderQuery = `ORDER BY wp.wp_code DESC`;
                if (orderType != null) {
                    const orderNumber = parseInt(orderType.toString());
                    if (orderNumber === 1) {
                        orderQuery = `ORDER BY wp.wp_code DESC`;
                    } else if (orderNumber === 2) {
                        orderQuery = `ORDER BY wp.create_tm DESC`;
                    }
                }
                let start_date: Moment | null = null;
                let end_date: Moment | null = null;
                if (start != null && end != null) {
                    start_date = getMoment(start.toString());
                    end_date = getMoment(end.toString());
                }
                let query = await getWorkProcMainDataFromUser(
                    user.level == 1 ? null : user_id,
                    start_date,
                    end_date,
                    null,
                    user.company_id
                );
                let nowQuery = type ? (type.toString().toLocaleLowerCase() == "tr" ? query.tr : query.drn) : query.all;
                let findQuery = "";
                if (keyword != null && typeof keyword == "string") {
                    let _upperKeyword = keyword.toUpperCase();
                    findQuery = `
                        UPPER(wp.subject) like '%${_upperKeyword}%' 
                    OR UPPER(wp.create_by) like '%${_upperKeyword}%'
                    OR UPPER(wt.tm_code) like '%${_upperKeyword}%'
                    OR UPPER(wp.wp_code) like '%${_upperKeyword}%`;
                }
                let work_proc = await getConnection().query(`
                    SELECT 
                        wp.wp_idx,
                        wp.wp_type,
                        wp.subject,
                        wp.create_by,
                        wp.due_date,
                        wp.create_tm,
                        wp.wp_code,
                        wt.tm_code
                    FROM  (
                        ${nowQuery}
                    ) wa
                    INNER JOIN work_proc wp
                        ON wp.wp_idx = wa.wp_idx
                    LEFT JOIN work_tm wt
                        ON wt.wp_idx = wp.wp_idx
                        OR wt.wp_idx = wp.original_tm_id
                    ${findQuery}
                    ${orderQuery}
                `);
                work_proc.map(work => {
                    list.push({
                        wp_idx: work.wp_idx,
                        wp_type: getWpTypeText(work.wp_type),
                        subject: work.subject,
                        send: work.create_by,
                        due_date: getMoment(work.due_date).format("YYYY-MM-DD"),
                        create_tm: getMoment(work.create_tm).format("YYYY-MM-DD"),
                        tm_code: work.wp_code,
                    });
                });
                return getSuccessResponse(res, list);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_blocked_work_proc_list", async (req: Request, res: Response) => {
    try {
        let now = moment();
        let allData = await getConnection().query(`
            SELECT 
                w_p.wp_idx, 
                w_p.subject, 
                u.username, 
                w_a.due_to_date 
            FROM work_proc w_p 
            INNER JOIN work_assign w_a 
                ON w_a.due_to_date < '${now.format("YYYY-MM-DD HH:mm:SS")}'
                AND w_a.is_approval = 0
            INNER JOIN edms_user u
                ON u.user_id = w_a.assign_to_id
            WHERE w_p.wp_idx = w_a.wp_idx
            ORDER BY w_p.create_tm DESC
            LIMIT 100;
        `);
        for (var d of allData) {
            if (d.due_to_date) {
                let diff_days = getDiffDate(new Date(), moment(d.due_to_date).toDate(), "days");
                Object.assign(d, { diff_days });
            }
        }
        return getSuccessResponse(res, allData);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_project_dday_data", async (req: Request, res: Response) => {
    try {
        let allData;
        await getConnection().transaction(async tr => {
            allData = await tr.query(`
                SELECT 
                    (AVG(DATEDIFF(actual_dt, plan_dt))) as 'avg',
                    (sum(plan_dt is not null) / count(*) * 100) as per, 
                    e_p.project_no, 
                    e_p.project_name 
                FROM edms_stage e_s
                INNER JOIN edms_document e_d
                INNER JOIN edms_project_type e_p ON e_p.project_no = e_d.project_no
                WHERE e_s.docu_no = e_d.docu_no group by e_d.project_no;
            `);
            let lastDate = await tr.query(`
                SELECT 
                    MAX(e_s.plan_dt) as 'max_date',
                    e_d.project_no
                FROM edms_stage e_s
                INNER JOIN edms_document e_d
                WHERE e_s.docu_no = e_d.docu_no group by e_d.project_no;
            `);
            for (var d of allData) {
                let last = lastDate.find(raw => raw.project_no == d.project_no);
                if (last) {
                    let diff = Math.floor(getDiffDate(last.max_date, new Date(), "days") + parseFloat(d.avg));
                    if (diff > 0) {
                        Object.assign(d, { dday: `-${diff}` });
                    } else {
                        Object.assign(d, { dday: `+${diff * -1}` });
                    }
                } else {
                    Object.assign(d, { dday: "??" });
                }
            }
        });
        return getSuccessResponse(res, allData);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
