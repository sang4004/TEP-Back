import { createQueryBuilder, getConnection, getRepository, In, Not, Tree } from "typeorm";
import {
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    WorkProc,
    WorkAssign,
    WorkSendRecvBox,
    EdmsDocumentManager,
} from "@/entity";
import { getMoment, fillZero } from "@/lib/utils";

import { LANGUAGE_PACK } from "@/lib/format";
import { logger } from "@/lib/winston";

export const update_assign_state = async (
    assign_state: number,
    wa_idx: any,
    is_approve?: boolean,
    comment: string = ""
) => {
    try {
        if (is_approve) {
            await getConnection()
                .createQueryBuilder()
                .update(WorkAssign)
                .set({
                    is_use: 1,
                    assign_state: assign_state,
                    is_approval: true,
                    assign_date: new Date(),
                    modify_tm: new Date(),
                    comment: comment,
                })
                .where(`wa_idx IN (${Array.isArray(wa_idx) ? wa_idx.join(",") : wa_idx})`)
                .execute();
            return true;
        } else {
            await getConnection()
                .createQueryBuilder()
                .update(WorkAssign)
                .set({
                    is_use: 1,
                    assign_state: assign_state,
                    is_approval: true,
                    modify_tm: new Date(),
                    comment: comment,
                })
                .where(`wa_idx IN (${Array.isArray(wa_idx) ? wa_idx.join(",") : wa_idx})`)
                .execute();
            return true;
        }
    } catch (err) {
        logger.error(err);
    }
    return false;
};

export const GetDocumentManager = async (
    docu_no?: number[],
    company_id?: number,
    user_id?: number[]
): Promise<EdmsDocumentManager[]> => {
    let document_manager_list: EdmsDocumentManager[] = [];
    if (docu_no) {
        let documents = await getRepository(EdmsDocument).find({ docu_no: In(docu_no), is_use: 1 });
        if (documents.length > 0) {
            let cates = await getRepository(EdmsCategory).find({
                cate_no: In([...documents.map(raw => raw.cate_no)]),
                is_use: 1,
            });
            document_manager_list = await getRepository(EdmsDocumentManager).find({
                discipline_id: In([...cates.map(raw => raw.discipline_id)]),
                is_use: 1,
            });
            // 유저아이디들과 회사아이디로 한번더 필터
            document_manager_list = document_manager_list.filter(raw => {
                if (user_id) return user_id.indexOf(raw.user_id) != -1;
                else if (company_id) return company_id == raw.company_id;
                else return true;
            });
        }
    } else if (user_id) {
        document_manager_list = await getRepository(EdmsDocumentManager).find({
            user_id: In(user_id),
            is_use: 1,
        });
    } else if (company_id) {
        document_manager_list = await getRepository(EdmsDocumentManager).find({ company_id, is_use: 1 });
    }

    // 중복 유저 제거
    let result = [];
    for (var docu_mng of document_manager_list) {
        if (result.find(raw => raw.user_id == docu_mng.user_id) != undefined) continue;
        result.push(docu_mng);
    }
    return result;
};

export const getWorkCode = (type: any, last_number: number) => {
    return `${type}${getMoment(new Date()).format("YYYYMMDD")}-${last_number}`;
};

export const CheckTopCateNo = (cate_no: number, data: any[], result?: number[]) => {
    let res = [];
    if (result) res = result;
    res.push(cate_no);
    let _list = data.filter((obj: any) => obj.cate_no == cate_no);
    if (_list.length == 0) return res;

    let pcate_no = _list[0].pcate_no;
    if (pcate_no == 0) return res;
    else return CheckTopCateNo(pcate_no, data, res);
};

// file code 생성
// export const newFileCode = async (docu_no: number) => {
//     try {
//         let files = await getRepository(EdmsFiles).find({
//             where: { docu_no: docu_no, is_use: 1 },
//             order: { file_code: "DESC" },
//         });
//         let file_code = "";
//         if (files.length == 0) {
//             file_code = `${docu_no}_N001_V001`;
//         } else {
//             let file = files[0];
//             let _ = file.file_code.split("_");
//             _[1] = "N" + fillZero(3, (parseInt(_[1].replace("N", "")) + 1).toString());
//             _[2] = "V0001";
//             file_code = _.join("_");
//         }
//         return file_code;
//     } catch (err) {
//         logger.error(err);
//     }
//     return "";
// };

export const tm_update_assign_state = async (assign_state: number, wp_idx: any, wa_idx: any, due_to_date: Date) => {
    try {
        await getConnection()
            .createQueryBuilder()
            .update(WorkAssign)
            .set({ is_use: 1, assign_state: assign_state, due_to_date: due_to_date })
            .where("wa_idx IN (:idx)", { idx: wa_idx })
            .execute();
        await getConnection()
            .createQueryBuilder()
            .update(WorkProc)
            .set({ due_date: due_to_date })
            .where("wp_idx IN (:idx)", { idx: wp_idx })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

export const send_recv_box_update = async (wp_idx: number, recver_id: number) => {
    try {
        await getConnection()
            .createQueryBuilder()
            .update(WorkSendRecvBox)
            .set({ is_use: 1 })
            .where("wp_idx = :wpIdx AND recver = :recverId", { wpIdx: wp_idx, recverId: recver_id })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

export const parseFileStageCode = (stage_code: string) => {
    if (stage_code.indexOf("Issue") != -1) {
        return { stage: stage_code, type: "i" };
    } else if (stage_code.indexOf("Approval") != -1) {
        return { stage: stage_code, type: "a" };
    }
    return { stage: stage_code, type: "" };
};

export const get_proc_state_text = (
    wp_type: string,
    tm_state: number,
    assign_state: number,
    is_tm_manager: boolean,
    is_approver?: boolean,
    is_cc?: boolean
) => {
    if (wp_type.toLocaleLowerCase() == "tm") {
        //참조 제외
        if (is_tm_manager && assign_state < 15) {
            switch (tm_state) {
                case 1:
                    return LANGUAGE_PACK.WORK_PROC.CREATE.kor;
                case 2:
                    return assign_state == 15
                        ? LANGUAGE_PACK.WORK_PROC.CC.default.kor
                        : LANGUAGE_PACK.WORK_PROC.SIGNATURE.IN_WAIT.kor;
                case 3:
                    return LANGUAGE_PACK.WORK_PROC.SIGNATURE.IN_COMPLETE.kor;
                case 4:
                    return LANGUAGE_PACK.WORK_PROC.SIGNATURE.REJECT.kor;
                case 5:
                    return LANGUAGE_PACK.WORK_PROC.SEND.DO.kor;
                case 6:
                    return is_approver
                        ? LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor
                        : LANGUAGE_PACK.WORK_PROC.SEND.COMPLETE.kor;
                case 7:
                    return LANGUAGE_PACK.WORK_PROC.REVIEW.REQUEST_ING.kor;
                case 8:
                    return is_cc
                        ? LANGUAGE_PACK.WORK_PROC.CC.CONFIRM_COMPLETE.kor
                        : assign_state == 7
                        ? //assign_state == 10 ||
                          LANGUAGE_PACK.WORK_PROC.COMPLETE.kor
                        : LANGUAGE_PACK.WORK_PROC.REPLY.default.kor;
                case 9:
                    return assign_state == 13
                        ? LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURED.kor
                        : LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURE.kor;
                case 10:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURE_REJECT.kor;
                case 11:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURE_COMPLETE.kor;
                case 12:
                    return assign_state == 7
                        ? LANGUAGE_PACK.WORK_PROC.REPLY.default.kor
                        : assign_state == 8
                        ? LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor
                        : LANGUAGE_PACK.WORK_PROC.COMPLETE.kor;
                case 13:
                    return LANGUAGE_PACK.WORK_PROC.CC.CONFRIM_WAIT.kor;
                case 14:
                    return LANGUAGE_PACK.WORK_PROC.CC.REVIEW_COMPLETE.kor;
                default:
                    return " ";
            }
        } else {
            switch (assign_state) {
                case 1:
                    return LANGUAGE_PACK.WORK_PROC.CREATE.kor;
                case 2:
                    return is_approver
                        ? LANGUAGE_PACK.WORK_PROC.SIGNATURE.DO.kor
                        : LANGUAGE_PACK.WORK_PROC.SIGNATURE.WAIT.kor;
                case 3:
                    return LANGUAGE_PACK.WORK_PROC.SIGNATURE.COMPLETE.kor;
                case 4:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.default.kor;
                case 5:
                    return LANGUAGE_PACK.WORK_PROC.SIGNATURE.REJECT.kor;
                case 6:
                    return LANGUAGE_PACK.WORK_PROC.SEND.default.kor;
                case 7:
                    return LANGUAGE_PACK.WORK_PROC.SEND.COMPLETE.kor;
                case 8:
                    return LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor;
                case 9:
                    return LANGUAGE_PACK.WORK_PROC.CC.CONFRIM_WAIT.kor;
                case 10:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
                case 11:
                    return LANGUAGE_PACK.WORK_PROC.COMPLETE.kor;
                case 12:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
                case 13:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURED.kor;
                case 14:
                    return LANGUAGE_PACK.WORK_PROC.REPLY.COMPLETE.kor;
                case 15:
                    return tm_state == 9
                        ? LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURE.kor
                        : LANGUAGE_PACK.WORK_PROC.REVIEW.REQUEST_ING.kor;
                case 16:
                    return LANGUAGE_PACK.WORK_PROC.CC.REVIEW_WAIT.kor;
                case 17:
                    return LANGUAGE_PACK.WORK_PROC.CC.CONFIRM_COMPLETE.kor;
                case 18:
                    return LANGUAGE_PACK.WORK_PROC.CC.CONFIRM_REJECT.kor;
                case 19:
                    return LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor;
                default:
                    return " ";
            }
        }
    } else if (wp_type == "din") {
        switch (assign_state) {
            case 1:
                return LANGUAGE_PACK.WORK_PROC.CREATE.kor;
            case 2:
                return LANGUAGE_PACK.WORK_PROC.RECEIVE.default.kor;
            case 3:
                return LANGUAGE_PACK.WORK_PROC.RECEIVE.default.kor;
            case 4:
                return LANGUAGE_PACK.WORK_PROC.RECEIVE.COMPLETE.kor;
            default:
                return "발송전";
        }
    } else {
        switch (assign_state) {
            case 1:
                return LANGUAGE_PACK.WORK_PROC.CREATE.kor;
            case 2:
                return is_approver ? LANGUAGE_PACK.WORK_PROC.REVIEW.DO.kor : LANGUAGE_PACK.WORK_PROC.REVIEW.WAIT.kor;
            case 3:
                return LANGUAGE_PACK.WORK_PROC.SIGNATURE.COMPLETE.kor;
            case 4:
                return LANGUAGE_PACK.WORK_PROC.REPLY.default.kor;
            case 5:
                return LANGUAGE_PACK.WORK_PROC.SIGNATURE.REJECT.kor;
            case 6:
                return LANGUAGE_PACK.WORK_PROC.SEND.default.kor;
            case 7:
                return LANGUAGE_PACK.WORK_PROC.SEND.COMPLETE.kor;
            case 8:
                return LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor;
            case 9:
                return LANGUAGE_PACK.WORK_PROC.CC.CONFRIM_WAIT.kor;
            case 10:
                return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
            case 11:
                return LANGUAGE_PACK.WORK_PROC.COMPLETE.kor;
            case 12:
                return LANGUAGE_PACK.WORK_PROC.REPLY.DO.kor;
            case 13:
                return LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURED.kor;
            case 14:
                return LANGUAGE_PACK.WORK_PROC.REPLY.SIGNATURE_COMPLETE.kor;
            case 15:
                return LANGUAGE_PACK.WORK_PROC.CC.default.kor;
            case 16:
                return LANGUAGE_PACK.WORK_PROC.CC.RECEIVE.kor;
            case 17:
                return LANGUAGE_PACK.WORK_PROC.CC.CONFIRM.kor;
            case 18:
                return LANGUAGE_PACK.WORK_PROC.SIGNATURE.REJECT.kor;
            case 19:
                return LANGUAGE_PACK.WORK_PROC.REGIST_N_DEPLOY.kor;
            default:
                return " ";
        }
    }
};
