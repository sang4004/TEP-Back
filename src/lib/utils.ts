/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * 기능
 *
 ******************************************************************************/
import fs from "fs";
import path, { dirname } from "path";
import { parse } from "node-html-parser";
import multer, { Multer } from "multer";
import moment, { unitOfTime } from "moment";
import momentBD from "moment-business-days";
import iconvLite from "iconv-lite";
import mkdirp from "mkdirp";
import XLSX from "xlsx";
import Excel from "exceljs";
import moveFile from "move-file";
import cpFile from "cp-file";
import JSZip from "jszip";
import { Request, Response } from "express";
import { Readable } from "stream";
import { logger } from "./winston";
import { getRepository } from "typeorm";
import { uploadFolder, edmsUploadFolder } from "../constant";
import { EdmsUser, EdmsCategory, WorkTmCode } from "@/entity";

// import test from "@/lib/js/test.js";
// test.test();

const bufferToStream = binary => {
    const readableInstanceStream = new Readable({
        read() {
            this.push(binary);
            this.push(null);
        },
    });
    return readableInstanceStream;
};

export const zipFolders = async (zip_name: string, path_list: string[], req: Request, res: Response) => {
    return await new Promise(async r => {
        if (path_list.length == 0) return null;
        try {
            let zip = new JSZip();
            for (var _path of path_list) {
                try {
                    let data = fs.readFileSync(path.resolve(globalThis.HOME_PATH, _path));
                    zip.file(_path, data);
                } catch (err) {}
            }
            let zipped = await zip.generateAsync({ type: "nodebuffer" });
            res.setHeader("Content-disposition", "attachment; filename=" + getDownloadFilename(req, zip_name) + ".zip"); // 다운받아질 파일명 설정
            res.setHeader("Content-Type", "application/zip");
            var filestream = bufferToStream(zipped);
            filestream.pipe(res);
            r(zipped);
        } catch (err) {
            logger.error(err);
            r(null);
        }
    });
};

export const getDownloadFilename = (req, filename) => {
    var header = req.headers["user-agent"];
    if (header == undefined) {
        return iconvLite.decode(iconvLite.encode(filename, "UTF-8"), "ISO-8859-1");
    }
    return encodeURIComponent(filename).replace(/\\+/gi, "%20");
};

export const getDateValue = (time: any, format?: string) => {
    return time ? moment(time).format(format ? format : "YYYY-MM-DD HH:mm") : null;
};

export const getDate = () => {
    return moment().format("YYYY. MM. DD.");
};

export const string2Date = (date_str: string) => {
    return moment(date_str).toDate();
};

export const getDateTime = () => {
    return moment().toDate();
};

export const getMoment = (date: Date | string, format?: string) => {
    return format ? moment(date, format) : moment(date);
};

export const getDiffDateNetworkDays = (date1: string, date2: string) => {
    return momentBD(date1).businessDiff(momentBD(date2));
};

export const getDiffDate = (date1: Date, date2: Date, params?: unitOfTime.Diff) => {
    return moment(date1).diff(moment(date2), params);
};

export const fillZero = (width, str) => {
    str = str.toString();
    return str.length >= width ? str : new Array(width - str.length + 1).join("0") + str;
};

export const validDate = (dateStr: string) => {
    return !isNaN(new Date(dateStr).getTime());
};

export const sleep = (second: number) => {
    return new Promise((r, rej) => {
        setTimeout(r, second * 1000);
    });
};

export const deleteFileSync = (path: string) => {
    //
    try {
        fs.unlinkSync(path);
        return true;
    } catch (err) {
        console.log(err);
    }
    //
};

export const deleteFile = (filename: string) => {
    return new Promise((resolve, reject) => {
        try {
            let _path = path.resolve(globalThis.HOME_PATH, uploadFolder, filename);
            fs.unlink(_path, err => {
                if (err) reject(err);
                resolve(_path);
            });
        } catch (err) {
            reject(err);
        }
    });
};

export const getUploadModule = (dir: string, filenameFlag: boolean = false) => {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            let fileName = filenameFlag
                ? file.originalname
                : file.fieldname + "-" + Date.now() + "." + file.mimetype.split("/")[1];
            if (filenameFlag) {
                let count = 0;
                while (fs.existsSync(path.resolve(globalThis.HOME_PATH, dir, fileName))) {
                    let _ = file.originalname.split(".");
                    let newFileName = _.slice(0, _.length - 1);
                    let fileExt = _.slice(_.length - 1, _.length);
                    count += 1;
                    fileName = `${newFileName.join("")}-${count.toString()}.${fileExt}`;
                }
            }
            cb(null, fileName);
        },
    });
    return multer({ storage });
};

export const getClientConfig = (host: string): object => {
    // console.log(host);
    let data = JSON.parse(
        fs.readFileSync(path.resolve(globalThis.HOME_PATH, "config-client", `${host}.json`), "utf-8")
    );
    // console.log(data);
    return data;
};

export const SetDataToHtml = (html: string, input_dic: object[], select_dic: object[]) => {
    for (var data of input_dic) {
        let key = Object.keys(data)[0];
        let value = Object.values(data)[0];
        // console.log(key);
        let regx = new RegExp(`<input .*id="${key}_input" value="`);
        let regx_p = new RegExp(`<p .*id="${key}_input">`);
        html = html.replace(regx, str => `${str}${value}`);
        html = html.replace(regx_p, str => `${str}${value}`);
        // console.log(html);
    }
    for (var data of select_dic) {
        let key = Object.keys(data)[0];
        let values = Object.values(data)[0];
        let options = "";
        for (var val of values) {
            options += `<option value="${val.id}">${val.text}</option>`;
        }
        // console.log(key, options)
        let regx = new RegExp(`select .*id="${key}_select".*`);
        html = html.replace(regx, str => `${str}${options}`);
    }
    return html;
};

export const GetDataFromHtml = (html: string, input_key: string[], select_key: string[]) => {
    let input_vals = [];
    let select_vals = [];
    var dom = parse(html);
    try {
        for (var key of input_key) {
            let val = dom.querySelector(`#${key}_input`).attrs["value"];
            if (val == null) val = dom.querySelector(`#${key}_input`).innerText;
            if (val) input_vals.push(val);
        }

        for (var key of select_key) {
            let val = dom.querySelector(`#${key}_select`).attrs["value"];
            if (val) select_vals.push(val);
        }
    } catch (err) {
        logger.error(err);
    }

    return {
        input: input_vals,
        select: select_vals,
    };
};

export const PathCheck = async (_path: string) => {
    if (_path) {
        let res = await mkdirp(path.resolve(globalThis.HOME_PATH, _path));
        if (res) return true;
    }
    return false;
};

export const GetExcelFileDataSheets = (file: any) => {
    let workbook = XLSX.readFile(path.resolve(globalThis.HOME_PATH, file.path));
    let sheet_name_list = workbook.SheetNames;
    // let datas = [];
    // for(var name of sheet_name_list){
    //     datas.push(XLSX.utils.sheet_to_csv(workbook.Sheets[name]));
    // }
    return {
        // data : datas,
        sheet: sheet_name_list,
    };
};

export const GetExcelFileData = (file: any): any[] => {
    try {
        if (
            file.mimetype.indexOf("xls") != -1 ||
            file.mimetype.indexOf("xml") != -1 ||
            file.mimetype.indexOf("excel") != -1
        ) {
            var workSheet = XLSX.readFile(path.resolve(globalThis.HOME_PATH, file.path), {});

            return Object.keys(workSheet.Sheets).map(function (name) {
                let sheet_name_list = workSheet.SheetNames;
                var sheet = workSheet.Sheets[name];
                return {
                    sheet: sheet_name_list,
                    name,
                    data: XLSX.utils.sheet_to_json(sheet, {
                        header: 1,
                        raw: true,
                        range: null,
                        blankrows: false,
                    }),
                };
            });
        }
    } catch (err) {
        logger.error(err);
    }
    return null;
};

export const GetExcelImageData = async (
    file: Express.Multer.File
): Promise<{ row: number; col: number; name: string; ext: string; buffer: Excel.Buffer }[]> => {
    try {
        if (file.mimetype.indexOf("xml") != -1) {
            const uploadPath = path.resolve(globalThis.HOME_PATH, edmsUploadFolder) + "/";
            const workbook = new Excel.Workbook();
            const ret = await workbook.xlsx.readFile(path.resolve(globalThis.HOME_PATH, file.path));
            let imageDatas = [];
            for (var sheet of ret.worksheets) {
                let images = sheet.getImages();
                for (var image of images) {
                    const img = workbook.model.media.find((m: any) => m.index === image.imageId);
                    const imgFileName = `${img.name}${new Date().getTime()}.${img.extension}`;
                    imageDatas.push({
                        row: image.range.tl.nativeRow,
                        col: image.range.tl.nativeCol,
                        name: imgFileName,
                        ext: `${img.extension}`,
                        buffer: img.buffer,
                    });
                    fs.writeFileSync(uploadPath + imgFileName, Buffer.from(img.buffer));
                }
            }
            return imageDatas;
        }
    } catch (err) {
        logger.error(err);
    }
    return null;
};

export const getExcelStyles = async (file: any, sheetNo: number, rowNo: number, workbook?: Excel.Workbook) => {
    if (workbook == undefined) {
        workbook = new Excel.Workbook();
        workbook = await workbook.xlsx.readFile(path.resolve(globalThis.HOME_PATH, file.path));
    }
    let row = workbook.worksheets[sheetNo].getRow(rowNo);
    return {
        workbook: workbook,
        background: row.fill && row.fill.type == "pattern" && row.fill.bgColor ? row.fill.bgColor.argb : "",
        foreground: row.fill && row.fill.type == "pattern" && row.fill.fgColor ? row.fill.fgColor.argb : "",
        border: row.border,
        height: row.height,
    };
};

export const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

export const getFileExtensionType = (fileType: string, fileName: string) => {
    switch (fileType) {
        case undefined:
        case "": {
            const strings = fileName.split(".");
            const stringsLowerCase = strings.map(str => str.toLowerCase());
            var idx = 0;
            for (let str of stringsLowerCase) {
                if (str === "iModel" || str === "dgn" || str === "nwd" || str === "bim") {
                    // || str === "dwg"
                    if (idx === stringsLowerCase.length - 1) {
                        return "001";
                    }
                }
                idx += 1;
            }
            return "003";
        }
        case "application/pdf":
            return "002";
        default:
            return "003";
    }
};

export const ExcelDateToJSDate = (serial: number) => {
    if (serial) {
        var utc_days = Math.floor(serial - 25569);
        var utc_value = utc_days * 86400;
        var date_info = new Date(utc_value * 1000);

        var fractional_day = serial - Math.floor(serial) + 0.0000001;

        var total_seconds = Math.floor(86400 * fractional_day);

        var seconds = total_seconds % 60;

        total_seconds -= seconds;

        var hours = Math.floor(total_seconds / (60 * 60));
        var minutes = Math.floor(total_seconds / 60) % 60;
        const dateResult = new Date(
            date_info.getFullYear(),
            date_info.getMonth(),
            date_info.getDate(),
            hours,
            minutes,
            seconds
        );
        return isNaN(Date.parse(dateResult.toString())) ? null : dateResult;
    }
    return null;
};

export const getProjectNo = async (company_id: number) => {
    let workTmCode = await getRepository(WorkTmCode).find({ company_id });
    return workTmCode.map(raw => raw.project_no);
};

export const CopyFile = async (origin: string, to: string) => {
    try {
        await cpFile(origin, path.resolve(globalThis.HOME_PATH, to));
    } catch (err) {
        logger.error(err);
    }
    return false;
};

export const MoveFile = async (origin: string, to: string) => {
    try {
        await moveFile(origin, path.resolve(globalThis.HOME_PATH, to));
        return true;
    } catch (err) {
        logger.error(err);
    }
    return false;
};

export const getFileTypeName = (file_type: string) => {
    switch (file_type) {
        case "001":
            return "도면";
        case "002":
            return "PDF";
        default:
            return "문서";
    }
};

export const checkAdmin = async (user_id: number) => {
    if (user_id != null) {
        let user = await getRepository(EdmsUser).findOne({ user_id });
        if (user && user.level == 1) {
            return true;
        }
    }
    return false;
};

// file path 생성
export const mvEdmsFile = async (
    project_no: string,
    cate_no: string,
    docu_no: string,
    file_no: number,
    origin: string,
    revision: any,
    file_ext: string,
    copyFlag?: boolean
) => {
    let cate = await getRepository(EdmsCategory).findOne({
        cate_no: parseInt(cate_no),
    });
    let _filePath = await getEdmsFilePath(parseInt(project_no), cate);
    let time = new Date().getTime();
    let destination = _filePath + `${docu_no}_N${file_no}_V${revision}_${time}.${file_ext}`;
    if (copyFlag) {
        await CopyFile(origin, destination);
    } else {
        await MoveFile(origin, destination);
    }
    // pdf 파일인지 확인
    // !! PDF Worker 가 알아서 다함.
    // if (
    //     file_ext &&
    //     file_ext.toLocaleLowerCase().indexOf("pdf") == -1 &&
    //     file_ext.toLocaleLowerCase().indexOf("bim") == -1
    // ) {
    //     registPdf(destination);
    // } else {
    // }
    return destination;
};

export const getEdmsFilePath = async (proj_no: number, cate: EdmsCategory) => {
    let _path = `${proj_no}/`;
    let _cates = ``;
    const dept = cate.dept + 1;
    for (var i = 0; i < dept; i++) {
        if (cate) {
            _cates = `${cate.cate_no}/` + _cates;
            cate = await getRepository(EdmsCategory).findOne({
                cate_no: cate.pcate_no,
            });
        }
    }
    return _path + _cates;
};

export const delEdmsFile = async (file_no_list: number[]) => {
    for (var file_no of file_no_list) {
    }
};

// project numbering procedure
// 1. 설계도서
// AAA-AA-AA-(AA)-NNNN-P
// 프로젝트 코드 - 분야코드 - 도서/도면 유형 code - 시스템/구역 유형 Code (구분필요시) - 일련번호 - P
// TEP-PM-EL-(KOGAS)-0000-P

// 2. 구매도서
// AAA-AAA-A-NNNN-P
// 구매도서 유형 Code - 프로젝트 Code - 구매분야 Code - 일련번호 - P
// RFQ/TBE/PO - TEP - R,S,P,E,I,H,F,G - 0001 - P

// 3. 제작자 도서/도면
// VP-AAA-ANNN-AA-AA-NNNN
// VP - 프로젝트 Code - Item 번호 - 분야 Code - 도서/도면 유형 Code - 일련번호
// VP - TEP - (R,S,P,E,I,F,H)001 - PM - EL - 0001

// 4. 미지의 파일
// P2-N-N-A-ANN-NN-0001
export interface GetDocumentNumberType {
    docu_code: string;
    revision: number;
    revisionOrigin: any;
    revisionType?: number;
}

export const get_document_number = (str: string): GetDocumentNumberType => {
    let regex_list = [
        /(TEP-[A-Za-z]{2}-[A-Za-z]{2}-\d+-P)/g, //design_regex
        /(TEP-[A-Za-z]{2}-[A-Za-z]{2}-\d+-[A-Za-z]{1})/g, //2022-315 Add
        /(TEP-[A-Za-z]{2}-[A-Za-z]{2}-\([A-Za-z]{2}\)-\d+-P)/g, //design_regex_option
        /(TEP-[A-Za-z]{2}-[A-Za-z]{2}-\([A-Za-z]{2}\)-\d+-P-\d+)/g, //2022-04-21 ADD
        /(TEP-[A-Za-z]{2}-[A-Za-z]{2}-[A-Za-z]{2}-\d+-P)/g, //2022-04-22 ADD
        /(TEP-[A-Za-z]{2} [A-Za-z]{2}-\([A-Za-z]{2}\)-\d+-P)/g, // 2022-06-14 ADD
        /((RFQ|TBE|PO)-TEP-\w-\d+-P)/g, //purchased_regex
        /(VP-TEP-\w\d+-\w\w-\w\w-\d+)/g, //vendor_regex
        /(P2-\d-\d-\w-\w\d+-\d+-\d+)/g,
        /(P2-\d-\d-\w-\w\d+-\w+-\d+)/g,
        /(VP-TEP-\w-\d+-\w\w-\d+-L)/g, // LNG Numbering (예시: VP-TEP-E-0005-25-0001-L)
        /(VP-TEP-\w-\d+-\w\w-\d+-L-\d+)/g, // LNG Numbering (예시: VP-TEP-E-0005-25-0001-L-001)
    ];
    let docu_code = "";
    for (var regex of regex_list) {
        let result = regex.exec(str);
        if (result && result.length > 0) {
            docu_code = result[0].replace("_", "");
        }
    }
    const revisionRegex =
        /rev.(\d+|\w)|Rev(\d+|\w)|_Rev.(\d+|\w)|Rev.(\d+|\w)|Rev.(\d+|\w)|_r(\d+|\w)\.|[(]R(\d+|\w)[)]|_R(\d+|\w)\s|REV.(\d+|\w)|_R(\d+|\w)\s|R(\d+|\w)\.\w/g;
    const revisionRegexLength = 11; // regex captcha 개수
    let revision = 0;
    let revisionOrigin;
    let revisionType = 0; // 0 : Number, 1 : String
    let revResult = revisionRegex.exec(str);
    if (revResult && revResult.length > 0) {
        for (var i = 1; i <= revisionRegexLength; i++) {
            if (revResult[i] != undefined) {
                if (isNaN(parseInt(revResult[i]))) {
                    revision = revResult[i].charCodeAt(0) - 65; // 64를 빼면 A 부터시작인데, 리비전은 0,1,2 이로 올라가기때문에 -1 더해줌.
                    revisionType = 1;
                } else {
                    revision = parseInt(revResult[i]);
                    revisionType = 0;
                }

                revisionOrigin = revResult[i];
            }
        }
    }
    return { docu_code: docu_code, revision: revision, revisionOrigin: revisionOrigin, revisionType: revisionType };
};

// leading zero number character
export const zeroPad = (num, places) => String(num).padStart(places, "0");

export const OrdinalSuffixOf = (i: number) => {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
};

export const dateRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/g;

export const replaceAll = (target: string, keyword: string, replace: string) => {
    let _reg = new RegExp(keyword, "g");
    return target.replace(_reg, replace);
};
