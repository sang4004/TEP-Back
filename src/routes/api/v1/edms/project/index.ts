/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsProjectType
 * 프로젝트 관련 api
 * api :
 ******************************************************************************/
import express, { request, Request, Response } from "express";
import { getConnection, getRepository, In, Repository, Not, LessThanOrEqual } from "typeorm";
import moment from "moment";
import { logger } from "@/lib/winston";
import {
    EdmsProjectType,
    EdmsCategory,
    EdmsDocument,
    EdmsUser,
    EdmsDiscipline,
    EdmsCompany,
    EdmsGroup,
    EdmsPosition,
    EdmsDocumentManager,
    WorkTmCode,
    EdmsProjects,
    EdmsMailGroup,
    WorkTmOfficialUser,
    EdmsStageType,
} from "@/entity";
import { getFailedResponse, getSuccessResponse, LANGUAGE_PACK } from "@/lib/format";
import { getDateValue, PathCheck, getMoment, getDiffDateNetworkDays } from "@/lib/utils";
import { getOfficialType } from "./utils";
import { sendMail } from "@/lib/mailer";
import { Procedure } from "@/lib/procedure";
import { globalWorkerObj } from "@/lib/mainWorker";
const isLive = process.env.NODE_ENV == "live";

const router = express.Router();

const get_proj_status_str = (status: string) => {
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

router.post("/create_project", async (req: Request, res: Response) => {
    try {
        const {
            project_code,
            project_name,
            explan,
            PM_idx,
            state,
            start_dt,
            end_dt,
            pproject_no,
            create_by,
            partner_company,
        } = req.body;
        let newProject = new EdmsProjectType();

        newProject.project_code = project_code;
        newProject.project_name = project_name;
        newProject.explan = explan;
        newProject.PM_idx = PM_idx;
        newProject.is_use_approval = "Y"; // 승인여부는 기본적으로 ON
        newProject.state = state;
        newProject.start_dt = start_dt;
        newProject.end_dt = end_dt;
        newProject.p_project_no = pproject_no ? pproject_no : -1;
        newProject.create_by = create_by;
        newProject.create_tm = new Date();
        newProject.partner_company = partner_company;

        let createdProj = await getRepository(EdmsProjectType).save(newProject);

        await PathCheck(`${createdProj.project_no}`);

        if (createdProj.project_no) {
            let users = await getRepository(EdmsUser).find({ level: LessThanOrEqual(2) });
            users.map(user => {
                sendMail(
                    user.email,
                    `<${createdProj.project_name}> ${LANGUAGE_PACK.EMAIL.CREATE_PROJECT.default.kor}`,
                    `${LANGUAGE_PACK.EMAIL.CREATE_PROJECT.content.kor}<br/>
                        <div>
                        프로젝트 명 : ${createdProj.project_name}<br/>
                        프로젝트 코드 : ${createdProj.project_code}<br/>
                        시작일 : ${
                            moment.isDate(createdProj.start_dt)
                                ? moment(createdProj.start_dt).format("YYYY-MM-DD HH:mm:ss")
                                : "미설정"
                        }<br/>
                        종료일 : ${
                            moment.isDate(createdProj.end_dt)
                                ? moment(createdProj.end_dt).format("YYYY-MM-DD HH:mm:ss")
                                : "미설정"
                        }<br/>
                        생성자 : ${createdProj.create_by}<br/>
                        </div>`
                );
            });
            // DCL data refresh
            globalWorkerObj.dclWorkerInstance.refreshData();
        }

        return getSuccessResponse(res, {
            insert_projects: {
                ...createdProj,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_project", async (req: Request, res: Response) => {
    try {
        const {
            project_no,
            project_code,
            project_name,
            explan,
            PM_idx,
            is_use_approval,
            state,
            start_dt,
            end_dt,
            pproject_no,
            modify_by,
            modify_tm,
            partner_company,
        } = req.body;
        if (project_no) {
            let edit_project = await getRepository(EdmsProjectType).findOne({
                project_no: project_no,
                is_use: 1,
            });
            let update_data = {
                modify_tm: modify_tm ? modify_tm : new Date(),
            };

            if (project_code) Object.assign(update_data, { project_code: project_code });
            if (project_name) Object.assign(update_data, { project_name: project_name });
            if (explan) Object.assign(update_data, { explan: explan });
            if (PM_idx) Object.assign(update_data, { PM_idx: PM_idx });
            if (is_use_approval) Object.assign(update_data, { is_use_approval: is_use_approval });
            if (state) Object.assign(update_data, { state: state });
            if (start_dt) Object.assign(update_data, { start_dt: start_dt });
            if (end_dt) Object.assign(update_data, { end_dt: end_dt });
            if (pproject_no) Object.assign(update_data, { p_project_no: pproject_no });
            if (modify_by) Object.assign(update_data, { modify_by: modify_by });
            if (partner_company) Object.assign(update_data, { partner_company: partner_company });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsProjectType)
                .set({ ...update_data })
                .where("project_no=:id", { id: edit_project.project_no })
                .execute();
            return getSuccessResponse(res, edit_project);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/delete_project", async (req: Request, res: Response) => {
    // try{
    //     let emps = await getRepository(EdmsProjectType).create({ project_no : project_no});
    //     if(emps){
    //         await getRepository(EdmsProjectType).remove(emps);
    //     }
    //     return getSuccessResponse(res, true);
    // } catch(err){ logger.error(req.path + " || " + err); }

    // return getFailedResponse(res);

    try {
        let emps = await getRepository(EdmsProjectType)
            .createQueryBuilder()
            .where("project_no IN (:...project_no)", { project_no: req.body.project_no })
            .getMany();

        if (emps.length > 0) {
            await getConnection().transaction(async tr => {
                let queries = Procedure.DeleteProjStdInfo(emps[0].project_no).data;
                for (var q of queries) {
                    await tr.query(q);
                }
                await tr.getRepository(EdmsProjectType).remove(emps);
            });
            globalWorkerObj.dclWorkerInstance.refreshData();
        }
        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_project", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != undefined) {
            let user = await getRepository(EdmsUser).findOne({ user_id, is_use: 1 });

            let emp = await getRepository(EdmsProjectType).findOne({});

            return getSuccessResponse(res, emp);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_project_type_list", async (req: Request, res: Response) => {
    try {
        let emps = await getRepository(EdmsProjectType).find({
            where: {
                state: 1,
                is_use: 1,
            },
            order: {
                create_tm: "ASC",
            },
        });
        if (emps.length != 0) {
            return getSuccessResponse(res, emps);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_prog_project_list", async (req: Request, res: Response) => {
    try {
        let projectType = [];
        let list: {
            project_no: number;
            project_code: string;
            project_name: string;
            create_by: string;
            status: string;
            docu_cnt: number;
            file_cnt: number;
            start_dt: Date;
            end_dt: Date;
            rate: number;
            p_project_no: number;
            explan: string;
            state: number;
            pm: number;
            partner_company: string;
        }[] = [];

        projectType = await getConnection().query(`
            SELECT pt.*,
                (SELECT COUNT(*) FROM edms_files ef WHERE ef.project_no = pt.project_no AND ef.is_use = 1) as file_cnt,
                (SELECT COUNT(*) FROM edms_document ed WHERE ed.project_no = pt.project_no) as docu_cnt
            FROM edms_project_type pt
            ORDER BY pt.project_no ASC;
        `);

        for (var t of projectType) {
            list.push({
                project_no: t.project_no,
                project_code: t.project_code,
                project_name: t.project_name,
                create_by: t.create_by,
                status: get_proj_status_str(t.state),
                docu_cnt: t.docu_cnt,
                file_cnt: t.file_cnt,
                start_dt: t.start_dt,
                end_dt: t.end_dt,
                rate: 10,
                p_project_no: t.p_project_no,
                explan: t.explan,
                state: t.state,
                pm: t.PM_idx,
                partner_company: t.partner_company,
            });
        }

        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_project_manager", async (req: Request, res: Response) => {
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

router.get("/get_all_list", async (req: Request, res: Response) => {
    try {
        //if(req.app.get("user_id") != null){
        let proj = await getRepository(EdmsProjectType).find({ where: { is_use: 1 }, order: { project_no: "ASC" } });
        let discipline = await getRepository(EdmsDiscipline).find({
            where: { is_use: 1 },
            order: { name: "ASC" },
        });
        let cate = await getRepository(EdmsCategory).find({ where: { is_use: 1 }, order: { cate_name: "ASC" } });
        let dcl_cate = await getConnection().query(`
            SELECT ec.*
            FROM edms_category ec
            WHERE ec.is_use = 1
            GROUP BY ec.cate_no
            ORDER BY ec.cate_no ASC, ec.cate_name ASC;
        `);
        let docu = await getRepository(EdmsDocument).find({ where: { is_use: 1 }, order: { create_tm: "DESC" } });
        let stage_type = await getRepository(EdmsStageType).find({
            where: { is_use: 1 },
            order: { create_tm: "DESC" },
        });

        return getSuccessResponse(res, { discipline, proj, cate, docu, stage_type, dcl_cate });
        //}
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getSuccessResponse(res);
});

router.get("/get_all_edms_user_list", async (req: Request, res: Response) => {
    const is_org = req.query.is_org ? Boolean(req.query.is_org.toString()) : undefined;
    const is_mail_user = req.query.is_mail_user ? Boolean(req.query.is_mail_user.toString()) : undefined;
    try {
        let user_id = req.app.get("edms_user_id");
        let _user = `
                SELECT * FROM edms_user
                @where
                ORDER BY username ASC;
            `;
        let user: any[] = [];
        if (is_org !== undefined && is_mail_user !== undefined && isLive) {
            user = await getConnection().query(
                _user.replace(
                    "@where",
                    is_org && is_mail_user
                        ? `WHERE is_use NOT IN (-1) AND level = 4`
                        : is_org && !is_mail_user
                        ? `WHERE is_use NOT IN (-1)`
                        : !is_org && is_mail_user
                        ? `WHERE level = 4`
                        : ``
                )
            );
        } else if (is_org !== undefined && is_mail_user !== undefined) {
            user = await getConnection().query(
                _user.replace(
                    "@where",
                    is_org && is_mail_user
                        ? `WHERE NOT is_use = -1 AND level = 4`
                        : is_org && !is_mail_user
                        ? `WHERE NOT is_use = -1`
                        : !is_org && is_mail_user
                        ? `WHERE level = 4`
                        : ``
                )
            );
        } else {
            user = await getConnection().query(_user.replace("@where", ""));
        }
        let company = await getRepository(EdmsCompany).find({
            is_delete: false,
        });
        let group = await getRepository(EdmsGroup).find({
            is_delete: false,
            is_mail_group: is_mail_user ? 1 : 0,
        });
        let position = await getRepository(EdmsPosition).find({
            is_delete: false,
        });

        let group_mail = await getRepository(EdmsMailGroup).find({
            is_delete: false,
        });

        //자신 회사 제외
        let user_company_id = user.find(raw => raw.user_id == user_id)
            ? user.find(raw => raw.user_id == user_id).company_id
            : -1;
        let filtered_company = company.filter(raw => raw.id != user_company_id);

        let tm_code = await getRepository(WorkTmCode).find();
        for (var u of user) {
            if (u.is_use == 1 || (u.level == 4 && u.is_use == 0)) {
                let is_tm: boolean = false;
                let tm_project_no_list: number[] = [];
                let company_tm = tm_code.filter(raw => raw.company_id == u.company_id);
                for (let tm of company_tm) {
                    if (tm.tm_user_id == u.user_id) {
                        is_tm = true;
                        tm_project_no_list.push(tm.project_no);
                    }
                }
                Object.assign(u, { is_tm: is_tm, tm_project_no_list: tm_project_no_list });
            }
        }

        return getSuccessResponse(res, {
            user,
            company,
            group,
            position,
            filtered_company: filtered_company,
            group_mail,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/delete_edms_address", async (req: Request, res: Response) => {
    const { id, type } = req.body;
    try {
        if (type == "company") {
            let emps = await getRepository(EdmsCompany).findOne({
                where: { id: id, is_delete: false },
            });
            if (emps) {
                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsCompany)
                    .set({ is_delete: true })
                    .where("id = :id", { id: id })
                    .execute();

                //await getRepository(EdmsCompany).remove(emps);
            }
        } else if (type == "group") {
            let emps = await getRepository(EdmsGroup).findOne({
                where: { id: id, is_delete: false },
            });
            if (emps) {
                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsGroup)
                    .set({ is_delete: true })
                    .where("id = :id", { id: id })
                    .execute();

                //await getRepository(EdmsPosition).remove(emps);
            }
        } else if (type == "user") {
            let user = await getRepository(EdmsUser).findOne({
                where: { user_id: id, is_use: 1 },
            });
            if (user && user.level != 4) {
                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsUser)
                    .set({ is_use: 0 })
                    .where("user_id = :id", { id: id })
                    .execute();

                //await getRepository(EdmsUser).remove(emps);
            } else {
                // 이메일유저의 경우 0 이므로, -1 까지 내려준다.
                await getConnection()
                    .createQueryBuilder()
                    .update(EdmsUser)
                    .set({ is_use: -1 })
                    .where("user_id = :id", { id: id })
                    .execute();
            }
        }
        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/create_edms_company", async (req: Request, res: Response) => {
    const { company_name } = req.body;
    try {
        let newCompany = new EdmsCompany();

        newCompany.company_name = company_name;
        newCompany.created_at = new Date();
        newCompany.is_delete = false;
        newCompany.project_no = 0;

        let insertCompany = await getRepository(EdmsCompany).save(newCompany);

        return getSuccessResponse(res, {
            insert_company: {
                ...insertCompany,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.post("/edit_edms_company", async (req: Request, res: Response) => {
    const { company_name, id } = req.body;
    try {
        let company = await getRepository(EdmsCompany).findOne({
            where: { id: id, is_delete: false },
        });

        await getConnection()
            .createQueryBuilder()
            .update(EdmsCompany)
            .set({ company_name: company_name })
            .where("id = :id", { id: id })
            .execute();
        return getSuccessResponse(res, { company });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.post("/create_edms_group", async (req: Request, res: Response) => {
    const { company_id, group_name, is_mail_group } = req.body;
    try {
        let newGroup = new EdmsGroup();

        newGroup.group_name = group_name;
        newGroup.created_at = new Date();
        newGroup.is_delete = false;
        newGroup.company_id = company_id;
        newGroup.is_mail_group = is_mail_group ? 1 : 0;

        let insertGroup = await getRepository(EdmsGroup).save(newGroup);

        return getSuccessResponse(res, {
            insert_group: {
                ...insertGroup,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.post("/edit_edms_group", async (req: Request, res: Response) => {
    const { company_id, group_name, group_id } = req.body;
    try {
        let group = await getRepository(EdmsGroup).findOne({
            where: { id: group_id, company_id: company_id, is_delete: false },
        });
        let edit_group = {};

        if (group_name) Object.assign(edit_group, { group_name: group_name });

        await getConnection()
            .createQueryBuilder()
            .update(EdmsGroup)
            .set(edit_group)
            .where("id = :id AND company_id = :company_id", {
                id: group_id,
                company_id: company_id,
            })
            .execute();
        return getSuccessResponse(res, { group });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.post("/create_edms_user", async (req: Request, res: Response) => {
    const {
        userid,
        userpw,
        username,
        company_id,
        group_id,
        position_id,
        level,
        email,
        tmManager,
        phone_number,
        is_mail_user,
        group_no_list,
    } = req.body;
    try {
        let newUser = new EdmsUser();

        newUser.userid = userid;
        newUser.password = userpw;
        newUser.username = username;
        newUser.company_id = company_id;
        newUser.group_id = group_id;
        newUser.position_id = position_id;
        newUser.level = is_mail_user ? 4 : level; // mail user: 4
        newUser.email = email;
        newUser.phone_number = phone_number;
        newUser.is_use = is_mail_user ? 0 : 1;

        let insertUser = await getRepository(EdmsUser).save(newUser);

        if (Array.isArray(group_no_list) && group_no_list != undefined) {
            for (var mg of group_no_list) {
                let newMailGroup = new EdmsMailGroup();

                newMailGroup.user_id = insertUser.user_id;
                newMailGroup.group_id = mg;

                await getRepository(EdmsMailGroup).save(newMailGroup);
            }
        }

        if (tmManager && !is_mail_user) {
            let tm_code = await getRepository(WorkTmCode).findOne({ company_id: company_id });
            await getConnection()
                .createQueryBuilder()
                .update(WorkTmCode)
                .set({ tm_user_id: userid })
                .where("id = :id", {
                    id: tm_code.id,
                })
                .execute();
        }

        return getSuccessResponse(res, {
            insert_user: {
                ...insertUser,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.post("/edit_edms_user", async (req: Request, res: Response) => {
    const create_user_id = req.app.get("edms_user_id");
    const {
        user_id,
        company_id,
        group_id,
        position_id,
        level,
        tmManager,
        email,
        phone_number,
        selectProjectNoList,
        is_mail_user,
        group_no_list,
        username,
    } = req.body;
    try {
        let user = await getRepository(EdmsUser).findOne({
            user_id: user_id,
            is_use: 1,
        });
        let create_user = await getRepository(EdmsUser).findOne({
            user_id: create_user_id,
            is_use: 1,
        });

        let work_tm_code = await getRepository(WorkTmCode).find();

        let edit_user = {};

        if (username) Object.assign(edit_user, { username: username });
        if (group_id) Object.assign(edit_user, { group_id: group_id });
        if (position_id) Object.assign(edit_user, { position_id: position_id });
        if (level) Object.assign(edit_user, { level: is_mail_user ? 4 : level });
        if (email) Object.assign(edit_user, { email: email });
        if (phone_number) Object.assign(edit_user, { phone_number: phone_number });

        await getConnection()
            .createQueryBuilder()
            .update(EdmsUser)
            .set(edit_user)
            .where("user_id = :user_id", { user_id: user_id })
            .execute();

        // update 수정 삭제 처리
        if (Array.isArray(group_no_list) && group_no_list != undefined) {
            await getConnection().transaction(async tr => {
                let mailGroupList = await tr.getRepository(EdmsMailGroup).find({ user_id, is_delete: false });
                for (var mail of group_no_list) {
                    let existMailGroup = await tr.getRepository(EdmsMailGroup).findOne({ user_id, group_id: mail });
                    if (existMailGroup == undefined) {
                        // add
                        let newMailGroup = new EdmsMailGroup();

                        newMailGroup.user_id = user_id;
                        newMailGroup.group_id = mail;

                        await tr.getRepository(EdmsMailGroup).save(newMailGroup);
                    } else if (existMailGroup.is_delete == true) {
                        // update isdelete false

                        await tr
                            .createQueryBuilder()
                            .update(EdmsMailGroup)
                            .set({ is_delete: false })
                            .where("user_id = :user_id AND group_id = :group_id", { user_id: user_id, group_id: mail })
                            .execute();
                    }
                }

                for (var existMail of mailGroupList) {
                    if (group_no_list.indexOf(existMail.group_id) == -1) {
                        // delete
                        await tr
                            .createQueryBuilder()
                            .update(EdmsMailGroup)
                            .set({ is_delete: true })
                            .where("user_id = :user_id AND group_id = :group_id", {
                                user_id: user_id,
                                group_id: existMail.group_id,
                            })
                            .execute();
                    }
                }
            });
        }
        let exist_tm_code_user = work_tm_code.filter(
            tmCode => tmCode.company_id == company_id && tmCode.tm_user_id == user_id
        );
        if (tmManager && selectProjectNoList.length != 0) {
            for (let selectProjectNo of selectProjectNoList) {
                let exist_tm_code = work_tm_code.find(
                    tmCode => tmCode.company_id == company_id && tmCode.project_no == selectProjectNo
                );
                if (exist_tm_code) {
                    if (exist_tm_code.tm_user_id != user_id)
                        await getConnection()
                            .createQueryBuilder()
                            .update(WorkTmCode)
                            .set({ tm_user_id: user_id })
                            .where("id = :tm_code_id", { tm_code_id: exist_tm_code.id })
                            .execute();
                    else {
                        let idx = exist_tm_code_user.findIndex(raw => raw.id == exist_tm_code.id);
                        exist_tm_code_user.splice(idx, 1);
                    }
                } else {
                    let tm_code = work_tm_code.find(tmCode => tmCode.company_id == company_id);

                    let newTmCode = new WorkTmCode();
                    newTmCode.create_by = create_user.username;
                    newTmCode.company_id = tm_code.company_id;
                    newTmCode.tm_code_start = tm_code.tm_code_start;
                    newTmCode.tm_code_mid = tm_code.tm_code_mid;
                    newTmCode.tm_code_last = tm_code.tm_code_last;
                    newTmCode.tm_user_id = user.user_id;
                    newTmCode.project_no = selectProjectNo;
                    await getRepository(WorkTmCode).save(newTmCode);
                }
            }
            // 전부 돌았는데, 기존에있던 프로젝트가 빠졌다면 삭제
            if (exist_tm_code_user.length > 0)
                await getRepository(WorkTmCode).delete({ id: In(exist_tm_code_user.map(raw => raw.id)) });
            //
        } else if (!tmManager && selectProjectNoList.length != 0) {
            for (let selectProjectNo of selectProjectNoList) {
                let exist_tm_code = work_tm_code.find(
                    tmCode =>
                        tmCode.company_id == company_id &&
                        tmCode.tm_user_id == user.user_id &&
                        tmCode.project_no == selectProjectNo
                );
                if (exist_tm_code) {
                    await getRepository(WorkTmCode).delete({ id: exist_tm_code.id });
                }
            }
        }

        return getSuccessResponse(res, { user });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.get("/get_edms_user_detail", async (req: Request, res: Response) => {
    const { is_org, is_mail_user } = req.query;
    try {
        let list = [];

        let user_filter = {};
        if (is_org) Object.assign(user_filter, { is_use: Not(-1) });
        if (is_mail_user) Object.assign(user_filter, { level: 4 });
        let user = await getRepository(EdmsUser).find(user_filter);
        let company = await getRepository(EdmsCompany).find({ is_delete: false });
        let group = await getRepository(EdmsGroup).find({ is_delete: false, is_mail_group: is_mail_user ? 1 : 0 });
        let position = await getRepository(EdmsPosition).find({ is_delete: false });

        for (var u of user) {
            if (u.is_use == 1 || u.level == 4) {
                let OneCompany = company.filter(raw => raw.id == u.company_id);
                let OneGroup = group.filter(raw => raw.id == u.group_id);
                let OnePosition = position.filter(raw => raw.id == u.position_id);

                let companyName = OneCompany.map(raw => raw.company_name);
                let groupName = OneGroup.map(raw => raw.group_name);
                let positionName = OnePosition.map(raw => raw.position_name);

                list.push({
                    company_id: u.company_id,
                    company: companyName[0],
                    group: groupName[0],
                    position: positionName[0],
                    name: u.username,
                    email: u.email,
                });
            }
        }

        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_all_edms_docu_manager", async (req: Request, res: Response) => {
    try {
        let manager = await getRepository(EdmsDocumentManager).find();

        return getSuccessResponse(res, manager);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_edms_document_manager_list", async (req: Request, res: Response) => {
    try {
        let final_list: {
            company_name: string;
            group_name: string;
            user_name: string;
            project_name: string;
            project_type_no: number;
            project_type_name: string;
            discipline_id: number;
            discipline_name: string;
            cate_no: number;
            cate_name: string;
            docu_no: number;
            docu_name: string;
        }[] = [];

        let list = await getConnection().query(`
            SELECT
                ec.company_name,
                eg.group_name,
                edm.username,
                ep.project_name,
                ept.project_no as project_type_no,
                ept.project_name as project_type_name,
                edm.discipline_id,
                ed.name,
                edm.cate_no,
                cate.cate_name,
                edm.docu_no,
                docu.docu_subject
            FROM edms_document_manager as edm
            LEFT JOIN edms_company as ec
                ON ec.id = edm.company_id
            LEFT JOIN edms_group as eg
                ON eg.id = edm.group_id
            LEFT JOIN edms_project_type as ept
                ON ept.project_no = edm.project_type_no
            LEFT JOIN edms_discipline as ed
                ON ed.id = edm.discipline_id
            LEFT JOIN edms_projects as ep
                ON ep.project_no = ept.p_project_no
            LEFT JOIN edms_category as cate
                ON cate.cate_no = edm.cate_no
            LEFT JOIN edms_document as docu
                ON docu.docu_no = edm.docu_no
            WHERE edm.is_use = 1 ORDER BY edm.project_type_no ASC;
        `);

        for (var m of list) {
            final_list.push({
                company_name: m.company_name,
                group_name: m.group_name,
                user_name: m.username,
                project_name: m.project_name,
                project_type_no: m.project_type_no,
                project_type_name: m.project_type_name,
                discipline_id: m.discipline_id,
                discipline_name: m.name,
                cate_no: m.cate_no,
                cate_name:
                    m.discipline_id == 0
                        ? ""
                        : m.cate_no == -1 || m.cate_no == 0
                        ? m.name + "의 총 담당자"
                        : m.cate_name,
                docu_no: m.docu_no,
                docu_name:
                    m.discipline_id == 0
                        ? ""
                        : (m.cate_no == -1 || m.cate_no == 0) && (m.docu_no == -1 || m.docu_no == 0)
                        ? m.name + "의 총 담당자"
                        : m.docu_no == -1 || m.docu_no == 0
                        ? m.cate_name + "의 총 담당자"
                        : m.docu_subject,
            });
        }

        return getSuccessResponse(res, final_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/create_docu_manager", async (req: Request, res: Response) => {
    const { company_id, group_id, user_id, discipline_id, cate_no, docu_no } = req.body;
    const edms_user_id = req.app.get("edms_user_id");
    try {
        let all_user = await getRepository(EdmsUser).find({ is_use: 1 });
        let newDocuMamager = new EdmsDocumentManager();
        let insertDocuManager: any;

        //생성자
        let create_user = all_user.find(raw => raw.user_id == edms_user_id);
        //작성자명
        let user = all_user.find(raw => raw.user_id == user_id);

        if (discipline_id != -1) {
            let discipline = await getRepository(EdmsDiscipline).findOne({
                where: { id: discipline_id, is_use: 1 },
            });
            newDocuMamager.user_id = user_id;
            newDocuMamager.company_id = user.company_id;
            newDocuMamager.group_id = group_id;
            newDocuMamager.create_by = create_user.username;
            newDocuMamager.is_use = 1;
            newDocuMamager.username = user.username;
            newDocuMamager.project_type_no = discipline.project_no;
            newDocuMamager.discipline_id = discipline_id;
            newDocuMamager.cate_no = -1;
            newDocuMamager.docu_no = -1;

            insertDocuManager = await getRepository(EdmsDocumentManager).save(newDocuMamager);
        } else if (cate_no != -1) {
            let cate = await getRepository(EdmsCategory).findOne({
                where: { cate_no: cate_no, is_use: 1 },
            });
            newDocuMamager.user_id = user_id;
            newDocuMamager.company_id = user.company_id;
            newDocuMamager.group_id = group_id;
            newDocuMamager.create_by = create_user.username;
            newDocuMamager.is_use = 1;
            newDocuMamager.username = user.username;
            newDocuMamager.project_type_no = cate.project_no;
            newDocuMamager.discipline_id = cate.discipline_id;
            newDocuMamager.cate_no = cate_no;
            newDocuMamager.docu_no = -1;

            insertDocuManager = await getRepository(EdmsDocumentManager).save(newDocuMamager);
        } else if (docu_no != -1) {
            let docu = await getRepository(EdmsDocument).findOne({
                where: { docu_no: docu_no, is_use: 1 },
            });
            let cate = await getRepository(EdmsCategory).findOne({
                where: { cate_no: docu.cate_no, is_use: 1 },
            });

            newDocuMamager.user_id = user_id;
            newDocuMamager.company_id = user.company_id;
            newDocuMamager.group_id = group_id;
            newDocuMamager.create_by = create_user.username;
            newDocuMamager.is_use = 1;
            newDocuMamager.username = user.username;
            newDocuMamager.project_type_no = cate.project_no;
            newDocuMamager.discipline_id = cate.discipline_id;
            newDocuMamager.cate_no = cate.cate_no;
            newDocuMamager.docu_no = docu_no;

            insertDocuManager = await getRepository(EdmsDocumentManager).save(newDocuMamager);
        }

        return getSuccessResponse(res, {
            insert_docu_manager: {
                ...insertDocuManager,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/delete_docu_manager", async (req: Request, res: Response) => {
    const { company_id, group_id, user_id, discipline_id, cate_no, docu_no } = req.body;
    try {
        // discipline_id = -1 아닐 때 삭제
        if (discipline_id != -1) {
            let docu_manager = await getRepository(EdmsDocumentManager).findOne({
                where: {
                    company_id: company_id,
                    group_id: group_id,
                    user_id: user_id,
                    discipline_id: discipline_id,
                    cate_no: -1,
                    docu_no: -1,
                },
            });

            await getRepository(EdmsDocumentManager).delete(docu_manager);

            // cate_no = -1이 아닐때 삭제
        } else if (cate_no != -1) {
            let cate = await getRepository(EdmsCategory).findOne({
                where: { cate_no: cate_no, is_use: 1 },
            });
            let docu_manager = await getRepository(EdmsDocumentManager).findOne({
                where: {
                    company_id: company_id,
                    group_id: group_id,
                    user_id: user_id,
                    discipline_id: cate.discipline_id,
                    cate_no: cate_no,
                    docu_no: -1,
                },
            });

            await getRepository(EdmsDocumentManager).delete(docu_manager);

            //docu_no = -1이 아닐떄
        } else if (docu_no != -1) {
            let docu = await getRepository(EdmsDocument).findOne({
                where: { docu_no: docu_no, is_use: 1 },
            });
            let cate = await getRepository(EdmsCategory).findOne({
                where: { cate_no: docu.cate_no, is_use: 1 },
            });

            let docu_manager = await getRepository(EdmsDocumentManager).findOne({
                where: {
                    company_id: company_id,
                    group_id: group_id,
                    user_id: user_id,
                    discipline_id: cate.discipline_id,
                    cate_no: cate.cate_no,
                    docu_no: docu_no,
                },
            });

            await getRepository(EdmsDocumentManager).delete(docu_manager);
        }

        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_edms_project", async (req: Request, res: Response) => {
    try {
        let projects = await getRepository(EdmsProjects).find({ is_use: 1 });
        return getSuccessResponse(res, projects);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/update_user_menu", async (req: Request, res: Response) => {
    const { user_id, menu_name, menu_state } = req.body;
    try {
        let user = await getRepository(EdmsUser).findOne({
            where: { user_id: parseInt(user_id) },
        });
        if (menu_name == "문서관리" && parseInt(menu_state) == 0) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ is_menu1: 1 })
                .where("user_id = :user_id", { user_id: parseInt(user_id) })
                .execute();
        } else if (menu_name == "성과물" && parseInt(menu_state) == 0) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ is_menu2: 1 })
                .where("user_id = :user_id", { user_id: parseInt(user_id) })
                .execute();
        } else if (menu_name == "문서관리" && parseInt(menu_state) == 1) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ is_menu1: 0 })
                .where("user_id = :user_id", { user_id: parseInt(user_id) })
                .execute();
        } else if (menu_name == "성과물" && parseInt(menu_state) == 1) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ is_menu2: 0 })
                .where("user_id = :user_id", { user_id: parseInt(user_id) })
                .execute();
        }
        return getSuccessResponse(res, user);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_edms_discipline", async (req: Request, res: Response) => {
    try {
        let discipline = await getRepository(EdmsDiscipline).find({ is_use: 1 });
        return getSuccessResponse(res, discipline);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

const DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
router.get("/get_tft_log", async (req: Request, res: Response) => {
    const { project_no, start_date, end_date, search_type, search_text } = req.query;
    const skip = req.query.skip ? parseInt(req.query.skip.toString()) : undefined;
    const size = req.query.size ? parseInt(req.query.size.toString()) : undefined;
    try {
        let _project_no = -1;
        let searchType = -1; // 1 제목, 2 TR. No., 3 Document. No.
        let searchText = "";
        let endDate = moment().format(DATE_FORMAT);
        let tmp = moment();
        tmp.add(-1, "months");
        let startDate = tmp.format(DATE_FORMAT);

        if (project_no && typeof project_no == "string") {
            _project_no = parseInt(project_no);
        }
        if (start_date && typeof start_date == "string") {
            startDate = getMoment(start_date.replace(/\"/gi, "")).format(DATE_FORMAT);
        }
        if (end_date && typeof end_date == "string") {
            endDate = getMoment(end_date.replace(/\"/gi, "")).format(DATE_FORMAT);
        }
        if (search_type && typeof search_type == "string") {
            searchType = parseInt(search_type); // 1 : discipline, 2 : tm_code, 3 : docu_code,
        }
        if (search_text && typeof search_text == "string") {
            searchText = search_text != "" ? search_text : "";
        }
        const waIdxQuery = `
            SELECT 
                DISTINCT wd.wp_idx 
            FROM work_docu wd
            INNER JOIN work_tm wt
                ON wt.wp_idx = wd.wp_idx
            INNER JOIN work_proc wp
                ON wp.wp_idx = wd.wp_idx
            INNER JOIN edms_document ed
                ON ed.docu_no = wd.docu_no
            INNER JOIN edms_category ecate
                ON ecate.cate_no = ed.cate_no
            INNER JOIN edms_discipline edisc
                ON edisc.id = ecate.discipline_id 
            WHERE wp.wp_type = 'TM' AND wp.original_tm_id = 0
            AND wt.sended_tm IS NOT NULL
            ${_project_no && _project_no != -1 ? `AND wp.project_no = ${_project_no}` : ``}
            ${
                startDate && endDate
                    ? `
                AND wt.sended_tm > '${startDate}'
                AND wt.sended_tm < '${endDate}'
            `
                    : ``
            }
            ${
                searchType == 1
                    ? `AND edisc.name like '%${searchText}%'`
                    : searchType == 2
                    ? `AND wt.tm_code like '%${searchText}%'`
                    : searchType == 3
                    ? `AND ed.docu_code like '%${searchText}%'`
                    : ``
            }
        `;

        let datas = await getConnection().query(`
            SELECT 
                edisc.name AS 'discipline', 
                wt.sended_tm, 
                wt.tm_code, 
                ed.docu_code,
                ed.docu_subject, 
                wth.stage_name, 
                wth.revision, 
                wp.due_date, 
                wt.deploy_tm, 
                wth.code,
                ef.file_no AS 'ef_file_no',
                wth.file_no AS 'wth_file_no'
            FROM work_proc wp
            JOIN (
                ${waIdxQuery}
                ${size && skip ? `LIMIT 0, ${size + skip}` : ``}                
            ) waIdx
            ON wp.wp_idx = waIdx.wp_idx
            INNER JOIN work_tm wt
                ON wt.wp_idx = wp.wp_idx
            LEFT JOIN work_tm_history wth
                ON wth.wp_idx = wp.wp_idx
            INNER JOIN work_file wf
                ON wf.wp_idx = wp.wp_idx
            INNER JOIN edms_files ef
                ON ef.file_no = wf.file_no
                AND ef.is_use = 1
            INNER JOIN work_docu work_d
                ON work_d.wp_idx = wp.wp_idx
            INNER JOIN edms_document ed
                ON ed.docu_no = work_d.docu_no
                AND ed.docu_no = ef.docu_no
            INNER JOIN edms_category ecate
                ON ecate.cate_no = ed.cate_no
            INNER JOIN edms_discipline edisc
                ON edisc.id = ecate.discipline_id
            ORDER BY wt.tm_code ASC, discipline ASC;
        `);
        let result = [];
        for (var data of datas) {
            let delay_time =
                data.sended_tm && data.deploy_tm ? getDiffDateNetworkDays(data.sended_tm, data.deploy_tm) : "";
            if (delay_time != "" && delay_time < 0) delay_time = `(${delay_time})`;
            let revision = "";
            if (
                data.revision &&
                data.stage_name &&
                data.stage_name.indexOf("IFA") != -1 &&
                !isNaN(parseInt(data.revision))
            ) {
                revision = String.fromCharCode(parseInt(data.revision) + 64);
            }
            if (data.ef_file_no != data.wth_file_no) data.code = "";
            result.push({
                Discipline: data.discipline,
                issued_date: getDateValue(data.sended_tm, "YYYY. MM. DD"),
                tr_no: data.tm_code,
                docu_no: data.docu_code,
                revision: revision,
                description: data.docu_subject,
                due_date: getDateValue(data.due_date, "YYYY. MM. DD"),
                actual_date: getDateValue(data.deploy_tm, "YYYY. MM. DD"),
                delay_date: delay_time,
                result: data.code,
            });
        }

        return getSuccessResponse(res, result);
    } catch (err) {
        logger.error(req.path + " || " + err);
        console.log(err);
    }
    return getFailedResponse(res);
});

router.get("/get_official_list", async (req: Request, res: Response) => {
    getConnection().transaction(async tr => {
        try {
            let official_list: {
                wtou_idx: number;
                user_id: number;
                username: string;
                project_no: number;
                project_name: string;
                off_type: number;
                off_type_name: string;
                stage_type: number;
                stage_type_name: string;
                off_docu_type: number;
                off_docu_type_name: string;
            }[] = [];

            let project_type = await tr.getRepository(EdmsProjectType).find({ is_use: 1 });
            let user_list = await tr.getRepository(EdmsUser).find({ is_use: 1 });

            let edms_user_list = await tr.query(`
                SELECT 
                    eu.user_id AS id, 
                    eu.username, 
                    ec.id AS cid, 
                    ec.company_name AS company, 
                    eg.id AS gid, 
                    eg.group_name AS part, 
                    ep.id AS pid, 
                    ep.position_name AS position
                FROM edms_user eu
                INNER JOIN edms_company ec
                    ON ec.id = eu.company_id
                INNER JOIN edms_group eg
                    ON eg.id = eu.group_id
                INNER JOIN edms_position ep
                    ON ep.id = eu.position_id
                WHERE eu.is_use = 1 AND Not eu.level = 4
                ORDER BY cid, gid, pid DESC;  
            `);

            let official_user = await tr.getRepository(WorkTmOfficialUser).find({
                where: { is_use: 1 },
                order: { project_no: "DESC" },
            });

            for (var u of official_user) {
                official_list.push({
                    wtou_idx: u.wtou_idx,
                    user_id: u.user_id,
                    username:
                        user_list.find(raw => raw.user_id == u.user_id) != undefined
                            ? user_list.find(raw => raw.user_id == u.user_id).username
                            : "",
                    project_no: u.project_no,
                    project_name:
                        project_type.find(raw => raw.project_no == u.project_no) != undefined
                            ? project_type.find(raw => raw.project_no == u.project_no).project_name
                            : "",
                    off_type: u.off_type,
                    off_type_name: getOfficialType("off_type", u.off_type),
                    stage_type: u.stage_type_no,
                    stage_type_name: getOfficialType("stage_type", u.stage_type_no),
                    off_docu_type: u.off_docu_type,
                    off_docu_type_name: getOfficialType("off_docu_type", u.off_docu_type),
                });
            }

            return getSuccessResponse(res, { project_type, edms_user_list, official_list });
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.post("/create_official_user", async (req: Request, res: Response) => {
    const { user_id, project_no, off_type, stage_type_no, off_docu_type } = req.body;
    getConnection().transaction(async tr => {
        try {
            let user = await tr.getRepository(EdmsUser).findOne({
                user_id: req.app.get("edms_user_id"),
            });

            if (stage_type_no == "0" && stage_type_no == "-1") {
                let work_tm_official_user = await tr.getRepository(WorkTmOfficialUser).find({
                    where: {
                        user_id: user_id,
                        is_use: 1,
                        project_no: project_no,
                        off_type: off_type,
                        off_docu_type: off_docu_type,
                    },
                });

                if (work_tm_official_user.length > 0) {
                    await tr
                        .createQueryBuilder()
                        .update(WorkTmOfficialUser)
                        .set({ modify_by: user.username, is_use: 0 })
                        .where("wtou_idx IN (:ids)", { ids: work_tm_official_user.map(raw => raw.wtou_idx) })
                        .execute();
                }
            }

            let newOfficialUser = new WorkTmOfficialUser();

            newOfficialUser.user_id = user_id;
            newOfficialUser.is_use = 1;
            newOfficialUser.project_no = project_no;
            newOfficialUser.off_type = off_type;
            newOfficialUser.stage_type_no = stage_type_no != -1 ? stage_type_no : 0;
            newOfficialUser.off_docu_type = off_docu_type;
            newOfficialUser.create_by = user.username;

            let insertOfficialUser = await tr.getRepository(WorkTmOfficialUser).save(newOfficialUser);

            return getSuccessResponse(res, insertOfficialUser);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.post("/delete_official_user", async (req: Request, res: Response) => {
    const { wtou_idx } = req.body;
    getConnection().transaction(async tr => {
        try {
            let user = await tr.getRepository(EdmsUser).findOne({
                user_id: req.app.get("edms_user_id"),
            });

            let delete_user = await tr
                .createQueryBuilder()
                .update(WorkTmOfficialUser)
                .set({ modify_by: user.username, is_use: 0 })
                .where("wtou_idx = :id", { id: wtou_idx })
                .execute();

            return getSuccessResponse(res, delete_user);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

export default router;
