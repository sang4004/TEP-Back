/******************************************************************************
 * entity :
 * DIN
 * DRN work api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, Not, Repository, IsNull, In } from "typeorm";
import {
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    WorkDocu,
    WorkAttach,
    WorkReview,
    EdmsUser,
    WorkAssign,
    EdmsPosition,
    EdmsCompany,
    WorkFile,
    WorkTm,
} from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { getMoment } from "@/lib/utils";
import { edmsFileDir, edmsUploadFolder } from "../../../../../../constant";

const router = express.Router();

const getWorkCode = (type: any, last_number: number) => {
    return `${type}${getMoment(new Date()).format("YYYYMMDD")}-${last_number}`;
};

router.post("/create_drn_comment", async (req: Request, res: Response) => {
    const { wp_idx, review_owner, contents, create_by, reviewer_id, code, page_sheet_no, is_changed_design, files } =
        req.body;
    try {
        let drn = await getRepository(WorkProc).findOne({ wp_idx });
        if (drn == undefined) throw "DRN not found";
        let work_docu = await getRepository(WorkDocu).findOne({ wp_idx: drn.wp_idx });
        let file = await getRepository(EdmsFiles).findOne({
            docu_no: work_docu.docu_no,
            is_last_version: "Y",
            is_use: 1,
        });
        if (file == undefined) throw "File not found";
        let newWR = new WorkReview();

        newWR.wp_idx = wp_idx;
        newWR.review_owner = review_owner;
        newWR.contents = contents;
        newWR.reply = "";
        newWR.reviewer_id = reviewer_id;
        newWR.create_by = create_by;
        newWR.create_tm = new Date();
        newWR.review_date = new Date();
        newWR.code = code;
        newWR.docu_no = work_docu.docu_no;
        newWR.file_no = file.file_no;
        newWR.page_sheet_no = page_sheet_no ? page_sheet_no : "";
        newWR.is_change_design = is_changed_design ? "Y" : "N";
        newWR.revision = file.revision;

        let insertWR = await getRepository(WorkReview).save(newWR);

        for (var f of files) {
            let new_attach = new WorkAttach();
            new_attach.wp_idx = wp_idx;
            new_attach.create_by = create_by;
            new_attach.file_name = f.originalname;
            new_attach.file_path = edmsFileDir + f.filename;
            new_attach.repo_path = edmsUploadFolder + f.filename;
            new_attach.wr_idx = newWR.wr_idx;
            new_attach.flag = 1;
            await getRepository(WorkAttach).save(new_attach);
        }

        // 하나의 코멘트만 써도 drn 에 tm_state를 변경
        await getConnection()
            .createQueryBuilder()
            .update(WorkProc)
            .set({ tm_state: 8 })
            .where("wp_idx=:id", { id: drn.wp_idx })
            .execute();

        return getSuccessResponse(res, {
            insert_workreview: {
                ...insertWR,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// wr_idx : work review table
// 1. 답변 reply 기능
router.post("/create_drn_reply", async (req: Request, res: Response) => {
    const { wr_idx, reply, attach_files } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        if (user_id != undefined) {
            let user = await getRepository(EdmsUser).findOne({ user_id, is_use: 1 });
            let review = await getRepository(WorkReview).findOne({ wr_idx });
            if (review) {
                await getConnection()
                    .createQueryBuilder()
                    .update(WorkReview)
                    .set({
                        reply: reply,
                        is_reply: 1,
                    })
                    .where("wr_idx = :id", { id: wr_idx })
                    .execute();

                for (var attach of attach_files) {
                    let new_attach = new WorkAttach();
                    new_attach.wp_idx = review.wp_idx;
                    new_attach.wr_idx = review.wr_idx;
                    new_attach.create_by = user.username;
                    new_attach.create_tm = new Date();
                    new_attach.file_name = attach.originalname;
                    new_attach.file_path = edmsFileDir + attach.filename;
                    new_attach.repo_path = edmsUploadFolder + attach.filename;
                    new_attach.flag = 2;
                    await getRepository(WorkAttach).save(new_attach);
                }
                return getSuccessResponse(res, true);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/drn_comment_list", async (req: Request, res: Response) => {
    const { wp_idx } = req.query;
    const user_id = req.app.get("edms_user_id");
    try {
        let _user = await getRepository(EdmsUser).findOne({ user_id, is_use: 1 });

        let _wp_idx = typeof wp_idx == "string" ? parseInt(wp_idx) : typeof wp_idx == "number" ? wp_idx : 0;
        let work_proc = await getRepository(WorkProc).findOne({ wp_idx: _wp_idx });
        let tm_wp_idx: number;

        if (work_proc && work_proc.wp_type.toLocaleLowerCase() == "drn") {
            let original_tm = await getRepository(WorkProc).findOne({ wp_idx: work_proc.original_tm_id });
            if (original_tm) tm_wp_idx = original_tm.wp_idx;
        } else {
            tm_wp_idx = _wp_idx;
        }

        let work_docu = await getRepository(WorkDocu).findOne({ wp_idx: tm_wp_idx });

        let final_list: {
            wr_idx: number;
            wr_auth: number;
            docu_no: number;
            reviewer_id: number;
            review_date: Date;
            contents: string;
            create_by: string;
            position_name: string;
            company_id: number;
            company_name: string;
            assign_stage: string;
            reply: string;
            page_sheet_no: string;
            file_data: any[];
            code: string;
            is_reply: number;
        }[] = [];

        let all_user = await getRepository(EdmsUser).find({ is_use: 1 });
        let all_position = await getRepository(EdmsPosition).find({ is_delete: false });
        let all_company = await getRepository(EdmsCompany).find({ is_delete: false });
        let all_files = await getRepository(WorkAttach).find();
        let wp_idx_list = [_wp_idx];
        // 회신시에는 기존의 origin 을 찾아옴
        let drn_list = await getRepository(WorkProc).find({ original_tm_id: work_proc.original_tm_id });
        if (drn_list.length > 0) {
            let drn_docu_list = await getRepository(WorkDocu).find({ wp_idx: In(drn_list.map(raw => raw.wp_idx)) });
            let find_drn = drn_docu_list.find(raw => raw.docu_no == work_docu.docu_no);
            if (find_drn) {
                wp_idx_list.push(find_drn.wp_idx);
            }
        }
        //
        let review = await getRepository(WorkReview).find({
            where: { wp_idx: In(wp_idx_list) },
            order: { wr_idx: "ASC" },
        });

        for (var r of review) {
            final_list.push({
                wr_idx: r.wr_idx,
                wr_auth: 0,
                docu_no: r.docu_no,
                reviewer_id: r.reviewer_id,
                review_date: r.create_tm,
                contents: r.contents,
                create_by: r.create_by,
                reply: r.reply,
                page_sheet_no: r.page_sheet_no != null ? r.page_sheet_no : "-",
                code: r.code == 0 ? "-" : "code" + r.code,
                position_name: "",
                company_id: 0,
                company_name: "",
                assign_stage: "",
                file_data: [],
                is_reply: r.is_reply,
            });
        }

        for (var d of final_list) {
            //유저 찾기
            let user = all_user.filter(raw => raw.user_id == d.reviewer_id);
            let position_id = user.map(raw => raw.position_id);
            let company_id = user.map(raw => raw.company_id);

            // 직급 찾기
            let position = all_position.filter(raw => raw.id == position_id[0]);
            let position_name = position.map(raw => raw.position_name);

            // 회사 찾기
            let company = all_company.filter(raw => raw.id == company_id[0]);
            let company_name = company.map(raw => raw.company_name);

            // 리뷰 대상자 확인
            let _auth = _user.group_id == company_id[0] ? 0 : 1;

            d.wr_auth = _auth;
            d.position_name = position_name[0];
            d.company_id = company_id[0];
            d.company_name = company_name[0];

            //파일 찾기
            let files = all_files.filter(raw => raw.wp_idx == _wp_idx && d.wr_idx == raw.wr_idx);
            if (files.length > 0) {
                for (var f of files) {
                    d.file_data.push([f.file_name, f.file_path]);
                }
            }
        }
        return getSuccessResponse(res, final_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/update_drn_approval", async (req: Request, res: Response) => {
    const { wp_idx, is_approval } = req.body;
    try {
        await getConnection()
            .createQueryBuilder()
            .update(WorkProc)
            .set({ is_approval: is_approval })
            .where({ wp_idx: wp_idx })
            .execute();
        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/create_tm_drn", async (req: Request, res: Response) => {
    const { wp_date, explan, due_date, create_by, file_list, approval_users, tm_wp_idx, relay } = req.body;
    try {
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");
            let insertProc: any;
            let user = await getRepository(EdmsUser).findOne({ user_id: req.app.get("edms_user_id"), is_use: 1 });
            //사전에 필요한 데이터 로드
            let AllFile = await getRepository(EdmsFiles).find({
                file_no: In([...file_list.map(raw => raw.file_no)]),
                is_use: 1,
            });
            let AllDocu = await getRepository(EdmsDocument).find({
                docu_no: In([...file_list.map(raw => raw.docu_no)]),
                is_use: 1,
            });
            let tm_work_proc = await getRepository(WorkProc).findOne({
                where: {
                    wp_idx: tm_wp_idx,
                    wp_type: "TM",
                },
            });

            let work_tm_data = await getRepository(WorkTm).findOne({ wp_idx: tm_wp_idx });

            // 수신자 만큼 DRN 생성
            for (var approver of approval_users) {
                // 워크 생성
                let newProc = new WorkProc();
                newProc.wp_type = "DRN";
                newProc.wp_date = wp_date;
                newProc.wp_code = "DRN-" + tm_work_proc.wp_code;
                newProc.project_no = tm_work_proc.project_no;
                newProc.series_no = tm_work_proc.series_no;
                newProc.account_ym = tm_work_proc.account_ym;
                newProc.subject = relay;
                newProc.explan = explan;
                newProc.requester_id = user_id;
                newProc.approver_id = approver;
                newProc.due_date = due_date;
                newProc.create_by = create_by;
                newProc.create_tm = new Date();
                newProc.user_id = user_id;
                newProc.original_tm_id = tm_work_proc.wp_idx;
                insertProc = await getRepository(WorkProc).save(newProc);
                //

                let cate_list = [];
                // 결재 테이블에 본인은 담당자로서 추가
                let newAssign = new WorkAssign();
                newAssign.wp_idx = insertProc.wp_idx;
                newAssign.is_approval = false;
                newAssign.approval_order = 0;
                newAssign.is_last_approve = false;
                newAssign.assign_from_id = user_id;
                newAssign.assign_to_id = user_id;
                newAssign.assign_state = 1;
                newAssign.create_by = req.body.create_by;
                newAssign.create_tm = new Date();
                await getRepository(WorkAssign).save(newAssign);
                //

                let _count = 0;
                // work file 생성
                for (var info of file_list) {
                    let newFile = new WorkFile();

                    newFile.wp_idx = insertProc.wp_idx;
                    newFile.file_no = info.file_no;
                    newFile.docu_no = info.docu_no;
                    newFile.create_by = create_by;
                    newFile.create_tm = new Date();
                    newFile.user_id = user_id;

                    getRepository(WorkFile).save(newFile);

                    let edmsFile = AllFile.filter((obj: any) => obj.file_no == info.file_no)[0];
                    if (cate_list.indexOf(edmsFile.cate_no) == -1) cate_list.push(edmsFile.cate_no);
                }
                //

                let new_approval_users = [];
                _count = 1;
                // 결재자 work assign 생성
                let new_approval = new WorkAssign();
                new_approval.approval_order = _count;
                new_approval.assign_from_id = user_id;
                new_approval.assign_to_id = approver;
                new_approval.create_by = create_by;
                new_approval.due_to_date = due_date;
                new_approval.wp_idx = insertProc.wp_idx;
                new_approval.assign_state = 2;
                new_approval.is_last_approve = _count == approval_users.length - 1;
                new_approval.is_approval = false;
                _count++;
                new_approval_users.push(new_approval);
                await getRepository(WorkAssign).save(new_approval);
                //

                // work_docu 생성
                for (let docu of AllDocu) {
                    let newWDocu = new WorkDocu();
                    newWDocu.user_id = user_id;
                    newWDocu.create_by = create_by;
                    newWDocu.wp_idx = insertProc.wp_idx;
                    newWDocu.docu_no = docu.docu_no;
                    newWDocu.is_use = 1;
                    await getRepository(WorkDocu).save(newWDocu);
                }

                //work file 생성
                let new_work_file_list = [];
                for (var info of file_list) {
                    let newFile = new WorkFile();

                    newFile.wp_idx = insertProc.wp_idx;
                    newFile.file_no = info.file_no;
                    newFile.docu_no = info.docu_no;
                    newFile.create_by = user.username;
                    newFile.create_tm = new Date();
                    newFile.user_id = user_id;

                    new_work_file_list.push(newFile);
                }
                await getRepository(WorkFile).save(new_work_file_list);
            }

            return getSuccessResponse(res, {
                insert_work: {
                    ...insertProc,
                },
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
