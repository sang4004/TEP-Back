/******************************************************************************
 * entity :
 * TM
 * TransMittal api
 * api :
 ******************************************************************************/
import express, { Request, Response, Router } from "express";
import { getConnection, getRepository, Like, In, Not, IsNull, Transaction, EntityManager } from "typeorm";
import path from "path";
import imageSizeOf from "image-size";
import ExcelJS, { Workbook } from "exceljs";
import { TmReviewExcel } from "@/lib/formatExcel";
import fs from "fs";
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
    EdmsArea,
    EdmsPosition,
    EdmsReview,
    EdmsFiles,
    WorkAttach,
    WorkTm,
    EdmsStage,
    WorkFile,
    EdmsProjectType,
    EdmsGroup,
    EdmsStageType,
    WorkSendRecvBox,
    WorkMail,
    WorkTmHistory,
    WorkTmOfficialUser,
} from "@/entity";
import { logger } from "@/lib/winston";
import {
    getFailedResponse,
    getSuccessResponse,
    getStringFromHtml,
    getHENCTREmailFormat,
    getShinhanTREmailFormat,
    LANGUAGE_PACK,
    officialTmHtmlDataType,
    getCompanyChar,
} from "@/lib/format";
import {
    fillZero,
    getFileExtensionType,
    mvEdmsFile,
    getDownloadFilename,
    getMoment,
    zeroPad,
    OrdinalSuffixOf,
    deleteFileSync,
    getFileExtension,
} from "@/lib/utils";
import { GetNextStage } from "@/routes/api/v1/edms/utils";
import { edmsFileDir, edmsUploadFolder, edmsFileLinkUrl } from "../../../../../../constant";
import { parseFileStageCode, update_assign_state } from "../utils";
import { sendMailWithHtmlImg, sendMail } from "@/lib/mailer";
import moment from "moment";
import { html2img } from "@/lib/html2img";
import { GenerateZip } from "@/lib/zip";
import { Procedure } from "@/lib/procedure";
import PDFUtil from "@/lib/PDFUtil";
import e from "express";

const router = express.Router();

export const update_tm_state = async (tm_state: number, wp_idx: number) => {
    await getConnection()
        .createQueryBuilder()
        .update(WorkProc)
        .set({ tm_state: tm_state })
        .where("wp_idx=:id", { id: wp_idx })
        .execute();
};

export const getCreateByName = (
    reviwer_company_id: number,
    user_company_id: number,
    project_name: string,
    reviewer_name: string
) => {
    // 터미널
    if (user_company_id != reviwer_company_id) {
        if (project_name.indexOf("LNG") != -1) {
            switch (reviwer_company_id) {
                case 1:
                    return "TEP";
                case 2:
                    return "TEP";
                case 3:
                    return "TEP";
                case 4:
                    return "HENC";
                default:
                    return "";
            }
        }
        //
        // 발전소, 송전선로
        else {
            switch (reviwer_company_id) {
                case 1:
                    return "TEP";
                case 2:
                    return "감리단";
                case 3:
                    return "감리단";
                case 4:
                    return "HENC";
                default:
                    return "";
            }
        }
    } else {
        return reviewer_name;
    }
};

export const send_mail_tm = async (docu_no_list: number[], user_id_list: number[], wp: WorkProc) => {
    if (user_id_list.length > 0) {
        let new_user_id_list = new Set(user_id_list);
        user_id_list = [...new_user_id_list];
    }
    try {
        let mail_attachments = [];

        let files = await Procedure.GetLatestTMFiles(docu_no_list);
        let attach_files = await getRepository(WorkAttach).find({ wp_idx: wp.wp_idx });

        let tm_code = await getRepository(WorkTm).findOne({ wp_idx: wp.wp_idx });

        //신한공문 한화공문 구분
        let trPaper: string | Buffer;
        // TR 공문
        let create_company = await getConnection().query(`
            SELECT
                ec.company_name
            FROM edms_user eu
            JOIN work_proc wp
                ON wp.wp_idx = ${wp.wp_idx}
            JOIN edms_company ec
                ON ec.id = eu.company_id
            WHERE eu.user_id = wp.requester_id
        `);
        if (create_company[0].company_name.indexOf("신한") != -1) {
            //신한 공문
            let tr_data = await getTmOfficalHtmlData("SHIN", wp.wp_idx);
            trPaper = getShinhanTREmailFormat(tm_code, wp, tr_data, true);
        } else {
            let tr_data = await getTmOfficalHtmlData("HENC", wp.wp_idx);
            trPaper = getHENCTREmailFormat(tm_code, wp, tr_data, true);
        }
        let trPaperImg = await html2img(trPaper, { captureBeyondViewport: true });
        let document_files = [];
        if (files.data) {
            for (var file of files.data) {
                let file_path = path.resolve(globalThis.HOME_PATH, file.repo_path);
                try {
                    let fstat = fs.statSync(file_path);
                    if (fstat && fstat.isFile() === true) {
                        document_files.push({
                            filename: file.original_file_name,
                            path: file_path,
                        });
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
        let zipUrl = "";
        let zipFileName = "";
        if (document_files.length > 0) {
            zipFileName = `${tm_code.tm_code}_${document_files[0].filename}${
                document_files.length > 1 ? `_외${document_files.length - 1}건` : ``
            }.zip`;
            await GenerateZip(
                zipFileName,
                document_files.map(raw => raw.path),
                document_files.map(raw => raw.filename),
                edmsUploadFolder
            );
            zipUrl = edmsFileLinkUrl + zipFileName;
        }
        // console.log(zipUrl);

        let bigAttachList: { filename: string; path: string }[] = [];
        for (var attach_file of attach_files) {
            try {
                let file_path = path.resolve(globalThis.HOME_PATH, attach_file.repo_path);
                let stats = fs.statSync(file_path);
                if (stats && stats.isFile() === true) {
                    // 10mb 이상파일은 링크로
                    if (stats.size / (1024 * 1024) > 10) {
                        bigAttachList.push({
                            filename: "[첨부파일] " + attach_file.file_name,
                            path: edmsFileLinkUrl + attach_file.file_name,
                        });
                    } else {
                        mail_attachments.push({
                            filename: "[첨부파일] " + attach_file.file_name,
                            path: file_path,
                        });
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }
        //#region make tr_paper to pdf
        let trPapaerRes = await html2img(trPaper, { encoding: "base64" });
        let trPaperURL = trPapaerRes.image,
            trPaperSize = trPapaerRes.size;
        let trPaperPDF = PDFUtil.ImageData2PDF(tm_code.tm_code, trPaperURL, {
            height: trPaperSize.height,
            width: trPaperSize.width,
        });
        mail_attachments.push({
            filename: `${tm_code.tm_code}.pdf`,
            path: trPaperPDF.path,
        });
        //#endregion
        let email_list = (await getRepository(EdmsUser).find({ user_id: In(user_id_list) })).map(raw => raw.email);
        for (var email of email_list) {
            await sendMailWithHtmlImg(
                email,
                `<${tm_code.tm_code}> ${wp.subject}`,
                `<div style="">
                    ${
                        document_files.length > 0
                            ? `
                        <div style="border : 1px solid grey;">
                            <table style="
                            height: auto;
                            color: rgb(51,51,51);
                            font-size: 12px;
                            font-weight: bold;
                            padding : 10px;
                            display : flex;
                            flex-direction : column;">
                            <tr><td>대용량 다운로드 목록</td></tr>
                            <tr><td><a target="_blank" href="${zipUrl}">${zipFileName} 다운로드</a></td></tr>
                            ${bigAttachList.map(
                                raw =>
                                    `<tr><td><a target="_blank" href="${raw.path}">${raw.filename} 다운로드</a></td></tr>`
                            )}
                            </table>
                        </div>`
                            : `<div></div>`
                    }
                    <span>${LANGUAGE_PACK.EMAIL.TM.RECEIVE_TM_DOCUMENT.kor}</span>
                    ${wp.explan}
                </div>`,
                trPaperImg.image,
                mail_attachments
            );
        }
    } catch (err) {
        console.log(err);
        console.log("sendmailtm error : " + err);
    }
};

router.get("/tm_test", async (req: Request, res: Response) => {
    let wp = await getRepository(WorkProc).findOne({ wp_idx: 3182 });
    let wd = await getRepository(WorkDocu).find({ wp_idx: wp.wp_idx });
    let target = await getRepository(EdmsUser).find({ username: Like("%정주호%") });
    await send_mail_tm(
        wd.map(raw => raw.docu_no),
        target.map(raw => raw.user_id),
        wp
    );
    res.send(200);
});

const DEFAULT_TM_CONTENT_ROW_COUNT = 100;

const file_path_to_sheet_image = (
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    file_path: string,
    col: number,
    row: number
) => {
    try {
        let repo_path = path.resolve(globalThis.HOME_PATH, edmsUploadFolder + file_path);
        let size = imageSizeOf(repo_path);
        let ext: any = size.type;
        let imgId = workbook.addImage({ filename: repo_path, extension: ext });
        // let pos = sheet.getCell(row, col).address;
        let height = size.height;
        let width = size.width;
        while (height > 300 || width > 300) {
            height -= height / 2;
            width -= width / 2;
        }
        sheet.addImage(imgId, { tl: { col: col - 1, row: row - 0.5 }, ext: { height: height, width: width } });
        sheet.getRow(row).height = height * 0.5;
    } catch (err) {
        // console.log(err);
        logger.error(err);
    }
};

export const get_tm_review_excel = async (wp_idx: number, req: Request, res: Response | null, is_del?: boolean) => {
    var {
        cell_styles,
        merge_column_list,
        cols_width_list,
        merge_list,
        cols_width_list_review,
        cols_height_review,
        cell_center_list,
    } = new TmReviewExcel();
    const user_id = req.app.get("edms_user_id");
    let tm_list = await getRepository(WorkProc).find({
        where: [
            { wp_type: "TM", wp_idx: wp_idx },
            { wp_type: "TM", original_tm_id: wp_idx },
        ],
        order: { original_tm_id: "ASC" },
    });
    if (tm_list == undefined || tm_list.length == 0) return null;
    let tm_code = await getRepository(WorkTm).findOne({ wp_idx: tm_list[0].wp_idx });

    let drn_list = await getRepository(WorkProc).find({
        wp_type: "DRN",
        original_tm_id: In(tm_list.map(raw => raw.wp_idx)),
    });
    let drn_wp_idx_list = drn_list.map(raw => raw.wp_idx);

    let review_list = await getRepository(WorkReview).find({
        where: {
            wp_idx: In([...tm_list.map(raw => raw.wp_idx), ...drn_wp_idx_list]),
        },
        order: { wr_idx: "ASC" },
    });

    let attach_list = await getRepository(WorkAttach).find({
        where: {
            wr_idx: In(review_list.map(raw => raw.wr_idx)),
        },
    });

    let work_docu = await getRepository(WorkDocu).find({
        wp_idx: In([...drn_wp_idx_list, wp_idx]),
    });

    let docu_list = await getRepository(EdmsDocument).find({
        docu_no: In(work_docu.map(raw => raw.docu_no)),
        is_use: 1,
    });

    let work_file = await getRepository(WorkFile).find({
        wp_idx: In(tm_list.map(raw => raw.wp_idx)),
    });

    let file_list = await getRepository(EdmsFiles).find({
        file_no: In(work_file.map(raw => raw.file_no)),
        is_use: 1,
    });

    let stage_list = await getRepository(EdmsStage).find({
        where: { docu_no: In(docu_list.map(raw => raw.docu_no)), is_use: 1 },
        order: { actual_dt: "DESC" },
    });

    if (docu_list.length == 0) return null;

    let project_type = await getRepository(EdmsProjectType).findOne({
        project_no: docu_list[0].project_no,
        is_use: 1,
    });

    // 다운받는 유저 찾기
    let user_list = await getRepository(EdmsUser).find({ is_use: 1 });
    let user = user_list.find(raw => raw.user_id == user_id);
    let review_order_datas = [
        "Rev.",
        "검토결과\n(*Note)",
        "Review Comment",
        "작성자",
        "Reply",
        "설계변경\n해당유무\n(Y/N)",
        "날짜",
    ];
    let default_review_content = [
        [
            "CONTRACT No.",
            "",
            ":",
            "1",
            "",
            "통영 천연가스 발전사업_" + project_type.project_code,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "TR No.",
            ":",
            tm_code.tm_code,
        ],
        [
            "P.O. No.",
            "",
            ":",
            "1",
            "",
            "Review Comments",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Date",
            ":",
            getMoment(tm_list[0].create_tm).format("YYYY-MM-DD"),
        ],
        ["Item Name", "", ":", "TEP 발전소"],
        ["Vendor Name", "", ":", "한화건설"],
        ["No.", "Document Number", "", "", "DESCRIPTION", "Page / Sheet No."],
    ];
    let DEFAULT_REVIEW_CONTENT_LENGTH = 5;
    let REVIEW_LEFT_LENGTH = 7;
    let REVIEW_RIGHT_LENGTH = 6;

    //first column style add
    for (var i = 6; i < DEFAULT_TM_CONTENT_ROW_COUNT + 6; i++) {
        cell_styles.push({
            cell: "A" + i,
            row: i,
            rowCount: 100,
            horizontal: "left",
            vertical: "middle",
            font: { size: 12 },
            border: {
                top: { style: "thin", color: { argb: "000" } },
                left: { style: "thin", color: { argb: "000" } },
                right: { style: "thin", color: { argb: "000" } },
                bottom: { style: "thin", color: { argb: "000" } },
            },
        });
        cell_styles.push({
            cell: "A" + i,
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "BF0001" } },
        });
    }

    // review data add
    // drn docu get by docu_no
    let drn_docu_list = docu_list;
    if (drn_docu_list.length > 0) {
        // 1. 리뷰를 wp_idx로 조회
        // 2. 가져온 리뷰들중 docu_no 가 같은것 끼리 뭉친다.
        // 3. 뿌려주기
        let review_filtered = [];
        for (let review of review_list) {
            let index = review_filtered.findIndex(
                (raw, idx) =>
                    raw.docu_no == review.docu_no &&
                    review.p_wr_idx != 0 &&
                    raw.review.findIndex(r => r.wr_idx == review.p_wr_idx) != -1
            );
            // 파일 가져오기
            let file = file_list.find(raw => raw.docu_no == review.docu_no);
            // docu_list
            let _drn_docu_list = drn_docu_list.filter(raw => raw.docu_no == review.docu_no);
            // 문서1번부터 10번까지일경우 1~10 표시
            let document_number =
                _drn_docu_list.length > 1
                    ? _drn_docu_list[0].docu_code + "~" + _drn_docu_list[_drn_docu_list.length - 1].docu_code
                    : _drn_docu_list.length > 0
                    ? _drn_docu_list[0].docu_code
                    : "ALL";
            // filename
            if (index != -1) {
                review_filtered[index].review.push(review);
                review_filtered[index].file.push(file);
            } else {
                review_filtered.push({
                    docu_no: review.docu_no,
                    review: [review],
                    file: [file],
                    document_number: document_number,
                });
            }
        }
        // data insert
        let maxOrder = 0;
        let review_content: any[];
        for (let data of review_filtered) {
            let lastIndex = data.review.length - 1;
            let file = data.file[lastIndex];
            let review = data.review[0];
            if (data.document_number !== "ALL" && file == undefined) continue;
            // stage data
            review_content = [
                data.review.map(raw => raw.wr_idx),
                data.document_number,
                "",
                "",
                file ? file.file_name.toString("utf8") : "",
                review.page_sheet_no ? review.page_sheet_no : "-",
            ];
            let review_datas = [...review_order_datas.map(raw => raw)];
            for (var i = 0; i < data.review.length; i++) {
                // 작성자명 찾기
                let nowReview = data.review[i];
                let reviewer = user_list.find(raw => raw.user_id == nowReview.reviewer_id);
                let creat_by = getCreateByName(
                    reviewer.company_id,
                    user.company_id,
                    project_type.project_name,
                    reviewer.username
                );
                // 최초회차일경우 컬럼 추가
                if (maxOrder <= i) {
                    review_datas[2] = OrdinalSuffixOf(i + 1) + " Review Comment";
                    review_datas[4] = OrdinalSuffixOf(i + 1) + " Reply";
                    default_review_content[4] = [...default_review_content[4], ...review_datas];
                }
                review_content = [
                    ...review_content,
                    nowReview.revision ? nowReview.revision : "",
                    nowReview.code && nowReview.code != 0 ? `Code ${nowReview.code}` : "",
                    getStringFromHtml(nowReview.contents),
                    creat_by,
                    getStringFromHtml(nowReview.reply),
                    nowReview.is_change_design,
                    `${getMoment(nowReview.review_date).format("YYMMDD")}`,
                ];
            }
            default_review_content.push(review_content);
            // max order
            if (maxOrder <= lastIndex) maxOrder = lastIndex + 1;
        }

        for (let i = 5; i < default_review_content.length; i++) {
            for (let j = default_review_content[i][0].length; j < maxOrder; j++) {
                review_content = ["", "", "", "", "", "", ""];
                default_review_content[i].push(...review_content);
            }
            default_review_content[i].push(
                default_review_content[i].find(raw => raw == "Code 3" || raw == "Code 4") ? "N" : "Y"
            );
        }
        default_review_content[4].push("최종 완료");
        // style row count
        // 7 => No ~ 최종완료 까지 컬럼개수
        // 7 => review 묶음의 개수
        let row_count = 7 + maxOrder * 7;
        cell_styles[9].rowCount = row_count;
        for (var i = 10; i < cell_styles.length; i++) {
            cell_styles[i].rowCount = row_count;
        }
        for (var i = 0; i < maxOrder; i++) {
            cols_width_list = [...cols_width_list, ...cols_width_list_review];
        }
        //
    }

    // Create Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("sheet1");
    //cell value setting
    for (var i = 0; i < default_review_content.length; i++) {
        for (var j = 0; j < default_review_content[i].length; j++) {
            let reviewContent = default_review_content[i];
            if (i >= DEFAULT_REVIEW_CONTENT_LENGTH) {
                // 기본으로 위에있는 행들
                let wat = undefined;
                let is_review_cell = (j - REVIEW_LEFT_LENGTH) % REVIEW_RIGHT_LENGTH == 1;
                let is_reply_cell = (j - REVIEW_LEFT_LENGTH) % REVIEW_RIGHT_LENGTH == 3;
                let wr_idx_index = reviewContent[0][Math.floor((j - REVIEW_LEFT_LENGTH) / REVIEW_RIGHT_LENGTH)]; // 회차를위해 나눔
                if (is_review_cell) {
                    // review
                    wat = attach_list.find(raw => raw.wr_idx == parseInt(wr_idx_index) && raw.flag == 1);
                } else if (is_reply_cell) {
                    // reply
                    wat = attach_list.find(raw => raw.wr_idx == parseInt(wr_idx_index) && raw.flag == 2);
                }
                if (wat != undefined && wat.file_path != "") {
                    file_path_to_sheet_image(workbook, sheet, wat.file_path.replace(edmsFileDir, ""), j + 1, i + 1);
                    sheet.getCell(i + 1, j + 1).value = `${reviewContent[j] ? reviewContent[j] : ""}`;
                } else {
                    sheet.getCell(i + 1, j + 1).value = `${reviewContent[j]}`;
                }
            } else {
                sheet.getCell(i + 1, j + 1).value = `${reviewContent[j]}`;
            }
        }
    }
    // cell merged
    for (var merge of merge_list) {
        sheet.mergeCells(merge);
    }
    //column merge
    for (var merge of merge_column_list) {
        let cols = merge.split(":");
        for (var i = 5; i < DEFAULT_TM_CONTENT_ROW_COUNT + 5; i++) {
            sheet.mergeCells(`${cols[0]}${i}:${cols[1]}${i}}`);
        }
    }

    //column width setting
    for (var i = 0; i < cols_width_list.length; i++) {
        let column = sheet.getColumn(i + 1);
        column.width = cols_width_list[i].width;
    }
    //column height setting
    for (var i = 6; i < default_review_content.length + 1; i++) {
        let row = sheet.getRow(i);
        row.height = cols_height_review;
    }
    //style setting
    for (var i = 0; i < cell_styles.length; i++) {
        let style = cell_styles[i];
        if (style.row != undefined) {
            let row = sheet.getRow(style.row);
            for (var j = 1; j <= style.rowCount; j++) {
                let cell = row.getCell(j);
                let alignment = {};
                if (cell_center_list.indexOf(j) != -1) {
                    Object.assign(alignment, { horizontal: "center" });
                    Object.assign(alignment, { vertical: "middle" });
                } else {
                    if (style.horizontal) Object.assign(alignment, { horizontal: style.horizontal });
                    if (style.vertical) Object.assign(alignment, { vertical: style.vertical });
                }

                cell.alignment = alignment;
                cell.font = { ...style.font };
                cell.border = style.border;
                cell.fill = style.fill;
            }
        } else {
            let cell = sheet.getCell(style.cell);
            cell.alignment = { horizontal: style.horizontal, vertical: style.vertical };
            cell.font = { ...style.font };
            cell.border = style.border;
            cell.fill = style.fill;
        }
    }

    const _filename = `temp${new Date().getTime()}.xlsx`;
    await workbook.xlsx.writeFile(_filename);
    if (res) {
        res.setHeader(
            "Content-disposition",
            "attachment; filename=" + getDownloadFilename(req, `${tm_code.tm_code}_ReviewComment.xlsx`)
        ); // 다운받아질 파일명 설정
        res.setHeader("Content-type", "application/vnd.ms-excel; charset=utf-8"); // 파일 형식 지정

        var filestream = fs.createReadStream(_filename);
        filestream.pipe(res);
    }

    if (is_del === true) fs.unlinkSync(_filename);

    return _filename;
};

router.get("/get_tm_review_excel", async (req: Request, res: Response) => {
    if (req.app.get("edms_user_id") != null) {
        const _wp_idx = req.query.wp_idx;
        let wp_idx = parseInt(_wp_idx.toString());
        let result = await get_tm_review_excel(wp_idx, req, res);
        if (result == null) return getFailedResponse(res);
        return;
    }
    return getFailedResponse(res);
});

router.post("/create_tm_comment", async (req: Request, res: Response) => {
    const { wp_idx, review_owner, contents, create_by, reviewer_id } = req.body;
    try {
        let newWR = new WorkReview();

        newWR.wp_idx = wp_idx;
        newWR.review_owner = review_owner;
        newWR.contents = contents;
        newWR.reviewer_id = reviewer_id;
        newWR.create_by = create_by;
        newWR.create_tm = new Date();
        newWR.review_date = new Date();

        let insertWR = await getRepository(WorkReview).save(newWR);

        let tm_comment_list = await getRepository(WorkReview).find({
            where: { wp_idx },
            order: { wr_idx: "ASC" },
        });

        return getSuccessResponse(res, {
            insert_workreview: {
                ...insertWR,
            },
            tm_comment_list,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/approval_tm", async (req: Request, res: Response) => {
    const { wp_idx, create_by } = req.body;
    try {
        if (req.app.get("edms_user_id") != null) {
            let wa_idx_list: any = [];

            const _assign_list = await getRepository(WorkAssign).find({
                wp_idx: wp_idx,
            });

            for (let l of _assign_list) {
                wa_idx_list.push(l.wa_idx);
            }

            let result = await update_assign_state(11, wa_idx_list, true);
            return getSuccessResponse(res, result);
        }
        // return getSuccessResponse(res, { insertWP, insertAchieve, insertSR });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_tm_detail", async (req: Request, res: Response) => {
    const { wp_idx } = req.query;
    const _wp_idx = parseInt(wp_idx.toString());
    try {
        let tm_comment_list: {
            reviewer_id: number;
            create_by: string;
            contents: string;
            review_date: Date;
            company: string;
            position: string;
            assign_state: string;
        }[] = [];
        // load data
        let all_edms_user = await getRepository(EdmsUser).find({ is_use: 1 });
        let all_company = await getRepository(EdmsCompany).find({ is_delete: false });
        let all_position = await getRepository(EdmsPosition).find({ is_delete: false });
        let all_assign = await getRepository(WorkAssign).find();
        //
        let now_tm_proc = await getRepository(WorkProc).findOne({ wp_idx: _wp_idx });
        let comment_list = await getRepository(WorkReview).find({
            where: { wp_idx },
            order: { wr_idx: "ASC" },
        });
        let tm_assign_list = await getRepository(WorkAssign).find({
            where: { wp_idx },
        });

        // 원본 TM일경우 모든 하위 데이터를 가져옴
        if (now_tm_proc && now_tm_proc.original_tm_id == 0) {
            let all_tm_proc = await getRepository(WorkProc).find({ original_tm_id: _wp_idx });
            let all_tm_proc_idx = [...all_tm_proc.map(raw => raw.wp_idx)];
            if (all_tm_proc_idx.length > 0) {
                let comments = await getRepository(WorkReview).find({
                    wp_idx: In(all_tm_proc_idx),
                });
                let all_tm_assign_list = await getRepository(WorkAssign).find({
                    wp_idx: In(all_tm_proc_idx),
                });
                comment_list = [...comment_list, ...comments];
                tm_assign_list = [...tm_assign_list, ...all_tm_assign_list];
            }
        }

        for (var comment of comment_list) {
            tm_comment_list.push({
                reviewer_id: comment.reviewer_id,
                create_by: comment.create_by,
                contents: comment.contents,
                review_date: comment.review_date,
                company: "",
                position: "",
                assign_state: "",
            });
        }

        for (var l of tm_comment_list) {
            //유저 찾기
            let user = all_edms_user.find(raw => raw.user_id == l.reviewer_id);

            // 직급 찾기
            let position = all_position.find(raw => raw.id == user.position_id);

            // 회사 찾기
            let company = all_company.find(raw => raw.id == user.company_id);

            l.company = company.company_name;
            l.position = position ? position.position_name : "";
        }

        return getSuccessResponse(res, { tm_comment_list, tm_assign_list });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_docu_review", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    try {
        let list: {
            create_by: string;
            contents: string;
            review_date: Date;
            reply: string;
            fversion: number;
        }[] = [];

        let docu_review = await getRepository(EdmsReview).find({
            where: { docu_no: docu_no },
        });
        let all_files = await getRepository(EdmsFiles).find({
            where: { docu_no: docu_no, is_use: 1 },
            order: { fversion: "DESC" },
        });

        for (var review of docu_review) {
            list.push({
                create_by: review.create_by,
                contents: review.content,
                review_date: review.create_tm,
                reply: review.reply,
                fversion: -1,
            });
        }
        for (var l of list) {
            let version = all_files.map(raw => raw.fversion);
            l.fversion = version[0];
        }
        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export const findAllWpIdxTm = async (wp_idx: number, find_wp_idx_list: any[]) => {
    if (wp_idx != -1 && wp_idx) {
        let tm = await getRepository(WorkProc).findOne({ wp_idx: wp_idx });
        let origin_tm_list = await getRepository(WorkProc).find({
            original_tm_id: wp_idx,
            wp_type: "tm",
        });
        if (tm.wp_type != "TM") return find_wp_idx_list;
        find_wp_idx_list.push(tm.wp_idx);
        if (tm.original_tm_id != -1 && find_wp_idx_list.indexOf(tm.original_tm_id) == -1) {
            let _list = await findAllWpIdxTm(tm.original_tm_id, find_wp_idx_list);
            find_wp_idx_list = _list;
        }
        if (origin_tm_list.length > 0) {
            for (var origin_tm of origin_tm_list) {
                if (origin_tm && find_wp_idx_list.indexOf(origin_tm.wp_idx) == -1) {
                    find_wp_idx_list.push(origin_tm.wp_idx);
                    find_wp_idx_list = await findAllWpIdxTm(origin_tm.wp_idx, find_wp_idx_list);
                }
            }
        }
    }
    return find_wp_idx_list;
};

router.get("/get_drn_history", async (req: Request, res: Response) => {
    const { docu_no } = req.query;
    let wp_idx = parseInt(req.query.wp_idx.toString());

    await getConnection().transaction(async tr => {
        try {
            let tm_wp_idx_list: number[] = [];
            let drn_wp_idx_list: number[] = [];
            let drn_work_proc_list: WorkProc[] = [];

            let now_tm = await tr.getRepository(WorkProc).findOne({ wp_idx });

            if (now_tm.original_tm_id == 0) {
                let now_wp_idx: number = wp_idx;
                let is_exist_sub_tm: boolean = true;
                tm_wp_idx_list = [now_tm.wp_idx];

                while (is_exist_sub_tm) {
                    let sub_tm_work_proc = await tr
                        .getRepository(WorkProc)
                        .findOne({ wp_type: "TM", original_tm_id: now_wp_idx });

                    if (sub_tm_work_proc) {
                        now_wp_idx = sub_tm_work_proc.wp_idx;
                        tm_wp_idx_list.push(sub_tm_work_proc.wp_idx);
                    } else {
                        is_exist_sub_tm = false;
                    }
                }
            } else {
                tm_wp_idx_list = [now_tm.wp_idx, now_tm.original_tm_id];
            }
            drn_work_proc_list = await tr
                .getRepository(WorkProc)
                .find({ original_tm_id: In(tm_wp_idx_list), wp_type: "DRN" });
            drn_wp_idx_list = [...drn_work_proc_list.map(raw => raw.wp_idx)];

            let file_attach_list: any[] = [];
            let filtered_assign_list: any[] = [];

            let all_wp_idx_list = [...drn_wp_idx_list, ...tm_wp_idx_list];

            let drn_history_list = await tr.query(`
                SELECT
                    wr.revision,
                    wr.wp_idx,
                    wr.code,
                    wr.page_sheet_no,
                    wr.create_by,
                    wr.review_date,
                    wr.contents,
                    wr.reply,
                    wr.file_no       	
                FROM work_review wr
                INNER JOIN edms_document ed
                ON ed.docu_no = wr.docu_no
                WHERE wr.wp_idx IN(${all_wp_idx_list}) AND wr.docu_no = ${docu_no};
            `);

            let drn_assign_list = await tr.getRepository(WorkAssign).find({
                where: { wp_idx: In(drn_history_list.map(raw => raw.wp_idx)) },
            });
            let drn_file_list = await tr.getRepository(WorkAttach).find({
                where: { wp_idx: In(drn_history_list.map(raw => raw.wp_idx)) },
            });

            if (drn_file_list.length != 0) {
                for (let list of drn_file_list) {
                    file_attach_list.push({
                        wp_idx: list.wp_idx,
                        file_name: list.file_name,
                        file_path: list.file_path,
                    });
                }
            }

            for (let list of drn_assign_list) {
                if (list.assign_from_id != list.assign_to_id) filtered_assign_list.push(list);
            }

            return getSuccessResponse(res, {
                drn_history_list,
                filtered_assign_list,
                file_attach_list,
            });
        } catch (err) {
            logger.error(req.path + " || " + err);
            return getFailedResponse(res);
        }
    });
});
// 채번
export const get_tm_code = (
    is_reply: boolean,
    project_type_code: string,
    stage_type: string, //"IFA" | "AFC" | "Start" | "As-Built",
    tm_last_code?: number
) => {
    const tm_code_cop = {
        "LNG TANK": "L",
        "POWER PLANT": "P",
        "TRANSMISSION LINE": "T",
    };
    const tm_code_doc_type = "T";
    // 1 : TEP, 2: HUMANTEC, 3 : SHINHAN, 4 : HANWHA
    const tm_code_company_char = !is_reply
        ? { 1: "T", 2: "T", 3: "S", 4: "H(H)" }
        : { 1: "H(H)", 2: "H(H)", 3: "H(H)", 4: "S" };
    const tm_code_project_code = "TEP";

    let code,
        proj_type_code,
        send_company_code,
        recv_company_code = "";

    // project type
    proj_type_code =
        tm_code_cop[
            Object.keys(tm_code_cop).find(
                raw => raw.toLocaleLowerCase().localeCompare(project_type_code.toLocaleLowerCase()) == 0
            )
        ];
    //
    // tm_last_code zero leading
    let _tm_last_code = tm_last_code !== undefined ? zeroPad(tm_last_code + 1, 4) : 0;
    //
    // 발전소
    if (project_type_code.toLocaleLowerCase().indexOf("power plant") != -1) {
        send_company_code = tm_code_company_char[4];
        recv_company_code = tm_code_company_char[3];
        if (stage_type.indexOf("IFA") != -1) {
        } else if (stage_type.indexOf("AFC") != -1) {
            recv_company_code += "(FC)";
        }
    }
    // LNG
    else if (project_type_code.toLocaleLowerCase().indexOf("lng tank") != -1) {
        send_company_code = tm_code_company_char[4];
        recv_company_code = tm_code_company_char[1];
    }
    // 송전선로
    else if (project_type_code.toLocaleLowerCase().indexOf("transmission line") != -1) {
        send_company_code = tm_code_company_char[4];
        recv_company_code = tm_code_company_char[3];
        if (stage_type.indexOf("IFA") != -1) {
        } else if (stage_type.indexOf("AFC") != -1) {
            recv_company_code += "(FC)";
        }
    }

    code = `${proj_type_code}-${tm_code_doc_type}${send_company_code}${recv_company_code}-${tm_code_project_code}${
        _tm_last_code != 0 ? `-${_tm_last_code}` : ""
    }`;
    return code;
};
// tm_code 가져오는 API
router.get("/get_tm_code", async (req: Request, res: Response) => {
    let isReply = req.query.is_reply && req.query.is_reply.toString() == "1" ? true : false;
    let company_name = req.query.company_name;
    let file_no = req.query.file_no ? parseInt(req.query.file_no.toString()) : -1;
    let project_no = req.query.project_no ? parseInt(req.query.project_no.toString()) : -1;
    let stage_type = req.query.stage_type;

    const user_id = req.app.get("edms_user_id");

    let recv_comp_id: number;
    let tm_last_code: any;
    let stage_code: any;
    let projectType: EdmsProjectType;
    let stageType: EdmsStageType;
    if (user_id !== undefined && user_id !== null) {
        await getConnection().transaction(async tr => {
            let user = await tr.getRepository(EdmsUser).findOne({
                where: { user_id: user_id, is_use: 1 },
            });
            try {
                // 관리자 권한이 없을 때
                if (user.level >= 3) return getSuccessResponse(res, []);
                // Optional
                if (project_no) {
                    projectType = await tr.getRepository(EdmsProjectType).findOne({
                        project_no: project_no,
                    });
                }
                if (stage_type) {
                    stageType = await tr.getRepository(EdmsStageType).findOne({
                        where: { stage_name: Like(`%${stage_type}%`) },
                    });
                }

                //
                let company_info = await tr.getRepository(EdmsCompany).find({
                    company_name: Like(`%${company_name}%`),
                    is_delete: false,
                });
                if (company_info.length == 0) {
                    return getSuccessResponse(res, { code: true, tm_user_id: 0 });
                }
                recv_comp_id = company_info[0].id;

                let workTmCode = await tr.getRepository(WorkTmCode).find({ company_id: recv_comp_id });
                let file = await tr.getRepository(EdmsFiles).findOne({
                    file_no: file_no,
                    is_use: 1,
                });
                if (file !== undefined || (projectType != undefined && stageType != undefined)) {
                    if (file && projectType === undefined)
                        projectType = await tr.getRepository(EdmsProjectType).findOne({
                            project_no: file.project_no,
                            is_use: 1,
                        });
                    if (file) {
                        stage_code = file.stage_code;
                        let stage_type_text = file.stage_code.split(" ")[0];
                        stageType = await tr
                            .getRepository(EdmsStageType)
                            .findOne({ stage_name: Like(`%${stage_type_text}%`) });
                    } else {
                        stage_code = stageType.stage_name;
                    }
                    let template_code = get_tm_code(isReply, projectType.project_code, stage_code);
                    tm_last_code = await getConnection().query(`
                        SELECT tm.* 
                        FROM work_tm tm
                        JOIN (SELECT max(wp_idx) as 'last_wp_idx'
                            FROM work_tm
                            WHERE tm_code LIKE '%${template_code}%') as last_tm
                        ON last_tm.last_wp_idx = tm.wp_idx 
                    `);

                    if (tm_last_code.length > 0) {
                        let _splited = tm_last_code[0].tm_code.split("-");
                        tm_last_code = parseInt(_splited[_splited.length - 1]);
                    } else {
                        tm_last_code = 0;
                    }
                    let code = get_tm_code(isReply, projectType.project_code, stage_code, tm_last_code);
                    let recv_tm_manager_id: any;

                    recv_tm_manager_id = workTmCode.find(workTm => workTm.project_no == projectType.project_no);
                    if (recv_tm_manager_id === undefined) {
                        let tmp = workTmCode.find(workTm => workTm.project_no == -1);
                        if (tmp !== undefined) recv_tm_manager_id = tmp.tm_user_id;
                        else recv_tm_manager_id = 0;
                    } else {
                        recv_tm_manager_id = recv_tm_manager_id.tm_user_id;
                    }

                    return getSuccessResponse(res, {
                        code,
                        tm_user_id: recv_tm_manager_id,
                        tm_project_no: projectType.project_no,
                        stage_type: stageType.stage_name,
                    });
                }
            } catch (err) {
                logger.error(req.path + " || " + err);
                return getFailedResponse(res);
            }
        });
    }
});

router.get("/get_all_tm_code_list", async (req: Request, res: Response) => {
    try {
        let list = await getRepository(WorkTmCode).find();

        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/edit_tm_code", async (req: Request, res: Response) => {
    const { company_id, startCode, midCode, lastCode } = req.body;
    try {
        let tmCode = await getRepository(WorkTmCode).findOne({
            where: { company_id: company_id },
        });

        let edit_code = {};

        if (startCode) Object.assign(edit_code, { tm_code_start: startCode });
        if (midCode) Object.assign(edit_code, { tm_code_mid: midCode });
        if (lastCode) Object.assign(edit_code, { tm_code_last: lastCode });

        await getConnection()
            .createQueryBuilder()
            .update(WorkTmCode)
            .set(edit_code)
            .where("company_id = :id", { id: company_id })
            .execute();

        return getSuccessResponse(res, { tmCode });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    getFailedResponse(res);
});

router.get("/get_original_tm_code", async (req: Request, res: Response) => {
    const { wp_idx } = req.query;
    try {
        const _original_tm_code = await getRepository(WorkTm).findOne({
            where: { wp_idx: wp_idx },
        });

        const work_proc = await getRepository(WorkProc).findOne({
            where: { wp_idx: wp_idx },
        });

        let tm_subject = work_proc.subject;
        let original_tm_code = _original_tm_code.tm_code;

        return getSuccessResponse(res, { original_tm_code: original_tm_code, tm_subject: tm_subject });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// tm 승인자 접수
router.post("/create_tm_approver", async (req: Request, res: Response) => {
    const { wa_idx, approver_id_list } = req.body;
    try {
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");
            let list: any[] = [];

            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });

            let _assign = await getRepository(WorkAssign).find({
                wa_idx: wa_idx,
            });

            // TM 결재자 생성
            for (let i = 0; i < approver_id_list.length; i++) {
                let newAssign = new WorkAssign();

                newAssign.approval_order = i + 1;
                newAssign.is_approval = false;
                newAssign.assign_from_id = user_id;
                newAssign.assign_to_id = approver_id_list[i];
                newAssign.create_by = user.userid;
                newAssign.due_to_date = _assign[0].due_to_date;
                newAssign.wp_idx = _assign[0].wp_idx;
                newAssign.assign_state = 2;
                if (i == approver_id_list.length - 1) newAssign.is_last_approve = true;
                else newAssign.is_last_approve = false;

                list.push(newAssign);

                await getRepository(WorkAssign).save(newAssign);
            }
            update_assign_state(9, wa_idx);
            //
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

const send_recv_box_update = async (wp_idx: number, recver_id: number) => {
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

const work_review_is_fin_update = async (work_review_list: WorkReview[] | number[]) => {
    try {
        if (work_review_list.length > 0) {
            let wr_idx_list = [];
            if (typeof work_review_list[0] == "number") {
                wr_idx_list = work_review_list;
            } else {
                wr_idx_list = work_review_list.map(raw => raw.wr_idx);
            }
            await getConnection()
                .createQueryBuilder()
                .update(WorkReview)
                .set({ is_fin: 1 })
                .where(`wr_idx IN(${wr_idx_list.join(",")})`)
                .execute();
        }
    } catch (err) {}
    return true;
};

export const UpdateCodeFromTm = (
    Allreview: WorkReview[],
    edms_file_list: EdmsFiles[],
    edms_stage_type: EdmsStageType[]
): { doc_ids: number[]; final_codes: number[]; file_codes: number[] } => {
    let doc_ids = [];
    let final_codes = []; // 최종적으로 해당 도큐먼트에 대한 결정. 1 : stage up, 2 : revision up, 3 : nothing
    let file_codes = []; // 파일별 실제 리뷰 코드 저장
    // ALL 을 가진 Document No 가 있다면
    // 공통 으로 처리된 리뷰의 경우 우선순위가 더 높음
    if (Allreview.length == 0) return { doc_ids, final_codes, file_codes };
    let isAllReview = Allreview.find(raw => raw.docu_no == -1);
    if (isAllReview) Allreview.map(review => (review.code = isAllReview.code));
    //
    for (var rootReview of Allreview) {
        if (rootReview.p_wr_idx != 0) continue; // 최상위 리뷰만 루프
        try {
            let latest_review = Allreview.filter(raw => raw.docu_no == rootReview.docu_no).sort((a, b) =>
                b.order != a.order ? b.order - a.order : b.wr_idx - a.wr_idx
            )[0];
            let idx = doc_ids.indexOf(rootReview.docu_no);
            let edms_file = edms_file_list.find(raw => raw.docu_no == rootReview.docu_no);
            let stage_split = edms_file.stage_code.split(` `); //ex ) "IFA Issue" => ["IFA", "Issue"];
            let now_stage = edms_stage_type.find((raw: any) => raw.stage_name == stage_split[0]);
            let code = latest_review.code;
            if (now_stage) {
                if (now_stage.stage_name.indexOf("IFA") != -1) {
                    //IFA
                    if (idx != -1) {
                        if (code <= 2) {
                            final_codes[idx] = 1;
                        } else if (code <= 3) {
                            final_codes[idx] = 2;
                        } else {
                            final_codes[idx] = 3;
                        }
                    } else {
                        doc_ids.push(latest_review.docu_no);
                        file_codes.push(code);
                        if (code <= 2) {
                            final_codes.push(1);
                        } else if (code <= 3) {
                            final_codes.push(2);
                        } else {
                            final_codes.push(3);
                        }
                    }
                } else if (now_stage.stage_name.indexOf("AFC") != -1) {
                    // AFC
                    if (idx != -1) {
                        if (code <= 1) {
                            final_codes[idx] = 1;
                        } else if (code <= 3) {
                            final_codes[idx] = 2;
                        } else {
                            final_codes[idx] = 3;
                        }
                    } else {
                        doc_ids.push(latest_review.docu_no);
                        file_codes.push(code);
                        if (code <= 1) {
                            final_codes.push(1);
                        } else if (code <= 3) {
                            final_codes.push(2);
                        } else {
                            final_codes.push(3);
                        }
                    }
                } else if (now_stage.stage_name.indexOf("As-Built") != -1) {
                    // As-Built
                    if (idx != -1) {
                        if (code <= 1) {
                            final_codes[idx] = 1;
                        } else if (code <= 3) {
                            final_codes[idx] = 2;
                        } else {
                            final_codes[idx] = 3;
                        }
                    } else {
                        doc_ids.push(latest_review.docu_no);
                        file_codes.push(code);
                        if (code <= 1) {
                            final_codes.push(1);
                        } else if (code <= 3) {
                            final_codes.push(2);
                        } else {
                            final_codes.push(3);
                        }
                    }
                }
            } else {
                // 스테이지 네임이 없다는건 파일이없다는건가.
            }
        } catch (err) {
            console.log(err);
        }
    }
    return { doc_ids, final_codes, file_codes };
};

const CloneNextStage = async (now_stage: EdmsStage) => {
    let new_stage = new EdmsStage();
    Object.assign(new_stage, { ...now_stage });
    new_stage.modify_tm = new Date();
    new_stage.plan_dt = new Date();
    new_stage.revision = now_stage.revision + 1;
    new_stage.actual_rate = 0;
    now_stage.stage_no = null;

    await getRepository(EdmsStage).save(new_stage);
};

// tm 회신결재
router.post("/tm_reply_approve", async (req: Request, res: Response) => {
    const { comment, check, wa_idx, wp_idx } = req.body;
    await getConnection().transaction(async tr => {
        try {
            if (req.app.get("edms_user_id") != null) {
                const user_id = req.app.get("edms_user_id");

                let result: boolean;
                let wa_idx_list: any[] = [];
                let wa_approver_wa_idx: any[] = [];

                const user = await tr.getRepository(EdmsUser).findOne({
                    user_id: user_id,
                    is_use: 1,
                });
                const _work_proc = await tr.getRepository(WorkProc).findOne({
                    wp_idx: wp_idx,
                });
                const work_tm = await tr.getRepository(WorkTm).findOne({ wp_idx });
                const work_docu = await tr.getRepository(WorkDocu).find({ wp_idx: wp_idx });
                const _assign_list = await tr.getRepository(WorkAssign).find({
                    where: {
                        wp_idx: wp_idx,
                    },
                    order: { wa_idx: "ASC" },
                });
                const assign_list = _assign_list.filter(raw => raw.is_cc == 0);
                const cc_assign = _assign_list.find(raw => raw.is_cc == 1);
                const _assign = _assign_list.find(raw => raw.wa_idx == wa_idx);

                if (check === "approve") {
                    // 승인
                    if (_assign.is_last_approve == true) {
                        // 마지막 결재자일떄
                        const _original_work_assign = await tr.getRepository(WorkAssign).findOne({
                            where: {
                                wp_idx: _work_proc.original_tm_id,
                                assign_to_id: _work_proc.user_id,
                            },
                        });
                        const _original_sender_work_assign = await tr.getRepository(WorkAssign).findOne({
                            where: {
                                assign_from_id: _work_proc.user_id,
                                assign_to_id: _original_work_assign.assign_from_id,
                            },
                        });

                        const tm_proc = await tr.getRepository(WorkProc).findOne({
                            wp_idx: _work_proc.original_tm_id,
                        });
                        for (let l of assign_list) {
                            if (
                                (l.assign_from_id == _work_proc.approver_id &&
                                    l.assign_to_id == _work_proc.requester_id) ||
                                (l.assign_from_id == _work_proc.requester_id &&
                                    l.assign_to_id == _work_proc.approver_id)
                            ) {
                                wa_approver_wa_idx.push(l.wa_idx);
                            }
                            wa_idx_list.push(l.wa_idx);
                        }
                        await update_assign_state(14, _original_work_assign.wa_idx, true);
                        await update_assign_state(8, _original_sender_work_assign.wa_idx, true);
                        await update_tm_state(11, tm_proc.wp_idx);
                        await update_tm_state(6, wp_idx);
                        // 재회신일경우에 대한 처리 필요
                        if (_work_proc.original_tm_id && _work_proc.original_tm_id != 0) {
                            // code에 따른 stage 변경
                            // code 가 더높은걸 사용
                            let work_proc_origin = await tr.getRepository(WorkProc).find({
                                where: [
                                    { original_tm_id: _work_proc.wp_idx },
                                    { wp_idx: _work_proc.original_tm_id },
                                    { wp_idx: _work_proc.wp_idx },
                                ],
                            });
                            let Allreview = await tr.getRepository(WorkReview).find({
                                wp_idx: In([...work_proc_origin.map(raw => raw.wp_idx)]),
                                is_fin: 0,
                            });
                            let edms_file_list = await tr.getRepository(EdmsFiles).find({
                                is_last_version: "Y",
                                docu_no: In(Allreview.map(raw => raw.docu_no)),
                                is_use: 1,
                            });
                            let edms_stage_type = await tr.getRepository(EdmsStageType).find({
                                is_use: 1,
                            });
                            let edms_stages = await tr.getRepository(EdmsStage).find({
                                docu_no: In(Allreview.map(raw => raw.docu_no)),
                                is_use: 1,
                            });
                            let { doc_ids, final_codes, file_codes } = UpdateCodeFromTm(
                                Allreview,
                                edms_file_list,
                                edms_stage_type
                            );
                            // 히스토리
                            let tm_history: WorkTmHistory[] = [];
                            // 프로세스
                            for (var i = 0; i < doc_ids.length; i++) {
                                let docu_no = doc_ids[i];
                                let code = final_codes[i];
                                let file_code = file_codes[i];
                                // document 당 한번씩만
                                let edms_file = edms_file_list.find(raw => raw.docu_no == docu_no);
                                if (edms_file) {
                                    let stage_split = edms_file.stage_code.split(` `); //ex ) "IFA Issue" => ["IFA", "Issue"];
                                    let now_stage = edms_stage_type.find(
                                        (raw: any) => raw.stage_name == stage_split[0]
                                    );
                                    let stage_type = stage_split.length > 1 ? stage_split[1][0] : "";
                                    let find_stage = edms_stages.find(
                                        stage =>
                                            stage.docu_no == docu_no &&
                                            stage.stage_code == now_stage.stage_name &&
                                            stage.stage_type.toLocaleLowerCase() == stage_type.toLocaleLowerCase()
                                    );
                                    let newTmHistory = null;
                                    newTmHistory = new WorkTmHistory();
                                    newTmHistory.company_id = user.company_id;
                                    newTmHistory.create_by = user.username;
                                    newTmHistory.file_no = edms_file.file_no;
                                    newTmHistory.wp_idx = _work_proc.original_tm_id;
                                    newTmHistory.code = code;
                                    newTmHistory.review_code = file_code;
                                    if (code == 1) {
                                        newTmHistory.revision = 0;
                                        newTmHistory.stage_name = GetNextStage(edms_file.stage_code, edms_stages);
                                    } else if (code == 2) {
                                        newTmHistory.revision = edms_file.revision;
                                        newTmHistory.stage_name = stage_split[0];
                                        if (find_stage) await CloneNextStage(find_stage);
                                    } else if (code == 3) {
                                        // nothing
                                    }
                                    if (newTmHistory != null) tm_history.push(newTmHistory);
                                }
                            }

                            if (tm_history.length > 0) await tr.getRepository(WorkTmHistory).save(tm_history);

                            if (final_codes.find(raw => raw == 3) == undefined) {
                                // 모든 리뷰 완료
                                let all_wp_idx_list = [];
                                await findAllWpIdxTm(wp_idx, all_wp_idx_list);
                                for (var idx of all_wp_idx_list) await update_tm_state(12, idx);
                            }
                            // is_fin 1 처리
                            await work_review_is_fin_update(Allreview);
                        }
                        result = await update_assign_state(7, wa_idx_list, true);
                        await update_assign_state(8, wa_approver_wa_idx);
                        await send_recv_box_update(_work_proc.wp_idx, _work_proc.approver_id);

                        let mail = await tr.getRepository(WorkMail).find({ wp_idx });

                        // 저장된 유저에게 메일 전송
                        // 참조처,수신처에도 전송
                        if (mail.length > 0) {
                            let mail_docu = work_docu.map(raw => raw.docu_no);
                            let mail_list = mail.map(raw => raw.user_id);
                            if (cc_assign) mail_list.push(cc_assign.assign_to_id);
                            if (_work_proc.approver_id) mail_list.push(_work_proc.approver_id);
                            send_mail_tm(mail_docu, mail_list, tm_proc ? _work_proc : _work_proc);
                        }
                    } else {
                        result = await update_assign_state(14, wa_idx, true);
                        // 현재 결재자 순번 결재자
                        let now_assign_idx = assign_list.findIndex(raw => raw.wa_idx == wa_idx);
                        // 남은 결재라인이 현재 idx 보다 많다면 진입
                        if (assign_list.length > now_assign_idx) {
                            for (var i = now_assign_idx - 1; i > assign_list.length; i++) {
                                let wa = assign_list[i];
                                if (
                                    wa.is_approval == false &&
                                    wa.assign_from_id != wa.assign_to_id &&
                                    wa.assign_state < 15
                                ) {
                                    let next_approver = await tr.getRepository(EdmsUser).findOne({
                                        user_id: wa.assign_to_id,
                                    });
                                    if (next_approver)
                                        sendMail(
                                            next_approver.email,
                                            `<${work_tm.tm_code}> ${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_TITLE.kor}`,
                                            `${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/workproc/tm/${_work_proc.wp_idx}">${LANGUAGE_PACK.EMAIL.SIGNATURE.SHORT_CUT.kor}</a>`
                                        );
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    // 반려
                    for (let list of assign_list) {
                        wa_idx_list.push(list.wa_idx);
                    }
                    result = await update_assign_state(5, wa_idx_list);
                }

                // work_review 생성
                if (result && comment != "") {
                    let docu_no = work_docu[0].docu_no;
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
                    newWR.create_by = user.userid;
                    newWR.create_tm = new Date();
                    newWR.review_date = new Date();
                    newWR.docu_no = docu_no;
                    newWR.file_no = last_file.file_no;
                    newWR.revision = last_file.revision;

                    await getRepository(WorkReview).save(newWR);
                }

                return getSuccessResponse(res, result);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }

        return getFailedResponse(res);
    });
});

// tm 회신하기
router.post("/tm_reply", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    let user = await getRepository(EdmsUser).findOne({
        user_id: user_id,
        is_use: 1,
    });
    await getConnection().transaction(async tr => {
        try {
            const { due_date, approver_list, original_tm, emailIdList, newTmCode, is_resend } = req.body;

            if (user_id != null) {
                let original_tm_work_proc = await tr.getRepository(WorkProc).findOne({
                    wp_idx: original_tm,
                });
                let original_tm_work_tm = await tr.getRepository(WorkTm).findOne({
                    wp_idx: original_tm,
                });
                let original_tm_docu = await tr.getRepository(WorkDocu).find({
                    wp_idx: original_tm,
                });
                let original_tm_file = await tr.getRepository(WorkFile).find({
                    wp_idx: original_tm,
                });

                let tm_code = await tr.getRepository(WorkTmCode).findOne({
                    where: {
                        company_id: original_tm_work_tm.cc_company_id,
                        project_no: original_tm_work_proc.project_no,
                    },
                });

                let is_reply_from_sender = original_tm_work_tm.send_company_id == user.company_id;
                // 워크 생성
                let newProc = new WorkProc();

                newProc.wp_type = "TM";
                newProc.wp_date = original_tm_work_proc.wp_date;
                newProc.wp_code = original_tm_work_proc.wp_code;
                newProc.project_no = original_tm_work_proc.project_no;
                newProc.series_no = original_tm_work_proc.series_no;
                newProc.account_ym = original_tm_work_proc.account_ym;
                newProc.subject = "[RE] " + original_tm_work_proc.subject;
                newProc.explan = original_tm_work_proc.explan;
                newProc.requester_id = original_tm_work_proc.approver_id;
                newProc.approver_id = original_tm_work_proc.requester_id;
                newProc.due_date = original_tm_work_proc.due_date;
                newProc.create_by = user.username;
                newProc.create_tm = new Date();
                newProc.user_id = original_tm_work_proc.approver_id;
                newProc.original_tm_id = original_tm_work_proc.wp_idx;
                newProc.tm_state = 9;
                newProc.tm_idx = original_tm_work_proc.tm_idx + 1;
                newProc.stage_type_id = original_tm_work_proc.stage_type_id;

                let insertProc = await getRepository(WorkProc).save(newProc);
                // 재생성시
                if (is_resend) {
                }
                // 묶여있는 DRN들 전부 생성 및 리뷰 생성
                let drn_list = await tr
                    .getRepository(WorkProc)
                    .find({ original_tm_id: original_tm_work_proc.wp_idx, wp_type: "DRN" });
                let drn_review_list = await tr
                    .getRepository(WorkReview)
                    .find({ where: { wp_idx: In(drn_list.map(raw => raw.wp_idx)) }, order: { order: "ASC" } });
                // DRN생성 리스트
                for (var drn of drn_list) {
                    let newDrn = new WorkProc();
                    Object.assign(newDrn, { ...drn });
                    newDrn.wp_idx = null;
                    newDrn.original_tm_id = insertProc.wp_idx;
                    let insertDrn = await getRepository(WorkProc).save(newDrn);
                    let reviews = drn_review_list.filter(raw => raw.wp_idx == drn.wp_idx);
                    let prev_review = null;
                    for (var review of reviews) {
                        let new_review = new WorkReview();
                        new_review.wp_idx = insertDrn.wp_idx;
                        new_review.review_owner = review.review_owner;
                        new_review.contents = review.contents;
                        new_review.reply = review.reply;
                        new_review.code = review.code;
                        new_review.reviewer_id = review.reviewer_id;
                        new_review.create_by = review.create_by;
                        new_review.create_tm = review.create_tm;
                        new_review.review_date = review.review_date;
                        new_review.docu_no = review.docu_no;
                        new_review.file_no = review.file_no;
                        new_review.is_fin = 0;
                        new_review.p_wr_idx = prev_review ? prev_review.wr_idx : 0;
                        new_review.revision = review.revision;

                        prev_review = await getRepository(WorkReview).save(new_review);
                    }
                }
                // DRN 리뷰 생성
                //
                // // DRN 이동
                // await getConnection()
                //     .createQueryBuilder()
                //     .update(WorkProc)
                //     .set({ original_tm_id: insertProc.wp_idx })
                //     .where("original_tm_id=:id AND wp_type='DRN'", {
                //         id: original_tm_work_proc.wp_idx,
                //     })
                //     .execute();
                let new_docu_list = [];
                //work docu create
                for (var docu of original_tm_docu) {
                    let new_docu = new WorkDocu();
                    Object.assign(new_docu, docu);
                    new_docu.create_tm = new Date();
                    new_docu.wd_idx = null;
                    new_docu.wp_idx = insertProc.wp_idx;
                    new_docu_list.push(new_docu);
                }
                await getRepository(WorkDocu).save(new_docu_list);
                //
                //work file create
                let new_file_list = [];
                for (var file of original_tm_file) {
                    let new_file = new WorkFile();
                    Object.assign(new_file, file);
                    new_file.create_tm = new Date();
                    new_file.wf_idx = null;
                    new_file.wp_idx = insertProc.wp_idx;
                    new_file_list.push(new_file);
                }
                await getRepository(WorkFile).save(new_file_list);
                // 기존 TM 회신결재 상태로변경
                await update_tm_state(9, original_tm_work_proc.wp_idx);
                //
                // TM 결재자 생성
                let new_tm_assign = new WorkAssign();
                new_tm_assign.assign_from_id = insertProc.requester_id;
                new_tm_assign.assign_to_id = insertProc.requester_id;
                new_tm_assign.is_use = 1;
                new_tm_assign.assign_state = 14;
                new_tm_assign.approval_order = 0;
                new_tm_assign.wp_idx = insertProc.wp_idx;
                new_tm_assign.due_to_date = insertProc.due_date;
                new_tm_assign.create_by = user.username;
                await getRepository(WorkAssign).save(new_tm_assign);

                let new_tm_recv_assign = new WorkAssign();
                new_tm_recv_assign.assign_from_id = insertProc.requester_id;
                new_tm_recv_assign.assign_to_id = insertProc.approver_id;
                new_tm_recv_assign.is_use = 0;
                new_tm_recv_assign.assign_state = 8;
                new_tm_recv_assign.approval_order = 0;
                new_tm_recv_assign.wp_idx = insertProc.wp_idx;
                new_tm_recv_assign.due_to_date = insertProc.due_date;
                new_tm_recv_assign.create_by = user.username;
                await getRepository(WorkAssign).save(new_tm_recv_assign);

                let new_tm_send_assign = new WorkAssign();
                new_tm_send_assign.assign_from_id = insertProc.approver_id;
                new_tm_send_assign.assign_to_id = insertProc.requester_id;
                new_tm_send_assign.is_use = 0;
                new_tm_send_assign.assign_state = 8;
                new_tm_send_assign.approval_order = 0;
                new_tm_send_assign.wp_idx = insertProc.wp_idx;
                new_tm_send_assign.due_to_date = insertProc.due_date;
                new_tm_send_assign.create_by = user.username;
                await getRepository(WorkAssign).save(new_tm_send_assign);

                let new_tm_cc_assign = new WorkAssign();
                new_tm_cc_assign.assign_from_id = insertProc.requester_id;
                new_tm_cc_assign.assign_to_id = tm_code.tm_user_id;
                new_tm_cc_assign.is_use = 0;
                new_tm_cc_assign.assign_state = 15;
                new_tm_cc_assign.approval_order = 0;
                new_tm_cc_assign.wp_idx = insertProc.wp_idx;
                new_tm_cc_assign.due_to_date = insertProc.due_date;
                new_tm_cc_assign.create_by = user.username;
                await getRepository(WorkAssign).save(new_tm_cc_assign);

                // 여기
                // 수신, 발신 확인 데이터 생성
                let newSendRecvBox = new WorkSendRecvBox();

                newSendRecvBox.create_by = user.username;
                newSendRecvBox.wp_idx = insertProc.wp_idx;
                newSendRecvBox.work_code = insertProc.wp_code;
                newSendRecvBox.sender = user.user_id;
                newSendRecvBox.recver = insertProc.approver_id;
                newSendRecvBox.user_id = user.user_id;
                newSendRecvBox.is_use = 0;

                await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                //

                let approver_id_list = JSON.parse(approver_list);
                for (let i = 0; i < approver_id_list.length; i++) {
                    // assign_state 2: 대기
                    let newAssign = new WorkAssign();

                    newAssign.approval_order = i + 1;
                    newAssign.assign_from_id = user.user_id;
                    newAssign.assign_to_id = approver_id_list[i];
                    newAssign.create_by = user.username;
                    newAssign.due_to_date = JSON.parse(due_date);
                    newAssign.wp_idx = insertProc.wp_idx;
                    newAssign.assign_state = 13;
                    newAssign.is_approval = false;
                    newAssign.is_use = 1;
                    if (i == approver_id_list.length - 1) newAssign.is_last_approve = true;
                    else newAssign.is_last_approve = false;

                    await getRepository(WorkAssign).save(newAssign);
                    // 여기
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
                //
                // 필요시 참조처 assign 추가
                // 발신처에서 보내는것이고
                // 참조처가 있는경우
                if (
                    is_reply_from_sender &&
                    original_tm_work_tm.cc_company_id &&
                    original_tm_work_tm.cc_company_id > 0
                ) {
                    //참조처 TM 담당자가 있어야함
                    let cc_tm_user = await getRepository(WorkTmCode).find({
                        company_id: original_tm_work_tm.cc_company_id,
                    });
                    if (cc_tm_user.length > 0) {
                        let cc_user = cc_tm_user.find(raw => raw.project_no == original_tm_work_tm.project_type_no);
                        if (cc_user == undefined) cc_user = cc_tm_user[0]; // project_type 매칭되는 유저 없으면 포괄적인 TM 담당자로 설정

                        let newAssign = new WorkAssign();

                        newAssign.wp_idx = insertProc.wp_idx;
                        newAssign.approval_order = 0;
                        newAssign.assign_from_id = insertProc.approver_id;
                        newAssign.assign_to_id = cc_user.tm_user_id;
                        newAssign.assign_state = 19;
                        newAssign.is_approval = false;
                        newAssign.is_last_approve = false;
                        newAssign.due_to_date = JSON.parse(due_date);
                        newAssign.create_by = user.username;
                        newAssign.create_tm = new Date();
                        newAssign.is_cc = 1;

                        await getRepository(WorkAssign).save(newAssign);

                        // 수신, 발신 확인 데이터 생성
                        let newSendRecvBox = new WorkSendRecvBox();

                        newSendRecvBox.create_by = user.username;
                        newSendRecvBox.wp_idx = insertProc.wp_idx;
                        newSendRecvBox.work_code = insertProc.wp_code;
                        newSendRecvBox.sender = user.user_id;
                        newSendRecvBox.recver = cc_user.tm_user_id;
                        newSendRecvBox.user_id = user.user_id;
                        newSendRecvBox.is_use = 0;

                        await getRepository(WorkSendRecvBox).save(newSendRecvBox);
                    }
                    //
                }
                //
                // work_tm 생성
                let newWorkTm = new WorkTm();

                newWorkTm.user_id = user.user_id;
                newWorkTm.create_by = user.username;
                newWorkTm.project_type_no = original_tm_work_tm.project_type_no;
                newWorkTm.discipline_id = original_tm_work_tm.discipline_id;
                newWorkTm.tm_code = newTmCode;
                newWorkTm.wp_idx = insertProc.wp_idx;
                newWorkTm.cc_company_id = original_tm_work_tm.cc_company_id;
                newWorkTm.send_company_id = original_tm_work_tm.send_company_id;

                await getRepository(WorkTm).save(newWorkTm);
                //

                // 첨부파일 있을시 work_attach에 저장
                if (req.files.length != 0) {
                    for (var file_key of Object.keys(req.files)) {
                        let file = req.files[file_key];
                        let new_attach = new WorkAttach();

                        new_attach.wp_idx = insertProc.wp_idx;
                        new_attach.create_by = user.username;
                        new_attach.create_tm = new Date();
                        new_attach.file_name = file.originalname;
                        new_attach.file_path = edmsFileDir + file.filename;
                        new_attach.repo_path = edmsUploadFolder + file.filename;
                        await getRepository(WorkAttach).save(new_attach);
                    }
                }

                //메일 전송할 유저 선택 후 저장
                if (JSON.parse(emailIdList) != undefined) {
                    let emails = [];
                    for (let id of JSON.parse(emailIdList)) {
                        let newMail = new WorkMail();

                        newMail.wp_idx = insertProc.wp_idx;
                        newMail.user_id = id;
                        newMail.create_by = user.username;
                        emails.push(newMail);
                    }
                    await getRepository(WorkMail).save(emails);
                }

                // 결재자에게 메일 송신
                let next_approver = await getRepository(EdmsUser).findOne({ user_id: approver_id_list[0] });
                if (next_approver)
                    sendMail(
                        next_approver.email,
                        `<${original_tm_work_tm.tm_code}> ${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_TITLE.kor}`,
                        `${LANGUAGE_PACK.EMAIL.SIGNATURE.REQUEST_ALERT_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/workproc/tm/${insertProc.wp_idx}">${LANGUAGE_PACK.EMAIL.SIGNATURE.SHORT_CUT.kor}</a>`
                    );

                return getSuccessResponse(res, insertProc);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/tm_version_file_list", async (req, res) => {
    //workfile에있는 파일만 리스트
    const { wp_idx, docu_no } = req.query;
    try {
        const file_list = await getConnection().query(`
            SELECT ef.*
                FROM edms_files ef
            INNER JOIN work_file wf
                ON wf.wp_idx = ${wp_idx} AND wf.docu_no = ${docu_no}
            WHERE ef.file_no = wf.file_no AND ef.is_use = 1
                AND ef.is_use = 1
        `);

        return getSuccessResponse(res, file_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// 220607 : 현재 사용하지않음. 기존에는 TR재회신이 있다면 TR내에서 버전업로드를 해주려했으나, 현재는 없음.
router.post("/tm_upload_version_file", async (req, res) => {
    const user_id = req.app.get("edms_user_id");
    let user = await getRepository(EdmsUser).findOne({
        user_id: user_id,
        is_use: 1,
    });
    const { wp_idx, docu_no, history } = req.body;
    try {
        // upload
        // 1. fversion - 이전거에서 up
        // 2. workfile 추가
        // 3. stage_code => 최신거로 넣어주기
        // 4. is_last_version -> 이전거는 N으로 바꾸고 지금올린거Y로 변경
        let filename = "";
        let originalname = "";
        let edms_stage = null;
        if (req.files.length > 0) {
            filename = req.files[0].filename;
            originalname = req.files[0].originalname;
        }

        //stage data
        let edms_file = await getRepository(EdmsFiles).findOne({
            docu_no: docu_no,
            is_last_version: "Y",
            is_use: 1,
        });
        if (edms_file) {
            let { stage, type } = parseFileStageCode(edms_file.stage_code);
            edms_stage = await getRepository(EdmsStage).findOne({
                docu_no: edms_file.docu_no,
                stage_code: stage,
                stage_type: type,
                plan_dt: Not(IsNull()),
                is_use: 1,
            });
        }

        // 새로운 버전 파일 생성
        let newfilecode: any;
        let _ = edms_file.file_code.split("_");
        _[2] = "V" + fillZero(3, (parseInt(_[2].replace("V", "")) + 1).toString());
        newfilecode = _.join("_");

        let newFile = new EdmsFiles();

        newFile.project_no = edms_file.project_no;
        newFile.cate_no = edms_file.cate_no;
        newFile.docu_no = edms_file.docu_no;
        newFile.root_path = `${edmsFileDir}${filename}`;
        newFile.repo_path = ``;
        newFile.origin_file_code = _[0] + "_" + _[1];
        newFile.file_code = newfilecode;
        newFile.file_name = filename;
        newFile.original_file_name = originalname;
        newFile.file_type = getFileExtensionType("", originalname);
        newFile.fversion = edms_file.fversion + 1;
        newFile.is_last_version = "Y";
        newFile.regi_dt = new Date();
        newFile.create_by = user.username;
        newFile.create_tm = new Date();
        newFile.history = history;
        newFile.stage_code = edms_file.stage_code;
        newFile.user_id = edms_file.user_id;
        newFile.file_ext = getFileExtension(originalname);

        let insertEmp = await getRepository(EdmsFiles).save(newFile);

        let ext = originalname.split(".")[originalname.split(".").length - 1];
        let _filePath = await mvEdmsFile(
            edms_file.project_no.toString(),
            edms_file.cate_no.toString(),
            edms_file.docu_no.toString(),
            insertEmp.file_no,
            req.files[0].path,
            insertEmp.fversion,
            ext
        );
        insertEmp.repo_path = _filePath;

        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ repo_path: insertEmp.repo_path })
            .where("file_no = :id", { id: insertEmp.file_no })
            .execute();
        //

        // 최신버전을 이전버전 file is_last_version N 으로 수정
        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ is_last_version: "N" })
            .where("file_no IN(:no)", { no: edms_file.file_no })
            .execute();
        //

        // 새로운 버전 WorkFile에 추가
        let newWorkFile = new WorkFile();

        newWorkFile.wp_idx = wp_idx;
        newWorkFile.file_no = insertEmp.file_no;
        newWorkFile.docu_no = insertEmp.docu_no;
        newWorkFile.create_by = user.username;
        newWorkFile.create_tm = new Date();
        newWorkFile.user_id = user.user_id;

        await getRepository(WorkFile).save(newWorkFile);

        // code에 따른 stage 변경
        // code 가 더높은걸 사용
        // if (review.code == 1) {
        //     // 파일 스테이지 업

        // } else if (review.code == 2) {
        //     // 파일 업로드 및 스테이지 업
        // } else if (review.code == 3) {
        //     // 파일 업로드 및 리비전 업
        // } else if (review.code == 4) {
        //     // 파일 업로드
        // }
        return getSuccessResponse(res, insertEmp);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

const getTmOfficalHtmlData = async (docu_type: "HENC" | "SHIN", wp_idx: number) => {
    let result: officialTmHtmlDataType = {
        docu_code: "",
        docu_subject: "",
        tm_explan: "",
        issuer: "",
        recievr: "",
        sender: "",
        sender_position: "",
        sender_company: "",
        sender_Date: new Date(),
        received_list: [],
        received_company: "",
        received_Date: new Date(),
        reference_company: "",
        reference_list: [],
        docu_list: [],
        stage: "IFA",
    };

    // TM 찾기
    let proc = await getRepository(WorkProc).findOne({
        where: { wp_idx: wp_idx },
    });

    // TR 채번 찾기
    let work_tm = await getRepository(WorkTm).findOne({
        where: { wp_idx: wp_idx },
    });

    let company_list = await getRepository(EdmsCompany).find({ is_delete: false });

    //프로젝트 찾기
    let project_type = await getRepository(EdmsProjectType).findOne({
        where: { project_no: proc.project_no },
    });

    //received_Date
    let assign_list = await getRepository(WorkAssign).find({
        wp_idx: parseInt(wp_idx.toString()),
    });
    let assign = assign_list.find(raw => raw.assign_to_id == proc.approver_id);

    //참조회사
    let cc_company = company_list.find(raw => raw.id == work_tm.cc_company_id);

    // stage_code
    let edms_file = await getRepository(EdmsFiles).findOne({
        where: { wp_idx: wp_idx },
        order: { file_no: "DESC" },
    });

    // get work tm official user
    let wtou_list = await getConnection().query(`
        SELECT 
            wtou.user_id,
            wtou.off_type,
            wtou.stage_type_no,
            wtou.wtou_idx,
            eu.username,
            eu.company_id,
            ep.position_name,
            ec.company_name
        FROM work_tm_official_user wtou
        JOIN edms_user eu
        ON wtou.user_id = eu.user_id
        JOIN edms_position ep
        ON ep.id = eu.position_id
        JOIN edms_company ec
        ON ec.id = eu.company_id
        WHERE wtou.project_no = ${project_type.project_no}
        AND wtou.is_use = 1
        AND wtou.off_docu_type = ${docu_type == "HENC" ? 0 : 1};
    `);
    //revision List

    // docuList
    let docuList = await getConnection().query(`
        SELECT
            ed.docu_code,
            ed.docu_subject,
            ef.revision
        FROM edms_document as ed
        INNER JOIN work_docu as wd
            ON wd.wp_idx = ${wp_idx}
        JOIN (
        SELECT ef.* FROM edms_files ef
            JOIN(
                SELECT MAX(file_no) AS file_no
                FROM edms_files 
                GROUP BY docu_no
                ORDER BY file_no DESC
            ) as find_ef
            WHERE ef.file_no = find_ef.file_no
        ) as ef ON ef.docu_no = ed.docu_no
        WHERE ed.docu_no = wd.docu_no AND ed.is_use = 1;
    `);

    result.docu_list = docuList;

    let from, to, ref, issued, received;
    let wtouList = wtou_list;
    if (edms_file) {
        if (edms_file.stage_code.indexOf("AFC") != -1) {
            wtouList = wtou_list.filter(raw => raw.stage_type_no == 0 || raw.stage_type_no == 2);
            result.stage = "AFC";
        } else if (edms_file.stage_code.indexOf("As-Built") != -1) {
            result.stage = "As-Built";
        } else {
            result.stage = "IFA";
        }
    }
    from = wtouList.filter(raw => raw.off_type == 0);
    to = wtouList.filter(raw => raw.off_type == 1);
    ref = wtouList.filter(raw => raw.off_type == 2);
    issued = wtouList.filter(raw => raw.off_type == 3);
    received = wtouList.filter(raw => raw.off_type == 4);
    if (from.length > 0) {
        result.sender = from[0].username; //getSenderName(project_type.project_code);
        result.sender_position = from[0].position_name;
        result.sender_company = from[0].company_name;
    }
    if (to.length > 0) {
        result.received_list = to.map(raw => `${raw.username} ${raw.position_name}`);
        result.received_company = to[0].company_name;
    }
    if (ref.length > 0) {
        result.reference_list = ref.map(raw => `${raw.username} ${raw.position_name}`);
        result.reference_company = ref[0].company_name;
    }
    if (issued.length > 0) {
        result.issuer = issued[0].username;
    }
    if (received.length > 0) {
        result.recievr = received[0].username;
    }

    // if (project_type.project_code.toLocaleUpperCase().indexOf("POWER") != -1) {
    //     if (work_tm.tm_code.indexOf("TH(H)S") != -1) {
    //         result.received_list.push("공현욱 PM");
    //         result.received_company = "(주)신한종합건축사사무소";
    //     } else {
    //         result.received_list.push("박진호 팀장");
    //         result.received_list.push("최현철 팀장");
    //         result.received_company = "통영에코파워";
    //     }
    //     //LNG
    // } else if (project_type.project_code.toLocaleUpperCase().indexOf("LNG") != -1) {
    //     if (edms_file && edms_file.stage_code == "AFC Issue") {
    //         result.received_list.push("최정채 상무");
    //         result.received_company = "(주)휴먼텍";
    //     } else {
    //         result.received_list.push("박진호 팀장");
    //         result.received_list.push("최현철 팀장");
    //         result.received_company = "통영에코파워";
    //     }

    //     //송전선로
    // } else if (project_type.project_code.toLocaleUpperCase().indexOf("TRANSMISSION") != -1) {
    //     if (edms_file && edms_file.stage_code == "AFC Issue") {
    //         result.received_list.push("공현욱 PM");
    //         result.received_company = "(주)신한종합건축사사무소";
    //     } else {
    //         result.received_list.push("전헌수 차장");
    //         result.received_company = "통영에코파워";
    //     }
    // }

    //CC
    // if (cc_company != undefined) {
    //     //발전소
    //     if (project_type.project_code.toLocaleUpperCase().indexOf("POWER") != -1) {
    //         if (cc_company.company_name == "통영에코파워") {
    //             result.reference_list.push("박진호 팀장");
    //             result.reference_list.push("최현철 팀장");
    //             result.reference_company = "통영에코파워";
    //         } else if (cc_company.company_name == "(주)신한종합건축사사무소") {
    //             result.reference_list.push("공현욱 PM");
    //             result.reference_company = "(주)신한종합건축사사무소";
    //         }
    //         //LNG
    //     } else if (project_type.project_code.toLocaleUpperCase().indexOf("LNG") != -1) {
    //         result.reference_list.push("박진호 팀장");
    //         result.reference_list.push("최현철 팀장");
    //         result.reference_company = "통영에코파워";
    //         //송전선로
    //     } else if (project_type.project_code.toLocaleUpperCase().indexOf("TRANSMISSION") != -1) {
    //         if (cc_company.company_name == "통영에코파워") {
    //             result.reference_list.push("박진호 팀장");
    //             result.reference_list.push("최현철 팀장");
    //             result.reference_list.push("전헌수 차장");
    //             result.reference_company = "통영에코파워";
    //         } else if (cc_company.company_name == "(주)신한종합건축사사무소") {
    //             result.reference_list.push("공현욱 PM");
    //             result.reference_company = "(주)신한종합건축사사무소";
    //         }
    //     }
    // }

    Object.assign(result, {
        docu_code: work_tm.tm_code,
        docu_subject: proc.subject,
        tm_explan: proc.explan,
        sender_Date: proc.create_tm,
        received_Date: assign.due_to_date,
    });

    return result;
};

router.get("/get_henc_tm_html_data", async (req: Request, res: Response) => {
    const _wp_idx = req.query.wp_idx;
    try {
        const wp_idx = parseInt(_wp_idx.toString());

        let result = await getTmOfficalHtmlData("HENC", wp_idx);
        let wp = await getRepository(WorkProc).findOne({ wp_idx });
        let workTm = await getRepository(WorkTm).findOne({ wp_idx });
        const html = getHENCTREmailFormat(workTm, wp, result, false);

        return getSuccessResponse(res, { html: html, result: { docu_code: result.docu_code } });
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_shinhan_tm_html_data", async (req: Request, res: Response) => {
    const _wp_idx = req.query.wp_idx;
    try {
        const wp_idx = parseInt(_wp_idx.toString());

        // TM 찾기
        let proc = await getRepository(WorkProc).findOne({
            where: { wp_idx: wp_idx },
        });

        // TR 채번 찾기
        let tm = await getRepository(WorkTm).findOne({
            where: { wp_idx: wp_idx },
        });

        let assign_list = await getRepository(WorkAssign).find({
            wp_idx: parseInt(wp_idx.toString()),
        });
        let assign = assign_list.find(raw => raw.assign_to_id == proc.approver_id);

        //유저 찾기
        let result = await getTmOfficalHtmlData("SHIN", wp_idx);
        const html = getShinhanTREmailFormat(tm, proc, result, false);

        return getSuccessResponse(res, { html: html, result: { docu_code: result.docu_code } });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_reference_tm_user", async (req: Request, res: Response) => {
    const { wp_idx } = req.query;
    const user_id = req.app.get("edms_user_id");
    try {
        if (user_id) {
            let workProc = await getRepository(WorkProc).findOne({ where: { wp_idx: wp_idx } });

            if (workProc.approver_id == user_id) {
                return getSuccessResponse(res, true);
            } else {
                return getSuccessResponse(res, false);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/confirm_referer", async (req: Request, res: Response) => {
    const { comment, is_approval, wp_idx } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        let result = false;
        await getConnection().transaction(async tr => {
            let wp = await tr.getRepository(WorkProc).findOne({ wp_idx });
            let _assign_list = await tr.getRepository(WorkAssign).find({ wp_idx });
            let assign_list = _assign_list.filter(raw => raw.assign_state == 16);
            let assign = assign_list.find(raw => raw.assign_to_id == user_id && raw.assign_state == 16);

            let drn = await tr.query(`
                SELECT 
                    wa.wp_idx 
                FROM work_proc wp 
                INNER JOIN work_assign wa 
                    ON wa.wp_idx = wp.wp_idx 
                    AND wa.is_fin = 0 
                WHERE wp.original_tm_id = ${wp_idx}
                    AND wp.requester_id = ${user_id};
            `);
            if (drn.length > 0) throw LANGUAGE_PACK.CANNOT_REQUEST_REFER.kor;

            if (wp && assign) {
                if (is_approval == true) {
                    await update_assign_state(17, assign.wa_idx);
                    //모든 참조승인이 종료되었을경우
                    if (assign_list.length == 1) {
                        let tm_manager_assigns = _assign_list.filter(
                            raw => raw.assign_from_id == wp.requester_id && raw.assign_from_id != raw.assign_to_id
                        );
                        for (var _assign of tm_manager_assigns) await update_assign_state(10, _assign.wa_idx);
                        let user = await getRepository(EdmsUser).findOne({ user_id: assign.assign_from_id });
                        sendMail(
                            user.email,
                            `<${wp.subject}> ${LANGUAGE_PACK.EMAIL.TM.CC.CONFIRM_TITLE.kor}`,
                            `${LANGUAGE_PACK.EMAIL.TM.CC.CONFIRM_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/tm/detail/${wp.wp_idx}">${LANGUAGE_PACK.EMAIL.TM.DOCUMENT_SHORTCUT.kor}</a>`
                        );
                        await update_tm_state(8, wp_idx);
                    }
                    //
                    result = true;
                } else {
                    await update_assign_state(18, assign.wa_idx, false, comment);
                }
            }
        });
        return getSuccessResponse(res, result);
    } catch (err) {
        logger.error(req.path + " || " + err);
        return getFailedResponse(res, err);
    }
});

router.get("/get_tm_all_review", async (req: Request, res: Response) => {
    let wp_idx = parseInt(req.query.wp_idx.toString());
    await getConnection().transaction(async tr => {
        try {
            let review_list: any[] = [];
            let allReviewData: {
                wr_idx: number;
                create_by: string;
                create_tm: Date;
                contents: string;
                reply: string;
                reviewer_id: number;
                review_date: Date;
                user_id: number;
                is_use: number;
                wp_idx: number;
                docu_no: number;
                file_no: number;
                cate_no: number;
                stage_code: string;
                file_name: string;
                docu_code: string;
                revision: string;
            }[] = await tr.query(`
                SELECT DISTINCT
                    wr.wr_idx,
                    ec.company_name AS 'create_by',
                    wr.create_tm,
                    wr.contents,
                    wr.reply,
                    wr.reviewer_id,
                    wr.review_date,
                    wr.user_id,
                    wr.is_use,
                    wr.wp_idx,
                    wr.review_owner,
                    wr.pwork_code,
                    wr.page_sheet_no,
                    wr.code,
                    wr.is_reply,
                    wr.p_wr_idx,
                    wr.order,
                    wr.is_change_design,
                    wr.is_fin,
                    ed.docu_code,
                    ed.cate_no,
                    ed.docu_no,
                    ef.file_no,
                    ef.stage_code,
                    ef.file_name,
                    wr.revision
                FROM work_review wr
                INNER JOIN work_proc wp
                    ON wp.original_tm_id = ${wp_idx}
                    AND wp.wp_type = 'DRN'
                INNER JOIN edms_user eu
                    ON eu.user_id = wr.reviewer_id
                INNER JOIN edms_company ec
                    ON ec.id = eu.company_id
                LEFT JOIN edms_document ed
                    ON ed.docu_no = wr.docu_no
                LEFT JOIN edms_stage es
                    ON es.docu_no = ed.docu_no
                LEFT JOIN edms_files ef
                    ON ef.docu_no = wr.docu_no
                    AND is_last_version = 'Y'
                WHERE wr.wp_idx = wp.wp_idx OR wr.wp_idx = ${wp_idx}
            `);
            if (allReviewData.length > 0) {
                let exist_wr = [];
                allReviewData = allReviewData.filter(raw => {
                    if (exist_wr.indexOf(raw.wr_idx) != -1) return false;
                    else {
                        exist_wr.push(raw.wr_idx);
                        return true;
                    }
                });
                let review_attach_files = await tr.getRepository(WorkAttach).find({
                    wr_idx: In(allReviewData.map((raw: any) => raw.wr_idx)),
                    is_use: 1,
                });
                for (let list of allReviewData) {
                    if (list.is_use == 1) {
                        // attach file은 각 리뷰, 답변 별로 달립니다.
                        let attach = review_attach_files.filter(raw => raw.wr_idx == list.wr_idx);
                        let review_attach_file = { file_path: "", originalname: "" };
                        let reply_attach_file = { file_path: "", originalname: "" };
                        if (attach.length > 0) {
                            let review_a = attach.find(raw => raw.flag == 1);
                            if (review_a)
                                review_attach_file = {
                                    file_path: review_a.file_path,
                                    originalname: review_a.file_name,
                                };
                            let reply_a = attach.find(raw => raw.flag == 2);
                            if (reply_a)
                                reply_attach_file = { file_path: reply_a.file_path, originalname: reply_a.file_name };
                        }
                        //
                        review_list.push({
                            ...list,
                            revision: list.revision,
                            date: getMoment(list.create_tm).format("YY-MM-DD HH:mm:SS"),
                            is_all: list.docu_no == null && list.file_no == null,
                            review_attach: review_attach_file,
                            reply_attach: reply_attach_file,
                        });
                    }
                }
            }

            return getSuccessResponse(res, { review_list });
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

const tm_review_delete = async (wr_idx: any) => {
    try {
        await getConnection()
            .createQueryBuilder()
            .update(WorkReview)
            .set({ is_use: 0 })
            .where("wr_idx IN (:idx)", { idx: wr_idx })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

router.post("/tm_review_delete", async (req: Request, res: Response) => {
    try {
        const { reviewList, data } = req.body;

        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");

            let result: number = 0;
            let delete_review_list: any[] = [];
            let filterList = reviewList.filter(raw => raw.order == 1);

            filterList.map(filterRaw => {
                let tmp = data.filter(dataRaw => filterRaw.wr_idx === dataRaw.first_wr_idx);
                if (filterRaw.reviewer_id != user_id) return (result = 2);
                if (tmp.length == 0 && filterRaw.reviewer_id == user_id) delete_review_list.push(filterRaw.wr_idx);
            });

            if (delete_review_list.length != 0) result = (await tm_review_delete(delete_review_list)) ? 1 : 0;

            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

const tm_review_update = async (
    wr_idx: any,
    contents: string,
    reply: string,
    is_changed_design: string,
    is_reply: boolean, // 요청자와 동일한회사라면
    code: number,
    tr: EntityManager
) => {
    try {
        let result = {};
        if (is_reply) {
            Object.assign(result, {
                reply: reply,
                is_change_design: is_changed_design,
                is_reply: 1,
                modify_tm: new Date(),
                create_tm: new Date(),
            });
        } else {
            Object.assign(result, {
                contents: `${contents}`,
                code: code,
                modify_tm: new Date(),
                create_tm: new Date(),
            });
        }
        await tr
            .createQueryBuilder()
            .update(WorkReview)
            .set({
                ...result,
            })
            .where("wr_idx=:idx", { idx: wr_idx })
            .execute();
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

router.post("/tm_review_register", async (req: Request, res: Response) => {
    try {
        const { wp_idx, reviewList, originData, is_only_prev } = req.body;

        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");
            let user_list = await getRepository(EdmsUser).find({ is_use: 1 });
            let user = user_list.find(raw => raw.user_id == user_id);
            let comps = await getRepository(EdmsCompany).find({ is_delete: false });
            let user_comp = comps.find(raw => raw.id == user.company_id);

            let result: boolean;
            let newReviewData: { originData: any; reviewData: any }[] = [];

            // Get original TM work_proc
            let all_wp_idx_list = [];
            await findAllWpIdxTm(wp_idx, all_wp_idx_list);

            let wp_list = await getRepository(WorkProc).find({ wp_idx: In(all_wp_idx_list) });
            let origin_wp = wp_list.find(raw => raw.original_tm_id == 0); // 최초 TM 찾아서 현재 회신인지 아닌지 파악
            let wp = wp_list.find(raw => raw.wp_idx == wp_idx);
            if (wp == undefined) return getFailedResponse(res);
            // 발신자 check
            let requester = user_list.find(raw => raw.user_id == origin_wp.requester_id);
            let requester_comp = comps.find(raw => raw.id == requester.company_id);
            //
            // Check added new review
            for (var i = 0; i < reviewList.length; i++) {
                // 첫번쨰 리뷰에 작성한 내용 or code 가 있어야한다.
                let review = reviewList[i];
                let data = originData[i];
                if (review.is_created && (data["review0"].length > 1 || data["result0"] != ""))
                    newReviewData.push({ originData: data, reviewData: review });
            }

            // get all document of tm

            let docus = await getConnection().query(`
                SELECT 
                    ed.*
                FROM edms_document as ed
                INNER JOIN work_docu as wd
                    ON wd.wp_idx IN (${all_wp_idx_list})
                WHERE ed.docu_no = wd.docu_no AND ed.is_use = 1;
            `);

            let change_attach_files: {
                flag: number;
                wr_idx: number;
                attach: { file_path: string; originalname: string };
            }[] = [];
            // Update review
            await getConnection().transaction(async tr => {
                for (var i = 0; i < reviewList.length; i++) {
                    let review = reviewList[i];
                    let isAll = review.docuNo.toLowerCase().indexOf("all") != -1 || review.docuNo == "-";
                    if (review.is_created) continue;
                    let docu = docus.find(raw => raw.docu_code == review.docuNo);
                    if (docu == undefined && !isAll) throw `잘못된 Document No : ${review.docuNo}`;
                    let file_info = isAll // isAll => 공통사항인 경우 -1,-1 로 기입
                        ? { docu_no: -1, file_no: -1, revision: "" }
                        : await tr.getRepository(EdmsFiles).findOne({
                              where: {
                                  docu_no: docu.docu_no,
                                  is_last_version: "Y",
                                  is_use: 1,
                              },
                          });
                    for (let order = 0; order < review.wr_idx.length; order++) {
                        ////
                        let changeReview = review.review[order]["review" + order];
                        let changeReply = review.review[order]["reply" + order];
                        let isChangedDesign = review.review[order]["change" + order];
                        let resultCode = review.review[order]["result" + order];
                        let code = 0;
                        let reviewImage = review.review[order]["review_attach" + order];
                        let replyImage = review.review[order]["reply_attach" + order]; //
                        let is_reply = false;
                        // 회신할 수 있는 회사인지 체크
                        if (
                            user_comp.company_name.indexOf(requester_comp.company_name) != -1 ||
                            user_comp.company_name.localeCompare("한화") >= 0
                        )
                            is_reply = true;
                        //
                        if (resultCode != "") code = get_code_type(resultCode);

                        // if (code < 1 || code > 4) throw `잘못된 코드 : ${resultCode}`;
                        // if (isChangedDesign != "Y" && isChangedDesign != "N")
                        //     throw `잘못된 설계변경 해당유무 : ${isChangedDesign}`;
                        // 수정
                        if (review.wr_idx[order] != -1) {
                            if (reviewImage) {
                                change_attach_files.push({
                                    flag: 1,
                                    wr_idx: review.wr_idx[order],
                                    attach: reviewImage,
                                });
                            }
                            if (replyImage) {
                                change_attach_files.push({ flag: 2, wr_idx: review.wr_idx[order], attach: replyImage });
                            }
                            await tm_review_update(
                                review.wr_idx[order],
                                changeReview,
                                changeReply,
                                isChangedDesign,
                                is_reply,
                                code,
                                tr
                            );
                        }
                        // 회차 추가
                        else if (changeReview.length > 1 && code != 0) {
                            let wr = await tr.getRepository(WorkReview).findOne({ wr_idx: review.wr_idx[order - 1] });
                            let newWR = new WorkReview();
                            newWR.wp_idx = wr.wp_idx;
                            newWR.review_owner = `WOR`;
                            newWR.code = code ? code : 0;
                            newWR.contents = changeReview;
                            newWR.reply = changeReply ? changeReply : "-";
                            newWR.user_id = user_id;
                            newWR.reviewer_id = user_id;
                            newWR.create_by = user.username;
                            newWR.review_date = new Date();
                            newWR.docu_no = file_info.docu_no;
                            newWR.file_no = file_info.file_no;
                            newWR.is_change_design = "N";
                            newWR.p_wr_idx = wr.wr_idx;
                            newWR.order = is_only_prev ? review.review[order].order : order + 1;
                            newWR.revision = file_info.revision;

                            let insertNewWR = await tr.getRepository(WorkReview).save(newWR);
                            if (reviewImage) {
                                change_attach_files.push({ flag: 1, wr_idx: insertNewWR.wr_idx, attach: reviewImage });
                            }
                            if (replyImage) {
                                change_attach_files.push({ flag: 2, wr_idx: insertNewWR.wr_idx, attach: reviewImage });
                            }
                        }
                    }
                }
                // 첨부파일 관리
                let _wr_idx_list = change_attach_files.map(raw => raw.wr_idx);
                let exist_attach_files = await tr.getRepository(WorkAttach).find({ wr_idx: In(_wr_idx_list) });
                let exist_reviews = await tr.getRepository(WorkReview).find({ wr_idx: In(_wr_idx_list) });

                for (var attach of change_attach_files) {
                    let exist = exist_attach_files.find(raw => raw.wr_idx == attach.wr_idx && raw.flag == attach.flag);
                    let wr = exist_reviews.find(raw => raw.wr_idx == attach.wr_idx);
                    if (exist)
                        await tr
                            .createQueryBuilder()
                            .update(WorkAttach)
                            .set({
                                modify_tm: new Date(),
                                file_path: attach.attach.file_path,
                                file_name: attach.attach.originalname,
                                repo_path: edmsUploadFolder + attach.attach.file_path.replace(edmsFileDir, ""),
                                is_use: 1,
                            })
                            .where(`wat_idx=${exist.wat_idx}`)
                            .execute();
                    else if (wr) {
                        let newWorkAttach = new WorkAttach();
                        newWorkAttach.wp_idx = wr.wp_idx;
                        newWorkAttach.wr_idx = wr.wr_idx;
                        newWorkAttach.create_by = user.username;
                        newWorkAttach.file_name = attach.attach.originalname;
                        newWorkAttach.file_path = attach.attach.file_path;
                        newWorkAttach.repo_path = edmsUploadFolder + attach.attach.file_path.replace(edmsFileDir, "");
                        newWorkAttach.flag = attach.flag;
                        await tr.getRepository(WorkAttach).save(newWorkAttach);
                    }
                }
                //
            });

            // 추가된 데이터 있을 시 DRN 생성
            // DRN 발신자는 해당 회사 TM 담당자, 수신자는 본인
            if (newReviewData) {
                let tm_manager_list = await getRepository(WorkTmCode).find();
                await getConnection().transaction(async tr => {
                    let new_work_assign = [];
                    let new_work_file = [];
                    let new_work_docu = [];
                    for (let i = 0; i < newReviewData.length; i++) {
                        let data = newReviewData[i].originData;
                        let review = newReviewData[i].reviewData;

                        let isAll = data.docuNo.toLowerCase().indexOf("all") != -1;
                        //GET docu & file
                        let docu = docus.find(raw => raw.docu_code == data.docuNo);
                        if (docu == undefined && !isAll) continue;
                        let file_info = isAll
                            ? { docu_no: -1, file_no: -1, revision: "" }
                            : await tr.getRepository(EdmsFiles).findOne({
                                  where: {
                                      docu_no: docu.docu_no,
                                      is_last_version: "Y",
                                      is_use: 1,
                                  },
                              });
                        //
                        // Get TM manager info of the same company
                        let now_user_info = user_list.find(raw => raw.user_id === user_id);
                        let tm_manager_id: any;

                        tm_manager_id = tm_manager_list.find(
                            workTm =>
                                workTm.company_id == now_user_info.company_id && workTm.project_no == wp.project_no
                        );

                        if (!tm_manager_id) {
                            let tmp = tm_manager_list.find(workTm => workTm.project_no == -1);
                            if (tmp) tm_manager_id = tmp.tm_user_id;
                            else tm_manager_id = 0;
                        } else {
                            tm_manager_id = tm_manager_id.tm_user_id;
                        }

                        let tm_manager_info = user_list.find(raw => raw.user_id === tm_manager_id);

                        // DRN work_proc 생성
                        let newProc = new WorkProc();

                        newProc.wp_type = "DRN";
                        newProc.wp_date = new Date();
                        newProc.wp_code = "DRN-" + wp.wp_code;
                        newProc.project_no = wp.project_no;
                        newProc.series_no = wp.series_no;
                        newProc.account_ym = wp.account_ym;
                        newProc.subject = wp.wp_code + " " + wp.subject;
                        newProc.explan = wp.explan;
                        newProc.requester_id = tm_manager_info.user_id;
                        newProc.approver_id = user_id;
                        newProc.due_date = wp.due_date;
                        newProc.create_by = tm_manager_info.username;
                        newProc.create_tm = new Date();
                        newProc.user_id = tm_manager_info.user_id;
                        newProc.original_tm_id = wp.wp_idx;
                        let insertProc = await getRepository(WorkProc).save(newProc);
                        // 결재 테이블 TM 담당자 기안 생성
                        let newAssign = new WorkAssign();

                        newAssign.wp_idx = insertProc.wp_idx;
                        newAssign.create_by = tm_manager_info.username;
                        newAssign.assign_from_id = tm_manager_info.user_id;
                        newAssign.assign_to_id = tm_manager_info.user_id;
                        newAssign.approval_order = 0;
                        newAssign.is_approval = true;
                        newAssign.assign_state = 3;
                        newAssign.is_last_approve = false;
                        new_work_assign.push(newAssign);

                        // 결재 테이블 now_user 생성
                        let newApproval = new WorkAssign();

                        newApproval.wp_idx = insertProc.wp_idx;
                        newApproval.create_by = tm_manager_info.username;
                        newApproval.assign_from_id = tm_manager_info.user_id;
                        newApproval.assign_to_id = user_id;
                        newApproval.approval_order = 1;
                        newApproval.is_last_approve = true;
                        newApproval.assign_state = 3;
                        newApproval.is_approval = true;
                        new_work_assign.push(newApproval);

                        // work file 생성
                        let newFile = new WorkFile();

                        newFile.wp_idx = insertProc.wp_idx;
                        newFile.file_no = file_info.file_no;
                        newFile.docu_no = file_info.docu_no;
                        newFile.create_by = tm_manager_info.username;
                        newFile.user_id = tm_manager_info.user_id;
                        new_work_file.push(newFile);

                        // work docu 생성
                        let newWDocu = new WorkDocu();

                        newWDocu.wp_idx = insertProc.wp_idx;
                        newWDocu.docu_no = file_info.docu_no;
                        newWDocu.user_id = tm_manager_info.user_id;
                        newWDocu.create_by = tm_manager_info.username;
                        newWDocu.is_use = 1;
                        new_work_docu.push(newWDocu);

                        // Review 생성
                        let newWR = new WorkReview();
                        newWR.wp_idx = insertProc.wp_idx;
                        newWR.review_owner = `WOR`;
                        newWR.code = get_code_type(data["result0"]);
                        newWR.contents = data["review0"];
                        newWR.reply = "";
                        newWR.reviewer_id = user_id;
                        newWR.user_id = user_id;
                        newWR.create_by = now_user_info.username;
                        newWR.review_date = new Date();
                        newWR.docu_no = file_info.docu_no;
                        newWR.file_no = file_info.file_no;
                        newWR.is_change_design = data["change0"];
                        newWR.page_sheet_no = data.pageSheet;
                        newWR.revision = file_info.revision;
                        if (is_only_prev && data.order) newWR.order = data.order;
                        let insertNewWR = await getRepository(WorkReview).save(newWR);
                        //

                        //Work Attach 생성 ( wr_idx 필요)
                        // review & reply
                        let review_attach = review.review[i]["review_attach" + i];
                        let reply_attach = review.review[i]["reply_attach" + i];
                        if (review_attach && review_attach.file_path != "") {
                            let newReviewAttach = new WorkAttach();
                            newReviewAttach.wp_idx = insertNewWR.wp_idx;
                            newReviewAttach.wr_idx = insertNewWR.wr_idx;
                            newReviewAttach.create_by = user.username;
                            newReviewAttach.file_name = review_attach.originalname;
                            newReviewAttach.file_path = review_attach.file_path;
                            newReviewAttach.repo_path =
                                edmsUploadFolder + review_attach.file_path.replace(edmsFileDir, "");
                            newReviewAttach.flag = 1;
                            await tr.getRepository(WorkAttach).save(newReviewAttach);
                        }

                        if (reply_attach && reply_attach.file_path != "") {
                            let newReplyAttach = new WorkAttach();
                            newReplyAttach.wp_idx = insertNewWR.wp_idx;
                            newReplyAttach.wr_idx = insertNewWR.wr_idx;
                            newReplyAttach.create_by = user.username;
                            newReplyAttach.file_name = reply_attach.originalname;
                            newReplyAttach.file_path = reply_attach.file_path;
                            newReplyAttach.repo_path =
                                edmsUploadFolder + reply_attach.file_path.replace(edmsFileDir, "");
                            newReplyAttach.flag = 2;
                            await tr.getRepository(WorkAttach).save(newReplyAttach);
                        }
                    }
                    await getRepository(WorkAssign).save(new_work_assign);
                    await getRepository(WorkFile).save(new_work_file);
                    await getRepository(WorkDocu).save(new_work_docu);
                });
                result = true;
            }
            //
            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
        return getSuccessResponse(res, { errTxt: err });
    }
    return getFailedResponse(res);
});

export interface reviewExcelType {
    No: string;
    Document_Number: string;
    Description: string;
    Page_Sheet_No: string;
    [key: string]: string;
    // ["rev" + number: d["rev" + idx],
    // ["result" + idx]: d["result" + idx],
    // ["review" + idx]: d["review" + idx],
    // ["create_by" + idx]: d["create_by" + idx],
    // ["reply" + idx]: d["reply" + idx],
    // ["change" + idx]: d["change" + idx],
    // ["date" + idx]: d["date" + idx],
    // ["review_attach" + idx]: d["review_attach" + idx],
    // ["reply_attach" + idx]: d["reply_attach" + idx],
}

// review data 유무 확인 함수
// 5회차 이상 리뷰를 검색했는데 없으면 없는거로 간주.
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
    console.log("ASDASD ???", findReviewIndex);
    for (let review of wrList) {
        // comment or reply, revision,document_number etc 비교
        if ((review.contents != "" || review.reply != "") && review.revision != null && review.revision != "") {
            if (findReviewIndex != undefined) {
                console.log(
                    review.contents == data["review" + findReviewIndex],
                    review.reply == data["reply" + findReviewIndex],
                    data["rev" + findReviewIndex] == review.revision,
                    get_code_type(data["result" + findReviewIndex]) == review.code
                );
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
                console.log(sameReview.wr_idx, sameReview.p_wr_idx, findReviewIndex);
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
            const uploadFolderRealPath = globalThis.HOME_PATH + "/";
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
                            ON wp.original_tm_id = ? 
                                OR wp.wp_idx = ?
                            WHERE wr.wp_idx = wp.wp_idx
                                ORDER BY wp.wp_idx ASC, wr.order ASC;
                        `,
                            [tm.wp_idx, tm.wp_idx]
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
                                    WHERE wr.wr_idx IN (?)
                                        
                                        ORDER BY wr.order;
                                `,
                                    [wr_idx_list]
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
                                console.log(d.contents, isExistReview);
                                if (isAuth && isReview && !isLastReview && !isExistReview) {
                                    // 다른유저의 정보는 수정불가
                                    // 2022-05-23 같으회사면 수정 가능하게
                                    // create_tm set
                                    let create_tm = getMoment(new Date(), "YY-MM-DD HH:mm:ss").toDate();
                                    if (
                                        data["date" + idx] &&
                                        getMoment(data["date" + idx], "YY-MM-DD HH:mm:ss").isValid()
                                    ) {
                                        create_tm = getMoment(data["date" + idx], "YY-MM-DD HH:mm:ss").toDate();
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
                                                contents: d.contents,
                                                reply: d.reply,
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
                                        newReview.contents = d.contents;
                                        newReview.create_tm = d.create_tm ? d.create_tm : new Date();
                                        newReview.reply = d.reply;
                                        newReview.is_change_design = d.is_change_design;
                                        newReview.user_id = user.user_id; // reviewer ? reviewer.user_id :
                                        newReview.reviewer_id = reviewer ? reviewer.user_id : user.user_id;
                                        newReview.review_date = d.create_tm ? d.create_tm : new Date();
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

router.post("/create_review_excel", async (req: Request, res: Response) => {
    try {
        const { ex_list, wp_idx } = req.body;
        const user_id = req.app.get("edms_user_id");
        let result = await create_review_excel(user_id, ex_list, wp_idx);
        if (result != null) return getSuccessResponse(res, result);
        else throw result;
    } catch (err) {
        console.log(err);
        return getFailedResponse(res, `${err}`);
    }
});

const get_code_type = (code: string) => {
    if (code) {
        if (code.replace) {
            return parseInt(code.replace(/[^\d]/g, ""));
        } else {
            return parseInt(code.toString());
        }
    } else {
        return NaN;
    }
};

const create_drn_for_review_excel = async (user: EdmsUser, tm: WorkProc) => {
    let tm_code_user = await getRepository(WorkTmCode).findOne({
        where: { company_id: user.company_id, project_no: tm.project_no },
    });
    let tm_code = await getRepository(WorkTm).findOne({ wp_idx: tm.wp_idx });
    let newProc = new WorkProc();

    newProc.wp_type = "DRN";
    newProc.wp_date = new Date();
    newProc.wp_code = "DRN-" + tm.wp_code;
    newProc.project_no = tm.project_no;
    newProc.series_no = 12345;
    newProc.account_ym = moment().format("YYYYMM");
    newProc.subject = tm_code.tm_code + "_" + tm.subject;
    newProc.explan = "";
    newProc.requester_id = tm_code_user ? tm_code_user.tm_user_id : user.user_id;
    newProc.approver_id = user.user_id;
    newProc.due_date = new Date();
    newProc.create_by = user.username;
    newProc.create_tm = new Date();
    newProc.user_id = user.user_id;
    newProc.original_tm_id = tm.wp_idx;

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

router.post("/request_tm_referer", async (req: Request, res: Response) => {
    const { wp_idx } = req.body;
    const user_id = req.app.get("edms_user_id");
    try {
        let drn = await getConnection().query(`
                SELECT 
                    wa.wp_idx 
                FROM work_proc wp 
                INNER JOIN work_assign wa 
                    ON wa.wp_idx = wp.wp_idx 
                    AND wa.is_fin = 0 
                WHERE wp.original_tm_id = ${wp_idx}
                    AND wp.requester_id = ${user_id};
        `);
        if (drn.length > 0) throw LANGUAGE_PACK.CANNOT_REQUEST_REFER.kor;

        let assign = await getRepository(WorkAssign).findOne({
            wp_idx,
            assign_state: 15,
        });
        let wp = await getRepository(WorkProc).findOne({ wp_idx });
        if (assign) {
            let assign_user = await getRepository(EdmsUser).findOne({ user_id: assign.assign_to_id });
            // tm status 13으로 참조처 승인 대기상태로 변경
            await update_tm_state(13, wp_idx);
            // 참조처 TR 담당자 state 16으로 변경
            await update_assign_state(16, assign.wa_idx);
            sendMail(
                assign_user.email,
                `<${wp.subject}> ${LANGUAGE_PACK.EMAIL.TM.REVIEW.REQUEST_TITLE.kor}`,
                `${LANGUAGE_PACK.EMAIL.TM.REVIEW.REQUEST_DESC.kor}<br /><a target="_blank" href="${process.env.ORIGIN}/edms/tm/detail/${wp.wp_idx}">${LANGUAGE_PACK.EMAIL.TM.SHORTCUT.kor}</a>`
            );
            return getSuccessResponse(res, true);
        }
        return getSuccessResponse(res, false);
    } catch (err) {
        logger.error(req.path + " || " + err);
        return getFailedResponse(res, err);
    }
});

router.post("/confirm_complete_review", async (req: Request, res: Response) => {
    const { wp_idx, reviewer_id } = req.body;
    const user_id = req.app.get("edms_user_id");
    await getConnection().transaction(async tr => {
        try {
            const user = await tr.getRepository(EdmsUser).findOne({ user_id: reviewer_id ? reviewer_id : user_id });
            if (user) {
                const wp = await tr.getRepository(WorkProc).findOne({ wp_idx: wp_idx }); // TR
                const drn_list = await tr
                    .getRepository(WorkProc)
                    .find({ original_tm_id: wp.wp_idx, approver_id: user.user_id });
                let drn_wp_idx_list = drn_list.map(raw => raw.wp_idx);
                if (drn_wp_idx_list.length > 0)
                    await tr
                        .createQueryBuilder()
                        .update(WorkAssign)
                        .set({ is_fin: 1 })
                        .where(`wp_idx IN (${drn_wp_idx_list.join(",")})`)
                        .execute();

                return getSuccessResponse(res, true);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/tr_data_download", async (req: Request, res: Response) => {
    const _wp_idx = req.query.wp_idx;
    const user_id = req.app.get("edms_user_id");

    if (typeof _wp_idx == "string" && user_id != null) {
        let edms_user = await getRepository(EdmsUser).findOne({ user_id: user_id });
        const wp_idx = parseInt(_wp_idx);

        if (wp_idx != undefined && user_id != null) {
            // TR채번
            let work_tm = await getRepository(WorkTm).findOne({
                where: { wp_idx: wp_idx },
            });
            let work_proc = await getRepository(WorkProc).findOne({
                where: { wp_idx: wp_idx },
            });

            // 첨부파일 시작
            // 오리지널 TR 찾기
            let wp_idx_list = [wp_idx];
            let original_tm = await getRepository(WorkProc).findOne({
                where: { original_tm_id: wp_idx, wp_type: "TM" },
            });

            if (original_tm != undefined) {
                wp_idx_list.push(original_tm.wp_idx);
            }

            // 첨부파일
            let attach = await getConnection().query(`
                SELECT 
                    CONCAT("Attachment", "/", wa.file_name) AS dest_path,
                    wa.repo_path
                FROM work_attach wa
                WHERE wp_idx in (${wp_idx_list});
            `);

            //

            // TR Dcoument
            let files = await getConnection().query(`
                SELECT
                    CONCAT("Document", "/", ef.original_file_name) AS dest_path,
                    ef.repo_path,
                    ef.docu_no,
                    ef.stage_code,
                    ef.revision
                FROM work_file wf
                INNER JOIN work_tm wt
                    ON wt.wp_idx = ${wp_idx}
                INNER JOIN edms_files ef
                    ON ef.file_no = wf.file_no
                WHERE 
                    wf.wp_idx = ${wp_idx}
                    AND ef.is_last_version = 'Y' AND ef.is_use = 1;
            `);

            //

            // TR 공문
            let create_company = await getConnection().query(`
                SELECT
                    ec.company_name
                FROM edms_user eu
                JOIN work_proc wp
                    ON wp.wp_idx = ${wp_idx}
                JOIN edms_company ec
                    ON ec.id = eu.company_id
                WHERE eu.user_id = wp.requester_id
            `);
            let tr;
            if (create_company[0].company_name.indexOf("신한") != -1) {
                // 보내는 유저 직급
                let tr_data = await getTmOfficalHtmlData("SHIN", wp_idx);
                tr = getShinhanTREmailFormat(work_tm, work_proc, tr_data, true);
            } else {
                let tr_data = await getTmOfficalHtmlData("HENC", wp_idx);
                tr = getHENCTREmailFormat(work_tm, work_proc, tr_data, true);
            }
            // 이미지화
            let imgBuffer = await html2img(tr);
            // 업로드 할 위치
            const uploadPath = path.resolve(globalThis.HOME_PATH, edmsUploadFolder);
            let file_name = `temp.${new Date().getTime()}.png`;
            let tr_dir_path = uploadPath + "/" + file_name;
            // 파일 생성
            fs.writeFileSync(tr_dir_path, imgBuffer.image);
            //

            // ReviweExcel file
            let reivew_excel = await get_tm_review_excel(wp_idx, req, null, false);
            //
            const _filename = `${work_tm.tm_code}.zip`;

            // 다운받을 파일명 설정
            res.setHeader("Content-disposition", "attachment; filename=" + encodeURI(_filename));
            // 파일 형식 지정
            res.setHeader("Content-Type", "application/zip; charset=utf-8");

            // 항상 들어 있을 파일
            let repo_path_list: any[] = [edmsUploadFolder + file_name];
            let dest_path_list: any[] = [`${work_tm.tm_code}.png`];

            // 리뷰엑셀파일 없을 경우 제외
            if (reivew_excel != null) {
                repo_path_list.push(reivew_excel);
                dest_path_list.push(`${work_tm.tm_code}_ReviewComment.xlsx`);
            }
            // 첨부파일 없을 경우 제외
            if (attach.length > 0) {
                repo_path_list.push(
                    ...attach.map(raw => {
                        // 첨부파일
                        return raw.repo_path;
                    })
                );
                dest_path_list.push(
                    ...attach.map(raw => {
                        return raw.dest_path;
                    })
                );
            }
            // 파일 없을 경우 제외
            if (files.length > 0) {
                repo_path_list.push(
                    ...files.map(raw => {
                        // TR Document
                        return raw.repo_path;
                    })
                );

                dest_path_list.push(
                    ...files.map(raw => {
                        return raw.dest_path;
                    })
                );
            }

            let output = await GenerateZip(_filename, repo_path_list, dest_path_list);

            var filestream = fs.createReadStream(output);
            filestream.pipe(res);

            logger.log("down", `[id: ${user_id}, User Email: ${edms_user.email}, File Path: ${output}]`);
            fs.unlinkSync(edmsUploadFolder + file_name);
            if (reivew_excel != null) fs.unlinkSync(reivew_excel);
            fs.unlinkSync(output);
            return res;
        }
    }
    return res.send("잠시 후에 다시 시도해주세요.");
});

router.get("/tr_no_examine", async (req: Request, res: Response) => {
    const { tr_no } = req.query;

    await getConnection().transaction(async tr => {
        try {
            let work_tm = await tr.getRepository(WorkTm).findOne({
                where: { tm_code: tr_no },
            });
            if (work_tm) {
                return getSuccessResponse(res, false);
            } else {
                return getSuccessResponse(res, true);
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

export default router;
