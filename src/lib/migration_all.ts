// env import
import "@/env";
// library
import path from "path";
import "../global";
import fs from "fs";
import cpFile from "cp-file";
import momentBD from "moment-business-days";
import { getConnection, getRepository, Like, In } from "typeorm";
// module
import Database from "@/lib/database";
import {
    WorkProc,
    WorkReview,
    WorkTmCode,
    EdmsCompany,
    EdmsUser,
    WorkAssign,
    WorkDocu,
    EdmsDocument,
    EdmsCategory,
    EdmsAuthority,
    EdmsFiles,
    WorkAttach,
    WorkTm,
    EdmsStage,
    WorkFile,
    EdmsProjectType,
    EdmsStageType,
    WorkTmHistory,
} from "@/entity";
import { GetReviewData, newFileCode, checkExistFileRevision } from "@/routes/api/v1/edms/files";
import { UpdateCodeFromTm } from "@/routes/api/v1/edms/work/tm";
import { UnZip } from "@/lib/zip";
import { CallDirTree, DirResultType } from "@/lib/pathutil";
import { logger } from "@/lib/winston";

// readUserInput
import readlineSync from "readline-sync";
import moment from "moment";
import {
    getMoment,
    get_document_number,
    deleteFileSync,
    getFileExtensionType,
    getDateTime,
    mvEdmsFile,
    GetNextStage,
    getFileExtension,
} from "./utils";
import { edmsFileDir, edmsUploadFolder } from "../constant";
import { getFileStageData } from "@/routes/api/v1/edms/work";
import { Procedure } from "@/lib/procedure";
import { MakeVP } from "@/lib/makevp";

const notExtensionList = ["ZIP"];

export const getOtherFileType = (file_type: string) => {
    if (
        file_type === "IMODEL" ||
        file_type === "DGN" ||
        file_type === "NWD" ||
        file_type === "BIM" ||
        file_type === "DWG"
    ) {
        return "001";
    } else if (file_type === "PDF") {
        return "002";
    } else {
        return "003";
    }
};

const addWorkingDay = (day: Date, addDay: number) => {
    let m = momentBD(day);
    m = m.businessAdd(addDay);
    return m;
};

const create_drn_for_review_excel = async (user: EdmsUser, tm: WorkProc) => {
    let tm_code_user = await getRepository(WorkTmCode).findOne({
        where: { company_id: user.company_id, project_no: tm.project_no },
    });
    let newProc = new WorkProc();

    newProc.wp_type = "DRN";
    newProc.wp_date = new Date();
    newProc.wp_code = "DRN-" + tm.wp_code;
    newProc.project_no = tm.project_no;
    newProc.series_no = 1;
    newProc.account_ym = moment().format("YYYYMM");
    newProc.subject = tm.wp_code + " " + tm.subject;
    newProc.explan = "";
    newProc.requester_id = tm_code_user.tm_user_id;
    newProc.approver_id = user.user_id;
    newProc.due_date = new Date();
    newProc.create_by = user.username;
    newProc.create_tm = new Date();
    newProc.user_id = user.user_id;
    newProc.original_tm_id = tm.wp_idx;
    newProc.stage_type_id = 0;

    let insertProc = await getRepository(WorkProc).save(newProc);

    // 기안자
    let requesterAssign = new WorkAssign();

    requesterAssign.wp_idx = insertProc.wp_idx;
    requesterAssign.is_approval = false;
    requesterAssign.approval_order = 0;
    requesterAssign.is_last_approve = false;
    requesterAssign.assign_from_id = tm_code_user.tm_user_id;
    requesterAssign.assign_to_id = tm_code_user.tm_user_id;
    requesterAssign.assign_state = 1;
    requesterAssign.create_by = user.username;
    requesterAssign.create_tm = new Date();
    requesterAssign.due_to_date = new Date();

    await getRepository(WorkAssign).save(requesterAssign);

    // 결재자
    let approverAssign = new WorkAssign();

    approverAssign.wp_idx = insertProc.wp_idx;
    approverAssign.approval_order = 1;
    approverAssign.assign_from_id = tm_code_user.tm_user_id;
    approverAssign.assign_to_id = user.user_id;
    approverAssign.create_by = user.username;
    approverAssign.due_to_date = new Date();
    approverAssign.wp_idx = insertProc.wp_idx;
    approverAssign.assign_state = 2;
    approverAssign.is_last_approve = true;
    approverAssign.is_approval = false;

    await getRepository(WorkAssign).save(approverAssign);

    return insertProc;
};

const get_code_type = (code: string) => {
    if (code && code.replace) return parseInt(code.replace(/[^\d]/g, "")[0]);
    else return parseInt(code.toString());
};

//#region legacy
// 하드코딩
const TEP = ["TEP", "통영", "에코파워"];
const SHIN = ["신한", "SHIN", "A&E"];
const HTC = ["휴먼텍", "HTC"];
const HENC = ["HENC", "한화"];
export const getCompanyChar = (str?: string) => {
    if (str) {
        for (var t of TEP) {
            if (t.indexOf(str) != -1 || str.indexOf(t) != -1) {
                return 1;
            }
        }
        for (var s of SHIN) {
            if (s.indexOf(str) != -1 || str.indexOf(s) != -1) {
                return 2;
            }
        }
        for (var h of HTC) {
            if (h.indexOf(str) != -1 || str.indexOf(h) != -1) {
                return 3;
            }
        }
        for (var hw of HENC) {
            if (hw.indexOf(str) != -1 || str.indexOf(hw) != -1) {
                return 4;
            }
        }
    }
    return 0;
};
//#endregion

export interface reviewExcelType {
    No: string;
    Document_Number: string;
    Description: string;
    Page_Sheet_No: string;
    [key: string]: string;
}

const MAX_REVIEW_CHECK_COUNT = 5;
const hasReviewData = (data: reviewExcelType) => {
    let isReview = false;
    for (var i = 0; i < MAX_REVIEW_CHECK_COUNT; i++) {
        if (data["rev" + i] != undefined && data["rev" + i].toString().length > 0) {
            isReview = true;
            break;
        }
    }
    if ((data.Document_Number || data.Description) && isReview) {
        return true;
    } else {
        return false;
    }
};

const checkUploadedReview = (wrList: WorkReview[], data: reviewExcelType, findReviewIndex?: number) => {
    let sameReview: WorkReview | null = null;
    for (let review of wrList) {
        // comment or reply, revision,document_number etc 비교
        if ((review.contents != "" || review.reply != "") && review.revision != null && review.revision != "") {
            if (findReviewIndex != undefined) {
                if (
                    (review.contents == data["review" + findReviewIndex] ||
                        review.reply == data["reply" + findReviewIndex]) && // 리뷰나 답변 하나만 같아도
                    data["rev" + findReviewIndex] == review.revision && // rev check
                    get_code_type(data["result" + findReviewIndex]) == review.code // code check
                ) {
                    sameReview = review;
                }
            } else {
                for (var i = 0; i < MAX_REVIEW_CHECK_COUNT; i++) {
                    if (
                        (review.contents == data["review" + i] || review.reply == data["reply" + i]) && // 리뷰나 답변 하나만 같아도
                        data["rev" + i] == review.revision && // rev check
                        get_code_type(data["result" + i]) == review.code // code check
                    ) {
                        sameReview = review;
                        break;
                    }
                }
            }
            if (sameReview) {
                if (sameReview.p_wr_idx != 0 && findReviewIndex == undefined) {
                    sameReview = wrList.find(r => r.wr_idx == sameReview.p_wr_idx);
                }
                return sameReview;
            }
        }
    }
    return undefined;
};

export const create_review_excel = async (
    user_id: number,
    ex_list: reviewExcelType[],
    wp_idx: number,
    is_fin: boolean = false
) => {
    try {
        if (Array.isArray(ex_list)) {
            const uploadFolderRealPath = path.resolve(__dirname, "../../../../../../../") + "/";
            let user = await getRepository(EdmsUser).findOne({ is_use: 1, user_id });
            let tm = await getRepository(WorkProc).findOne({
                where: { wp_idx: wp_idx },
            });
            let reviewer: EdmsUser;
            let newReviews: WorkReview[] = [];
            await getConnection().transaction(async tr => {
                for (var data of ex_list) {
                    if (data.Document_Number != undefined && data.Description != undefined) {
                        //도큐먼트 로드
                        let isAll = data.Document_Number.toLowerCase().indexOf("all") != -1;
                        let document = await tr
                            .getRepository(EdmsDocument)
                            .findOne({ docu_code: data.Document_Number });
                        let isReview = hasReviewData(data);
                        if (document == undefined && !isAll && isReview == false) {
                            console.log(`잘못된 Document No : ${data.Document_Number}`);
                            continue;
                        }

                        // 가장 최근 파일 불러오기
                        let recent_file = document
                            ? await tr
                                  .getRepository(EdmsFiles)
                                  .findOne({ docu_no: document.docu_no, is_use: 1, is_last_version: "Y" })
                            : undefined;
                        // TR생성시에 엑셀 업로드로 만들어질 경우 master_review => undefined
                        let wr_idx_list = [];
                        if (data.No)
                            if (typeof data.No == "string" && data.No.indexOf(",") != -1)
                                wr_idx_list = data.No.split(",").map(raw => parseInt(raw));
                            else wr_idx_list = [parseInt(data.No)];

                        let master_review: any | WorkReview = await tr.getRepository(WorkReview).findOne({
                            where: { wr_idx: wr_idx_list[0] },
                        });
                        let workReviewList = await tr.query(
                            `
                            SELECT wr.* 
                            FROM work_review wr
                            INNER JOIN work_proc wp
                            ON wp.original_tm_id = ${tm.wp_idx} 
                                OR wp.wp_idx = ${tm.wp_idx}
                            WHERE wr.wp_idx = wp.wp_idx
                                ORDER BY wp.wp_idx ASC, wr.order ASC;
                        `
                        );
                        if (master_review) wp_idx = master_review.wp_idx;
                        else {
                            // 동일한 리비전, 검토결과, document, 코멘트로 이루어진 리뷰가 있다면, 그거로 함.
                            master_review = checkUploadedReview(workReviewList, data);
                        }

                        // 작성 하는곳 정보 가져오기 & 이전리뷰가 없다면 새로 DRN 생성
                        if (is_fin && master_review) {
                            reviewer = await getRepository(EdmsUser).findOne({
                                is_use: 1,
                                user_id: master_review ? master_review.reviewer_id : user_id,
                            });
                        } else {
                            reviewer = await getRepository(EdmsUser).findOne({
                                is_use: 1,
                                username: Like(`%${data["create_by0"]}%`),
                            });
                            if (reviewer == undefined) {
                                let company_id = getCompanyChar(data["create_by0"]);
                                // 회사명으로 들어올경우 회사이름으로 파싱
                                reviewer = await getRepository(EdmsUser).findOne({
                                    is_use: 1,
                                    company_id: company_id,
                                });
                            }
                        }
                        if (master_review == undefined || is_fin) {
                            let wp = await create_drn_for_review_excel(reviewer ? reviewer : user, tm);
                            wp_idx = wp.wp_idx;
                        }
                        //
                        if (wp_idx != -1) {
                            // 현재 wp_idx 에 존재하는 모든 리뷰 로드
                            // TR생성시 불릴경우 기존 review 는 사용하지않음
                            if (is_fin) {
                                wr_idx_list = [];
                                master_review = undefined;
                            }

                            let exist_review: any[] = [];
                            if (wr_idx_list.length > 0) {
                                exist_review = await tr.query(
                                    `
                                    SELECT wr.*, eu.company_id
                                    FROM work_review wr
                                    INNER JOIN edms_user eu
                                        ON eu.user_id = wr.reviewer_id
                                    WHERE wr.wr_idx IN (${wr_idx_list.join(",")})
                                        ORDER BY wr."order";
                                `
                                );
                            }
                            let exist_attach = await tr
                                .getRepository(WorkAttach)
                                .find({ wr_idx: In(exist_review.map(raw => raw.wr_idx)) });
                            //엑셀파일 result가 있는지 판단
                            let prev_review: WorkReview = master_review;
                            let idx = 0;
                            let nowReviewResult = data["result" + idx];
                            let nowReviewDate = data["date" + idx];
                            //
                            let exist_review_a = undefined;
                            let exist_reply_a = undefined;

                            while (nowReviewDate) {
                                let code = get_code_type(nowReviewResult ? nowReviewResult : "0");

                                if (code < 1 || code > 4 || isNaN(code)) {
                                    if (is_fin) {
                                        // TM생성시에는 그냥 다음거로 넘어가게
                                        exist_review[idx] = undefined;
                                    } else {
                                        console.log(`잘못된 코드 : ${code}`);
                                        code = 0;
                                    }
                                }

                                if (data["change" + idx] != "Y" && data["change" + idx] != "N")
                                    data["change" + idx] = "N";

                                let d = {
                                    code: code,
                                    contents: data["review" + idx] ? data["review" + idx] : "",
                                    reply: data["reply" + idx] ? data["reply" + idx] : "",
                                    is_change_design: data["change" + idx] == "Y" ? "Y" : "N",
                                    modify_tm: new Date(),
                                    create_tm: new Date(),
                                    create_by: data["create_by" + idx],
                                    revision: data["rev" + idx],
                                    pageSheetNo: data["Page_Sheet_No"],
                                };

                                // let isContent =
                                //     (d.contents != undefined && d.contents != "") ||
                                //     (d.reply != undefined && d.reply != "");
                                let isAuth =
                                    exist_review[idx] == undefined ||
                                    exist_review[idx].compnay_id === user.company_id ||
                                    exist_review[idx].reviewer_id === user.user_id;
                                // 코드도, 리비전도, 컨텐츠도 없다면 그냥 작성안해보림
                                let isLastReview =
                                    (d.revision == undefined || d.revision == "") &&
                                    code == 0 &&
                                    (d.contents == undefined || d.contents == "" || d.contents.length == 0) &&
                                    data["date" + (idx + 1)] == undefined;
                                // 기존에 작성했던 회차의 리뷰일가능성이 높음.
                                let isExistReview = checkUploadedReview(workReviewList, data, idx);
                                if (isAuth && isReview && !isLastReview && !isExistReview) {
                                    // 다른유저의 정보는 수정불가
                                    // 2022-05-23 같으회사면 수정 가능하게
                                    // create_tm set
                                    let create_tm: Date = null;
                                    if (data["date" + idx] && getMoment(data["date" + idx]).isValid()) {
                                        create_tm = getMoment(data["date" + idx]).toDate();
                                    }
                                    d.create_tm = create_tm;
                                    //
                                    let review_a = data["review_attach" + idx];
                                    let reply_a = data["reply_attach" + idx];

                                    // 이부분은 컨텐츠의 경우 빈 string이 될수없기에 미리 예외처리해주는것
                                    // 코드도 0 이고 리비전도 없다면 그냥 끝내는게 맞음.
                                    if (d.contents == undefined || d.contents == "" || d.contents.length == 0) {
                                        d.contents = " ";
                                    }
                                    //
                                    if (exist_review[idx]) {
                                        await tr
                                            .createQueryBuilder()
                                            .update(WorkReview)
                                            .set({
                                                code: d.code,
                                                contents: `${encodeURIComponent(d.contents)}`,
                                                reply: `${encodeURIComponent(d.reply)}`,
                                                is_change_design: d.is_change_design,
                                                modify_tm: d.modify_tm,
                                                create_tm: d.create_tm,
                                                revision: d.revision,
                                                page_sheet_no: d.pageSheetNo,
                                            })
                                            .where("wr_idx = :id", { id: exist_review[idx].wr_idx })
                                            .execute();
                                        prev_review = exist_review[idx];
                                        exist_review_a = exist_attach.find(
                                            raw => raw.wr_idx == exist_review[idx].wr_idx && raw.flag == 1
                                        );
                                        exist_reply_a = exist_attach.find(
                                            raw => raw.wr_idx == exist_review[idx].wr_idx && raw.flag == 2
                                        );
                                    } else {
                                        let newReview = new WorkReview();
                                        newReview.wp_idx = wp_idx;
                                        newReview.code = d.code;
                                        newReview.contents = `${encodeURIComponent(d.contents)}`;
                                        newReview.create_tm = getMoment(new Date()).toDate();
                                        newReview.reply = `${encodeURIComponent(d.reply)}`;
                                        newReview.is_change_design = d.is_change_design;
                                        newReview.user_id = user.user_id; // reviewer ? reviewer.user_id :
                                        newReview.reviewer_id = reviewer ? reviewer.user_id : user.user_id;
                                        newReview.review_date = d.create_tm ? d.create_tm : null;
                                        newReview.create_by = reviewer ? reviewer.username : user.username;
                                        newReview.docu_no = prev_review
                                            ? prev_review.docu_no
                                            : document
                                            ? document.docu_no
                                            : -1;
                                        newReview.file_no = prev_review
                                            ? prev_review.file_no
                                            : recent_file
                                            ? recent_file.file_no
                                            : -1;
                                        newReview.p_wr_idx = prev_review ? prev_review.wr_idx : 0;
                                        newReview.order = idx;
                                        newReview.is_fin = is_fin ? 1 : 0;
                                        newReview.revision = d.revision;
                                        newReview.page_sheet_no = d.pageSheetNo;
                                        let insertReview = await getRepository(WorkReview).save(newReview);
                                        newReviews.push(insertReview);
                                        prev_review = insertReview;
                                    }
                                    //#region work attach 리뷰 코멘트 이미지 파일
                                    if (exist_review_a) {
                                        deleteFileSync(uploadFolderRealPath + exist_review_a.repo_path);
                                        await tr
                                            .createQueryBuilder()
                                            .update(WorkAttach)
                                            .set({
                                                file_name: review_a,
                                                file_path: edmsFileDir + review_a,
                                                repo_path: edmsUploadFolder + review_a,
                                            })
                                            .where(`wat_idx=${exist_review_a.wat_idx}`)
                                            .execute();
                                    } else {
                                        let newAttach = new WorkAttach();
                                        newAttach.file_name = review_a;
                                        newAttach.file_path = edmsFileDir + review_a;
                                        newAttach.wp_idx = wp_idx;
                                        newAttach.wr_idx = prev_review.wr_idx;
                                        newAttach.flag = 1;
                                        newAttach.create_by = is_fin && reviewer ? reviewer.username : user.username;
                                        newAttach.repo_path = edmsUploadFolder + review_a;
                                        await getRepository(WorkAttach).save(newAttach);
                                    }
                                    if (exist_reply_a) {
                                        deleteFileSync(uploadFolderRealPath + exist_reply_a.repo_path);
                                        await tr
                                            .createQueryBuilder()
                                            .update(WorkAttach)
                                            .set({
                                                file_name: reply_a,
                                                file_path: edmsFileDir + reply_a,
                                                repo_path: edmsUploadFolder + reply_a,
                                            })
                                            .where(`wat_idx=${exist_reply_a.wat_idx}`)
                                            .execute();
                                    } else {
                                        let newAttach = new WorkAttach();
                                        newAttach.file_name = reply_a;
                                        newAttach.file_path = edmsFileDir + reply_a;
                                        newAttach.wp_idx = wp_idx;
                                        newAttach.wr_idx = prev_review.wr_idx;
                                        newAttach.flag = 2;
                                        newAttach.create_by = is_fin && reviewer ? reviewer.username : user.username;
                                        newAttach.repo_path = edmsUploadFolder + reply_a;
                                        await getRepository(WorkAttach).save(newAttach);
                                    }
                                    //#endregion
                                } else if (isExistReview) {
                                    prev_review = isExistReview;
                                }
                                // next
                                idx += 1;
                                nowReviewResult = data["result" + idx];
                                nowReviewDate = data["date" + idx];
                            }
                        }
                    }
                }
            });
            return newReviews;
        }
    } catch (err) {
        logger.error(err);
        console.log(err);
        return null;
    }
    return null;
};

export const ReadUserInputText = async (): Promise<string> => {
    return new Promise(r => {
        let doc_path = readlineSync.question("경로 : ");
        r(doc_path);
    });
};

export const ReadUserInputSelect = async (category: string[]): Promise<number> => {
    return new Promise(r => {
        var index = readlineSync.keyInSelect(category, "프로젝트 유형 : ");
        r(index);
    });
};
//
//#region 한글비교
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]/]/g, "/$&"); // $& means the whole matched string
}
function ch2pattern(ch) {
    const offset = 44032; /* '가'의 코드 */
    // 한국어 음절
    if (/[가-힣]/.test(ch)) {
        const chCode = ch.charCodeAt(0) - offset;
        // 종성이 있으면 문자 그대로를 찾는다.
        if (chCode % 28 > 0) {
            return ch;
        }

        const begin = Math.floor(chCode / 28) * 28 + offset;
        const end = begin + 27;
        return `[/u${begin.toString(16)}-/u${end.toString(16)}]`;
    }

    // 한글 자음
    if (/[ㄱ-ㅎ]/.test(ch)) {
        const con2syl = {
            ㄱ: "가".charCodeAt(0),
            ㄲ: "까".charCodeAt(0),
            ㄴ: "나".charCodeAt(0),
            ㄷ: "다".charCodeAt(0),
            ㄸ: "따".charCodeAt(0),
            ㄹ: "라".charCodeAt(0),
            ㅁ: "마".charCodeAt(0),
            ㅂ: "바".charCodeAt(0),
            ㅃ: "빠".charCodeAt(0),
            ㅅ: "사".charCodeAt(0),
        };
        const begin = con2syl[ch] || (ch.charCodeAt(0) - 12613) /* 'ㅅ'의 코드 */ * 588 + con2syl["ㅅ"];
        const end = begin + 587;
        return `[${ch}/u${begin.toString(16)}-/u${end.toString(16)}]`;
    }

    // 그 외엔 그대로 내보냄
    // escapeRegExp는 lodash에서 가져옴
    return escapeRegExp(ch);
}

//#endregion
// REGEX
const getTRCode = (folder_name: string) => {
    try {
        let code = /\[(.*?)\]/gi.exec(folder_name);
        if (code.length > 1) {
            let _code = code[1];
            folder_name = folder_name.split("\\")[folder_name.split("\\").length - 1];
            folder_name = folder_name.replace(`[${_code}]`, "");
            return { code: _code, subject: folder_name };
        } else throw "?";
    } catch (err) {
        return { code: null, subject: null };
    }
};
//
//#region all file unzip
const unzipInFolder = async (_path: string, skip?: number) => {
    // get folder & file list
    var results: DirResultType[] = [];
    var tree: directoryTree.DirectoryTree = null;

    CallDirTree(_path, results, true);
    var i = skip ? skip : 0;
    for (; i < results.length; i++) {
        let items = results[i].items;
        for (var p of items) {
            console.log(`TR PROCESS :: Unzip : ${p}`);
            try {
                await UnZip(p);
            } catch (err) {
                console.log("zip err : ", err);
            }
        }
    }
};
//#endregion

const uploadEdmsFiles = async (
    files: {
        docu: EdmsDocument;
        filepath: string;
        revision: number;
        revisionOrigin: number | string;
        revisionType: number;
        full_stage_code: string;
    }[],
    exist_files: EdmsFiles[],
    issuedDate: Date
): Promise<EdmsFiles[]> => {
    let newFiles = [];
    for (var file of files) {
        if (file !== null) {
            // console.log("!!!! :::: ",file.filepath);
            let filename = file.filepath.split("\\")[file.filepath.split("\\").length - 1];
            const document = file.docu;
            const _file = exist_files ? exist_files.find(raw => raw.docu_no == document.docu_no) : undefined;
            const new_file = new EdmsFiles();
            new_file.project_no = file.docu.project_no;
            new_file.cate_no = document.cate_no;
            new_file.docu_no = document.docu_no;
            new_file.root_path = file.filepath;
            new_file.file_name = filename;
            new_file.file_type = getFileExtensionType("", filename);
            let code_res = await newFileCode(document.docu_no);
            new_file.fversion = _file ? _file.fversion + 1 : 0;
            new_file.file_code = code_res.newFileCode;
            new_file.origin_file_code = code_res.originFileCode;
            new_file.original_file_name = filename;
            new_file.is_last_version = "Y";
            new_file.weight = "0";
            new_file.create_by = make_user.username;
            new_file.create_tm = getDateTime();
            new_file.regi_dt = getDateTime();
            new_file.stage_code = file.revisionType == 0 ? "AFC Issue" : "IFA Issue";
            new_file.repo_path = file.filepath;
            new_file.user_id = make_user.user_id;
            new_file.file_ext = getFileExtension(filename);
            if (file.revisionOrigin) {
                new_file.revision =
                    file.revisionOrigin.toString().indexOf("Y") != -1 ||
                    file.revisionOrigin.toString().indexOf("N") != -1
                        ? "A"
                        : file.revisionOrigin.toString();
            } else {
                new_file.revision = "0";
            }
            let insertFile = await getRepository(EdmsFiles).save(new_file);
            newFiles.push(insertFile);
            // 기존파일들 is_last_version : N
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ is_last_version: "N" })
                .where("docu_no=:id AND file_no != :file_no", { id: document.docu_no, file_no: insertFile.file_no })
                .execute();
            await getConnection()
                .createQueryBuilder()
                .update(EdmsStage)
                .set({ modify_tm: issuedDate, actual_dt: issuedDate })
                .where("docu_no=:id AND stage_code=:stage_code AND stage_type='a'", {
                    id: document.docu_no,
                    stage_code: file.revisionType == 0 ? "AFC" : "IFA",
                })
                .execute();
        }
    }
    for (var insert_file of newFiles) {
        let origin_file_name_split = insert_file.original_file_name.split(".");
        let ext = origin_file_name_split[origin_file_name_split.length - 1];
        let _filePath = await mvEdmsFile(
            insert_file.project_no.toString(),
            insert_file.cate_no.toString(),
            insert_file.docu_no.toString(),
            insert_file.file_no,
            insert_file.repo_path,
            insert_file.fversion,
            ext,
            true
        );
        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ repo_path: _filePath })
            .where("file_no=:id", { id: insert_file.file_no })
            .execute();
        // data set
        insert_file.repo_path = _filePath;
    }
    // fs.copyFileSync(file.filepath, edmsFileDir + filename);

    return newFiles;
};

const uploadAttachFiles = async (files: string[]): Promise<string[]> => {
    let newAttaches = [];
    for (var file of files) {
        let filename = file.split("\\")[file.split("\\").length - 1];
        if (newAttaches.indexOf(filename) == -1) {
            await cpFile(file, path.resolve(globalThis.HOME_PATH, edmsUploadFolder) + "\\" + filename);
            if (filename != null && filename != undefined && filename != "") newAttaches.push(filename);
        }
    }
    return newAttaches;
};

const updateUserAuth = async (files: EdmsFiles[], users: EdmsUser[]) => {
    // file object create end
    let existDocuId = [];
    let fileAuthList = [];
    const documents = await getRepository(EdmsDocument).find({ docu_no: In(files.map(raw => raw.docu_no)) });
    const cates = await getRepository(EdmsCategory).find({ cate_no: In(files.map(raw => raw.cate_no)) });
    const projects = await getRepository(EdmsProjectType).find({
        project_no: In(documents.map(raw => raw.project_no)),
    });
    await getConnection().transaction(async tr => {
        for (var file of files) {
            if (existDocuId.indexOf(file.docu_no) == -1) {
                existDocuId.push(file.docu_no);
                const docu = documents.find(raw => raw.docu_no == file.docu_no);
                const cate = cates.find(raw => raw.cate_no == docu.cate_no);
                const proj = projects.find(raw => raw.project_no == docu.project_no);
                for (var user of users) {
                    if (user) {
                        // new file auth
                        // const file_auth = new EdmsAuthority();
                        // file_auth.company_id = user.company_id;
                        // file_auth.group_id = user.group_id;
                        // file_auth.user_id = user.user_id;
                        // file_auth.project_no = proj.p_project_no;
                        // file_auth.project_type_no = proj.project_no;
                        // file_auth.discipline_id = cate.discipline_id;
                        // file_auth.area_id = docu.area_id;
                        // file_auth.cate_no = docu.cate_no;
                        // file_auth.docu_no = docu.docu_no;
                        // file_auth.read = 1;
                        // file_auth.write = 1;
                        // file_auth.download = 1;
                        // file_auth.delete = 1;
                        // await tr.getRepository(EdmsAuthority).save(file_auth);
                        // fileAuthList.push(file_auth);
                    }
                }
            }
        }
    });
    return fileAuthList;
};

const getCommentData = async (file: string, user_id: number, wp_idx: number): Promise<WorkReview[] | null> => {
    if (file == "" || file == undefined) return null;
    // file to edmsfolder
    let filename = file.split("\\")[file.split("\\").length - 1];
    const file_path = edmsUploadFolder + filename;
    await cpFile(file, path.resolve(globalThis.HOME_PATH, edmsUploadFolder) + "\\" + filename, { overwrite: true });
    //
    //get review comment data
    let res = await GetReviewData({ path: file_path, mimetype: "xls" });
    let comment_data = await create_review_excel(user_id, res, wp_idx, true);
    //
    return comment_data;
};

const tr_project_type_code_template = [
    "P-TH(H)S-TEP",
    "P-TH(H)T-TEP",
    "L-TH(H)T-TEP",
    "L-TH(H)T-TEP",
    "T-TH(H)S-TEP",
    "T-TH(H)S(FC)-TEP",
];

//실제 경로에 있는 폴더 순서와 일치해야함
const project_type_folder = [
    "L-TH(H)T-TEP (LNG)",
    "P-TH(H)S-TEP (Power)",
    "P-TH(H)S(FC)-TEP (Power)",
    "T-TH(H)S-TEP (Transmission)",
    "T-TH(H)S(FC)-TEP (Transmission)",
];

const folder_list: {
    project_folder_name: string;
    project_type_no: number;
    tr_folder_list: { trNo: string; subject: string; docNo: string[]; checked: number[] }[];
}[] = [];

var results: DirResultType[] = [];

const DOCU_SUBJECT_ONLY_CHAR = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+┼<>@\#$%&\ '\"\\(\=]/gi;
var make_user: EdmsUser;
const migration_tr = async () => {
    //#region 초기설정
    const database = new Database("hdc_db_edms"); // 변경 할 것
    await database.getConnection();
    //#endregion
    //#region 프로젝트 타입 등 DB에서 가져오기
    const tr_path: string = "/Users/mac/Downloads/P-TH(H)S-TEP-1437";
    const skipTrCount = 0;

    if (fs.existsSync(tr_path)) {
        await unzipInFolder(tr_path);

        CallDirTree(tr_path, results);

        for (var project_folder of project_type_folder) {
            let proj = project_folder.split(" ").pop();
            let projcet_code = proj.slice(1, proj.length - 1);

            let project_type = await getRepository(EdmsProjectType).findOne({
                project_code: Like(`%${projcet_code}%`),
            });

            folder_list.push({
                project_folder_name: project_folder,
                project_type_no: project_type.project_no,
                tr_folder_list: [],
            });
        }

        for (var folder_dir of results) {
            folder_dir.items.map(raw => {
                // 프로젝트 찾기
                let path_list = raw.split("\\");

                let project_index_list = project_type_folder.map(raw => path_list.findIndex(data => raw == data));
                let project_path_index = project_index_list.filter(raw => raw != -1).pop();

                let project = path_list[project_path_index];

                // docu_code 찾기
                let poped = raw.split("\\").pop();
                let docu_code = get_document_number(poped).docu_code;

                let { code, subject } = getTRCode(folder_dir.folder);

                let project_index = folder_list.findIndex(raw => raw.project_folder_name == project);

                let tr_index = folder_list[project_index].tr_folder_list.findIndex(raw => raw.trNo == code);

                if (project_index != -1 && tr_index == -1 && code != null) {
                    folder_list[project_index].tr_folder_list.push({
                        trNo: code,
                        subject: subject,
                        docNo: [],
                        checked: [],
                    });
                } else if (docu_code != null && docu_code != "" && project_index != -1 && tr_index != -1) {
                    folder_list[project_index].tr_folder_list[tr_index].docNo.push(docu_code);
                }
            });
        }
    }

    make_user = await getRepository(EdmsUser).findOne({ user_id: 1 });
    let edms_stage_type = await getRepository(EdmsStageType).find({ is_use: 1 });
    let user_list = await getRepository(EdmsUser).find({ is_use: 1 });
    let comp_list = await getRepository(EdmsCompany).find({ is_delete: false });
    let stage_list = await getRepository(EdmsStage).find({ is_use: 1 });
    for (var folder of folder_list) {
        // const p_type = Object.keys(migration_type)[type_index];
        let project = await getRepository(EdmsProjectType).findOne({ project_no: folder.project_type_no });
        let work_code_list = await getRepository(WorkTmCode).find({ is_use: 1, project_no: project.project_no });
        let docu_list = await getRepository(EdmsDocument).find({ is_use: 1, project_no: project.project_no });
        //#endregion
        //#region 각 회사 미리 할당
        let tep = comp_list.find(raw => raw.company_name.indexOf("통영") != -1);
        let henc = comp_list.find(raw => raw.company_name.indexOf("한화") != -1);
        let shinhan = comp_list.find(raw => raw.company_name.indexOf("신한") != -1);
        let htc = comp_list.find(raw => raw.company_name.indexOf("휴먼텍") != -1);
        let tep_tm_code = work_code_list.find(raw => raw.company_id == tep.id);
        let henc_tm_code = work_code_list.find(raw => raw.company_id == henc.id);
        let shinhan_tm_code = work_code_list.find(raw => raw.company_id == shinhan.id);
        let htc_tm_code = work_code_list.find(raw => raw.company_id == htc.id);
        let tep_m = user_list.find(raw => (tep_tm_code ? raw.user_id == tep_tm_code.tm_user_id : false));
        let henc_m = user_list.find(raw => (henc_tm_code ? raw.user_id == henc_tm_code.tm_user_id : false));
        let shinhan_m = user_list.find(raw => (shinhan_tm_code ? raw.user_id == shinhan_tm_code.tm_user_id : false));
        let htc_m = user_list.find(raw => (htc_tm_code ? raw.user_id == htc_tm_code.tm_user_id : false));
        //#endregion
        //#region TR정보 정의
        let requester: EdmsUser; // 발신처 TR담당자
        let request_company: EdmsCompany;
        let approver: EdmsUser; // 수신처 TR담당자
        let approve_company: EdmsCompany;
        let refer: EdmsUser; // 참조처 TR담당자
        let refer_company: EdmsCompany;
        //#endregion
        //#region get folder & file list
        var tree: directoryTree.DirectoryTree = null;
        //#endregion
        console.log(`${tr_path + "\\" + folder.project_folder_name} Start`);
        console.log(`${project.project_name} TR Migration Started`);
        if (project) {
            console.log(
                `${project.project_name} TR Exist ? ${fs.existsSync(tr_path + "\\" + folder.project_folder_name)}`
            );
            if (fs.existsSync(tr_path + "\\" + folder.project_folder_name)) {
                CallDirTree(tr_path + "\\" + folder.project_folder_name, results);
                let folderName = "";
                let tr_results = [];
                let tr_codes = [];
                //#region 여러폴더로 나뉘어져있는 TR은 한번의 프로세스로 압축
                results.map(raw => {
                    let { code } = getTRCode(raw.folder);
                    // console.log(code, raw.folder);
                    let exist_code = tr_codes.indexOf(code);
                    if (exist_code != -1) {
                        tr_results[exist_code].items = [...tr_results[exist_code].items, ...raw.items];
                    } else {
                        tr_results.push(raw);
                        tr_codes.push(code);
                    }
                });
                //#endregion
                let count = 0;
                for (var result of tr_results) {
                    count++;
                    if (count < skipTrCount) continue; // TR 스킵할경우 컨티뉴
                    folderName = result.folder;
                    try {
                        //#region load data from real file&folder
                        let { code, subject } = getTRCode(folderName);

                        if (code == null || subject == null) {
                            console.log(folderName + " code is not defined ");
                            continue;
                        }
                        let trDocuments = folder.tr_folder_list.filter(raw => raw.trNo == code);
                        let real_file_list = [];
                        let comment_file = null;
                        let attach_file_list = [];
                        let unreal_file_list: EdmsFiles[] = [];
                        result.items.map(raw => {
                            let poped = raw.split("\\").pop();
                            let docu_code = get_document_number(poped).docu_code;
                            let itemPath = poped.replace(DOCU_SUBJECT_ONLY_CHAR, "");
                            // 1. 파일에 있는 도큐먼트 코드로 issue log 대조
                            let isDocument = -1;
                            if (docu_code.length > 0) {
                                isDocument = trDocuments.findIndex(
                                    docu => docu.docNo && docu.docNo.indexOf(docu_code) != -1
                                );
                            }
                            console.log("!!!!!!!!!!!!!!!!!!", raw, docu_code, isDocument);
                            if (docu_code && isDocument == -1) {
                                logger.log(
                                    "error",
                                    `누락 파일 발생! TR No. : ${code}, Doc No. : ${docu_code}, File : ${raw}`
                                );
                                console.log(`누락 파일 발생! TR No. : ${code}, Doc No. : ${docu_code}, File : ${raw}`);
                            }
                            if (
                                itemPath.indexOf("xls") != -1 &&
                                ((itemPath.indexOf(code) != -1 && itemPath.indexOf("log") == -1) ||
                                    itemPath.toLocaleLowerCase().indexOf("comment") != -1 ||
                                    itemPath.toLocaleLowerCase().indexOf("검토") != -1 ||
                                    itemPath.toLocaleLowerCase().indexOf("회신") != -1)
                            ) {
                                comment_file = raw;
                            } else if (isDocument != -1 && itemPath.toLocaleLowerCase().indexOf("zip") == -1) {
                                trDocuments[isDocument].checked.push(real_file_list.length);
                                real_file_list.push(raw);
                            } else {
                                attach_file_list.push(raw);
                            }
                        });
                        let unreal = trDocuments.filter(raw => raw.checked.length == 0);
                        if (unreal.length > 0) {
                            let docNo_list = unreal
                                .map(raw => raw.docNo)
                                .join(",")
                                .split(",");
                            let unreal_documents = await getRepository(EdmsDocument).find({
                                docu_code: In(docNo_list),
                            });
                            let res = await Procedure.GetLatestTMFiles(unreal_documents.map(raw => raw.docu_no));
                            if (res.data) unreal_file_list = res.data;
                            logger.log(
                                "error",
                                `실제 파일을 찾지못한 도큐먼트! TR No. : ${code}, Doc No : ${trDocuments
                                    .filter(raw => raw.checked.length == 0)
                                    .map(raw => raw.docNo)
                                    .join(" , ")}`
                            );
                            console.log(
                                `실제 파일을 찾지못한 도큐먼트! TR No. : ${code}, Doc No : ${trDocuments
                                    .filter(raw => raw.checked.length == 0)
                                    .map(raw => raw.docNo)
                                    .join(" , ")}`
                            );
                        }
                        console.log(
                            `${code} TR Start!!!!!!!!!! - document : ${real_file_list.length}개, comment : ${
                                comment_file ? 1 : 0
                            }개, attach : ${attach_file_list.length}개`
                        );
                        //#endregion
                        //#region VP 체크 후 필요시 Edms Document 생성
                        for (var f of real_file_list) {
                            let vpDocu = await MakeVP(f, make_user);
                            if (vpDocu) {
                                console.log("VP DOCUMENT CREATE!! : ", vpDocu.docu_code);
                                docu_list.push(vpDocu);
                            }
                        }
                        //#endregion
                        //#region edms files 생성
                        let allFileDatas = real_file_list
                            .map((_real_file, idx) => {
                                let { docu_code, revision, revisionOrigin, revisionType } =
                                    get_document_number(_real_file);
                                let findTr = trDocuments.find(raw => raw.checked.indexOf(idx) != -1);
                                let docNo_list = findTr.docNo;
                                console.log(findTr, docNo_list, docu_code);
                                let document = docu_list.find(raw => raw.docu_code.indexOf(docu_code) != -1);
                                // 우선 도큐코드로 탐색
                                if (document == undefined) {
                                    document = docu_list.find(
                                        raw => findTr && docNo_list.map(doc => doc === raw.docu_code)
                                    );
                                }
                                // 제목으로도 없으면 에러
                                if (document == undefined) {
                                    logger.log("error", "도큐먼트가 없는 성과물 :: " + _real_file);
                                    attach_file_list.push(_real_file);
                                    return null;
                                }
                                let stageData = getFileStageData(
                                    "",
                                    stage_list.filter(raw => raw.docu_no == document.docu_no)
                                );
                                return {
                                    docu: document,
                                    revision: revision,
                                    revisionOrigin: revisionOrigin,
                                    revisionType: revisionType,
                                    filepath: _real_file,
                                    full_stage_code: stageData.full_stage_code,
                                };
                            })
                            .filter(raw => raw != null);

                        const issuedDate = new Date();
                        const dueDate = addWorkingDay(issuedDate, 10).toDate(); // working day 10 일
                        console.log("DATE::::::::::::::::::::::::::::::", code, issuedDate, dueDate);
                        let exist_files = await Procedure.GetLatestTMFiles(allFileDatas.map(raw => raw.docu.docu_no));
                        let allFiles = await uploadEdmsFiles(allFileDatas, exist_files.data, issuedDate);
                        let allAttaches = await uploadAttachFiles(attach_file_list);
                        let allAuth = await updateUserAuth(allFiles, [henc_m, tep_m, htc_m, shinhan_m]);
                        // 코멘트 시트에만 들어가있는 파일도 넣어줘야함.
                        allFiles = [...allFiles, ...unreal_file_list];
                        //
                        console.log(`${code} TR PROGRESS :: files upload END`);
                        //#endregion
                        //#region TR constant 값 세팅
                        let p_type_index: number =
                            tr_project_type_code_template.findIndex(raw => code.indexOf(raw) != -1) + 1;
                        //#region LNG 일경우 TANK 인지 Terminal 인지에따라 수신처가 변경됨.
                        // if (subject.toLocaleUpperCase().indexOf("TANK") != -1) {
                        //     if (p_type_index == 3) {
                        //         p_type_index = 7;
                        //     } else {
                        //         p_type_index = 8;
                        //     }
                        // }
                        //#endregion

                        //#region requester, approver, refer 정보 세팅
                        request_company = henc;
                        requester = henc_m;
                        switch (p_type_index) {
                            case 1:
                                approve_company = shinhan;
                                approver = shinhan_m;
                                refer_company = tep;
                                refer = tep_m;
                                break;
                            case 2:
                                approve_company = tep;
                                approver = tep_m;
                                refer_company = shinhan;
                                refer = shinhan_m;
                                break;
                            case 3:
                                approve_company = tep;
                                approver = tep_m;
                                refer_company = htc;
                                refer = htc_m;
                                break;
                            case 4:
                            case 5:
                            case 6:
                                approve_company = shinhan;
                                approver = shinhan_m;
                                refer_company = tep;
                                refer = tep_m;
                                break;
                            case 7:
                                approve_company = htc;
                                approver = htc_m;
                                refer_company = tep;
                                refer = tep_m;
                                break;
                            case 8:
                                approve_company = tep;
                                approver = tep_m;
                                refer_company = htc;
                                refer = htc_m;
                                break;
                            default:
                                approve_company = shinhan;
                                approver = shinhan_m;
                                refer_company = tep;
                                refer = tep_m;
                                break;
                        }
                        //#endregion

                        //#region now, duedate 설정
                        const now = new Date();
                        // const due_date = new Date();
                        // due_date.setDate(now.getDate() + 10);
                        //#endregion

                        //#endregion
                        console.log(`${code} TR PROGRESS :: constant data set END`);
                        let exist_work_tm = await getRepository(WorkTm).findOne({ tm_code: Like(`%${code}%`) });
                        let now_wp_idx = -1;
                        if (exist_work_tm == undefined) {
                            // 워크 생성
                            let newProc = new WorkProc();

                            newProc.wp_type = "TM";
                            newProc.wp_date = new Date();
                            newProc.wp_code = code;
                            newProc.project_no = project.project_no;
                            newProc.series_no = 0;
                            newProc.account_ym = getMoment(now).format("YYYYMM");
                            newProc.subject = subject;
                            newProc.explan = "";
                            newProc.requester_id = requester.user_id;
                            newProc.approver_id = approver.user_id;
                            newProc.due_date = dueDate;
                            newProc.create_by = requester.username;
                            newProc.create_tm = issuedDate;
                            newProc.user_id = requester.user_id;
                            newProc.tm_state = 12;
                            newProc.stage_type_id = 0;

                            let insertProc = await getRepository(WorkProc).save(newProc);
                            //
                            now_wp_idx = insertProc.wp_idx;
                            //#region Set Assign
                            // 자기자신을 결재자로
                            let signAssign = new WorkAssign();
                            signAssign.approval_order = 1;
                            signAssign.assign_from_id = requester.user_id;
                            signAssign.assign_to_id = requester.user_id;
                            signAssign.create_by = requester.username;
                            signAssign.due_to_date = dueDate;
                            signAssign.wp_idx = insertProc.wp_idx;
                            signAssign.assign_state = 7;
                            signAssign.is_approval = true;
                            signAssign.is_last_approve = true;
                            signAssign.is_use = 1;
                            signAssign.is_fin = 1;
                            signAssign.create_tm = issuedDate;
                            await getRepository(WorkAssign).save(signAssign);
                            //
                            // 발신-수신자
                            let requesterAssign = new WorkAssign();
                            requesterAssign.approval_order = 0;
                            requesterAssign.assign_from_id = requester.user_id;
                            requesterAssign.assign_to_id = approver.user_id;
                            requesterAssign.create_by = requester.username;
                            requesterAssign.due_to_date = dueDate;
                            requesterAssign.wp_idx = insertProc.wp_idx;
                            requesterAssign.assign_state = 14;
                            requesterAssign.is_fin = 1;
                            requesterAssign.create_tm = issuedDate;
                            await getRepository(WorkAssign).save(requesterAssign);
                            //
                            // 수신-발신자
                            let receiverAssign = new WorkAssign();
                            receiverAssign.approval_order = 0;
                            receiverAssign.assign_from_id = approver.user_id;
                            receiverAssign.assign_to_id = requester.user_id;
                            receiverAssign.create_by = requester.username;
                            receiverAssign.due_to_date = dueDate;
                            receiverAssign.wp_idx = insertProc.wp_idx;
                            receiverAssign.assign_state = 14;
                            receiverAssign.is_fin = 1;
                            receiverAssign.create_tm = issuedDate;
                            await getRepository(WorkAssign).save(receiverAssign);
                            //
                            // 참조자
                            let referAssign = new WorkAssign();
                            referAssign.approval_order = 0;
                            referAssign.assign_from_id = requester.user_id;
                            referAssign.assign_to_id = refer.user_id;
                            referAssign.create_by = requester.username;
                            referAssign.due_to_date = dueDate;
                            referAssign.wp_idx = insertProc.wp_idx;
                            referAssign.assign_state = 14;
                            referAssign.is_fin = 1;
                            referAssign.is_cc = 1;
                            referAssign.create_tm = issuedDate;
                            await getRepository(WorkAssign).save(referAssign);
                            //
                            //#endregion

                            //#region work_tm 생성
                            let newWorkTm = new WorkTm();

                            newWorkTm.user_id = requester.user_id;
                            newWorkTm.create_by = requester.username;
                            newWorkTm.project_type_no = project.project_no;
                            newWorkTm.discipline_id = 0;
                            newWorkTm.tm_code = code;
                            newWorkTm.cc_company_id = refer_company.id; // 참조처
                            newWorkTm.send_company_id = request_company.id; // 발신처
                            newWorkTm.wp_idx = insertProc.wp_idx;
                            newWorkTm.sended_tm = issuedDate;
                            newWorkTm.deploy_tm = issuedDate;

                            await getRepository(WorkTm).save(newWorkTm);
                            //#endregion
                        } else {
                            now_wp_idx = exist_work_tm.wp_idx;
                        }
                        console.log(`${code} TR PROGRESS :: work_proc ~ work_tm END ${allFiles.length}`);

                        let comment_data = await getCommentData(comment_file, requester.user_id, now_wp_idx);
                        // 코멘트시트에도큐먼트는 있는데, 압축파일에 성과물이없을경우는 기존 파일을 사용하려고 하는것으로 간주.
                        if (comment_data != null && comment_data.length > 0) {
                            for (var comment of comment_data) {
                                if (allFiles.find(raw => raw.docu_no == comment.docu_no) == undefined) {
                                    let _file = await getRepository(EdmsFiles).findOne({
                                        where: { docu_no: comment.docu_no },
                                        order: { file_no: "DESC" },
                                    });
                                    if (_file) {
                                        let newFile = new EdmsFiles();
                                        Object.assign(newFile, _file);
                                        newFile.file_no = null;
                                        newFile.is_last_version = "Y";
                                        newFile.fversion = _file.fversion + 1;
                                        newFile.create_tm = new Date();
                                        let insertFile = await getRepository(EdmsFiles).save(newFile);
                                        allFiles.push(insertFile);
                                    }
                                }
                            }
                        }
                        // 추가된 EDMS FIles 가 있을경우
                        if (allFiles.length > 0) {
                            //#region work file 생성
                            for (let i = 0; i < allFiles.length; i++) {
                                let newFile = new WorkFile();

                                newFile.wp_idx = now_wp_idx;
                                newFile.file_no = allFiles[i].file_no;
                                newFile.docu_no = allFiles[i].docu_no;
                                newFile.create_by = requester.username;
                                newFile.create_tm = new Date();
                                newFile.user_id = requester.user_id;

                                await getRepository(WorkFile).save(newFile);
                            }
                            //#endregion
                            //#region edmsfiles wp_idx 넣어주기
                            await getConnection()
                                .createQueryBuilder()
                                .update(EdmsFiles)
                                .set({ wp_idx: now_wp_idx })
                                .where(`file_no IN (${allFiles.map(raw => raw.file_no).join(",")})`)
                                .execute();
                            //
                            //#region work docu 생성
                            for (let file of allFiles) {
                                if (file != null) {
                                    let newWDocu = new WorkDocu();

                                    newWDocu.user_id = make_user.user_id;
                                    newWDocu.create_by = make_user.username;
                                    newWDocu.wp_idx = now_wp_idx;
                                    newWDocu.docu_no = file.docu_no;
                                    newWDocu.is_use = 1;

                                    await getRepository(WorkDocu).save(newWDocu);
                                }
                            }
                            //#endregion
                            //#region work cate 생성
                            // work cate는 안쓰는 테이블이네 ㅋㅋ
                            //#endregion
                            //#region comment data
                            if (comment_data != null && comment_data.length > 0) {
                                console.log("comment_data LENGTH!!!!!!  ", comment_data.length);
                                let { doc_ids, final_codes, file_codes } = UpdateCodeFromTm(
                                    comment_data,
                                    allFiles,
                                    edms_stage_type
                                );
                                let tm_history: WorkTmHistory[] = [];
                                //#endregion
                                //#region work tm history 생성
                                console.log("DOC IDS LENGTH!!! : ", doc_ids.length);
                                await getConnection().transaction(async tr => {
                                    for (var i = 0; i < doc_ids.length; i++) {
                                        let docu_no = doc_ids[i];
                                        let code = final_codes[i];
                                        let file_code = file_codes[i];
                                        // document 당 한번씩만
                                        let edms_file_idx = allFiles.findIndex(raw => raw.docu_no == docu_no);
                                        let edms_file = allFiles.splice(edms_file_idx, 1)[0];
                                        let edms_stages = await tr.getRepository(EdmsStage).find({
                                            docu_no: docu_no,
                                            is_use: 1,
                                        });
                                        if (edms_file) {
                                            let newTmHistory = null;
                                            let next_stage_info = GetNextStage(edms_file.stage_code, edms_stages);
                                            newTmHistory = new WorkTmHistory();
                                            newTmHistory.company_id = requester.company_id;
                                            newTmHistory.create_by = requester.username;
                                            newTmHistory.file_no = edms_file.file_no;
                                            newTmHistory.wp_idx = now_wp_idx;
                                            newTmHistory.code = code;
                                            newTmHistory.review_code = file_code;
                                            if (code == 1) {
                                                newTmHistory.revision = 0;
                                                newTmHistory.stage_name = next_stage_info;
                                            } else if (code == 2) {
                                                let file_revision = edms_file.revision
                                                    ? isNaN(parseInt(edms_file.revision))
                                                        ? edms_file.revision.charCodeAt(0) - 65
                                                        : parseInt(edms_file.revision)
                                                    : 0;
                                                newTmHistory.revision = file_revision;
                                                newTmHistory.stage_name = edms_file.stage_code;
                                            } else if (code == 3) {
                                                // nothing
                                            }

                                            if (newTmHistory != null) tm_history.push(newTmHistory);
                                            // file revision 적용 실제있는 코멘트에 리비전으로 교체
                                            let effectedFiles = allFiles
                                                .filter(raw => raw.docu_no == docu_no)
                                                .map(raw => raw.file_no);
                                            let review = comment_data.find(raw => raw.docu_no == docu_no);
                                            if (review && review.revision && effectedFiles.length > 0)
                                                await tr
                                                    .createQueryBuilder()
                                                    .update(EdmsFiles)
                                                    .set({ revision: review.revision })
                                                    .where(`file_no IN (${effectedFiles.join(",")}) AND revision = 'A'`)
                                                    .execute();
                                        } else {
                                        }
                                    }
                                    console.log("tm_history LENGTH!!!!!!  ", tm_history.length);
                                    if (tm_history.length > 0) await tr.getRepository(WorkTmHistory).save(tm_history);
                                });
                            } else {
                                console.log(`${code} TR PROGRESS :: only comment data is null`);
                            }
                            // 코멘트파일을 지났음에도 allFiles 에 파일이 남아있다면, 따로 히스토리를 남겨줘야함.
                            if (allFiles.length > 0) {
                                let tm_history = [];
                                for (var edmsFile of allFiles) {
                                    let newTmHistory = null;
                                    newTmHistory = new WorkTmHistory();
                                    newTmHistory.company_id = requester.company_id;
                                    newTmHistory.create_by = requester.username;
                                    newTmHistory.file_no = edmsFile.file_no;
                                    newTmHistory.wp_idx = now_wp_idx;
                                    newTmHistory.code = 0;
                                    newTmHistory.review_code = 0;
                                    newTmHistory.stage_name = edmsFile.stage_code;

                                    if (newTmHistory != null) tm_history.push(newTmHistory);
                                }

                                await getRepository(WorkTmHistory).save(tm_history);
                            }
                            //
                            //#endregion
                        }

                        result.items.map(async raw => {
                            let filename = raw.split("\\")[raw.split("\\").length - 1];
                            filename = filename.replace(/\"/g, "").replace(/\'/g, "");
                            let file_ext_upper: string;

                            if (filename.indexOf(".") != -1) {
                                let file_name_list = filename.split(".");
                                let file_ext = file_name_list.splice(-1, file_name_list.length);
                                file_ext_upper = file_ext.map(raw => raw.toUpperCase())[0]
                                    ? file_ext.map(raw => raw.toUpperCase())[0]
                                    : "";
                            } else {
                                file_ext_upper = "";
                            }
                            if (notExtensionList.indexOf(file_ext_upper) == -1) {
                                await getConnection().query(`
                            INSERT INTO "edms_other_files"("user_id", "create_by", "project_no", "root_path", "repo_path", "file_name", "original_file_name", "file_type", "file_ext", "wp_idx", "create_tm") VALUES (
                                ${requester.user_id},
                                '${requester.username}',
                                ${project.project_no},
                                '${edmsFileDir + filename}',
                                '${edmsUploadFolder + filename}',
                                '${filename}',
                                '${filename}',
                                '${getOtherFileType(file_ext_upper)}',
                                '${file_ext_upper}',
                                ${now_wp_idx},
                                '${getMoment(new Date()).format("YYYY-MM-DD HH:mm:ss")}'
                            );
                        `);
                            }
                        });

                        console.log(`${code} TR PROGRESS :: work_tm_history END`);
                        // 추가된 첨부파일이 있을경우
                        if (allAttaches.length > 0) {
                            for (var attach of allAttaches) {
                                attach = attach.replace(/\"/g, "").replace(/\'/g, "");

                                console.log(`${attach} length :: ${attach.length}`);
                                try {
                                    await getConnection().query(`
                                    INSERT INTO "work_attach"("wp_idx", "create_by", "file_name", "file_path", "repo_path") VALUES (
                                        ${now_wp_idx},
                                        '${requester.username}',
                                        '${attach}',
                                        '${edmsFileDir + attach}',
                                        '${edmsUploadFolder + attach}'
                                    );
                                `);
                                } catch (err) {
                                    console.log("err : :", err);
                                }
                            }
                        }
                        console.log(`${code} TR PROGRESS :: Fin.`);
                    } catch (err) {
                        console.log("err :: ", err);
                        return;
                    } finally {
                    }
                    //
                }
            }
        }
    }
};

(async function () {
    await migration_tr();
})();
