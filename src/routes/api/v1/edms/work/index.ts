/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * Work..
 * 배포 관련 api
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { createQueryBuilder, getConnection, getRepository, In, Not } from "typeorm";
import moment from "moment";
////// router import
import tm, { update_tm_state, send_mail_tm, findAllWpIdxTm, create_review_excel } from "./tm";
import din from "./din";
import drn from "./drn";
import sendrecv from "./sendrecv";
import achieve from "./achieve";
import mydocument from "./mydocument";
import plant from "./plant";
//////////
import {
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    WorkDocu,
    WorkAttach,
    WorkTmpBox,
    WorkAssign,
    WorkSendRecvBox,
    WorkDeploy,
    EdmsStage,
    WorkReview,
    EdmsAuthority,
    EdmsUser,
    WorkFile,
    WorkTm,
    EdmsDiscipline,
    EdmsProjectType,
    WorkTmCode,
    EdmsCompany,
    WorkMail,
    WorkTmHistory,
    EdmsGroup,
    EdmsMailGroup,
    EdmsDelBox,
} from "@/entity";
import { getFailedResponse, getSuccessResponse, LANGUAGE_PACK } from "@/lib/format";
import { zipFolders, getMoment, getFileTypeName, getDiffDate, getProjectNo } from "@/lib/utils";
import { getDefaultStages } from "@/routes/api/v1/edms/utils";
import { edmsFileDir, edmsUploadFolder } from "@/constant";
import { GetAuthority } from "@/lib/getauthority";
import { logger } from "@/lib/winston";
import {
    get_proc_state_text,
    update_assign_state,
    GetDocumentManager,
    getWorkCode,
    tm_update_assign_state,
    send_recv_box_update,
} from "./utils";
import { sendMail } from "@/lib/mailer";

const isLive = process.env.NODE_ENV == "live";

const router = express.Router();

router.post("/create_work_proc_din", async (req: Request, res: Response) => {
    try {
        const {
            wp_date,
            project_no,
            series_no,
            account_ym,
            subject,
            explan,
            approver_id,
            due_date,
            create_by,
            file_list,
            same_work_count,
            approval_users,
            approverId,
        } = req.body;
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");

            // 워크 생성
            let newProc = new WorkProc();

            newProc.wp_type = "DIN";
            newProc.wp_date = wp_date;
            newProc.wp_code = getWorkCode("DIN", same_work_count);
            newProc.project_no = project_no;
            newProc.series_no = series_no;
            newProc.account_ym = account_ym;
            newProc.subject = subject;
            newProc.explan = explan;
            newProc.requester_id = user_id;
            newProc.approver_id = approver_id;
            newProc.due_date = due_date;
            newProc.create_by = create_by;
            newProc.create_tm = new Date();
            newProc.user_id = user_id;

            let insertProc = await getRepository(WorkProc).save(newProc);

            // 사전에 필요한 데이터 로드
            let AllFile = await getRepository(EdmsFiles).find({
                file_no: In([...file_list.map(raw => raw.file_no)]),
                is_use: 1,
            });

            let AllDocu = await getRepository(EdmsDocument).find({
                docu_no: In([...AllFile.map(raw => raw.docu_no)]),
                is_use: 1,
            });

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

            // 등록된 document 담당자 Assign에 추가
            let new_approval_users = [];
            let _count = 0;

            // DIN 권한 없는 파일에 대한 권한 요청시 사용할 예정
            if (approverId.length != 0) {
                for (let id of approverId) {
                    let new_approval = new WorkAssign();

                    new_approval.approval_order = _count;
                    new_approval.assign_from_id = user_id;
                    new_approval.assign_to_id = id;
                    new_approval.create_by = create_by;
                    new_approval.due_to_date = due_date;
                    new_approval.wp_idx = insertProc.wp_idx;
                    new_approval.assign_state = 2;
                    new_approval.is_last_approve = _count == approverId.length - 1;
                    new_approval_users.push(new_approval);
                    _count++;

                    await getRepository(WorkAssign).save(new_approval);
                }
            } else {
                // DIN 권한 부여
                for (let id of approval_users) {
                    let new_approval = new WorkAssign();

                    new_approval.approval_order = _count;
                    new_approval.assign_from_id = user_id;
                    new_approval.assign_to_id = id;
                    new_approval.create_by = create_by;
                    new_approval.due_to_date = due_date;
                    new_approval.wp_idx = insertProc.wp_idx;
                    new_approval.assign_state = 3;
                    new_approval.is_last_approve = _count == approval_users.length - 1;
                    new_approval.is_approval = false;
                    new_approval_users.push(new_approval);
                    _count++;

                    await getRepository(WorkAssign).save(new_approval);

                    // 수신, 발신 확인 데이터 생성
                    let newSendRecvBox = new WorkSendRecvBox();

                    newSendRecvBox.create_by = create_by;
                    newSendRecvBox.wp_idx = insertProc.wp_idx;
                    newSendRecvBox.work_code = insertProc.wp_code;
                    newSendRecvBox.sender = user_id;
                    newSendRecvBox.recver = id;
                    newSendRecvBox.user_id = user_id;

                    await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                    //
                }
            }
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

            // work file 및 결재라인 설정
            if (file_list != undefined) {
                let cate_list = [];

                for (var info of file_list) {
                    let newFile = new WorkFile();

                    newFile.wp_idx = insertProc.wp_idx;
                    newFile.file_no = info.file_no;
                    newFile.docu_no = info.docu_no;
                    newFile.create_by = create_by;
                    newFile.create_tm = new Date();
                    newFile.user_id = user_id;

                    await getRepository(WorkFile).save(newFile);

                    let edmsFile = AllFile.filter((obj: any) => obj.docu_no == info.docu_no)[0];
                    if (cate_list.indexOf(edmsFile.cate_no) == -1) cate_list.push(edmsFile.cate_no);
                }
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

router.post("/create_work_proc_drn", async (req: Request, res: Response) => {
    try {
        const {
            wp_date,
            project_no,
            series_no,
            account_ym,
            subject,
            explan,
            approver_id,
            due_date,
            create_by,
            file_list,
            approval_users,
            same_work_count,
            tm_wp_idx,
        } = req.body;
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");

            // 워크 생성
            let newProc = new WorkProc();

            newProc.wp_type = "DRN";
            newProc.wp_date = wp_date;
            newProc.wp_code = getWorkCode("DRN", same_work_count);
            newProc.project_no = project_no;
            newProc.series_no = series_no;
            newProc.account_ym = account_ym;
            newProc.subject = subject;
            newProc.explan = explan;
            newProc.requester_id = user_id;
            newProc.approver_id = approver_id;
            newProc.due_date = due_date;
            newProc.create_by = create_by;
            newProc.create_tm = new Date();
            newProc.user_id = user_id;
            if (tm_wp_idx) newProc.original_tm_id = parseInt(tm_wp_idx);

            let insertProc = await getRepository(WorkProc).save(newProc);
            //

            //사전에 필요한 데이터 로드
            let AllFile = await getRepository(EdmsFiles).find({
                file_no: In([...file_list.map(raw => raw.file_no)]),
                is_use: 1,
            });

            let AllDocu = await getRepository(EdmsDocument).find({
                docu_no: In([...file_list.map(raw => raw.docu_no)]),
                is_use: 1,
            });
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
            // work file 및 결재라인 설정
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
            // work assign 선택한 결재자들 넣어주기
            for (var approver of approval_users) {
                // 결재 라인 생성
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

                // 수신, 발신 확인 데이터 생성
                let newSendRecvBox = new WorkSendRecvBox();

                newSendRecvBox.create_by = create_by;
                newSendRecvBox.wp_idx = insertProc.wp_idx;
                newSendRecvBox.work_code = insertProc.wp_code;
                newSendRecvBox.sender = user_id;
                newSendRecvBox.recver = approver;
                newSendRecvBox.user_id = user_id;

                await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                //
            }

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

            // work file 및 결재라인 설정
            if (file_list != undefined) {
                for (var info of file_list) {
                    let newFile = new WorkFile();

                    newFile.wp_idx = insertProc.wp_idx;
                    newFile.file_no = info.file_no;
                    newFile.docu_no = info.docu_no;
                    newFile.create_by = create_by;
                    newFile.create_tm = new Date();
                    newFile.user_id = user_id;

                    await getRepository(WorkFile).save(newFile);
                }
            }
            // 배포 알림 메일 발송
            await send_mail_for_drn([{ user_id: approver_id, subject: insertProc.subject, wp_idx: insertProc.wp_idx }]);

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

const update_file_stage_code = async (file_list: EdmsFiles[]) => {
    let update_file_no = [...file_list.filter(raw => raw.stage_code.indexOf("Start") != -1).map(raw => raw.file_no)];
    if (update_file_no.length > 0)
        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ stage_code: "IFA Issue" })
            .where(`file_no IN (${update_file_no})`)
            .execute();
};

router.post("/create_work_proc_tm", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    const user = await getRepository(EdmsUser).findOne({
        user_id: user_id,
        is_use: 1,
    });
    try {
        const {
            wp_date,
            project_no,
            series_no,
            account_ym,
            subject,
            explan,
            approver_id,
            due_date,
            create_by,
            docu_list,
            same_work_count,
            tm_no,
            approver_list,
            file_list,
            recvCompanyTmId,
            stage_type_no,
            referenceIdList,
            emailIdList,
            exFileList,
            forType, // Issue For What
        } = req.body;

        if (user_id != null) {
            await getConnection().transaction(async tr => {
                let document_list: number[] = JSON.parse(docu_list).map(raw => parseInt(raw));
                let cc_company: number[] = JSON.parse(referenceIdList);
                let tm_company: any[] = [];
                let cc_comp_id = -1;

                if (cc_company.length > 0 && cc_company) {
                    let work_tm_code = await getRepository(WorkTmCode).find();

                    for (let cc of cc_company) {
                        cc_comp_id = cc;
                        let cc_tm_code = work_tm_code.filter(tmCode => tmCode.company_id == cc);
                        let exist_cc_tm_code = cc_tm_code.find(ccTmCode => ccTmCode.project_no == project_no);
                        if (exist_cc_tm_code) {
                            tm_company.push(exist_cc_tm_code);
                        } else {
                            tm_company.push(cc_tm_code.find(ccTmCode => ccTmCode.project_no == -1));
                        }
                    }
                }
                //#region 사전에 필요한 데이터 로드
                let DisciplineData = await getRepository(EdmsDiscipline).findOne({
                    project_no: project_no,
                    is_use: 1,
                });
                let ProjectTypeNo = await getRepository(EdmsProjectType).findOne({
                    project_no: project_no,
                    is_use: 1,
                });
                //#endregion

                // 워크 생성
                let newProc = new WorkProc();

                newProc.wp_type = "TM";
                newProc.wp_date = JSON.parse(wp_date);
                newProc.wp_code = tm_no;
                newProc.project_no = project_no;
                newProc.series_no = series_no;
                newProc.account_ym = account_ym;
                newProc.subject = subject;
                newProc.explan = explan;
                newProc.requester_id = user.user_id;
                newProc.approver_id = recvCompanyTmId;
                newProc.due_date = JSON.parse(due_date);
                newProc.create_by = user.username;
                newProc.create_tm = new Date();
                newProc.user_id = user.user_id;
                newProc.tm_state = 2;
                newProc.stage_type_id = stage_type_no;
                newProc.for_type = forType ? forType : 0;

                let insertProc = await getRepository(WorkProc).save(newProc);

                // work_tm 생성
                let newWorkTm = new WorkTm();

                newWorkTm.user_id = user.user_id;
                newWorkTm.create_by = create_by;
                newWorkTm.project_type_no = ProjectTypeNo.project_no;
                newWorkTm.discipline_id = DisciplineData.id;
                newWorkTm.tm_code = tm_no;
                newWorkTm.cc_company_id = cc_comp_id; // 참조처
                newWorkTm.send_company_id = user.company_id; // 발신처
                newWorkTm.wp_idx = insertProc.wp_idx;

                await getRepository(WorkTm).save(newWorkTm);
                //
                //
                // 리뷰 코멘트 엑셀 파일 업로드 기능
                let newReviewList = await create_review_excel(user_id, JSON.parse(exFileList), insertProc.wp_idx, true);

                let reviewDocus =
                    newReviewList && newReviewList.length > 0 ? newReviewList.map(raw => raw.docu_no) : [];
                //
                //사전에 필요한 데이터 로드
                document_list = [...document_list, ...reviewDocus];

                let AllFile = await getRepository(EdmsFiles).find({
                    docu_no: In(document_list),
                    is_last_version: "Y",
                    is_use: 1,
                });

                let AllDocu = await getRepository(EdmsDocument).find({
                    docu_no: In(document_list),
                    is_use: 1,
                });
                //
                // 발신처, 수신처 TM 담당자 ID 리스트 생성
                let manager_id_list: any[] = [];
                manager_id_list.push(user.user_id);
                manager_id_list.push(approver_id);

                // 기안, 수신자, TM 재회신 WorkAssign 생성
                for (let i = 0; i < manager_id_list.length + 1; i++) {
                    let newAssign = new WorkAssign();

                    newAssign.wp_idx = insertProc.wp_idx;
                    newAssign.approval_order = 0;
                    // i 0: 기안 생성, 1: 수신자 생성, 2: TM 재회신
                    // assign_state 1: 기안자, 6: 결재대기
                    if (i == 0) {
                        newAssign.assign_from_id = user.user_id;
                        newAssign.assign_to_id = user.user_id;
                        newAssign.assign_state = 1;

                        // 수신, 발신 확인 데이터 생성
                        let newSendRecvBox = new WorkSendRecvBox();

                        newSendRecvBox.create_by = user.username;
                        newSendRecvBox.wp_idx = insertProc.wp_idx;
                        newSendRecvBox.work_code = insertProc.wp_code;
                        newSendRecvBox.sender = user.user_id;
                        newSendRecvBox.recver = parseInt(manager_id_list[1]);
                        newSendRecvBox.user_id = user.user_id;
                        newSendRecvBox.is_use = 0;

                        await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                        //
                    } else if (i == 1) {
                        newAssign.assign_from_id = user.user_id;
                        newAssign.assign_to_id = parseInt(manager_id_list[1]);
                        newAssign.is_use = 0;
                        newAssign.assign_state = 2;
                    } else if (i == 2) {
                        newAssign.assign_from_id = parseInt(manager_id_list[1]);
                        newAssign.assign_to_id = user.user_id;
                        newAssign.is_use = 0;
                        newAssign.assign_state = 2;
                    }
                    newAssign.is_approval = false;
                    newAssign.is_last_approve = false;
                    newAssign.due_to_date = JSON.parse(due_date);
                    newAssign.create_by = create_by;
                    newAssign.create_tm = new Date();

                    await getRepository(WorkAssign).save(newAssign);
                }
                //

                let approver_id_list = JSON.parse(approver_list);

                // TM 결재자 생성
                for (let i = 0; i < approver_id_list.length; i++) {
                    // assign_state 2: 대기
                    // 결재 라인 생성
                    let newAssign = new WorkAssign();

                    newAssign.approval_order = i + 1;
                    newAssign.assign_from_id = user.user_id;
                    newAssign.assign_to_id = approver_id_list[i];
                    newAssign.create_by = create_by;
                    newAssign.due_to_date = JSON.parse(due_date);
                    newAssign.wp_idx = insertProc.wp_idx;
                    newAssign.assign_state = 2;
                    newAssign.is_approval = false;
                    if (i == approver_id_list.length - 1) newAssign.is_last_approve = true;
                    else newAssign.is_last_approve = false;

                    //
                    await getRepository(WorkAssign).save(newAssign);

                    // 수신, 발신 확인 데이터 생성
                    let newSendRecvBox = new WorkSendRecvBox();

                    newSendRecvBox.create_by = user.username;
                    newSendRecvBox.wp_idx = insertProc.wp_idx;
                    newSendRecvBox.work_code = insertProc.wp_code;
                    newSendRecvBox.sender = user.user_id;
                    newSendRecvBox.recver = approver_id_list[i];
                    newSendRecvBox.user_id = user.user_id;

                    await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                    //
                }

                // 참조회사 선택 시
                if (tm_company.length > 0) {
                    for (var c of tm_company) {
                        let newAssign = new WorkAssign();

                        newAssign.wp_idx = insertProc.wp_idx;
                        newAssign.approval_order = 0;
                        newAssign.assign_from_id = user.user_id;
                        newAssign.assign_to_id = c.tm_user_id;
                        newAssign.assign_state = 2;
                        newAssign.is_approval = false;
                        newAssign.is_last_approve = false;
                        newAssign.due_to_date = JSON.parse(due_date);
                        newAssign.create_by = create_by;
                        newAssign.create_tm = new Date();
                        newAssign.is_cc = 1;

                        await getRepository(WorkAssign).save(newAssign);

                        // 수신, 발신 확인 데이터 생성
                        let newSendRecvBox = new WorkSendRecvBox();

                        newSendRecvBox.create_by = user.username;
                        newSendRecvBox.wp_idx = insertProc.wp_idx;
                        newSendRecvBox.work_code = insertProc.wp_code;
                        newSendRecvBox.sender = user.user_id;
                        newSendRecvBox.recver = c.tm_user_id;
                        newSendRecvBox.user_id = user.user_id;
                        newSendRecvBox.is_use = 0;

                        await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                        //
                    }
                }
                // work file 및 결재라인 설정
                for (let i = 0; i < AllFile.length; i++) {
                    let newFile = new WorkFile();

                    newFile.wp_idx = insertProc.wp_idx;
                    newFile.file_no = AllFile[i].file_no;
                    newFile.docu_no = AllFile[i].docu_no;
                    newFile.create_by = create_by;
                    newFile.create_tm = new Date();
                    newFile.user_id = user.user_id;

                    await getRepository(WorkFile).save(newFile);
                }
                //
                // 해당하는 파일들에 wp_idx 넣어주기
                if (AllFile.length > 0) {
                    await getConnection()
                        .createQueryBuilder()
                        .update(EdmsFiles)
                        .set({ wp_idx: insertProc.wp_idx })
                        .where(`file_no IN (${AllFile.map(raw => raw.file_no).join(",")})`)
                        .execute();
                }
                //

                // 첨부파일 있을시 work_attach에 저장
                if (req.files.length != 0) {
                    for (var file_key of Object.keys(req.files)) {
                        let new_attach = new WorkAttach();

                        new_attach.wp_idx = insertProc.wp_idx;
                        new_attach.create_by = user.username;
                        new_attach.create_tm = new Date();
                        new_attach.file_name = req.files[file_key].originalname;
                        new_attach.file_path = edmsFileDir + req.files[file_key].filename;
                        new_attach.repo_path = edmsUploadFolder + req.files[file_key].filename;

                        await getRepository(WorkAttach).save(new_attach);
                    }
                }

                // work_docu 생성
                for (let docu of AllDocu) {
                    let newWDocu = new WorkDocu();

                    newWDocu.user_id = user.user_id;
                    newWDocu.create_by = create_by;
                    newWDocu.wp_idx = insertProc.wp_idx;
                    newWDocu.docu_no = docu.docu_no;
                    newWDocu.is_use = 1;

                    await getRepository(WorkDocu).save(newWDocu);
                }
                //
                // EdmsFiles Start 스테이지일 경우 IFA 단계로 업데이트
                // await update_file_stage_code(AllFile);

                //메일 전송할 유저 선택 후 저장
                if (emailIdList != undefined && typeof emailIdList == "string") {
                    let _emailIdList = JSON.parse(emailIdList);
                    let emails = [];
                    if (Array.isArray(_emailIdList)) {
                        // 자기자신도 메일 발송포함
                        _emailIdList.push(user.user_id);
                        for (let id of _emailIdList) {
                            let newMail = new WorkMail();

                            newMail.wp_idx = insertProc.wp_idx;
                            newMail.user_id = id;
                            newMail.create_by = create_by;
                            emails.push(newMail);
                        }
                        await getRepository(WorkMail).save(emails);
                    }
                }

                // 결재자에게 메일 송신
                let next_approver = await getRepository(EdmsUser).findOne({ user_id: approver_id_list[0] });
                if (next_approver)
                    sendMail(
                        next_approver.email,
                        `<${tm_no}> ${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_TITLE.kor}`,
                        `${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/workproc/tm/${insertProc.wp_idx}">${LANGUAGE_PACK.EMAIL.SIGNATURE.SHORT_CUT.kor}</a>`
                    );

                return getSuccessResponse(res, {
                    insert_work: {
                        ...insertProc,
                    },
                    create_tm: {
                        ...newWorkTm,
                    },
                });
            });
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        return getFailedResponse(res);
    }
});

const DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
router.get("/get_work_proc_list", async (req: Request, res: Response) => {
    const { project_no, work_type_val, wp_type, is_fin, start_date, end_date, search_type, search_text } = req.query;
    const skip = req.query.skip ? parseInt(req.query.skip.toString()) : undefined;
    const size = req.query.size ? parseInt(req.query.size.toString()) : undefined;
    await getConnection().transaction(async tr => {
        try {
            if (req.app.get("edms_user_id") != null && typeof work_type_val == "string" && typeof wp_type == "string") {
                let isTm = wp_type.toLocaleUpperCase().indexOf("TM") != -1;
                let isDrn = wp_type.toLocaleUpperCase().indexOf("DRN") != -1;
                const user_id = req.app.get("edms_user_id");
                // 검색 조건
                let _project_no = "";
                let _is_fin = null;
                let searchType = -1; // 1 제목, 2 TR. No., 3 Document. No.(문서코드) 4 문서 제목
                let searchText = "";
                let endDate = moment().format(DATE_FORMAT);
                let tmp = moment();
                tmp.add(-1, "months");
                let startDate = tmp.format(DATE_FORMAT);

                if (project_no && typeof project_no == "string") {
                    _project_no = project_no;
                }
                if (is_fin && typeof is_fin == "string") {
                    _is_fin = parseInt(is_fin);
                }
                if (start_date && typeof start_date == "string") {
                    startDate = getMoment(start_date.replace(/\"/gi, "")).format(DATE_FORMAT);
                }
                if (end_date && typeof end_date == "string") {
                    endDate = getMoment(end_date.replace(/\"/gi, "")).format(DATE_FORMAT);
                }
                if (search_type && typeof search_type == "string") {
                    searchType = parseInt(search_type);
                }
                if (search_text && typeof search_text == "string") {
                    searchText = search_text != "" ? search_text : "";
                }
                //
                let assign_list: any[] = []; //  assign 되어있는 리스트
                let my_assign_list: WorkAssign[] = [];
                let approval_info_list: any[] = [];

                let list: any;
                let index_list: any[] = [];
                let is_tm_manager = await tr.getRepository(WorkTmCode).findOne({ tm_user_id: user_id });
                // tm일때 다르게 가져와야함
                let users = await tr.getRepository(EdmsUser).find({ is_use: 1 });
                let user = users.find(raw => raw.user_id == user_id);
                // 0614 무조건 프로젝트 번호로 필터링
                let _projects = await getProjectNo(user.company_id);
                // workassign 전체사람으로 전환
                const _assignToQuery = user.level == 1 || true ? `wa.assign_to_id > 0` : `wa.assign_to_id = ${user_id}`;
                const _assignFromQuery =
                    user.level == 1 || true ? `wa.assign_from_id > 0` : `wa.assign_from_id = ${user_id}`;

                let _projectQuery =
                    _projects && _projects.length > 0 ? `AND wp.project_no IN (${_projects.join(",")})` : ``;
                if (_project_no && _project_no != "-1") {
                    if (_projects.indexOf(parseInt(_project_no)) == -1) {
                        _projectQuery = `AND wp.project_no = -1`;
                    } else {
                        _projectQuery = `AND wp.project_no = ${_project_no}`;
                    }
                }

                let waIdxQuery = `
                    SELECT wa.wp_idx
                    FROM work_assign wa
                    INNER JOIN work_proc wp
                        ON wp.wp_idx = wa.wp_idx
                    ${
                        isTm && work_type_val != "1"
                            ? `
                        LEFT JOIN ( SELECT 
                                DISTINCT wp.original_tm_id
                            FROM work_proc wp
                            INNER JOIN work_assign wa
                                ON ${_assignToQuery}
                            WHERE wp.wp_type = 'DRN'
                                AND wp.original_tm_id != 0
                                AND wp.wp_idx = wa.wp_idx
                        ) drn ON drn.original_tm_id = wa.wp_idx`
                            : ``
                    }
                    LEFT JOIN work_docu wd
                    ${
                        isTm
                            ? `ON wp.wp_idx = wd.wp_idx`
                            : isDrn
                            ? `ON wd.wp_idx = wp.original_tm_id`
                            : `ON wp.wp_idx = wd.wp_idx`
                    }
                    ${
                        searchType == 3 && searchText != "" && searchText.length > 0 // Docu Code
                            ? `INNER JOIN edms_document ed
                                ON wd.docu_no = ed.docu_no
                                AND ed.docu_code like '%${searchText}%'`
                            : searchType == 4 && search_text != "" && searchText.length > 0 // Docu Subject
                            ? `INNER JOIN edms_document ed
                                ON wd.docu_no = ed.docu_no
                                AND ed.docu_subject like '%${searchText}%'`
                            : `LEFT JOIN edms_document ed 
                                ON wd.docu_no = ed.docu_no`
                    }
                    WHERE
                        wp.wp_type = '${wp_type.toUpperCase()}'
                        AND (
                            ( 
                                ${_assignFromQuery}
                                ${work_type_val != "1" ? `OR ${_assignToQuery}` : ``}
                            )
                            ${
                                isTm && work_type_val != "1"
                                    ? `OR
                            ( 
                                wa.wp_idx = drn.original_tm_id
                                AND wp.wp_type = 'TM'
                            )`
                                    : ``
                            }
                        )
                        ${_projectQuery}
                        ${_is_fin ? `AND wa.is_fin =  ${_is_fin}` : ``}
                        ${
                            startDate && endDate
                                ? `AND wa.create_tm > '${startDate}' AND wa.create_tm < '${endDate}'`
                                : ``
                        }
                        ${
                            searchType != -1 && searchText != "" && searchText.length > 0
                                ? searchType == 1
                                    ? `AND wp.subject like '%${searchText}%'` // 제목
                                    : searchType == 2 && isTm
                                    ? `AND wt.tm_code like '%${searchText}%'` // TM No
                                    : ``
                                : ``
                        }
                    GROUP BY wa.wp_idx
                    ORDER BY wa.wp_idx DESC
                    @limit
                `;
                let only_wp = await tr.query(waIdxQuery.replace("@limit", ""));
                if (size !== undefined && skip !== undefined) {
                    waIdxQuery = waIdxQuery.replace(
                        "@limit",
                        isLive
                            ? `OFFSET ${skip} ROW
                            FETCH NEXT ${size} ROW ONLY
                            `
                            : `LIMIT ${size} OFFSET ${skip}`
                    );
                }
                list = await tr.query(
                    `
                    SELECT 
                        wa.wp_idx,
                        wa.wa_idx,
                        wa.assign_date,
                        wa.is_approval,
                        wa.approval_order,
                        wa.is_last_approve,
                        wa.assign_from_id,
                        wa.assign_to_id,
                        wa.is_use,
                        wa.assign_state,
                        wa.is_cc,
                        wp.wp_type,
                        wp.wp_date,
                        wp.wp_code,
                        wp.requester_id,
                        wp.approver_id,
                        wp.due_date,
                        wp.original_tm_id,
                        wp.tm_state,
                        wp.subject,
                        wp.explan,
                        wa.create_tm,
                        wa.is_fin,
                        wa.comment as 'comment',
                        wp.project_no
                        ${isTm || isDrn ? `, wt.tm_code` : ``}
                    FROM work_proc wp
                    JOIN (
                        ${waIdxQuery}
                    ) waIdx
                    ON wp.wp_idx = waIdx.wp_idx
                    INNER JOIN work_assign wa
                        ON wa.wp_idx = wp.wp_idx
                    ${
                        isTm
                            ? `
                    INNER JOIN work_tm wt
                        ON wt.wp_idx = wp.wp_idx
                    `
                            : isDrn
                            ? `
                    LEFT JOIN work_tm wt
                        ON wt.wp_idx = wp.original_tm_id
                    `
                            : ``
                    }
                    ORDER BY wp.wp_idx DESC;
                `
                );
                // DRN 상위에있는 TR까지 리스트되도록

                let proc_list: any[] = [];
                if (list.length != 0) {
                    let work_proc_idx: number[] = list.map(raw => raw.wp_idx);
                    //
                    for (let l of list) {
                        let find_proc = proc_list.find(raw => raw.wp_idx == l.wp_idx);
                        // 결재 상태
                        let approvalState = find_proc ? find_proc.approvalState : 0;
                        if (l.assign_to_id == user_id && l.assign_state != "1" && l.approval_order != 0) {
                            approvalState = 1;
                        }

                        // 접수 및 배포 상태
                        let registerType = find_proc ? find_proc.registerType : 0;
                        if (
                            (l.assign_state == 8 || l.assign_state == 19) &&
                            l.requester_id != user_id &&
                            (l.assign_to_id == user_id || l.approver_id == user_id)
                        ) {
                            registerType = 1;
                        }
                        // 이전에 처리한거면 state 만 비교
                        if (find_proc != undefined) {
                            find_proc.approvalState = approvalState;
                            find_proc.registerType = registerType;
                            continue;
                        }
                        //
                        // assign_state == 2 결재전인 문서의 경우 수신처, 참조처는 못보도록 분기
                        if (l.assign_state == 2 && l.requester_id != user_id && l.is_approval == 0) {
                            continue;
                        }
                        //
                        let tm_state = parseInt(l.tm_state);
                        let wa_state = parseInt(l.assign_state);
                        let step = 0;
                        if (isTm) {
                            if (tm_state == 1) {
                                step = 0;
                            } else if (tm_state >= 2 && tm_state < 3) {
                                step = 1;
                            } else if (tm_state >= 3 && tm_state < 6) {
                                step = 2;
                            } else if (tm_state >= 6 && tm_state < 7) {
                                step = 3;
                            } else if (tm_state >= 7 && tm_state < 9) {
                                step = 4;
                            } else if (tm_state >= 9 && tm_state < 11) {
                                step = 5;
                            } else if (tm_state >= 11 && tm_state < 12) {
                                step = 6;
                            } else if (tm_state >= 12 && tm_state < 13) {
                                step = 6;
                            } else if (tm_state >= 13 && tm_state <= 14) {
                                step = 4;
                            }
                        } else if (isDrn) {
                            if (wa_state == 1) {
                                step = 1;
                            } else if (wa_state == 2) {
                                step = 2;
                                if (l.is_fin == 1) {
                                    step = 3;
                                }
                            }
                        }

                        Object.assign(l, { step: step, registerType, approvalState });
                        proc_list.push(l);
                        index_list.push(work_proc_idx.indexOf(l.wp_idx));
                    }
                    // wp_idx 리스트에 포함되는 모든 결재라인 가져오기
                    for (let l of index_list) {
                        // 1. wp_idx 매칭되는 work_proc 을 먼저 찾아온다.
                        let filtered = [];
                        let _wp_list = list
                            .filter(
                                (obj: any) =>
                                    obj.wp_idx == work_proc_idx[l] &&
                                    (obj.assign_to_id == user_id || obj.assign_from_id == user_id)
                            )
                            .sort((a, b) => b.assign_state - a.assign_state);
                        //
                        // 2. 우선 기안한사람 or 결재할 사람이 본인인 리스트로 정제
                        if (_wp_list.length > 0) {
                            // 2-1. 본인이 기안한 문서인경우 본인의 assign 사용
                            let is_own = _wp_list
                                .filter(raw => raw.assign_from_id == raw.assign_to_id)
                                .sort((a, b) => a.assign_state - b.assign_state);
                            if (is_own.length > 0) filtered = is_own;
                            else filtered = _wp_list;
                            //
                        } else {
                            // 3. DRN 으로 연결되어 들어온사람인경우 original_tm_id 로 찾아서 전체 assign 내려줌.
                            let original_wp_list = list
                                .filter(raw => raw.wp_idx == work_proc_idx[l] || raw.original_tm_id == work_proc_idx[l])
                                .sort((a, b) => b.assign_state - a.assign_state);
                            filtered = original_wp_list;
                            //
                        }
                        // 중복제거
                        let exist_wa_idx = [];
                        filtered = filtered.filter(raw => {
                            return exist_wa_idx.indexOf(raw.wa_idx) == -1 && exist_wa_idx.push(raw.wa_idx);
                        });
                        //
                        assign_list.push(filtered);
                        my_assign_list.push(_wp_list.find(obj => obj.approval_order > 0)); // 현재 나의 결재정보
                    }

                    for (var l of proc_list) {
                        let info = {};
                        let now_approver: any[] = [];
                        let last_approver: any[] = [];

                        let _assign_list = list.filter((obj: any) => obj.wp_idx == l.wp_idx && obj.is_use == 1);

                        // 최종결재자 가져오기
                        let lastAssign = _assign_list.find(
                            raw =>
                                raw.is_use == 1 &&
                                raw.is_last_approve == true &&
                                (raw.assign_state == 2 || raw.assign_state == 13) &&
                                raw.approval_order > 0
                        );
                        if (lastAssign != undefined) {
                            let last_approver_tmp = users.find(raw => raw.user_id == lastAssign.assign_to_id);

                            if (last_approver_tmp != undefined) {
                                last_approver.push({
                                    user_id: last_approver_tmp.user_id,
                                    username: last_approver_tmp.username,
                                });
                            }
                        }

                        // 현재결재자 가져오기
                        let nowAssign = _assign_list
                            .filter(
                                raw =>
                                    raw.is_approval == false &&
                                    raw.is_use == 1 &&
                                    (raw.assign_state == 2 || raw.assign_state == 13) && // 발신결재 : 2, 회신결재 : 13
                                    raw.approval_order > 0
                            )
                            .sort((a, b) => a.approval_order - b.approval_order);

                        if (nowAssign.length != 0) {
                            let now_approver_tmp = users.find(raw => raw.user_id == nowAssign[0].assign_to_id);

                            if (now_approver_tmp != undefined) {
                                now_approver.push({
                                    user_id: now_approver_tmp.user_id,
                                    username: now_approver_tmp.username,
                                });
                            }
                        } else {
                            now_approver = last_approver;
                        }
                        // 등록파일 가져오기
                        Object.assign(info, {
                            last_approver,
                            now_approver,
                        });
                        // 목록 문구 표시
                        let assign_text = "";
                        let assign = list.filter(raw => {
                            if (raw.wp_idx === l.wp_idx) {
                                if (
                                    (raw.requester_id === user_id && raw.assign_from_id == user_id) ||
                                    (raw.assign_to_id == user_id && parseInt(raw.assign_state) > 1)
                                ) {
                                    // 자기자신이 생성한 사람이면, assign_from_id 에 자기자신이 있는걸 가져와도됨.
                                    // 본인이 생성한게 아니라면, assign_state == 1 은 기안자만의 것이므로 빼고 가져와야함.
                                    return true;
                                }
                            }
                            return false;
                        });

                        let my_approval: any = undefined;
                        let _assign = assign[0];
                        // 참조처가 아닌 회사가 있다면, 참조처 꺼는 삭제.
                        // 반대로 참조처가 리스트를 본다면, 참조처는 리스트에 전체다 보면됨. ( 참조처는 상관없음)
                        if (assign.find(raw => raw.is_cc != undefined && raw.is_cc != 1)) {
                            assign = assign.filter(raw => !raw.is_cc);
                        } else if (assign.length != 0) {
                            my_approval = assign.find(
                                raw => raw.assign_to_id == raw.assign_from_id && raw.assign_state == 2
                            );
                        }

                        if (is_tm_manager && my_approval == undefined) {
                            assign_text = get_proc_state_text(
                                wp_type,
                                parseInt(l.tm_state),
                                parseInt(_assign ? _assign.assign_state : 0),
                                true,
                                l.approver_id == user_id,
                                _assign != undefined && _assign.is_cc == 1 ? true : false
                            );
                        } else if (is_tm_manager && my_approval != undefined) {
                            // 자신에게 결재 올릴 시
                            assign_text = get_proc_state_text(
                                wp_type,
                                parseInt(l.tm_state),
                                parseInt(my_approval.assign_state),
                                true,
                                true,
                                _assign != undefined && _assign.is_cc == 1 ? true : false
                            );
                        } else {
                            // LEGACY For Company :: 0614
                            if (_assign == undefined || _assign <= 0) {
                                _assign = list.find(raw => raw.wp_idx === l.wp_idx && parseInt(raw.assign_state) > 1);
                            }
                            assign_text = get_proc_state_text(
                                wp_type,
                                parseInt(l.tm_state),
                                _assign ? parseInt(_assign.assign_state) : 0, // assign_state 가없는, DRN으로 인해 나오는TR일경우 0
                                false,
                                now_approver.length > 0 && now_approver[0].user_id == user_id,
                                _assign != undefined && _assign.is_cc == 1 ? true : false
                            );
                        }
                        let is_fin_count = 0;
                        let is_fin_total_count = 0;
                        if (isTm) {
                            //#region 검토 완료 컬럼 정의
                            let docuManagerAssignList = await tr.query(`
                                SELECT 
                                    DISTINCT wa.assign_to_id, 
                                    wa.is_fin
                                FROM work_proc wp
                                INNER JOIN work_assign wa
                                    ON wa.is_use = 1
                                    AND wa.wp_idx = wp.wp_idx
                                    AND wa.assign_to_id = wp.approver_id
                                INNER JOIN edms_user eu
                                    ON eu.company_id = ${user.company_id}
                                    AND wa.assign_to_id = eu.user_id
                                WHERE wp.original_tm_id = ${l.wp_idx}
                                    AND wp.wp_type = "DRN"
                            `);
                            // 검토 완료된 수 (기안자 제외)
                            is_fin_count = docuManagerAssignList.filter(raw => raw.is_fin == 1).length;
                            // 총 문서담당자 수 (기안자 제외);
                            is_fin_total_count = docuManagerAssignList.length;
                            //#endregion
                        }
                        Object.assign(l, {
                            assign_text,
                            is_fin_count,
                            is_fin_total_count,
                        });

                        approval_info_list.push(info);
                    }
                }

                return getSuccessResponse(res, {
                    proc_list,
                    assign_list,
                    approval_info_list,
                    my_assign_list,
                    proc_list_length: only_wp.length,
                });
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
            console.log(err);
        }

        return getFailedResponse(res);
    });
});

router.get("/get_work_proc", async (req: Request, res: Response) => {
    try {
        let list = await getConnection().query(`
                     select wp.*,
                     DATE_FORMAT(create_tm, '%Y-%m-%d') as create_tm,
                     DATE_FORMAT(wp_date, '%Y-%m-%d') as wp_date,
                     DATE_FORMAT(due_date, '%Y-%m-%d') as due_date,
                             (select u.username from edms_user u where u.user_id = wp.requester_id) requester,
                             (select u.username from edms_user u where u.user_id = wp.approver_id) approver
                         from work_proc wp
                         where wp.wp_idx = ${req.query.wp_idx}
                 `);
        let sign_org = await getConnection().query(`
                 SELECT 
                     u.user_id as 'id',
                     u.user_id,
                     u.username,
                     g.group_name AS 'groupname',
                     c.company,
                     u.email,
                     u.admin_level,
                     p.name AS position,
                     p.priority
                 FROM edms_group g
                 INNER JOIN edms_company c
                     ON c.id = g.company_id
                 INNER JOIN edms_user u
                     ON u.group_id = g.id
                     AND u.level != 2
                     AND u.is_use = 1
                 INNER JOIN edms_position p
                     ON p.id = u.position_id
                 WHERE g.group_name NOT LIKE '%관리자%'
                 ORDER BY c.id ASC;
             `);
        let work_assign = await getConnection().query(`
             SELECT
                 wa.*,
                 u.user_id,
                 u.username,
                 c.company_name AS 'company',
                 g.group_name AS groupname
             FROM work_assign wa
             INNER JOIN edms_user u
                 ON u.user_id = wa.assign_to_id
             INNER JOIN edms_group g
                 ON g.id = u.group_id
             INNER JOIN edms_company c
                 ON c.id = u.company_id
             WHERE wp_idx = ${req.query.wp_idx}
             ORDER BY wa.approval_order ASC;
         `);
        let work_deploy = await getConnection().query(`
             SELECT
                 wdp.*,
                 u.user_id,
                 u.username,
                 c.company_name AS 'company',
                 g.group_name AS groupname
             FROM work_deploy wdp
             INNER JOIN edms_user u
                 ON u.user_id = wdp.assign_to_id
             INNER JOIN edms_group g
                 ON g.id = u.group_id
             INNER JOIN edms_company c
                 ON c.id = u.company_id
             WHERE wdp.wp_idx = ${req.query.wp_idx};
         `);
        return getSuccessResponse(res, {
            wpdata: list[0],
            sign_org,
            work_assign,
            work_deploy,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// LEGACY CODE.
router.post("/set_work_deploy", async (req: Request, res: Response) => {
    try {
        const work_proc = await getRepository(WorkProc).findOne({
            wp_idx: req.body.wp_idx,
        });
        const exist_line = await getRepository(WorkDeploy).find({
            where: { wp_idx: req.body.wp_idx },
        });
        if (req.body.deploy_line) {
            for (var i = 0; i < req.body.deploy_line.length; i++) {
                let findIdx = exist_line.findIndex((val, idx) => val.assign_to_id == req.body.deploy_line[i]);
                if (findIdx != -1) {
                    await getRepository(WorkDeploy).update(exist_line[findIdx].wdp_idx, exist_line[findIdx]);
                } else {
                    let new_work_deploy = new WorkDeploy();
                    new_work_deploy.wp_idx = req.body.wp_idx;
                    new_work_deploy.assign_from_id = work_proc.requester_id;
                    new_work_deploy.assign_to_id = req.body.deploy_line[i];
                    await getRepository(WorkDeploy).save(new_work_deploy);
                }
            }
            for (let line of exist_line) {
                if (
                    req.body.deploy_line.indexOf(line.assign_to_id) != -1 ||
                    line.assign_to_id == work_proc.requester_id
                )
                    continue;
                await getRepository(WorkDeploy).delete(line);
            }
        }
        let work_deploy = await getConnection().query(`
             select wdp.*,
             u.id as user_id,
             u.username,
             o.company,
             o.name as groupname
             from work_deploy wdp
                 inner join users u
                 on wdp.assign_to_id = u.id
                 inner join organization o
                 on o.id = u.group_id
             where wp_idx = ${req.body.wp_idx};
         `);
        return getSuccessResponse(res, work_deploy);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/set_work_assign", async (req: Request, res: Response) => {
    const { wp_idx, assign_line } = req.body;
    try {
        const work_proc = await getRepository(WorkProc).findOne({
            wp_idx: wp_idx,
        });
        const exist_line = await getRepository(WorkAssign).find({
            where: { wp_idx: wp_idx },
        });
        if (assign_line) {
            for (var i = 0; i < assign_line.length; i++) {
                let findIdx = exist_line.findIndex((val, idx) => val.assign_to_id == assign_line[i]);
                if (findIdx != -1) {
                    let update_wa = {};
                    Object.assign(update_wa, { approval_order: i + 1 });
                    if (i == assign_line.length - 1) Object.assign(update_wa, { is_last_approve: true });
                    await getConnection()
                        .createQueryBuilder()
                        .update(WorkAssign)
                        .set({ ...update_wa })
                        .where("wa_idx=:id", { id: exist_line[findIdx].wa_idx })
                        .execute();
                } else {
                    let new_work_assign = new WorkAssign();
                    new_work_assign.wp_idx = wp_idx;
                    new_work_assign.assign_from_id = work_proc.requester_id;
                    new_work_assign.assign_to_id = assign_line[i];
                    new_work_assign.assign_state = 2;
                    new_work_assign.is_approval = false;
                    new_work_assign.approval_order = i + 1;
                    if (i == assign_line.length - 1) new_work_assign.is_last_approve = true;
                    await getRepository(WorkAssign).save(new_work_assign);
                }
            }
            for (let line of exist_line) {
                if (assign_line.indexOf(line.assign_to_id) != -1 || line.assign_to_id == work_proc.requester_id)
                    continue;
                await getRepository(WorkAssign).delete(line);
            }
        }
        let work_assign = await getConnection().query(`
             select wa.*,
             u.id as user_id,
             u.username,
             o.company,
             o.name as groupname
             from work_assign wa
                 inner join users u
                 on wa.assign_to_id = u.id
                 inner join organization o
                 on o.id = u.group_id
             where wp_idx = ${wp_idx}
             order by wa.approval_order asc;
         `);
        return getSuccessResponse(res, work_assign);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});
// TM 첫발신
const first_send_tm = async (
    docu_list: WorkDocu[],
    now_assign: WorkAssign,
    assign_list: WorkAssign[],
    user_id: number
) => {
    const work_proc = await getRepository(WorkProc).findOne({ wp_idx: now_assign.wp_idx });
    // 조회된 docu_no으로 EdmsDocument 조회
    // docu_no, cate_no, area_id
    let _edms_docu = await getRepository(EdmsDocument).find({
        docu_no: In([...docu_list.map(raw => raw.docu_no)]),
        is_use: 1,
    });
    // 조회한 EdmsDocument cate_no 를 가지고 EdmsCategory 조회
    let _edms_cate = await getRepository(EdmsCategory).find({
        cate_no: In([..._edms_docu.map(raw => raw.cate_no)]),
        is_use: 1,
    });
    let assign_user = await getRepository(EdmsUser).findOne({
        user_id: now_assign.assign_from_id,
        is_use: 1,
    });
    // 기안자 assign
    let requester_assign = assign_list.find(
        raw => raw.assign_from_id == work_proc.requester_id && raw.assign_to_id == raw.assign_from_id
    );
    let receive_pm_manager_list = assign_list.filter(raw => raw.is_use == 0 || raw.is_cc);
    for (var receive_pm_manager of receive_pm_manager_list) {
        for (let i = 0; i < _edms_docu.length; i++) {
            // let newAuth = new EdmsAuthority();
            // newAuth.read = 1;
            // newAuth.write = 1;
            // newAuth.delete = 0;
            // newAuth.download = 1;
            // newAuth.user_id = receive_pm_manager.assign_to_id;
            // newAuth.docu_no = _edms_docu[i].docu_no;
            // newAuth.cate_no = _edms_docu[i].cate_no;
            // newAuth.area_id = _edms_docu[i].area_id;
            // document가 한 Cate에 있을 경우
            // let doc_edms_cate = _edms_cate.find(raw => raw.cate_no == _edms_docu[i].cate_no);
            // if (doc_edms_cate) {
            //     newAuth.project_no = doc_edms_cate.p_project_no;
            //     newAuth.project_type_no = doc_edms_cate.project_no;
            //     newAuth.discipline_id = doc_edms_cate.discipline_id;
            // }
            // newAuth.company_id = assign_user.company_id;
            // await getRepository(EdmsAuthority).save(newAuth);
        }
        if (receive_pm_manager.is_cc) {
            if (receive_pm_manager.user_id != user_id)
                send_recv_box_update(receive_pm_manager.wp_idx, receive_pm_manager.assign_to_id);
            // update_assign_state(16, receive_pm_manager.wa_idx);
        } else {
            if (receive_pm_manager.user_id != user_id)
                send_recv_box_update(receive_pm_manager.wp_idx, receive_pm_manager.assign_to_id);
            update_assign_state(8, receive_pm_manager.wa_idx);
        }
    }
    // 메일발송
    await send_mail_tm(
        docu_list.map(raw => raw.docu_no),
        [...receive_pm_manager_list.map(raw => raw.assign_to_id)],
        work_proc
    );
    //
    if (requester_assign) await update_assign_state(7, requester_assign.wa_idx);
    await update_tm_state(6, work_proc.wp_idx);
    // 발송일자 기록
    await getConnection()
        .createQueryBuilder()
        .update(WorkTm)
        .set({ sended_tm: new Date() })
        .where(`wp_idx=${work_proc.wp_idx}`)
        .execute();
    //
    return;
};

// drn, tm 결재
router.post("/approve_work_assign", async (req: Request, res: Response) => {
    try {
        const { wa_idx, comment, type, work_type, wp_idx, reason } = req.body;
        let list: any[] = [];
        let wa_idx_list: any[] = [];
        const user_id = req.app.get("edms_user_id");
        if (user_id != null) {
            let result: boolean;

            let user = await getRepository(EdmsUser).find({
                user_id: user_id,
                is_use: 1,
            });

            const _assign_list = await getRepository(WorkAssign).find({
                wp_idx: wp_idx,
            });

            let _assign_idx = _assign_list.findIndex(raw => raw.wa_idx == wa_idx);
            let _assign = _assign_list[_assign_idx];

            // wp_idx로 해당 Document 조회
            let _docu_no = await getRepository(WorkDocu).find({
                wp_idx: _assign.wp_idx,
            });

            // 결재
            if (type === "approve") {
                if (work_type.toLocaleLowerCase() === "tm") {
                    result = await update_assign_state(3, wa_idx);
                }
                // drn 결재 마지막 결재자일 경우 모두 3(승인)
                else if (work_type.toLocaleLowerCase() != "tm" && _assign.is_last_approve == true) {
                    for (let l of _assign_list) {
                        wa_idx_list.push(l.wa_idx);
                    }
                    result = await update_assign_state(3, wa_idx_list, true);
                } else {
                    result = await update_assign_state(3, wa_idx, true);
                }

                // assign_state 1: 기안자, 3: 승인, 6: 발신
                if (work_type.toLocaleLowerCase() === "tm" && _assign.is_last_approve == true) {
                    // 기안자 발신함 데아터
                    let pm_manager = _assign_list.find(
                        raw =>
                            raw.assign_from_id == _assign.assign_from_id && raw.assign_to_id == _assign.assign_from_id
                    );

                    if (pm_manager) {
                        // TM 첫 진행
                        await update_assign_state(6, pm_manager.wa_idx);
                        await update_tm_state(5, pm_manager.wp_idx);
                    }
                    // 참조처 유저 정보
                    let cc_tm_manager = _assign_list.find(
                        raw => raw.assign_from_id == _assign.assign_from_id && raw.is_cc == 1
                    );
                    if (cc_tm_manager) {
                        await update_assign_state(19, cc_tm_manager.wa_idx);
                    }

                    // 발신하기
                    await first_send_tm(_docu_no, _assign, _assign_list, user_id);

                    let mail = await getRepository(WorkMail).find({ wp_idx: wp_idx });

                    // 저장된 유저에게 메일 전송
                    if (mail.length > 0) {
                        let work_proc = await getRepository(WorkProc).findOne({
                            where: { wp_idx: wp_idx },
                        });
                        let mail_docu = _docu_no.map(raw => raw.docu_no);

                        send_mail_tm(mail_docu, [...mail.map(raw => raw.user_id)], work_proc);
                    }
                } else {
                    // 결재자에게 메일 송신
                    if (_assign_list.length > _assign_idx) {
                        let next_approver = await getRepository(EdmsUser).findOne({
                            user_id: _assign_list[_assign_idx].assign_to_id,
                        });
                        if (next_approver) {
                            let worktm = await getRepository(WorkTm).findOne({ wp_idx });
                            sendMail(
                                next_approver.email,
                                `<${worktm.tm_code}> ${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_TITLE.kor}`,
                                `${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/workproc/tm/${wp_idx}">${LANGUAGE_PACK.EMAIL.SIGNATURE.SHORT_CUT.kor}</a>`
                            );
                        }
                    }
                }
            } else if (type === "reject") {
                await update_tm_state(4, parseInt(wp_idx));

                // 반려를 진행한 유저
                let reject_assign_wa_idx = _assign_list
                    .filter(raw => raw.assign_to_id == user_id && raw.assign_state == 2)
                    .map(raw => raw.wa_idx);

                let reject = await update_assign_state(5, reject_assign_wa_idx[0], false, reason);

                // 반려를 진행한 유저를 제외한 나머지 유저
                let reject__wa_idx_list = _assign_list
                    .filter(raw => raw.wa_idx != reject_assign_wa_idx[0])
                    .map(raw => raw.wa_idx);

                let reject_list = await update_assign_state(5, reject__wa_idx_list);

                if (reject == true && reject_list == true) result = true;
            }
            //
            // work_review 생성
            if (result && comment != "" && type != "" && type != "reject") {
                let docu_no = _docu_no[0].docu_no;
                let last_file = await getRepository(EdmsFiles).findOne({
                    is_last_version: "Y",
                    docu_no: docu_no,
                    is_use: 1,
                });
                let newWR = new WorkReview();

                newWR.wp_idx = _assign.wp_idx;
                newWR.review_owner = `WOR`;
                newWR.contents = comment;
                newWR.reply = "";
                newWR.code = 0;
                newWR.reviewer_id = _assign.assign_to_id;
                newWR.create_by = user[0].userid;
                newWR.create_tm = new Date();
                newWR.review_date = new Date();
                newWR.docu_no = docu_no;
                newWR.file_no = last_file.file_no;
                let insertWR = await getRepository(WorkReview).save(newWR);

                list.push(insertWR);
            }

            if (list) return getSuccessResponse(res, list);
            else return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
        console.log(err);
    }
    return getFailedResponse(res);
});

router.post("/all_approval_work_assign", async (req: Request, res: Response) => {
    const { wp_idx_list, type, reason } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        if (user_id != null && Array.isArray(wp_idx_list)) {
            let result: boolean;

            for (var wp_idx of wp_idx_list) {
                const assign_list = await getRepository(WorkAssign).find({
                    where: { wp_idx: wp_idx },
                });
                const work_docu = await getRepository(WorkDocu).find({
                    where: { wp_idx: wp_idx },
                });

                if (type === "approve") {
                    // 자신의 결재 찾기
                    let my_assign = assign_list.find(raw => raw.assign_to_id == user_id);

                    result = await update_assign_state(3, my_assign.wa_idx);

                    //마지막 결재 시
                    if (my_assign.is_last_approve == true) {
                        // 기안자 상태 업데이트
                        let create_user = assign_list.find(
                            raw =>
                                raw.assign_from_id == my_assign.assign_from_id &&
                                raw.assign_to_id == my_assign.assign_from_id
                        );

                        if (create_user != undefined) {
                            await update_assign_state(6, create_user.wa_idx);
                            await update_tm_state(5, create_user.wp_idx);
                        }
                        await first_send_tm(work_docu, my_assign, assign_list, user_id);

                        let mail = await getRepository(WorkMail).find({ wp_idx: wp_idx });

                        // 저장된 유저에게 메일 전송
                        if (mail.length > 0) {
                            let work_proc = await getRepository(WorkProc).findOne({
                                where: { wp_idx: wp_idx },
                            });
                            let mail_docu = work_docu.map(raw => raw.docu_no);

                            send_mail_tm(mail_docu, [...mail.map(raw => raw.user_id)], work_proc);
                        }
                    } else {
                        let _assign_idx = assign_list.findIndex(raw => raw.assign_to_id == user_id);
                        if (assign_list.length > _assign_idx) {
                            let next_approver = await getRepository(EdmsUser).findOne({
                                user_id: assign_list[_assign_idx].assign_to_id,
                            });
                            if (next_approver) {
                                let worktm = await getRepository(WorkTm).findOne({ wp_idx });
                                sendMail(
                                    next_approver.email,
                                    `<${worktm.tm_code}> ${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_TITLE.kor}`,
                                    `${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/workproc/tm/${wp_idx}">${LANGUAGE_PACK.EMAIL.SIGNATURE.SHORT_CUT.kor}</a>`
                                );
                            }
                        }
                    }
                } else if (type === "reject") {
                    await update_tm_state(4, parseInt(wp_idx));

                    // 반려를 진행한 유저
                    let reject_assign_wa_idx = assign_list
                        .filter(raw => raw.assign_to_id == user_id && raw.assign_state == 2)
                        .map(raw => raw.wa_idx);

                    let reject = await update_assign_state(5, reject_assign_wa_idx[0], false, reason);

                    // 반려를 진행한 유저를 제외한 나머지 유저
                    let reject__wa_idx_list = assign_list
                        .filter(raw => raw.wa_idx != reject_assign_wa_idx[0])
                        .map(raw => raw.wa_idx);

                    let reject_list = await update_assign_state(5, reject__wa_idx_list);

                    if (reject == true && reject_list == true) result = true;
                }
            }
            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// 배포시 유저들에게 이메일 발송
const send_mail_for_drn = async (deploy_user_list: { user_id: number; subject: string; wp_idx: number }[]) => {
    if (deploy_user_list.length > 0) {
        let users = await getRepository(EdmsUser).find({ is_use: 1 });
        // 중복제거
        let exist_users = [];
        for (var deploy of deploy_user_list) {
            if (exist_users.indexOf(deploy.user_id) == -1) {
                let user = users.find(raw => raw.user_id == deploy.user_id);
                exist_users.push(deploy.user_id);
                if (user) {
                    await sendMail(
                        user.email,
                        `<${deploy.subject}> ${LANGUAGE_PACK.EMAIL.DEPLOY.default.kor}`,
                        `${LANGUAGE_PACK.EMAIL.DEPLOY.REVIEW_REQUEST_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/drn/detail/${deploy.wp_idx}">${LANGUAGE_PACK.EMAIL.DEPLOY.REVIEW_SHORTCUT.kor}</a>`
                    );
                }
            }
        }
    }
};

// 첫 접수시 배포
// 회신온 DRN들을 그대로 담당자에게 배포
router.post("/deploy_tm_drn", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            const { wp_idx, due_date, is_approve, comment, docuManagerIdList } = req.body;
            const mail_groups: number[] = req.body.mail_groups;
            let deploy_user_list: { user_id: number; subject: string; wp_idx: number }[] = [];

            if (req.app.get("edms_user_id") != null) {
                const user_id = req.app.get("edms_user_id");
                let user_list = await tr.getRepository(EdmsUser).find({ is_use: 1 });
                let user = user_list.find(u => u.user_id == user_id);
                // TM Not Found
                let tm_work_proc = await tr.getRepository(WorkProc).findOne({ wp_idx, wp_type: "TM" });
                let tm_code = await tr.getRepository(WorkTm).findOne({ wp_idx: wp_idx });
                if (tm_work_proc == undefined) throw new Error("잘못된 요청입니다.");
                if (is_approve == false) {
                    const assign_list = await tr.getRepository(WorkAssign).find({
                        where: [
                            { wp_idx: wp_idx, assign_from_id: user_id },
                            { wp_idx, assign_to_id: user_id },
                            { wp_idx: wp_idx, assign_from_id: tm_work_proc.requester_id },
                        ],
                    });
                    await update_tm_state(4, wp_idx);
                    for (var assign of assign_list) {
                        await update_assign_state(5, assign.wa_idx, false, comment);
                    }
                    return getSuccessResponse(res, true);
                }
                let tm_drn_list = await tr.getRepository(WorkProc).find({
                    wp_type: "DRN",
                    original_tm_id: tm_work_proc.original_tm_id,
                });
                let tm_review = await tr.getRepository(WorkReview).find({ wp_idx: tm_work_proc.original_tm_id });
                if (tm_work_proc.original_tm_id != -1 && tm_work_proc.original_tm_id != 0 && tm_drn_list.length > 0) {
                    // 회신온 DRN을 배포
                    let all_work_assign = await tr.getRepository(WorkAssign).find({
                        where: [
                            {
                                wp_idx,
                                assign_to_id: user.user_id,
                            },
                            {
                                wp_idx,
                                assign_from_id: user.user_id,
                            },
                        ],
                    });
                    let all_work_docu = await tr.getRepository(WorkDocu).find({
                        wp_idx: In([...tm_drn_list.map(raw => raw.wp_idx)]),
                    });
                    // 동일한 회사 사람 중 문서 담당자를 지정해준다.
                    let new_assign_list: any[] = [];
                    let new_review_list: any[] = [];
                    let new_send_recv_box_list: any[] = [];
                    for (var drn of tm_drn_list) {
                        let docu = all_work_docu.find(raw => raw.wp_idx == drn.wp_idx);
                        if (docu) {
                            let all_docu_manager = await GetDocumentManager([docu.docu_no], user.company_id);
                            let same_document_review_of_tm_drn = tm_review.filter(
                                review => review.docu_no == docu.docu_no
                            );
                            for (var mng_user of all_docu_manager) {
                                let new_assign = new WorkAssign();
                                new_assign.wp_idx = drn.wp_idx;
                                new_assign.is_approval = false;
                                new_assign.approval_order = 0;
                                new_assign.is_last_approve = false;
                                new_assign.assign_from_id = drn.requester_id;
                                new_assign.assign_to_id = mng_user.user_id;
                                new_assign.assign_state = 2;
                                new_assign.create_by = user.username;
                                new_assign.create_tm = new Date();
                                new_assign_list.push(new_assign);
                                // 수신, 발신 확인 데이터 생성
                                let newSendRecvBox = new WorkSendRecvBox();
                                newSendRecvBox.create_by = user.username;
                                newSendRecvBox.wp_idx = drn.wp_idx;
                                newSendRecvBox.work_code = drn.wp_code;
                                newSendRecvBox.sender = user_id;
                                newSendRecvBox.recver = mng_user.user_id;
                                newSendRecvBox.user_id = user_id;
                                new_send_recv_box_list.push(newSendRecvBox);
                                //
                                deploy_user_list.push({
                                    user_id: mng_user.user_id,
                                    subject: drn.subject,
                                    wp_idx: drn.wp_idx,
                                });
                            }
                            for (let tm_review of same_document_review_of_tm_drn) {
                                let new_review = new WorkReview();
                                new_review.wp_idx = tm_review.wp_idx;
                                new_review.review_owner = tm_review.review_owner;
                                new_review.contents = tm_review.contents;
                                new_review.reply = tm_review.reply;
                                new_review.code = tm_review.code;
                                new_review.reviewer_id = tm_review.reviewer_id;
                                new_review.create_by = tm_review.create_by;
                                new_review.create_tm = tm_review.create_tm;
                                new_review.review_date = tm_review.review_date;
                                new_review.docu_no = tm_review.docu_no;
                                new_review.file_no = tm_review.file_no;
                                new_review.revision = tm_review.revision;
                                new_review_list.push(new_review);
                            }
                        }
                    }
                    await tr.getRepository(WorkAssign).save(new_assign_list);
                    await tr.getRepository(WorkReview).save(new_review_list);
                    await tr.getRepository(WorkSendRecvBox).save(new_send_recv_box_list);
                    await update_assign_state(10, [...all_work_assign.map(raw => raw.wa_idx)]);
                    await update_tm_state(8, wp_idx);
                } else {
                    // 기본배포
                    let assign_list = await tr.getRepository(WorkAssign).find({ wp_idx });
                    let work_assign = assign_list.find(raw => raw.assign_to_id == user.user_id);
                    let work_assign_mine = assign_list
                        .filter(raw => raw.assign_from_id == user.user_id && raw.assign_state == 8)
                        .map(raw => raw.wa_idx);
                    let work_docu_list = await tr.getRepository(WorkDocu).find({ wp_idx: wp_idx });
                    //
                    //사전에 필요한 데이터 로드
                    let AllProj = await tr.getRepository(EdmsProjectType).find({ is_use: 1 });
                    let AllDocu = await tr.getRepository(EdmsDocument).find({
                        docu_no: In([...work_docu_list.map(raw => raw.docu_no)]),
                        is_use: 1,
                    });
                    let AllCate = await tr.getRepository(EdmsCategory).find({
                        cate_no: In([...AllDocu.map(raw => raw.cate_no)]),
                        is_use: 1,
                    });
                    let AllFile = await tr.getRepository(EdmsFiles).find({
                        docu_no: In([...work_docu_list.map(raw => raw.docu_no)]),
                        is_use: 1,
                    });
                    //
                    let new_assign_list = [];
                    let new_work_file_list = [];
                    let new_send_recv_box_list = [];
                    for (var work_docu of work_docu_list) {
                        // 워크 생성
                        // document manager
                        let AllDocuManagerUser = await GetDocumentManager([work_docu.docu_no], user.company_id);
                        let docu = AllDocu.find(raw => raw.docu_no == work_docu.docu_no);
                        let cate = AllCate.find(raw => raw.cate_no == docu.cate_no);
                        //추가 담당자 지정
                        if (Array.isArray(docuManagerIdList) && docuManagerIdList.length > 0) {
                            for (var manager_id of docuManagerIdList) {
                                // let isAuth = await tr
                                //     .getRepository(EdmsAuthority)
                                //     .findOne({ where: { read: 1, docu_no: docu.docu_no, user_id: manager_id } });
                                // if (isAuth === undefined) {
                                //     // 권한 부여
                                //     // let newAuth = new EdmsAuthority();
                                //     // let project = AllProj.find(raw => raw.project_no == cate.project_no);
                                //     // newAuth.read = 1;
                                //     // newAuth.write = 1;
                                //     // newAuth.delete = 0;
                                //     // newAuth.download = 1;
                                //     // newAuth.user_id = manager_id;
                                //     // newAuth.docu_no = docu.docu_no;
                                //     // newAuth.cate_no = docu.cate_no;
                                //     // newAuth.area_id = docu.area_id;
                                //     // newAuth.project_no = project ? project.p_project_no : -1;
                                //     // newAuth.project_type_no = cate.project_no;
                                //     // newAuth.discipline_id = cate.discipline_id;
                                //     // newAuth.company_id = user.company_id;
                                //     // await getRepository(EdmsAuthority).save(newAuth);
                                //     //
                                // }
                                let file_list = AllFile.filter(raw => raw.docu_no == work_docu.docu_no);
                                let newProc = new WorkProc();
                                newProc.wp_type = "DRN";
                                newProc.wp_date = new Date();
                                newProc.wp_code = "DRN-" + tm_work_proc.wp_code;
                                newProc.project_no = tm_work_proc.project_no;
                                newProc.series_no = tm_work_proc.series_no;
                                newProc.account_ym = tm_work_proc.account_ym;
                                newProc.subject = tm_code.tm_code + "_" + tm_work_proc.subject;
                                newProc.explan = tm_work_proc.explan;
                                newProc.requester_id = user_id;
                                newProc.approver_id = manager_id;
                                newProc.due_date = due_date;
                                newProc.create_by = user.username;
                                newProc.create_tm = new Date();
                                newProc.user_id = user_id;
                                newProc.original_tm_id = tm_work_proc.wp_idx;
                                let insertProc = await getRepository(WorkProc).save(newProc);
                                //
                                // 결재라인 기안자
                                let newAssign = new WorkAssign();
                                newAssign.wp_idx = insertProc.wp_idx;
                                newAssign.is_approval = false;
                                newAssign.approval_order = 0;
                                newAssign.is_last_approve = false;
                                newAssign.assign_from_id = user_id;
                                newAssign.assign_to_id = user_id;
                                newAssign.assign_state = 1;
                                newAssign.create_by = user.username;
                                newAssign.create_tm = new Date();
                                new_assign_list.push(newAssign);
                                // work assign 문서담당자 넣어주기
                                let new_approval = new WorkAssign();
                                new_approval.approval_order = 0;
                                new_approval.assign_from_id = user_id;
                                new_approval.assign_to_id = manager_id;
                                new_approval.create_by = user.username;
                                new_approval.due_to_date = due_date;
                                new_approval.wp_idx = insertProc.wp_idx;
                                new_approval.assign_state = 2;
                                new_approval.is_last_approve = true;
                                new_approval.is_approval = false;
                                new_assign_list.push(new_approval);
                                //
                                // 수신, 발신 확인 데이터 생성
                                let newSendRecvBox = new WorkSendRecvBox();
                                newSendRecvBox.create_by = user.username;
                                newSendRecvBox.wp_idx = insertProc.wp_idx;
                                newSendRecvBox.work_code = insertProc.wp_code;
                                newSendRecvBox.sender = user_id;
                                newSendRecvBox.recver = manager_id;
                                newSendRecvBox.user_id = user_id;
                                new_send_recv_box_list.push(newSendRecvBox);
                                //
                                // work file 및 결재라인 설정
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
                                //
                                // work_docu 생성
                                let newWDocu = new WorkDocu();
                                newWDocu.user_id = user_id;
                                newWDocu.create_by = user.username;
                                newWDocu.wp_idx = insertProc.wp_idx;
                                newWDocu.docu_no = docu.docu_no;
                                newWDocu.is_use = 1;
                                await getRepository(WorkDocu).save(newWDocu);
                                //
                                deploy_user_list.push({
                                    user_id: manager_id,
                                    subject: newProc.subject,
                                    wp_idx: insertProc.wp_idx,
                                });
                            }
                        }
                        if (AllDocuManagerUser.length > 0) {
                            // let edms_authority = await getRepository(EdmsAuthority).find();
                            for (var manager of AllDocuManagerUser) {
                                // let auth_user = edms_authority.find(
                                //     raw =>
                                //         raw.docu_no == docu.docu_no &&
                                //         raw.is_delete == false &&
                                //         raw.user_id == manager.user_id
                                // );
                                // if (auth_user == undefined) {
                                //     // 권한 부여
                                //     let newAuth = new EdmsAuthority();
                                //     let project = AllProj.find(raw => raw.project_no == cate.project_no);
                                //     newAuth.read = 1;
                                //     newAuth.write = 1;
                                //     newAuth.delete = 0;
                                //     newAuth.download = 1;
                                //     newAuth.user_id = manager.user_id;
                                //     newAuth.docu_no = docu.docu_no;
                                //     newAuth.cate_no = docu.cate_no;
                                //     newAuth.area_id = docu.area_id;
                                //     newAuth.project_no = project ? project.p_project_no : -1;
                                //     newAuth.project_type_no = cate.project_no;
                                //     newAuth.discipline_id = cate.discipline_id;
                                //     newAuth.company_id = user.company_id;
                                //     await getRepository(EdmsAuthority).save(newAuth);
                                //     //
                                // }
                                let file_list = AllFile.filter(raw => raw.docu_no == work_docu.docu_no);
                                let newProc = new WorkProc();
                                newProc.wp_type = "DRN";
                                newProc.wp_date = new Date();
                                newProc.wp_code = "DRN-" + tm_work_proc.wp_code;
                                newProc.project_no = tm_work_proc.project_no;
                                newProc.series_no = tm_work_proc.series_no;
                                newProc.account_ym = tm_work_proc.account_ym;
                                newProc.subject = tm_code.tm_code + "_" + tm_work_proc.subject;
                                newProc.explan = tm_work_proc.explan;
                                newProc.requester_id = user_id;
                                newProc.approver_id = manager.user_id;
                                newProc.due_date = due_date;
                                newProc.create_by = user.username;
                                newProc.create_tm = new Date();
                                newProc.user_id = user_id;
                                newProc.original_tm_id = tm_work_proc.wp_idx;
                                let insertProc = await getRepository(WorkProc).save(newProc);
                                //
                                // 결재라인 기안자
                                let newAssign = new WorkAssign();
                                newAssign.wp_idx = insertProc.wp_idx;
                                newAssign.is_approval = false;
                                newAssign.approval_order = 0;
                                newAssign.is_last_approve = false;
                                newAssign.assign_from_id = user_id;
                                newAssign.assign_to_id = user_id;
                                newAssign.assign_state = 1;
                                newAssign.create_by = user.username;
                                newAssign.create_tm = new Date();
                                new_assign_list.push(newAssign);
                                //await getRepository(WorkAssign).save(newAssign);
                                //
                                // work assign 문서담당자 넣어주기
                                let new_approval = new WorkAssign();
                                new_approval.approval_order = 0;
                                new_approval.assign_from_id = user_id;
                                new_approval.assign_to_id = manager.user_id;
                                new_approval.create_by = user.username;
                                new_approval.due_to_date = due_date;
                                new_approval.wp_idx = insertProc.wp_idx;
                                new_approval.assign_state = 2;
                                new_approval.is_last_approve = true;
                                new_approval.is_approval = false;
                                new_assign_list.push(new_approval);
                                //
                                // 수신, 발신 확인 데이터 생성
                                let newSendRecvBox = new WorkSendRecvBox();
                                newSendRecvBox.create_by = user.username;
                                newSendRecvBox.wp_idx = insertProc.wp_idx;
                                newSendRecvBox.work_code = insertProc.wp_code;
                                newSendRecvBox.sender = user_id;
                                newSendRecvBox.recver = manager.user_id;
                                newSendRecvBox.user_id = user_id;
                                new_send_recv_box_list.push(newSendRecvBox);
                                //
                                // work file 및 결재라인 설정
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
                                //
                                // work_docu 생성
                                let newWDocu = new WorkDocu();
                                newWDocu.user_id = user_id;
                                newWDocu.create_by = user.username;
                                newWDocu.wp_idx = insertProc.wp_idx;
                                newWDocu.docu_no = docu.docu_no;
                                newWDocu.is_use = 1;
                                await getRepository(WorkDocu).save(newWDocu);
                                //
                                deploy_user_list.push({
                                    user_id: manager.user_id,
                                    subject: newProc.subject,
                                    wp_idx: insertProc.wp_idx,
                                });
                            }
                        }
                    }
                    await getRepository(WorkAssign).save(new_assign_list);
                    await getRepository(WorkSendRecvBox).save(new_send_recv_box_list);
                    await getRepository(WorkFile).save(new_work_file_list);
                    let cc_assign = assign_list.find(raw => raw.assign_state >= 15 && raw.is_cc);
                    if (cc_assign && tm_work_proc.approver_id != user.user_id) {
                        // await update_tm_state(7, wp_idx);
                        await update_assign_state(15, work_assign.wa_idx);
                        await update_assign_state(15, work_assign_mine);
                    } else {
                        if (cc_assign) await update_tm_state(7, wp_idx);
                        else await update_tm_state(8, wp_idx);
                        await update_assign_state(10, work_assign.wa_idx);
                        await update_assign_state(10, work_assign_mine);
                        await getConnection()
                            .createQueryBuilder()
                            .update(WorkTm)
                            .set({ deploy_tm: new Date() })
                            .where(`wp_idx=${wp_idx}`)
                            .execute();
                    }
                }
                // DRN 배포시 유저들에게 매일 전송
                if (deploy_user_list.length > 0) {
                    await send_mail_for_drn(deploy_user_list);
                }
                // 메일유저에게 메일 발송
                if (mail_groups && mail_groups.length > 0) {
                    let work_docu = await getRepository(WorkDocu).find({
                        where: { wp_idx: wp_idx },
                    });
                    let docu_no = work_docu.map(raw => raw.docu_no);

                    let mail_group_list = await getRepository(EdmsMailGroup).find({
                        where: { group_id: In(mail_groups), is_delete: 0 },
                    });

                    if (mail_group_list != undefined) {
                        await send_mail_tm(
                            docu_no,
                            mail_group_list.map(raw => raw.user_id),
                            tm_work_proc
                        );
                    }
                }
                return getSuccessResponse(res, true);
            }
        } catch (err) {
            console.log(err);
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.post("/all_deploy_tm_drn", async (req: Request, res: Response) => {
    const {} = req.body;
    try {
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// din, tm 회신(접수)하기
router.post("/reply_work_assign", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    let user = await getRepository(EdmsUser).findOne({
        user_id: user_id,
        is_use: 1,
    });

    try {
        if (user_id != null) {
            // completeType 1 : 완료, 2 : 회신하기
            const { wa_idx, comment, completeType, workType, startDate, endDate } = req.body;
            const default_stages = await getDefaultStages();
            let _company_id: any;
            let list: any[] = [];

            // wa_idx로 wp_idx 찾기
            // wp_idx, assign_from_id
            let _wp_idx = await getRepository(WorkAssign).find({
                wa_idx: wa_idx,
            });

            const user_assign = _wp_idx.filter(raw => raw.wa_idx == wa_idx)[0];

            // company_id
            if (completeType == 1) {
                _company_id = await getRepository(EdmsUser).find({
                    user_id: In([..._wp_idx.map(raw => raw.assign_to_id)]),
                    is_use: 1,
                });
            } else {
                _company_id = await getRepository(EdmsUser).find({
                    user_id: In([..._wp_idx.map(raw => raw.assign_from_id)]),
                    is_use: 1,
                });
            }

            // wp_idx로 해당 Document 조회
            // docu_no
            let _docu_no = await getRepository(WorkDocu).find({
                wp_idx: In([..._wp_idx.map(raw => raw.wp_idx)]),
            });
            // 조회된 docu_no으로 EdmsDocument 조회
            // docu_no, cate_no, area_id
            let _edms_docu = await getRepository(EdmsDocument).find({
                docu_no: In([..._docu_no.map(raw => raw.docu_no)]),
            });
            // 조회한 EdmsDocument cate_no 를 가지고 EdmsCategory 조회
            // project_no(EdmsProjectType) ,p_project_no(EdmsProjects), discipline_id,
            let _edms_cate = await getRepository(EdmsCategory).find({
                cate_no: In([..._edms_docu.map(raw => raw.cate_no)]),
                is_use: 1,
            });

            for (let i = 0; i < _edms_docu.length; i++) {
                // cate 중복일 경우 분기
                let tmp_edms_cate: any;
                if (_edms_cate[i] == undefined) tmp_edms_cate = _edms_cate[i - 1];
                else tmp_edms_cate = _edms_cate[i];

                // tm 회신하기가 아닐떄 문서 권한부여
                if (workType.toLocaleLowerCase() != "tm") {
                    // let newAuth = new EdmsAuthority();
                    // newAuth.read = 1;
                    // newAuth.write = 1;
                    // newAuth.delete = 0;
                    // newAuth.download = 1;
                    // newAuth.user_id = _wp_idx[i].assign_to_id;
                    // newAuth.docu_no = _edms_docu[i].docu_no;
                    // newAuth.cate_no = _edms_docu[i].cate_no;
                    // newAuth.area_id = _edms_docu[i].area_id;
                    // newAuth.project_no = tmp_edms_cate.p_project_no;
                    // newAuth.project_type_no = tmp_edms_cate.project_no;
                    // newAuth.discipline_id = tmp_edms_cate.discipline_id;
                    // newAuth.company_id = _company_id[0].company_id;
                    // list.push(newAuth);
                    // await getRepository(EdmsAuthority).save(newAuth);
                }

                // 20220316 : 무조건 파일은 이슈시에 등록하면됨.
                //  첨부된 파일 등록
                // let new_file_code = await newFileCode(_edms_docu[i].docu_no);
                // let insertFiles = [];

                // if (req.files.length > 0 && new_file_code != "" && user_id != -1) {
                //     const file = req.files[0];
                //     let newFile = new EdmsFiles();

                //     newFile.project_no = tmp_edms_cate.project_no;
                //     newFile.cate_no = _edms_docu[i].cate_no;
                //     newFile.docu_no = _edms_docu[i].docu_no;
                //     newFile.user_id = user.user_id;
                //     newFile.root_path = `${edmsFileDir}${file.filename}`;
                //     newFile.repo_path = ``;
                //     let split_file_code = new_file_code.split("_");
                //     newFile.origin_file_code = split_file_code[0] + "_" + split_file_code[1];
                //     newFile.file_code = new_file_code;
                //     newFile.file_name = file.filename;
                //     newFile.original_file_name = file.originalname;
                //     newFile.file_type = getFileExtension(file.originalname.split(".")[1], file.originalname);
                //     newFile.fversion = 1;
                //     newFile.is_last_version = "N";
                //     newFile.regi_dt = new Date();
                //     newFile.create_by = user.userid;
                //     newFile.create_tm = new Date();
                //     newFile.weight = "";
                //     newFile.history = "";
                //     newFile.stage_code = default_stages[0];
                //     newFile.user_id = user.user_id;

                //     let insertFile = await getRepository(EdmsFiles).save(newFile);
                //     insertFiles.push(insertFile);

                //     let ext = file.originalname.split(".")[file.originalname.split(".").length - 1];

                //     let _filePath = await mvEdmsFile(
                //         String(tmp_edms_cate.project_no),
                //         String(_edms_docu[i].cate_no),
                //         String(_edms_docu[i].docu_no),
                //         insertFile.file_no,
                //         file.path,
                //         1,
                //         ext
                //     );

                //     insertFile.repo_path = _filePath;
                //     await getConnection()
                //         .createQueryBuilder()
                //         .update(EdmsFiles)
                //         .set({ repo_path: insertFile.repo_path })
                //         .where("file_no = :id", { id: insertFile.file_no })
                //         .execute();
                // }
                //
            }

            // WorkAssign assign_state 업데이트
            const _assign_list = await getRepository(WorkAssign).find({
                wp_idx: user_assign.wp_idx,
            });

            let result: any;
            if (workType.toLocaleLowerCase() === "tm") {
                let receive_user = await getRepository(WorkAssign).find({
                    wp_idx: _wp_idx[0].wp_idx,
                    assign_from_id: _wp_idx[0].assign_to_id,
                    assign_to_id: _wp_idx[0].assign_from_id,
                });

                // 회신하는 유저 -> 회신완료
                await update_assign_state(4, wa_idx);
                // 회신받는 유저 -> 접수
                result = await tm_update_assign_state(8, _wp_idx[0].wp_idx, receive_user[0].wa_idx, endDate);
            } else if (workType === "din") {
                // din 완료
                if (completeType == 1) {
                    let _user_assign_info = _assign_list.filter(raw => raw.assign_to_id == user.user_id);

                    result = await update_assign_state(4, _user_assign_info[0].wa_idx);
                } else {
                    // din 회신하기
                    // 추후에 수정필요
                    let wa_idx_list: any = [];

                    for (let l of _assign_list) {
                        wa_idx_list.push(l.wa_idx);
                    }

                    result = await update_assign_state(4, wa_idx_list);
                }
            }

            // WorkReview 생성
            // 리뷰가 없으면 WorkReview 미생성
            if (comment && result) {
                let docu_no = _docu_no[0].docu_no;
                let last_file = await getRepository(EdmsFiles).findOne({
                    is_last_version: "Y",
                    docu_no: docu_no,
                    is_use: 1,
                });

                let newWR = new WorkReview();

                newWR.wp_idx = user_assign.wp_idx;
                newWR.review_owner = `WOR`;
                newWR.contents = comment;
                newWR.reviewer_id = user_assign.assign_to_id;
                newWR.create_by = user.userid;
                newWR.create_tm = new Date();
                newWR.review_date = new Date();
                newWR.docu_no = docu_no;
                newWR.file_no = last_file.file_no;
                newWR.revision = last_file.revision;
                await getRepository(WorkReview).save(newWR);
            }

            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

//DIN
router.post("/request_work_assign", async (req: Request, res: Response) => {
    try {
        const user_assign = await getRepository(WorkAssign).findOne({
            where: { wa_idx: req.body.wa_idx },
        });

        let _obj = {};
        Object.assign(_obj, { is_approval: true });
        if (user_assign.assign_state == 2) {
            Object.assign(_obj, { assign_state: 3 });
        }

        await getConnection()
            .createQueryBuilder()
            .update(WorkAssign)
            .set(_obj)
            .where("wa_idx = :idx", { idx: req.body.wa_idx })
            .execute();

        let work_assign = await getConnection().query(`
             select 
                 wa.*,
                 u.id as user_id,
                 u.username,
                 o.company,
                 o.name as groupname
             from work_assign wa
                 inner join users u
                 on wa.assign_to_id = u.id
                 inner join organization o
                 on o.id = u.group_id
             where wp_idx = ${user_assign.wp_idx}
             order by wa.approval_order asc;
         `);
        return getSuccessResponse(res, work_assign);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

//DIN
router.post("/reject_work_assign", async (req: Request, res: Response) => {
    try {
        const user_assign = await getRepository(WorkAssign).findOne({
            where: { wa_idx: req.body.wa_idx },
        });
        await getConnection()
            .createQueryBuilder()
            .update(WorkAssign)
            .set({ assign_state: 4 })
            .where("wa_idx=:id", { id: user_assign.wa_idx })
            .execute();

        let work_assign = await getConnection().query(`
             select wa.*,
             u.id as user_id,
             u.username,
             o.company,
             o.name as groupname
             from work_assign wa
                 inner join users u
                 on wa.assign_to_id = u.id
                 inner join organization o
                 on o.id = u.group_id
             where wp_idx = ${user_assign.wp_idx}
             order by wa.approval_order asc;
         `);
        return getSuccessResponse(res, work_assign);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_work_attach_list", async (req: Request, res: Response) => {
    try {
        let emps = await getRepository(WorkAttach).find({
            where: {
                wp_idx: Number(req.query.wp_idx),
            },
            order: {
                wat_idx: "ASC",
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

router.get("/get_work_docu_list", async (req: Request, res: Response) => {
    const { wp_idx_list } = req.query;
    const user_id = req.app.get("edms_user_id");
    try {
        let list: {
            wp_idx: number;
            work_docu_no: number;
            docu_no: number;
            docu_code: string;
            docu_subject: string;
            docu_type: string;
            stage_code: string;
            last_fversion: string;
            file_name: string;
            file_no: number;
            repo_path: string;
            file_type: string;
            file_code: string;
            cate_name: string;
            user_name: string;
            create_tm: Date;
            create_by: string;
            company: string;
            description_name: string;
        }[] = [];

        let result = [];

        if (Array.isArray(wp_idx_list)) {
            for (var _wp_idx of wp_idx_list) {
                let wp_idx = parseInt(_wp_idx.toString());
                let _wp_idx_list: number[] = [wp_idx];

                // TM 이고, 원본 TM일경우 하위에 모든 데이터 로드
                let work_proc = await getRepository(WorkProc).findOne({ wp_idx: wp_idx });

                if (work_proc)
                    if (work_proc && work_proc.wp_type.toLocaleLowerCase() == "tm" && work_proc.original_tm_id == 0) {
                        let all_work_proc = await getRepository(WorkProc).find({ original_tm_id: wp_idx });
                        if (all_work_proc.length > 0) {
                            _wp_idx_list = [..._wp_idx_list, ...all_work_proc.map(raw => raw.wp_idx)];
                        }
                    } else if (
                        work_proc &&
                        work_proc.wp_type.toLocaleLowerCase() == "drn" &&
                        work_proc.original_tm_id != 0
                    ) {
                        let original_tm = await getRepository(WorkProc).findOne({ wp_idx: work_proc.original_tm_id });
                        if (original_tm) {
                            _wp_idx_list = [..._wp_idx_list, original_tm.wp_idx];
                        }
                    }

                let user_info = await getConnection().query(`
                    SELECT 
                        eu.company_id,
                        ec.company_name
                    FROM edms_user eu
                    INNER JOIN edms_company ec
                        ON ec.id = eu.company_id
                    WHERE eu.user_id = ${user_id} AND eu.is_use = 1; 
                `);

                let work_list = await getConnection().query(`
                    SELECT 
                        wd.wp_idx,
                        wd.docu_no,
                        wd.create_tm,
                        wd.create_by,
                        wf.file_no
                    FROM work_docu wd
                    INNER JOIN work_file wf
                        ON wf.docu_no = wd.docu_no 
                        AND wf.wp_idx = wd.wp_idx
                    WHERE wd.wp_idx IN (${_wp_idx_list});
                `);

                let exist_work_docu = [];
                for (var work of work_list) {
                    if (exist_work_docu.indexOf(work.docu_no) != -1) continue;
                    list.push({
                        wp_idx: work.wp_idx,
                        work_docu_no: work.docu_no,
                        docu_no: -1,
                        docu_code: "",
                        docu_subject: "",
                        cate_name: "",
                        docu_type: "",
                        stage_code: "",
                        last_fversion: "",
                        file_name: "",
                        repo_path: "",
                        file_type: "",
                        file_code: "",
                        user_name: "",
                        create_tm: work.create_tm,
                        create_by: work.create_by,
                        company: "",
                        description_name: "",
                        file_no: work.file_no,
                    });
                    exist_work_docu.push(work.docu_no);
                }

                let documents = await getRepository(EdmsDocument).find({
                    docu_no: In(list.map(raw => raw.work_docu_no)),
                    is_use: 1,
                });
                let files = await getRepository(EdmsFiles).find({
                    file_no: In(list.map(raw => raw.file_no)),
                    is_use: 1,
                });

                for (var l of list) {
                    // 문서 번호, 카테고리 번호
                    let docu = documents.find(raw => raw.docu_no == l.work_docu_no);

                    if (docu) {
                        let cate = await getRepository(EdmsCategory).findOne({ cate_no: docu.cate_no, is_use: 1 });
                        let file = files.find(raw => raw.file_no == l.file_no);
                        if (file == undefined) continue;

                        let last_version_file = files.sort((a, b) => b.fversion - a.fversion)[0];

                        let description = await getRepository(EdmsDiscipline).findOne({
                            where: { id: cate.discipline_id },
                        });

                        // 카테고리 명
                        let cate_name = cate.cate_name;

                        // 문서 담당자
                        let docu_manager = await GetDocumentManager([docu.docu_no], user_info.company_id);

                        l.docu_no = docu.docu_no;
                        l.docu_code = docu.docu_code;
                        l.docu_subject = docu.docu_subject;
                        l.docu_type = docu.docu_type;
                        l.cate_name = cate_name;
                        if (description) l.description_name = description.name;
                        if (file) {
                            l.stage_code = file.stage_code;
                            l.last_fversion = last_version_file.revision;
                            l.file_name = file.file_name;
                            l.file_no = file.file_no;
                            l.file_type = file.file_type;
                            l.repo_path = file.repo_path;
                            l.file_code = file.file_code;
                        }
                        l.user_name =
                            docu_manager.length > 0
                                ? docu_manager.length > 1
                                    ? `${docu_manager[0].username} 외 ${docu_manager.length - 1} 명`
                                    : docu_manager[0].username
                                : "";

                        l.company = user_info.company_name;
                        result.push(l);
                    }
                }
            }
            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/create_work_tmp_box", async (req: Request, res: Response) => {
    try {
        for (var list of req.body.docu_list) {
            let newEmp = new WorkTmpBox();
            newEmp.project_no = list.project_no;
            newEmp.docu_no = list.docu_no;
            newEmp.owner_id = list.user_id;
            newEmp.create_by = list.create_by;
            newEmp.create_tm = new Date();
            await getRepository(WorkTmpBox).save(newEmp);
        }

        return getSuccessResponse(res, {});
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

export const makeFullStageCode = (stage_code: string, stage_type: string) => {
    if (stage_code.indexOf("Start") != -1) return "Start";
    else if (stage_code.indexOf("As-Built") != -1) return "As-Built Approval";
    else return `${stage_code} ${stage_type == "i" ? "Issue" : "Approval"}`;
};
// code : stage_code IFA Issue
// docu_stage_list : only documents stage data
export const getFileStageData = (code: string, docu_stage_list: EdmsStage[]) => {
    docu_stage_list = docu_stage_list.filter(raw => raw.stage_code != "Start"); // Start 인 스테이지는 전부 베제.
    let stage_code = "";
    let stage_type = "";

    let _split = code.split(" ");
    if (_split.length > 1) {
        stage_code = _split[0];
        stage_type = _split[1][0].toLowerCase();
    } else {
        stage_code = code;
    }

    let find_stages = docu_stage_list.filter(
        raw => raw.stage_code.indexOf(stage_code) != -1 && raw.stage_type.indexOf(stage_type) != -1
    );
    let find_stage: EdmsStage;
    if (find_stages.length == 0 && docu_stage_list.length > 0) {
        find_stage = docu_stage_list[0];
    } else if (find_stages.length > 0) {
        find_stage = find_stages[0];
    }
    let revision_str = find_stage ? GetRevisionByStage(stage_code, find_stage.revision) : "A";
    let full_stage_code = "";
    if (find_stage) {
        full_stage_code = makeFullStageCode(find_stage.stage_code, find_stage.stage_type);
    }
    return {
        full_stage_code,
        stage_code,
        stage_type,
        find_stage,
        revision: revision_str,
    };
};

export const GetRevisionByStage = (stage: string, revision: number) => {
    let revision_str: string;
    if (stage.indexOf("IFA") != -1) {
        revision_str = String.fromCharCode(revision + 65);
    } else {
        revision_str = revision.toString();
    }
    return revision_str;
};

router.get("/get_delete_box_list", async (req: Request, res: Response) => {
    try {
        const delete_box_type = req.query.deleteBoxType;
        const user_id = req.app.get("edms_user_id");
        if (user_id != null) {
            let proj_list = await getRepository(EdmsProjectType).find({
                where: { is_use: 1 },
                order: { project_name: "ASC" },
            });

            let edms_del_box_list: any;
            if (delete_box_type === "Admin") {
                edms_del_box_list = await getRepository(EdmsDelBox).find({ is_use: 0 });
            } else if (delete_box_type === "General") {
                edms_del_box_list = await getRepository(EdmsDelBox).find({ user_id: user_id, is_use: 1 });
            }

            let docu_list = await getRepository(EdmsDocument).find({
                where: { docu_no: In([...edms_del_box_list.map(raw => raw.docu_no)]), is_use: 1 },
                order: { docu_subject: "ASC" },
            });
            let cate_list = await getRepository(EdmsCategory).find({
                cate_no: In([...edms_del_box_list.map(raw => raw.cate_no)]),
                is_use: 1,
            });

            let discipline_list = await getRepository(EdmsDiscipline).find({
                where: { id: In([...cate_list.map(raw => raw.discipline_id)]) },
                order: { name: "ASC" },
            });

            let stage_list = await getRepository(EdmsStage).find({
                where: { docu_no: In([...docu_list.map(raw => raw.docu_no)]), is_use: 1 },
                order: { actual_dt: "DESC" },
            });
            let wf_list = await getRepository(WorkFile).find({
                file_no: In([...edms_del_box_list.map(raw => raw.file_no)]),
            });

            let wp_list = await getRepository(WorkProc).find({
                wp_idx: In([...wf_list.map(raw => raw.wp_idx)]),
            });

            for (var deleted_file of edms_del_box_list) {
                let create_user_name_deleted_file = await (
                    await getRepository(EdmsUser).findOne({ where: { user_id: deleted_file.user_id } })
                ).username;
                let edms_docu = docu_list.find(docu => docu.docu_no == deleted_file.docu_no);
                //기본적인 프로젝트, 카테고리 정보
                let project = proj_list.find(proj => proj.project_no == deleted_file.project_no);
                let cate = cate_list.find(cate => cate.cate_no == deleted_file.cate_no);
                if (cate == undefined) continue;
                let disc = discipline_list.find(discipline => discipline.id == cate.discipline_id);

                Object.assign(deleted_file, {
                    project_name: project.project_name,
                    pcate_no: cate.pcate_no,
                    cate_name: cate.cate_name,
                    disc_name: disc.name,
                    docu_code: edms_docu.docu_code,
                    docu_subject: edms_docu.docu_subject,
                    file_create_user_name: create_user_name_deleted_file,
                });
                //

                // 파일이 있다면 파일 정보 추가
                if (deleted_file.file_no != null) {
                    let workFile = [
                        ...wf_list.filter(raw => raw.file_no == deleted_file.file_no).map(raw => raw.wp_idx),
                    ];

                    let work_proc_type = wp_list
                        .filter(raw => workFile.indexOf(raw.wp_idx) != -1)
                        .sort((a, b) => getDiffDate(b.wp_date, a.wp_date));

                    let { find_stage } = getFileStageData(
                        deleted_file.stage_code,
                        stage_list.filter(raw => raw.docu_no == edms_docu.docu_no)
                    );

                    // actual_dt, forecast_dt, plan_dt 순으로 표시
                    let first_dt: any;
                    let first_dt_name: string;
                    if (find_stage != undefined) {
                        if (find_stage.actual_dt != null) {
                            first_dt_name = "Actual";
                            first_dt = find_stage.actual_dt;
                        } else if (find_stage.forecast_dt != null) {
                            first_dt_name = "Forecast";
                            first_dt = find_stage.forecast_dt;
                        } else if (find_stage.plan_dt != null) {
                            first_dt_name = "Plan";
                            first_dt = find_stage.plan_dt;
                        } else {
                            first_dt = null;
                            first_dt_name = null;
                        }
                    }
                    Object.assign(deleted_file, {
                        file_no: deleted_file.file_no,
                        file_code: deleted_file.file_code,
                        file_name: deleted_file.file_name,
                        file_type: getFileTypeName(deleted_file.file_type),
                        stage: deleted_file.stage_code,
                        type: work_proc_type.length > 0 ? work_proc_type[0].wp_type : "임시",
                        first_dt_name: first_dt_name != null ? first_dt_name : "",
                        first_dt: first_dt != null ? first_dt : "",
                        repo_path: deleted_file.repo_path,
                        revision: deleted_file.revision,
                        create_tm: deleted_file.create_tm,
                    });
                } else {
                    // 파일이 없는경우 MyDocument 에 나오지 않아야함.
                    continue;
                }
                //
                Object.assign(deleted_file, { file_auth: deleted_file.user_id == user_id ? 1 : 0 });
            }
            edms_del_box_list = edms_del_box_list.sort((a, b) => b.create_tm.getTime() - a.create_tm.getTime());
            return getSuccessResponse(res, edms_del_box_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_work_tmp_box_list", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        const isPaging = req.query.paging != undefined && req.query.paging != null;
        const skip = req.query.skip ? parseInt(req.query.skip.toString()) : 0;
        const size = req.query.size ? parseInt(req.query.size.toString()) : 20;
        const project_type_no = req.query.project_type_no ? parseInt(req.query.project_type_no.toString()) : null;
        const cate_no = req.query.cate_no ? parseInt(req.query.cate_no.toString()) : null;
        const docu_no = req.query.docu_no ? parseInt(req.query.docu_no.toString()) : null;
        const selected_type = req.query.selected_type ? parseInt(req.query.selected_type.toString()) : null; // 1 : 파일명, 2 : 문서제목
        const search_data = req.query.search_data ? req.query.search_data.toString() : null;

        if (user_id != null) {
            let user_auth = await GetAuthority(user_id, isPaging, skip, size, {
                project_no: project_type_no != -1 ? project_type_no : null,
                cate_no: cate_no != -1 ? cate_no : null,
                docu_no: docu_no != -1 ? docu_no : null,
                original_name: selected_type == 1 ? search_data : null,
                docu_subject: selected_type == 2 ? search_data : null,
            });
            let allData = user_auth.all_data;
            if (allData.length > 0) {
                await getConnection().transaction(async tr => {
                    // let stage_list = await tr.query(
                    //     `SELECT es.* FROM edms_stage es INNER JOIN edms_document ed ON ed.cate_no IN (${user_auth.cate_no.join(
                    //         ","
                    //     )}) WHERE es.docu_no = ed.docu_no
                    //         ORDER BY es.actual_dt DESC;`
                    // );
                    let users = await tr.getRepository(EdmsUser).find({ where: { is_use: 1 } });
                    for (var l of allData) {
                        // 파일이 있다면 파일 정보 추가
                        if (l.file_no) {
                            let stage_list = await tr
                                .getRepository(EdmsStage)
                                .find({ where: { docu_no: l.docu_no }, order: { actual_dt: "DESC" } });
                            let stageData = getFileStageData(l.stage_code, stage_list);
                            let find_stage;
                            if (stageData) {
                                find_stage = stageData.find_stage;
                            }
                            let create_user = users.find(raw => raw.user_id == l.file_user_id);
                            // actual_dt, forecast_dt, plan_dt 순으로 표시
                            let first_dt: any;
                            let first_dt_name: string;
                            if (find_stage != undefined) {
                                if (find_stage.plan_dt != null) {
                                    first_dt_name = "Plan";
                                    first_dt = find_stage.plan_dt;
                                } else if (find_stage.forecast_dt != null) {
                                    first_dt_name = "Forecast";
                                    first_dt = find_stage.forecast_dt;
                                } else if (find_stage.actual_dt != null) {
                                    first_dt_name = "Actual";
                                    first_dt = find_stage.actual_dt;
                                } else {
                                    first_dt = null;
                                    first_dt_name = null;
                                }
                            }
                            Object.assign(l, {
                                file_no: l.file_no,
                                file_code: l.file_code,
                                file_name: l.file_name,
                                fversion: l.fversion,
                                file_type: getFileTypeName(l.file_type),
                                stage: l.stage_code,
                                first_dt_name: first_dt_name != null ? first_dt_name : "",
                                first_dt: first_dt != null ? first_dt : "",
                                repo_path: l.repo_path,
                                revision: l.revision,
                                create_tm: l.file_create_tm,
                                docu_revision: l.revision,
                                disc_name: l.discipline_name,
                                file_create_user_name: create_user ? create_user.username : "",
                                auth: 1,
                                file_auth: l.file_user_id == user_id ? 1 : 0,
                            });
                        } else {
                            // 파일이 없는경우 MyDocument 에 나오지 않아야함.
                            continue;
                        }
                    }
                });
                allData = allData.sort(
                    (a, b) => moment(b.file_create_tm).toDate().getTime() - moment(a.file_create_tm).toDate().getTime()
                );
            }
            return getSuccessResponse(res, { result: allData, length: user_auth.allDataLength });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_zip_file", async (req: Request, res: Response) => {
    try {
        if (typeof req.query.ids && Array.isArray(req.query.ids)) {
            let zip_urls = [];
            // 1. get ids
            let ids = req.query.ids.map(raw => parseInt(raw));
            // 2. get work docu
            let wDocus = await getRepository(WorkDocu).find({
                wp_idx: In(ids),
            });
            // 3. get document datas
            let document_ids = [...wDocus.map(raw => raw.docu_no)];
            //4. get files of document
            let files = await getRepository(EdmsFiles).find({
                docu_no: In(document_ids),
                is_use: 1,
            });
            // 4. get urls
            for (var file of files) {
                if (file.repo_path == "") continue;
                zip_urls.push(file.repo_path);
            }
            //5. send zip file to user
            return await zipFolders(req.query.filename.toString(), zip_urls, req, res);
            // return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res);
});

router.get("/get_revision_info", async (req: Request, res: Response) => {
    try {
        const { ids } = req.query;
        if (Array.isArray(ids)) {
            let tmp_boxes = await getRepository(WorkTmpBox).find({
                wtb_idx: In(ids.map(raw => parseInt(raw))),
            });
            let docu_ids = tmp_boxes.map(raw => raw.docu_no);
            let files = await getRepository(EdmsFiles).find({
                where: { docu_no: In(docu_ids), is_use: 1 },
                order: { fversion: "DESC" },
            });
            if (files.length > 0) {
                // result : latest fversion
                return getSuccessResponse(res, { revision: files[0].fversion });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/revision_process", async (req: Request, res: Response) => {
    let err_msg = "";
    try {
        const { ids, stage, revision_num, content } = req.body;
        if (req.app.get("edms_user_id") != -1 && Array.isArray(ids)) {
            let tmp_boxes = await getRepository(WorkTmpBox).find({
                wtb_idx: In(ids),
            });

            let docu_ids = tmp_boxes.map(raw => raw.docu_no);
            //#region 1. 파일 탐색 후 복제
            let files = await getRepository(EdmsFiles).find({
                where: {
                    docu_no: In(docu_ids),
                    stage_code: stage,
                    is_use: 1,
                },
                order: { fversion: "DESC" },
            });
            if (files.length == 0) {
                err_msg = "스테이지에 해당하는 파일이 존재하지 않습니다.";
            }

            let f_files = [];
            let exist_file_codes = [];
            for (var file of files) {
                if (exist_file_codes.indexOf(file.file_code) != -1) continue;
                exist_file_codes.push(file.file_code);
                f_files.push(file);
            }
            let new_files = [];
            for (var f_file of f_files) {
                let new_file = f_file;
                Object.assign(new_file, {
                    file_no: null,
                    fversion: parseInt(revision_num),
                    history: content,
                });
                new_files.push(new_file);
            }
            await getRepository(EdmsFiles).save(new_files);
            //#endregion

            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res, err_msg);
});

// 송신함 리스트 API
router.get("/get_send_list", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != null) {
            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });
            let list = await getRepository(WorkSendRecvBox).find({
                sender: user_id,
            });
            let users = await getRepository(EdmsUser).find({
                user_id: In([...list.map(raw => raw.recver)]),
                is_use: 1,
            });
            for (var item of list) {
                Object.assign(item, {
                    sender_name: user.username,
                    recver_name: users.find(raw => raw.user_id == item.recver).username,
                });
            }
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// 수신함 리스트 API
router.get("/get_recv_list", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (req.app.get("edms_user_id") != null) {
            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });
            let list = await getRepository(WorkSendRecvBox).find({
                recver: user_id,
            });
            let users = await getRepository(EdmsUser).find({
                user_id: In([...list.map(raw => raw.sender)]),
                is_use: 1,
            });
            for (var item of list) {
                Object.assign(item, {
                    sender_name: users.find(raw => raw.user_id == item.sender).username,
                    recver_name: user.username,
                });
            }
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/delete_tmp_box", async (req: Request, res: Response) => {
    const { wtb_idx } = req.body;
    try {
        if (Array.isArray(wtb_idx)) {
            let list = await getRepository(WorkTmpBox).find({ wtb_idx: In(wtb_idx) });
            if (list.length > 0) {
                await getRepository(WorkTmpBox).remove(list);
            }
            return getSuccessResponse(res, {});
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return;
});

const update_file = async (file_no: any, is_use: number, is_last_version?: string) => {
    try {
        if (is_last_version != undefined) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ is_use: is_use, is_last_version: is_last_version })
                .where("file_no IN (:...idx)", { idx: file_no })
                .execute();
            return true;
        } else if (is_last_version == undefined) {
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ is_use: is_use })
                .where("file_no IN (:...idx)", { idx: file_no })
                .execute();
            return true;
        }
    } catch (err) {
        logger.error(err);
    }
    return false;
};

const update_del_box = async (file_no: any) => {
    try {
        await getConnection()
            .createQueryBuilder()
            .update(EdmsDelBox)
            .set({ is_use: 0 })
            .where("file_no IN (:idx)", { idx: file_no })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

const update_file_version = async (file_no: any, is_last_version: boolean) => {
    try {
        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ is_last_version: is_last_version ? "Y" : "N" })
            .where("file_no IN (:idx)", { idx: file_no })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

//  일반 삭제  edms_files => is_use : 0 , edms_del_box => 추가
//  영구 삭제  edms_files => row 삭제 , edms_del_box => is_use : 0
//  내문서 => 삭제 기능 && 휴지통 => 영구 삭제 기능 API
router.post("/delete_mydocument_files", async (req: Request, res: Response) => {
    try {
        const { docu_data_list, is_delete } = req.body;
        if (req.app.get("edms_user_id") != null) {
            let result: boolean = false;
            let _file_no_list: number[] = docu_data_list.map(raw => raw.file_no);
            let _docu_no_list: number[] = docu_data_list.map(raw => raw.docu_no);
            if (_file_no_list.length > 0) {
                // is_delete => true: 영구 삭제 , false: 일반 삭제
                if (is_delete) {
                    // EdmsDelBox => 해당 file is_use: 0
                    let edms_files = await getRepository(EdmsFiles).find({ docu_no: In(_docu_no_list) });
                    result = await update_del_box(_file_no_list);

                    for (let file of docu_data_list) {
                        let prev_file = edms_files.filter(edmsFile => edmsFile.docu_no == file.docu_no);
                        if (prev_file) {
                            let new_last_version_file = prev_file.find(
                                prevFile => prevFile.fversion == file.fversion - 1
                            );
                            if (new_last_version_file)
                                result = await update_file_version(new_last_version_file.file_no, true);
                        }
                    }

                    // EdmsFiles => 해당 file row 삭제
                    // for (let file_no of _file_no_list) {
                    //     let delEdmsFile = await getRepository(EdmsFiles).delete({ file_no: file_no });
                    //     if (!delEdmsFile) result = false;
                    // }
                } else {
                    let update_file_no_list: any[] = [];

                    let files = await getRepository(EdmsFiles).find({
                        where: { docu_no: In(_docu_no_list), is_use: 1, is_last_version: "N" },
                        order: { file_no: "DESC" },
                    });
                    for (var docu_no of _docu_no_list) {
                        let _nowFiles = files.filter(file => file.docu_no == docu_no);
                        if (_nowFiles.length > 0) {
                            update_file_no_list.push(_nowFiles[0].file_no);
                        }
                    }

                    if (update_file_no_list.length > 0) {
                        await update_file(update_file_no_list, 1, "Y");
                    }

                    let edms_files = await getRepository(EdmsFiles).find({
                        file_no: In(_file_no_list),
                        is_use: 1,
                    });

                    // EdmsFiles => 해당 file is_use: 0
                    result = await update_file(_file_no_list, 0, "N");

                    // EdmsDelBox => 해당 file info 추가
                    let delete_box_list: any[] = [];
                    edms_files.map(file => {
                        let newDelBox = new EdmsDelBox();
                        newDelBox.is_use = 1;
                        newDelBox.user_id = file.user_id;
                        newDelBox.project_no = file.project_no;
                        newDelBox.docu_no = file.docu_no;
                        newDelBox.cate_no = file.cate_no;
                        newDelBox.file_no = file.file_no;
                        newDelBox.history = file.history;
                        newDelBox.weight = file.weight;
                        newDelBox.fversion = file.fversion;
                        newDelBox.file_name = file.file_name;
                        newDelBox.file_type = file.file_type;
                        newDelBox.file_code = file.file_code;
                        newDelBox.repo_path = file.repo_path;
                        newDelBox.root_path = file.root_path;
                        newDelBox.stage_code = file.stage_code;
                        newDelBox.is_last_version = file.is_last_version;
                        newDelBox.origin_file_code = file.origin_file_code;
                        newDelBox.original_file_name = file.original_file_name;
                        newDelBox.regi_dt = file.regi_dt;
                        newDelBox.create_tm = new Date();
                        newDelBox.create_by = file.create_by;
                        newDelBox.modify_tm = file.modify_tm;
                        newDelBox.modify_by = file.modify_by;
                        newDelBox.revision = file.revision;

                        delete_box_list.push(newDelBox);
                    });

                    let insertDelBox = await getRepository(EdmsDelBox).save(delete_box_list);

                    if (!insertDelBox) result = false;
                }
            }

            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// EdmsFiles => 해당 file is_use: 1 , EdmsDelBox => 해당 file row 삭제
// 휴지통 => 복원 기능 API
router.post("/restore_mydocument_files", async (req: Request, res: Response) => {
    const { docu_data_list, is_admin } = req.body;
    try {
        let result: boolean = false;
        let _file_no_list = docu_data_list.map(raw => raw.file_no);
        let docu_no_list: number[] = docu_data_list.map(raw => raw.docu_no);
        if (_file_no_list.length > 0) {
            if (is_admin) {
                // 영구삭제된 문서를 복원
                await getRepository(EdmsDelBox)
                    .createQueryBuilder("del_box")
                    .update()
                    .set({ is_use: 1 })
                    .where("file_no IN (:file_no)", { file_no: _file_no_list.join(",") })
                    .execute();
            } else {
                // EdmsFiles => 해당 file is_use: 1
                result = await update_file(_file_no_list, 1);
                // last version 체크 다시 시작
                let last_version_files = [];
                let files = await getRepository(EdmsFiles).find({
                    where: { docu_no: In(docu_no_list) },
                    order: { docu_no: "ASC", fversion: "DESC" },
                });
                for (var docu_no of docu_no_list) {
                    let docu_files = files.filter(raw => raw.docu_no == docu_no);
                    last_version_files.push(docu_files[0].file_no);
                }
                await update_file_version(
                    files.map(raw => raw.file_no),
                    false
                );
                await update_file_version(
                    last_version_files.map(raw => raw),
                    true
                );
                //
                // EdmsDelBox => 해당 file row 삭제
                for (let file_no of _file_no_list) {
                    let deleteDelBox = await getRepository(EdmsDelBox).delete({ file_no: file_no });
                    if (!deleteDelBox) result = false;
                }
            }

            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_work_code", async (req: Request, res: Response) => {
    const { wp_type } = req.query;
    try {
        let _count = await getRepository(WorkProc).count({
            where: { wp_type },
        });

        let code = getWorkCode(wp_type, _count + 1);

        return getSuccessResponse(res, code);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/create_list_tmp_box", async (req: Request, res: Response) => {
    const { docu_no } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        if (Array.isArray(docu_no)) {
            let temp = await getRepository(WorkTmpBox).find({
                owner_id: user_id,
            });
            let docu_no_list = [];
            for (var t of temp) {
                docu_no_list.push(t.docu_no);
            }
            let docu = await getRepository(EdmsDocument).find({ is_use: 1 });
            for (var d of docu_no) {
                if (docu_no_list.indexOf(d) == -1) {
                    let _docu = docu.filter(raw => raw.docu_no == d);
                    for (var tmp of _docu) {
                        let newEmp = new WorkTmpBox();
                        newEmp.project_no = tmp.project_no;
                        newEmp.docu_no = tmp.docu_no;
                        newEmp.owner_id = user_id;
                        newEmp.create_by = tmp.create_by;
                        newEmp.create_tm = tmp.create_tm;
                        await getRepository(WorkTmpBox).save(newEmp);
                    }
                }
            }
        }
        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/work_proc_detail", async (req: Request, res: Response) => {
    const { wp_idx, type } = req.query;
    const user_id = req.app.get("edms_user_id");
    try {
        // 문서 상세정보 찾기
        let proc = await getRepository(WorkProc).findOne({
            where: { wp_idx: wp_idx, wp_type: type },
        });

        // 결재 유저 찾기
        let assign = await getRepository(WorkAssign).findOne({
            where: { wp_idx: wp_idx, assign_to_id: user_id },
        });

        let user_id_list = [proc.approver_id, proc.requester_id];

        let tmCode = await getRepository(WorkTmCode).find({
            where: { tm_user_id: In(user_id_list) },
        });

        if (tmCode.length > 1) {
            let user_company_id_list = [tmCode[0].company_id, tmCode[1].company_id];
            let company_id = await getRepository(EdmsCompany).find({
                where: { id: In(user_company_id_list), is_delete: false },
            });
            return getSuccessResponse(res, { proc, assign, company_id });
        } else {
            return getSuccessResponse(res, { proc, assign });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_original_tm", async (req: Request, res: Response) => {
    const { original_tm_id } = req.query;
    const user_id = req.app.get("edms_user_id");
    const user = await getRepository(EdmsUser).findOne({ user_id, is_use: 1 });
    await getConnection().transaction(async tr => {
        try {
            let tm_detail: {
                wp_idx: number;
                wp_type: string;
                create_by: string;
                send_company: string;
                receive_company: string;
                wp_date: Date;
                due_data: Date;
                explan: string;
                is_response: boolean;
                is_sender: boolean;
                is_cc_confirm: boolean;
                is_cc_request: boolean;
                attach_files: WorkAttach[];
                is_review: boolean; // drn 리뷰 작성 플래그
                is_re_send: boolean; // 재생성 가능여부
                is_review_confirm: boolean; // 문서담당자들 완료 여부
                is_tr_modify: boolean;
            };

            let tm_code = await tr.getRepository(WorkTmCode).findOne({ tm_user_id: user_id });
            let _original_tm_id =
                typeof original_tm_id == "string"
                    ? parseInt(original_tm_id)
                    : typeof original_tm_id == "number"
                    ? original_tm_id
                    : 0;

            if (_original_tm_id != 0) {
                // original_tm_id으로 TM 찾기
                let work_proc_list = await getConnection().query(`
                    SELECT * 
                    FROM work_proc
                    WHERE wp_idx = ${_original_tm_id}
                		OR (original_tm_id = ${_original_tm_id} AND wp_type = "TM") 
                		OR (wp_type = "DRN" AND original_tm_id = ${_original_tm_id});
                `);

                let tm = work_proc_list.find(raw => raw.wp_idx == _original_tm_id && raw.wp_type == "TM");

                let assign_list = await tr.getRepository(WorkAssign).find({ wp_idx: tm.wp_idx });
                let wp_idx_list = [];
                await findAllWpIdxTm(_original_tm_id, wp_idx_list);

                let tm_attach = await tr.getRepository(WorkAttach).find({
                    wp_idx: In(wp_idx_list),
                });

                let exist_tm = work_proc_list.find(raw => raw.original_tm_id == tm.wp_idx && raw.wp_type == "TM");

                let tm_docu = await tr.getRepository(WorkDocu).find({ wp_idx: _original_tm_id });
                let exist_work_docu = [];
                let tm_docu_distinct = [
                    ...tm_docu.map(raw => {
                        if (exist_work_docu.indexOf(raw.docu_no) == -1) {
                            exist_work_docu.push(raw.docu_no);
                            return raw.docu_no;
                        }
                    }),
                ];
                // 하나라도 comment 를 달은 drn만 가져오기
                let drn_wp_idx_list: any[] = [];
                drn_wp_idx_list = work_proc_list.filter(raw => raw.original_tm_id == tm.wp_idx).map(raw => raw.wp_idx);

                let drn_assign_list = await tr
                    .getRepository(WorkAssign)
                    .find({ wp_idx: In(drn_wp_idx_list), assign_to_id: user.user_id, assign_state: 2 });

                let user_info = await tr.query(`
                    SELECT 
                        eu.*,
                        ec.company_name
                    FROM edms_user eu 
                    INNER JOIN edms_company ec
                        ON ec.id = eu.company_id
                    WHERE (user_id = ${tm.requester_id} OR user_id = ${tm.approver_id}) AND eu.is_use = 1 AND ec.is_delete = false;
                `);

                // 발신처 회사 아이디
                let tm_send_user = user_info.find(raw => raw.user_id == tm.requester_id);
                // 발신처 회사 이름
                let send_company = user_info.find(raw => raw.user_id == tm.requester_id).company_name;
                // 수신처 회사 이름
                let receive_company = user_info.find(raw => raw.user_id == tm.approver_id).company_name;
                let is_response = false;
                if (
                    tm.approver_id == user_id &&
                    tm.tm_state == 8 &&
                    tm_docu_distinct.length <= drn_wp_idx_list.length &&
                    exist_tm == undefined
                ) {
                    //todo
                    is_response = true;
                }

                // 재회신일경우
                let drn_reply = await tr.getRepository(WorkProc).find({
                    original_tm_id: tm.original_tm_id,
                    wp_type: "DRN",
                });
                if (is_response == false && drn_reply.length > 0) {
                    let review = await tr.getRepository(WorkReview).findOne({
                        wp_idx: drn_reply[0].wp_idx,
                    });
                    if (review && review.is_reply == 1) {
                        is_response = true;
                    }
                }
                //
                // 회신 후 반려처리 당했을 경우
                if (
                    is_response == false &&
                    assign_list.find(raw => raw.assign_to_id == user_id && raw.assign_state == 5) &&
                    tm.tm_idx > 0 &&
                    tm_send_user.user_id == user.user_id
                )
                    is_response = true;
                //
                //참조 일경우 회신불가 & 승인 가능
                let is_cc_confirm = false;
                if (tm.tm_state == 13 && tm_code) {
                    let assign = assign_list.find(raw => raw.assign_to_id == user_id && raw.assign_state == 16);
                    if (assign) is_cc_confirm = true;
                }
                // 참조처에 검토요청
                let is_cc_request = false;
                if (tm.tm_state == 7) {
                    let assign = assign_list.find(
                        raw =>
                            raw.assign_from_id == tm.requester_id &&
                            raw.assign_state == 15 && // 참조 15
                            raw.assign_to_id != user_id && // 수신처에서 참조처로 검토요청하기에, 참조처사람으로 되어있으면 수신처에서 보낼수있는것이다.
                            user.level == 2 // 문서담당자 이고
                    );
                    if (assign) is_cc_request = true;
                }
                // tm_state 따라 플래그 변경
                let is_review: boolean; // drn 리뷰 작성 플래그
                if (tm.tm_state == 7 || tm.tm_state == 8 || tm.tm_state == 13 || tm.tm_state == 14) {
                    is_review = true;
                } else {
                    is_review = false;
                }
                //
                //재생성 가능 여부
                let is_re_send = false;
                // 본인이 기안한 TR 일경우
                if (exist_tm == undefined && tm.requester_id == user.user_id) {
                    let assign = assign_list.find(
                        raw =>
                            raw.assign_to_id == user.user_id &&
                            raw.assign_from_id == tm.approver_id &&
                            raw.assign_state == 10
                    );
                    if (assign) is_re_send = true;
                }
                //
                // 문서담당자 리뷰 완료 가능 여부
                let is_review_confirm = false;
                if (drn_assign_list.length > 0 && tm.original_tm_id == 0) {
                    // 회신문서의 경우 리뷰확인 액션 못함
                    let exist_is_fin = drn_assign_list.find(raw => raw.is_fin == 1); // 완료한 리뷰가 있는지 확인
                    is_review_confirm = exist_is_fin == undefined;
                }
                //

                // tr 발신 전 정보 수정 가능 여부
                let is_tr_modify = false;
                if (tm.tm_state == 1 || tm.tm_state == 2) {
                    is_tr_modify = true;
                }
                //
                tm_detail = {
                    wp_idx: tm.wp_idx,
                    wp_type: tm.wp_type,
                    create_by: tm.create_by,
                    wp_date: tm.wp_date,
                    due_data: tm.due_date,
                    explan: tm.explan,
                    send_company: send_company ? send_company.company_name : "",
                    receive_company: receive_company ? receive_company.company_name : "",
                    is_response: is_response,
                    is_sender: tm_send_user ? user.company_id == tm_send_user.company_id : false,
                    is_cc_confirm: is_cc_confirm,
                    is_cc_request: is_cc_request,
                    attach_files: tm_attach,
                    is_review: is_review,
                    is_re_send: is_re_send,
                    is_review_confirm: is_review_confirm,
                    is_tr_modify: is_tr_modify,
                };
                return getSuccessResponse(res, tm_detail);
            } else {
                return getSuccessResponse(res, undefined);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
            console.log(err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_unread_works", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    try {
        let unread_work_list: any[] = [];
        let all_data = await getConnection().query(`
            SELECT wp.*, wsr.wsr_idx FROM work_send_recv_box wsr
                INNER JOIN work_proc wp
                    ON wp.wp_idx = wsr.wp_idx
                WHERE wsr.recver = ${user_id}
                    AND wsr.is_use = 1
                    AND wsr.state = 1
                ORDER BY wsr.create_tm DESC
        `);
        all_data.map(raw => unread_work_list.push({ unread_work: raw, wsr_idx: raw.wsr_idx }));

        return getSuccessResponse(res, unread_work_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/update_send_recv_box", async (req: Request, res: Response) => {
    try {
        const { wp_idx_list } = req.body;
        if (Array.isArray(wp_idx_list)) {
            let work_send_recv_box = await getRepository(WorkSendRecvBox).find({
                where: { wp_idx: In(wp_idx_list) },
            });
            let wrs_idx_list = work_send_recv_box.map(raw => raw.wsr_idx);
            if (wrs_idx_list.length > 0) {
                let result = await getConnection()
                    .createQueryBuilder()
                    .update(WorkSendRecvBox)
                    .set({ state: 2 })
                    .where(`wsr_idx IN(${wrs_idx_list.join(",")})`)
                    .execute();
                if (result) {
                    return getSuccessResponse(res, true);
                } else {
                    return getSuccessResponse(res, false);
                }
            } else {
                return getSuccessResponse(res, false);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_docu_manager", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    const user_id = req.app.get("edms_user_id");
    try {
        if (user_id != null && typeof docu_no == "string") {
            let user = await getRepository(EdmsUser).findOne({
                where: { user_id: user_id },
            });

            let docu_manager = await GetDocumentManager([parseInt(docu_no)], user.company_id, [user.user_id]);

            return getSuccessResponse(res, docu_manager);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_work_assign_user_list", async (req: Request, res: Response) => {
    const _wp_idx = req.query.wp_idx;
    const user_id = req.app.get("edms_user_id");
    await getConnection().transaction(async tr => {
        try {
            if (_wp_idx) {
                let list: {
                    user_id: number;
                    username: string;
                    is_fin: number;
                    position: string;
                }[] = [];
                const wp_idx = parseInt(_wp_idx.toString());
                const user = await tr.getRepository(EdmsUser).findOne({ user_id });
                let work_assign_list = await tr.query(`
                    SELECT DISTINCT wa.assign_to_id, wa.is_fin, eu.username, eu.user_id, epos.position_name
                    FROM work_proc wp
                    INNER JOIN work_assign wa
                        ON wa.is_use = 1
                        AND wa.wp_idx = wp.wp_idx
                        AND wa.assign_to_id = wp.approver_id
                    INNER JOIN edms_user eu
                        ON eu.company_id = ${user.company_id}
                        AND wa.assign_to_id = eu.user_id
                    INNER JOIN edms_position epos
                        ON epos.id = eu.position_id
                    WHERE wp.original_tm_id = ${wp_idx}
                        AND wp.wp_type = "DRN"
                `);
                for (var assign of work_assign_list) {
                    list.push({
                        user_id: assign.user_id,
                        username: assign.username,
                        is_fin: assign.is_fin,
                        position: assign.position_name,
                    });
                }

                return getSuccessResponse(res, list);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_revision_hisotory", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    await getConnection().transaction(async tr => {
        try {
            let datas: {
                revison: string;
                stage_name: string;
                file_name: string;
                file_type: string;
                file_no: number;
                wp_idx: number;
            }[] = [];

            let work_docu = await tr.getRepository(WorkDocu).find({
                where: { docu_no: docu_no },
            });
            let edms_file = await tr.getRepository(EdmsFiles).find({ is_use: 1 });

            let wp_idx_list = work_docu.map(raw => raw.wp_idx);
            let tm_history = await tr.getRepository(WorkTmHistory).find({
                where: { wp_idx: In(wp_idx_list) },
            });

            for (var tmh of tm_history) {
                let file = edms_file.find(raw => raw.file_no == tmh.file_no);
                datas.push({
                    revison: tmh.revision,
                    stage_name: tmh.stage_name,
                    file_name: file.file_name,
                    file_type: file.file_type,
                    file_no: tmh.file_no,
                    wp_idx: tmh.wp_idx,
                });
            }

            return getSuccessResponse(res, datas);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_file_review_list", async (req: Request, res: Response) => {
    const { file_no, wp_idx } = req.query;
    await getConnection().transaction(async tr => {
        try {
            let work_review = await tr.getRepository(WorkReview).find({
                where: { file_no: file_no, wp_idx: wp_idx },
            });
            return getSuccessResponse(res, work_review);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.post("/update_due_date", async (req: Request, res: Response) => {
    const { wp_idx, endDate } = req.body;
    await getConnection().transaction(async tr => {
        try {
            let proc = await tr.getRepository(WorkProc).findOne({
                where: { wp_idx: wp_idx },
            });

            await tr
                .createQueryBuilder()
                .update(WorkProc)
                .set({ due_date: endDate })
                .where("wp_idx = :id", { id: wp_idx })
                .execute();

            return getSuccessResponse(res, proc);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

// 첨부파일 미리 올려놓는 API
router.post("/upload_attach_file", async (req: Request, res: Response) => {
    try {
        if (Array.isArray(req.files)) {
            let files = [];
            if (req.files.length > 0)
                for (var file of req.files) {
                    files.push({
                        filename: file.filename,
                        originalname: file.originalname,
                        file_path: edmsFileDir + file.filename,
                    });
                }
            return getSuccessResponse(res, files);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

// 수정할 TR 정보 불러오기
router.get("/get_all_tr_work_list", async (req: Request, res: Response) => {
    const { wp_idx } = req.query;
    await getConnection().transaction(async tr => {
        let docu_list: {
            docu_no: number;
            docu_code: string;
            docu_subject: string;
            file_no: number;
            revision: number;
            file_code: string;
            file_name: string;
        }[] = [];

        let tr_assign_list: {
            id: number;
            username: string;
            part: string;
            company: string;
        }[] = [];

        let tr_mail_list: {
            id: number;
            username: string;
            part: string;
            company: string;
        }[] = [];
        try {
            let company = await tr.getRepository(EdmsCompany).find();
            let group = await tr.getRepository(EdmsGroup).find();

            // work_proc
            let proc = await tr.getRepository(WorkProc).findOne({
                where: { wp_idx: wp_idx },
            });

            //메일 수신자 리스트
            let tm_mail = await tr.getRepository(WorkMail).find({
                where: { wp_idx: wp_idx },
            });

            let user_id_list = tm_mail.filter(raw => raw.user_id != proc.requester_id).map(raw => raw.user_id);

            let mail_user_list = await tr.getRepository(EdmsUser).find({
                where: { user_id: In(user_id_list) },
            });

            if (mail_user_list.length > 0) {
                for (var user of mail_user_list) {
                    let user_company = company.find(raw => raw.id == user.company_id);
                    let user_group = group.find(raw => raw.id == user.group_id);

                    tr_mail_list.push({
                        id: user.user_id,
                        username: user.username,
                        part: user_group.group_name,
                        company: user_company.company_name,
                    });
                }
            }
            //

            // 결재자 리스트
            let work_assign = await tr.getRepository(WorkAssign).find({
                where: {
                    wp_idx: wp_idx,
                },
            });

            // 내부 결재자
            let assign_list = work_assign
                .filter(raw => raw.assign_to_id != proc.approver_id && raw.is_cc != 1 && raw.assign_state == 2)
                .map(raw => raw.assign_to_id);

            let assign_user_list = await tr.getRepository(EdmsUser).find({
                where: { user_id: In(assign_list) },
            });

            if (assign_user_list.length > 0) {
                for (var user of assign_user_list) {
                    let user_company = company.find(raw => raw.id == user.company_id);
                    let user_group = group.find(raw => raw.id == user.group_id);

                    tr_assign_list.push({
                        id: user.user_id,
                        username: user.username,
                        part: user_group.group_name,
                        company: user_company.company_name,
                    });
                }
            }
            //

            // tr.no, 수선처, 참조처
            let work_tm = await tr.getRepository(WorkTm).findOne({
                where: { wp_idx: wp_idx },
            });
            //

            //첨부파일
            let tm_attach = await tr.getRepository(WorkAttach).find({
                where: { wp_idx: wp_idx },
            });
            //

            //선택문서
            let work_docu = await tr.getRepository(WorkDocu).find({
                where: { wp_idx: wp_idx },
            });

            let work_docu_list = work_docu.map(raw => raw.docu_no);

            let edms_docu = await tr.getRepository(EdmsDocument).find({
                where: { docu_no: In(work_docu_list) },
            });

            for (var docu of edms_docu) {
                let work_file = await tr.getRepository(WorkFile).findOne({
                    where: { wp_idx: wp_idx, docu_no: docu.docu_no },
                });

                if (work_file.file_no != -1) {
                    let edms_file = await tr.getRepository(EdmsFiles).findOne({
                        where: { file_no: work_file.file_no, is_use: 1 },
                    });

                    docu_list.push({
                        docu_no: docu.docu_no,
                        docu_code: docu.docu_code,
                        docu_subject: docu.docu_subject,
                        file_no: edms_file.file_no,
                        revision: edms_file.fversion,
                        file_code: edms_file.file_code,
                        file_name: edms_file.file_name,
                    });
                } else {
                    docu_list.push({
                        docu_no: docu.docu_no,
                        docu_code: docu.docu_code,
                        docu_subject: docu.docu_subject,
                        file_no: 0,
                        revision: 0,
                        file_code: "",
                        file_name: "",
                    });
                }
            }
            //

            return getSuccessResponse(res, {
                proc: proc,
                work_tm: work_tm,
                docu_list: docu_list,
                tm_attach: tm_attach,
                mail_user_list: tr_mail_list,
                assign_list: tr_assign_list,
            });
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

// tr 수정
router.post("/update_tr_data", async (req: Request, res: Response) => {
    const {
        wp_idx,
        startDate,
        endDate,
        subject,
        explan,
        referenceId,
        emailIdList,
        docuList,
        fileList,
        files,
        tmNo,
        stageTypeId,
        projectTypeNo,
    } = req.body;
    const user_id = req.app.get("edms_user_id");

    try {
        let user_list = await getRepository(EdmsUser).find();

        let user = user_list.find(raw => raw.user_id == user_id);

        let modify_by = user.username;
        let modify_tm = new Date();

        if (typeof startDate == "string" && typeof endDate == "string") {
            let _startDate = new Date(startDate);
            let _edndDate = new Date(endDate);

            //proc 수정
            let update_proc = {};
            if (startDate) Object.assign(update_proc, { wp_date: _startDate });
            if (endDate) Object.assign(update_proc, { due_date: _edndDate });
            if (subject) Object.assign(update_proc, { subject: subject });
            if (explan) Object.assign(update_proc, { explan: explan });
            if (stageTypeId) Object.assign(update_proc, { stage_type_id: stageTypeId });
            if (projectTypeNo) Object.assign(update_proc, { project_no: projectTypeNo });
            if (modify_tm) Object.assign(update_proc, { modify_tm: modify_tm });
            if (modify_by) Object.assign(update_proc, { modify_by: modify_by });

            await createQueryBuilder()
                .update(WorkProc)
                .set({ ...update_proc })
                .where("wp_idx=:wp_idx", { wp_idx: wp_idx })
                .execute();
            //

            await createQueryBuilder()
                .update(WorkTm)
                .set({ tm_code: tmNo })
                .where("wp_idx=:wp_idx", { wp_idx: wp_idx })
                .execute();

            // 첨부파일
            if (req.files.length > 0) {
                await getRepository(WorkAttach).delete({ wp_idx: wp_idx });

                for (var file_key of Object.keys(req.files)) {
                    let new_attach = new WorkAttach();

                    new_attach.wp_idx = wp_idx;
                    new_attach.create_by = user.username;
                    new_attach.create_tm = new Date();
                    new_attach.file_name = req.files[file_key].originalname;
                    new_attach.file_path = edmsFileDir + req.files[file_key].filename;
                    new_attach.repo_path = edmsUploadFolder + req.files[file_key].filename;

                    await getRepository(WorkAttach).save(new_attach);
                }
            } else if (files != undefined && typeof files == "string") {
                let _files = JSON.parse(files);
                if (Array.isArray(_files)) {
                    let file = await getRepository(WorkAttach).find({
                        where: { wp_idx: wp_idx },
                    });

                    for (var f of file) {
                        let _file_find = _files.find(raw => raw.file_path == f.file_path);

                        if (_file_find == undefined) {
                            await getRepository(WorkAttach).delete({ wp_idx: wp_idx, wat_idx: f.wat_idx });
                        }
                    }
                }
            }

            //메일 유저
            if (emailIdList != undefined) {
                if (Array.isArray(emailIdList) && emailIdList.length > 0) {
                    await getRepository(WorkMail).delete({ wp_idx: wp_idx });
                    let new_mail = [];
                    for (var id of emailIdList) {
                        let newMail = new WorkMail();

                        newMail.user_id = id;
                        newMail.create_by = user.username;
                        newMail.is_use = 1;
                        newMail.wp_idx = wp_idx;

                        new_mail.push(newMail);
                    }
                    if (new_mail.length > 0) await getRepository(WorkMail).save(new_mail);
                }
            }
            //

            //참조처 수정
            let work_tm = await getRepository(WorkTm).findOne({
                where: { wp_idx: wp_idx },
            });

            let work_assign = await getRepository(WorkAssign).findOne({
                where: { wp_idx: wp_idx, is_cc: 1 },
            });

            let work_proc = await getRepository(WorkProc).findOne({
                where: { wp_idx: wp_idx },
            });

            // 기존과 변화할 경우
            if (referenceId != "null") {
                if (work_tm.cc_company_id != referenceId && referenceId != -1) {
                    await createQueryBuilder()
                        .update(WorkTm)
                        .set({ cc_company_id: referenceId })
                        .where("wp_idx = :wp_idx", { wp_idx: wp_idx })
                        .execute();

                    let work_tm_code = await getRepository(WorkTmCode).findOne({
                        where: { project_no: work_tm.project_type_no, company_id: referenceId },
                    });

                    if (work_assign != undefined) {
                        //work_send_recv_box
                        await createQueryBuilder()
                            .update(WorkSendRecvBox)
                            .set({ recver: work_tm_code.tm_user_id })
                            .where("wp_idx = :wp_idx AND recver = :cc_id", {
                                wp_idx: wp_idx,
                                cc_id: work_assign.assign_to_id,
                            })
                            .execute();

                        // work_assign
                        await createQueryBuilder()
                            .update(WorkAssign)
                            .set({ assign_to_id: work_tm_code.tm_user_id })
                            .where("wp_idx = :wp_idx AND is_cc = 1", { wp_idx: wp_idx })
                            .execute();
                    } else if (work_assign == undefined) {
                        let new_assign = [];

                        let newAssign = new WorkAssign();

                        newAssign.create_by = user.username;
                        newAssign.wp_idx = wp_idx;
                        newAssign.due_to_date = work_proc.create_tm;
                        newAssign.is_approval = false;
                        newAssign.approval_order = 0;
                        newAssign.is_last_approve = false;
                        newAssign.assign_from_id = user_id;
                        newAssign.assign_to_id = work_tm_code.tm_user_id;
                        newAssign.user_id = 0;
                        newAssign.is_use = 1;
                        newAssign.is_cc = 0;

                        new_assign.push(newAssign);

                        let new_send_recv = [];

                        let newSendRecv = new WorkSendRecvBox();

                        newSendRecv.create_by = user.username;
                        newSendRecv.is_use = 0;
                        newSendRecv.wp_idx = wp_idx;
                        newSendRecv.work_code = work_proc.wp_code;
                        newSendRecv.sender = user_id;
                        newSendRecv.recver = work_tm_code.tm_user_id;
                        newSendRecv.comment = 0;
                        newSendRecv.state = 2;
                        newSendRecv.user_id = user_id;

                        new_send_recv.push(newSendRecv);

                        if (new_assign.length > 0) await getRepository(WorkAssign).save(new_assign);
                        if (new_send_recv.length > 0) await getRepository(WorkSendRecvBox).save(new_send_recv);
                    }

                    // 참조처가 없는 경우
                } else if (work_tm.cc_company_id != referenceId && referenceId == -1) {
                    let work_tm_code = await getRepository(WorkTmCode).findOne({
                        where: { project_no: work_tm.project_type_no, company_id: work_tm.cc_company_id },
                    });
                    await getRepository(WorkSendRecvBox).delete({ wp_idx: wp_idx, recver: work_tm_code.tm_user_id });
                    await getRepository(WorkAssign).delete({ wp_idx: wp_idx, is_cc: 1 });

                    await createQueryBuilder()
                        .update(WorkTm)
                        .set({ cc_company_id: referenceId })
                        .where("wp_idx = :wp_idx", { wp_idx: wp_idx })
                        .execute();
                }
            }
            //

            // 선택파일 부분 변경
            if (docuList != undefined && fileList != undefined) {
                if (Array.isArray(docuList) && docuList.length > 0 && Array.isArray(fileList) && fileList.length > 0) {
                    await getRepository(WorkDocu).delete({ wp_idx: wp_idx });
                    await getRepository(WorkFile).delete({ wp_idx: wp_idx });

                    let new_work_docu = [];
                    let new_work_file = [];
                    for (var i = 0; i < docuList.length; i++) {
                        // 문서번호
                        let new_docu_no = docuList[i];
                        // 파일번호
                        let new_file_no = fileList[i];

                        //work_docu 생성
                        let newWorkDocu = new WorkDocu();

                        newWorkDocu.create_by = user.username;
                        newWorkDocu.wp_idx = wp_idx;
                        newWorkDocu.docu_no = new_docu_no;
                        newWorkDocu.user_id = user.user_id;
                        newWorkDocu.is_use = 1;
                        new_work_docu.push(newWorkDocu);

                        //work_file 생성
                        let newWorkFile = new WorkFile();

                        newWorkFile.create_by = user.username;
                        newWorkFile.is_use = 1;
                        newWorkFile.wp_idx = wp_idx;
                        newWorkFile.file_no = new_file_no;
                        newWorkFile.docu_no = new_docu_no;
                        newWorkFile.user_id = user.user_id;

                        new_work_file.push(newWorkFile);
                    }
                    if (new_work_docu.length > 0) await getRepository(WorkDocu).save(new_work_docu);
                    if (new_work_file.length > 0) await getRepository(WorkFile).save(new_work_file);
                }
            }
        }
        //

        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.use("/din", din);
router.use("/drn", drn);
router.use("/tm", tm);
router.use("/sr", sendrecv);
router.use("/achieve", achieve);
router.use("/mydocument", mydocument);
router.use("/plant", plant);

export default router;
