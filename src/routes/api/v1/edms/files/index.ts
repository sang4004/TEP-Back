/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * EdmsDocument
 * 도큐먼트 관리
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Like } from "typeorm";
import path from "path";
import moment from "moment";
import {
    EdmsProjectType,
    EdmsCategory,
    EdmsDocument,
    EdmsFiles,
    EdmsStage,
    EdmsStageType,
    EdmsDiscipline,
    EdmsUser,
    EdmsArea,
    EdmsProjects,
    EdmsAuthority,
    EdmsOtherFiles,
    WorkProc,
    EdmsPlantFiles,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { UnZip } from "@/lib/zip";
import {
    GetExcelFileData,
    GetExcelImageData,
    getDateTime,
    getFileExtension,
    getFileExtensionType,
    ExcelDateToJSDate,
    PathCheck,
    fillZero,
    zipFolders,
    mvEdmsFile,
    get_document_number,
    getExcelStyles,
    zeroPad,
    GetDocumentNumberType,
    validDate,
} from "@/lib/utils";
import { getDefaultStages, GetNextStage } from "@/routes/api/v1/edms/utils";
import { edmsFileDir } from "@/constant";
import {
    GetDocuNoRangeFromDocNo,
    getVPISExcelData,
    getPlanetExcelData,
    newCategoryDcl,
    newDocuDcl,
    originDocuDcl,
    newArea,
    newDiscipline,
    comaprePlantFiles,
} from "./utils";
import { logger } from "@/lib/winston";
import { getFileStageData } from "@/routes/api/v1/edms/work";
import { Procedure } from "@/lib/procedure";
import { DclUploadWorker } from "@/lib/DclUploadWorker";
import { MakeVP } from "@/lib/makevp";
import { globalWorkerObj } from "@/lib/mainWorker";
import { refresh } from "../../../../../lib/token";

const router = express.Router();
const dclUploadWorker = new DclUploadWorker();

const DCL_DOCU_NO_REGEX = /Document No.|Doc. No./gi;

router.post("/collect_file_excel", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1 && req.files[0]) {
            return getSuccessResponse(res, { exFile: req.files[0] });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/collect_file", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1 && req.files && req.files.length > 0) {
            let result_files = [];
            if (Array.isArray(req.files)) {
                for (var file of req.files) {
                    if (file.mimetype.indexOf("zip") != -1) {
                        // 압축파일일 경우
                        // 1. 압축해제
                        let zip_file_list = await UnZip(path.resolve(globalThis.HOME_PATH, file.path));
                        result_files = [...result_files, ...zip_file_list];
                    } else {
                        // 압축파일이 아닐경우
                        result_files.push(file);
                    }
                }
            }
            return getSuccessResponse(res, { files: result_files });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

export const newFileCode = async (docu_no: number, file?: any) => {
    try {
        if (file) {
            let fversion = parseInt(file.fversion) + 1;
            if (isNaN(fversion)) {
                fversion = 1;
            }
            let version = "V" + fillZero(3, fversion.toString());
            let _newFileCode = `${docu_no}_N001_${version}`;
            let originFileCode = `${docu_no}_N001`;
            return {
                newFileCode: _newFileCode,
                originFileCode,
                version: fversion,
            };
        } else {
            let version = "V" + fillZero(3, "1");
            let _newFileCode = `${docu_no}_N001_${version}`;
            let originFileCode = `${docu_no}_N001`;
            return {
                newFileCode: _newFileCode,
                originFileCode,
            };
        }
    } catch (err) {
        logger.error(err);
    }
};

// 조건이 있음.
// 1. TR 을 통해 들어온 코드로만 어떤파일을 올릴수있는지 체크한다.
// 2. 파일명에는 무조건 document no 와 revision 이 들어온다.
enum checkRevResultCodeType {
    "A" = "정상",
    "B" = "이력이 없는 리비전 파일 알림",
    "C" = "이력이 없는 리비전 및 스테이지 변경 파일 알림",
    "D" = "리비전 해석 에러",
    "E" = "도큐먼트와 매칭되지 않는 파일 에러",
    "F" = "리비전이 latest 리비전보다 낮은 파일 에러",
}
export const checkExistFileRevision = async (
    file: EdmsFiles,
    revision: number,
    revisionOrigin: string,
    stages: EdmsStage[]
): Promise<{
    result: boolean;
    nextStage?: string;
    revision?: string;
    skipRevision?: string[];
    result_code: checkRevResultCodeType;
}> => {
    let revisionType: "number" | "abc" = "number";
    let existFileRevisionType: "number" | "abc" = "number";
    if (isNaN(parseInt(revisionOrigin))) {
        revisionType = "abc";
    }
    if (file) {
        let nextStage = file.stage_code;
        let file_revision = parseInt(file.revision);
        if (isNaN(file_revision)) {
            file_revision = file.revision ? file.revision.charCodeAt(0) - 65 : 0;
            existFileRevisionType = "abc";
        }
        if (
            (revisionType == existFileRevisionType &&
                -1 <= file_revision - revision &&
                file_revision - revision <= 0) || // 0, +1 둘중 하나 리비전만
            (revisionType != existFileRevisionType && revision == 0) // 리비전 타입변경은 스테이지 변경
        ) {
            if (revisionType == existFileRevisionType && revisionType != existFileRevisionType) {
                // 타입이 바뀌었다면 스테이지가 변경되었다는뜻
                nextStage = GetNextStage(file.stage_code, stages);
            }
            return {
                nextStage: nextStage,
                result: true,
                revision: revisionOrigin,
                result_code: checkRevResultCodeType.A,
            };
        } else if (revision - file_revision > 0) {
            // 새로들어온 리비전이 기존 파일리비전보다는 높을때
            // 사이에 건너뛴 리비전을 채워준다.
            let skipRevision = [];
            for (var i = file_revision + 1; i < revision; i++) {
                if (revisionType == "abc") {
                    skipRevision.push(String.fromCharCode(i + 65));
                } else {
                    skipRevision.push(i);
                }
            }
            return {
                result: true,
                nextStage: nextStage,
                revision: revisionOrigin,
                skipRevision: skipRevision,
                result_code: checkRevResultCodeType.B,
            };
        } else if (revisionType != existFileRevisionType && revision > 0) {
            // 새로들어온 리비전이, 이전 스테이지를 건너띈 경우에도 추가해줘야함.
            let skipRevision = [];
            for (var i = 0; i < revision; i++) {
                if (revisionType == "abc") {
                    skipRevision.push(String.fromCharCode(i + 65));
                } else {
                    skipRevision.push(i);
                }
            }
            return {
                result: true,
                nextStage: GetNextStage(file.stage_code, stages),
                revision: revisionOrigin,
                skipRevision: skipRevision,
                result_code: checkRevResultCodeType.C,
            };
        } else {
            return { result: false, result_code: checkRevResultCodeType.F };
        }
    } else {
        return {
            nextStage: revisionType == "abc" ? "IFA Issue" : "AFC Issue",
            result: true,
            revision: revisionOrigin,
            result_code: checkRevResultCodeType.A,
            skipRevision: [],
        };
    }
    // if (file && file.wp_idx) {
    //     let tmhistory = await getRepository(WorkTmHistory).findOne({
    //         where: { wp_idx: file.wp_idx, file_no: file.file_no },
    //     });
    //     if (tmhistory) {
    //         let file_revision = isNaN(parseInt(file.revision))
    //             ? file.revision.charCodeAt(0) - 65
    //             : parseInt(file.revision);
    //         if (tmhistory.code == 0) {
    //             // only history
    //             return { nextStage: file.stage_code, result: true, revision: file.revision };
    //         } else if (tmhistory.code == 1) {
    //             let nextStage = GetNextStage(file.stage_code, stages);
    //             if (file.stage_code.indexOf(nextStage) == -1 && revision == 0) {
    //                 let new_revision =
    //                     nextStage.indexOf("IFA") != -1 ? String.fromCharCode(revision + 65) : revision.toString();
    //                 // next stage
    //                 return { nextStage: nextStage, result: true, revision: new_revision };
    //             }
    //         } else if (tmhistory.code == 2) {
    //             if (file_revision + 1 == revision) {
    //                 let new_revision =
    //                     file.stage_code.indexOf("IFA") != -1 ? String.fromCharCode(revision + 65) : revision.toString();
    //                 return { nextStage: file.stage_code, result: true, revision: new_revision };
    //             }
    //         } else if (tmhistory.code == 3) {
    //             return { result: false };
    //         }
    //     }
    // } else {
    //     return { nextStage: "IFA Issue", result: true, revision: "A" };
    // }
    // return { result: false, result_code: checkRevResultCodeType.D };
};

interface filteredFilesType extends GetDocumentNumberType {
    originalname: string;
    filename: string;
    path: string;
    ext: string;
}

// 1. document code , revision 등의 파일정보를 담아서 새로운 객체를 만든다.
// 2. EDMS는 동일한 파일명으로 파일을 올릴경우 원본파일과, pdf 중 원본파일만 EdmsFiles 로 변환하고 pdf 는 뷰어 기능으로써 사용한다.
// 3. 원본 파일을 PDF로 변환하는 작업을 여기서 실행해준다.
export const filesFilter = async (files: Express.Multer.File[], user: EdmsUser): Promise<filteredFilesType[]> => {
    let filteredFiles: filteredFilesType[] = [];

    for (var file of files) {
        await MakeVP(file.originalname, user);
        let { docu_code, revision, revisionOrigin } = get_document_number(file.originalname);
        filteredFiles.push({
            docu_code: docu_code,
            revision: revision,
            revisionOrigin: revisionOrigin,
            originalname: file.originalname,
            filename: file.filename,
            path: file.path,
            ext: getFileExtension(file.originalname),
        });
    }
    // 같은 파일이름의 서로다른 확장자인 경우, pdf 파일은 제외. ( EdmsFiles 에서만 제오 )
    for (var i = 0; i < filteredFiles.length; i++) {
        let _file = filteredFiles[i];
        if (_file.ext == "pdf") {
            let fileExtReg = new RegExp(_file.ext);
            let _exist = filteredFiles.findIndex(
                raw => raw.originalname.indexOf(_file.originalname.replace(fileExtReg, "")) != -1
            );
            if (_exist != -1 && _exist != i) {
                filteredFiles.splice(i, 1);
            }
        }
    }

    return filteredFiles;
};

router.post("/collect_file_build", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        let uploaded_files: any[] = req.body.files;
        let isConfirmUpload: boolean = req.body.isConfirm;
        let files: EdmsFiles[] = [];
        let file_auths: EdmsAuthority[] = [];
        let result_list: string[] = [];
        let result_msg_list: string[] = [];

        await getConnection().transaction(async tr => {
            if (user_id != -1) {
                let user = await tr.getRepository(EdmsUser).findOne({
                    user_id: user_id,
                    is_use: 1,
                });

                let project_list = await tr.getRepository(EdmsProjects).find({ where: { is_use: 1 } });
                let project_type_list = await tr.getRepository(EdmsProjectType).find({ where: { is_use: 1 } });
                let filteredFiles = await filesFilter(uploaded_files, user);
                for (var uploaded_file of filteredFiles) {
                    if (uploaded_file.docu_code) {
                        let document = await getRepository(EdmsDocument).findOne({
                            where: { is_use: 1, docu_code: Like(`%${uploaded_file.docu_code}%`) },
                        });
                        if (document) {
                            let cate = await tr
                                .getRepository(EdmsCategory)
                                .findOne({ where: { is_use: 1, cate_no: document.cate_no } });
                            let stage_list = await tr.getRepository(EdmsStage).find({
                                where: { is_use: 1, docu_no: document.docu_no },
                                order: { actual_dt: "DESC", stage_no: "ASC" },
                            });
                            let lastTmFile = await Procedure.GetLatestFile(document.docu_no);
                            if (lastTmFile.result == false) {
                                lastTmFile.data = await getRepository(EdmsFiles).findOne({
                                    where: { docu_no: document.docu_no, is_use: 1 },
                                    order: { file_no: "DESC" },
                                });
                                //     error_list.push(uploaded_file.originalname);
                                //     continue;
                            }
                            let exist_file = lastTmFile.data;
                            let proj_type = project_type_list.find(raw => raw.project_no == document.project_no);
                            let proj = project_list.find(raw => raw.project_no == proj_type.p_project_no);

                            let stageData = getFileStageData("", stage_list);
                            let checkedRevisionRes = await checkExistFileRevision(
                                exist_file,
                                uploaded_file.revision,
                                uploaded_file.revisionOrigin,
                                stage_list
                            );
                            if (checkedRevisionRes.result_code != checkRevResultCodeType.A) {
                                //정상인 파일은 유저에게 메세지를 노출하지 않는다.
                                result_list.push(uploaded_file.originalname);
                                if (
                                    checkedRevisionRes.result_code == checkRevResultCodeType.B ||
                                    checkedRevisionRes.result_code == checkRevResultCodeType.C
                                ) {
                                    result_msg_list.push(
                                        checkedRevisionRes.result_code +
                                            "( " +
                                            checkedRevisionRes.skipRevision.join(",") +
                                            " )"
                                    );
                                } else {
                                    result_msg_list.push(checkedRevisionRes.result_code);
                                }
                            }
                            if (checkedRevisionRes.result == false) {
                                continue;
                            }
                            if (checkedRevisionRes.revision.length == 0 || checkedRevisionRes.revision == "") {
                                checkedRevisionRes.revision =
                                    checkedRevisionRes.nextStage.indexOf("IFA") != -1 ? "A" : "0";
                            }
                            // 사용자가 리비전 확인 & 승인시에 해당 구문을 넘어감.
                            if (isConfirmUpload == false || isConfirmUpload == undefined) {
                                continue;
                            }
                            //
                            if (exist_file) {
                                await getConnection()
                                    .createQueryBuilder()
                                    .update(EdmsFiles)
                                    .set({ is_last_version: "N" })
                                    .where(
                                        `docu_no = :docu_no
                                        AND file_no = :file_no
                                    `,
                                        { docu_no: document.docu_no, file_no: exist_file.file_no }
                                    )
                                    .execute();
                            }
                            // 리비전 건너띄는 부분 파일 추가
                            if (checkedRevisionRes.skipRevision) {
                                for (var rev of checkedRevisionRes.skipRevision) {
                                    const originalName = uploaded_file.originalname.replace(
                                        checkedRevisionRes.revision,
                                        rev
                                    );
                                    const new_file = new EdmsFiles();
                                    new_file.project_no = document.project_no;
                                    new_file.cate_no = document.cate_no;
                                    new_file.docu_no = document.docu_no;
                                    new_file.root_path = `${edmsFileDir}${uploaded_file.filename}`;
                                    new_file.file_name = uploaded_file.originalname;
                                    new_file.file_type = getFileExtensionType("", originalName);
                                    let code_res;
                                    if (exist_file) {
                                        code_res = await newFileCode(document.docu_no, exist_file);
                                        new_file.fversion = code_res.version;
                                    } else {
                                        code_res = await newFileCode(document.docu_no);
                                        new_file.fversion = 1;
                                    }
                                    new_file.file_code = code_res.newFileCode;
                                    new_file.origin_file_code = code_res.originFileCode;
                                    new_file.original_file_name = originalName;
                                    new_file.is_last_version = "Y";
                                    new_file.weight = "0";
                                    new_file.create_by = user.username;
                                    new_file.create_tm = getDateTime();
                                    new_file.regi_dt = getDateTime();
                                    new_file.stage_code = checkedRevisionRes.nextStage;
                                    new_file.repo_path = uploaded_file.path;
                                    new_file.user_id = user_id;
                                    new_file.revision = rev;
                                    new_file.file_ext = getFileExtension(originalName);
                                    files.push(new_file);
                                    exist_file = new_file;
                                }
                            }
                            const new_file = new EdmsFiles();
                            new_file.project_no = document.project_no;
                            new_file.cate_no = document.cate_no;
                            new_file.docu_no = document.docu_no;
                            new_file.root_path = `${edmsFileDir}${uploaded_file.filename}`;
                            new_file.file_name = uploaded_file.originalname;
                            new_file.file_type = getFileExtensionType("", uploaded_file.originalname);
                            let code_res;
                            if (exist_file) {
                                code_res = await newFileCode(document.docu_no, exist_file);
                                new_file.fversion = code_res.version;
                            } else {
                                code_res = await newFileCode(document.docu_no);
                                new_file.fversion = 1;
                            }
                            new_file.file_code = code_res.newFileCode;
                            new_file.origin_file_code = code_res.originFileCode;
                            new_file.original_file_name = uploaded_file.originalname;
                            new_file.is_last_version = "Y";
                            new_file.weight = "0";
                            new_file.create_by = user.username;
                            new_file.create_tm = getDateTime();
                            new_file.regi_dt = getDateTime();
                            new_file.stage_code = checkedRevisionRes.nextStage;
                            new_file.repo_path = uploaded_file.path;
                            new_file.user_id = user_id;
                            new_file.revision = checkedRevisionRes.revision;
                            new_file.file_ext = uploaded_file.ext;
                            files.push(new_file);
                            // file object create end
                            // const file_auth = new EdmsAuthority();
                            // file_auth.company_id = user.company_id;
                            // file_auth.group_id = user.group_id;
                            // file_auth.user_id = user.user_id;
                            // file_auth.project_no = proj.project_no;
                            // file_auth.project_type_no = proj_type.project_no;
                            // file_auth.discipline_id = cate.discipline_id;
                            // file_auth.area_id = document.area_id;
                            // file_auth.cate_no = document.cate_no;
                            // file_auth.docu_no = document.docu_no;
                            // file_auth.read = 1;
                            // file_auth.write = 1;
                            // file_auth.download = 1;
                            // file_auth.delete = 1;
                            if (stageData.find_stage) {
                                let first_find_stage = stage_list.find(raw => raw.stage_code == "IFA");
                                await tr
                                    .createQueryBuilder()
                                    .update(EdmsStage)
                                    .set({
                                        revision: exist_file ? stageData.find_stage.revision + 1 : 0,
                                        actual_dt: new Date(),
                                    })
                                    .where(
                                        `stage_no=${
                                            exist_file
                                                ? stageData.find_stage.stage_no
                                                : first_find_stage
                                                ? first_find_stage.stage_no
                                                : 0
                                        }`
                                    )
                                    .execute();
                            }
                            // file_auths.push(file_auth);
                            //
                        } else {
                            result_list.push(uploaded_file.originalname);
                            result_msg_list.push(checkRevResultCodeType.E);
                        }
                    } else {
                        result_list.push(uploaded_file.originalname);
                        result_msg_list.push(checkRevResultCodeType.E);
                    }
                }

                if (files.length > 0) {
                    let insertRes = await getRepository(EdmsFiles).save(files);
                    for (var insert_file of insertRes) {
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
                    }
                    // await getRepository(EdmsAuthority).save(file_auths);
                }
            }
        });
        return getSuccessResponse(res, {
            resultList: result_list,
            resultMessages: result_msg_list,
            files: files,
            isConfirm: isConfirmUpload,
        });
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        return getFailedResponse(res, "잠시 후에 다시 시도해주세요.");
    }
});

/***********************************************
 * VP master document list to DB
 * method : POST
 * Params
 * exFilePath : excel file uploaded Path
 * projNo : EdmsProjectType->project_no
 * Process
 * 1. 우선 전체개수만 파악하고 파일만 받은다음 success 내려준다.
 * 2. 백그라운드에서 데이터들 인서트함.
 ***********************************************/
router.post("/collect_file_build_vp", async (req: Request, res: Response) => {
    const { exFilePath, projNo } = req.body;
    try {
        if (req.app.get("edms_user_id") != -1) {
            let user = await getRepository(EdmsUser).findOne({ user_id: req.app.get("edms_user_id"), is_use: 1 });
            let project = await getRepository(EdmsProjectType).findOne({ project_no: projNo });
            let p_project = await getRepository(EdmsProjects).findOne({ project_no: project.p_project_no });
            let stage_type = await getRepository(EdmsStageType).find();
            if (user == undefined) throw "잠시 후에 다시 시도해주세요";
            if (project == undefined) throw "프로젝트가 선택되지 않았습니다. 다시 시도해주세요";
            //#region 1
            let id = new Date().getTime();
            let excelData = GetExcelFileData(exFilePath);
            let total = 0;
            for (var d of excelData) total += d.data.length;
            dclUploadWorker.setDclUpload(id, total, 0);
            getSuccessResponse(res, { dcl_id: id });
            //#endregion
            //#region 2
            let existDocuList = await getRepository(EdmsDocument).find({
                project_no: project.project_no,
                is_vp: 1,
                is_use: 1,
            });
            let existDisciplineList = await getRepository(EdmsDiscipline).find({
                project_no: project.project_no,
                is_vp: 1,
                is_use: 1,
            });
            let existCategoryList = await getRepository(EdmsCategory).find({
                project_no: project.project_no,
                is_vp: 1,
                is_use: 1,
            });
            let keyIndexData = {
                po_no: undefined,
                doc_no: undefined,
                rev: undefined,
                plan_date: undefined,
                title: undefined,
                discipline: undefined,
                issue_code: undefined,
                issued_date: undefined,
            };

            const NewDiscipline = async (name: string, user: EdmsUser, project_no: number): Promise<EdmsDiscipline> => {
                let newDisc = new EdmsDiscipline();
                newDisc.code = "";
                newDisc.create_by = user.username;
                newDisc.is_vp = 1;
                newDisc.name = name;
                newDisc.project_no = project_no;
                newDisc.user_id = user.user_id;
                newDisc = await getRepository(EdmsDiscipline).save(newDisc);
                return newDisc;
            };
            const NewCategory = async (
                discipline: EdmsDiscipline,
                user: EdmsUser,
                project_no: number,
                p_project_no: number
            ): Promise<EdmsCategory> => {
                let newCate = new EdmsCategory();
                newCate.project_no = project_no;
                newCate.is_root = true;
                newCate.pcate_no = 0;
                newCate.cate_code = discipline.name;
                newCate.cate_name = discipline.name;
                newCate.weight = 0;
                newCate.status = "0";
                newCate.is_approval = true;
                newCate.create_by = user.username;
                newCate.dir_path = project_no + "/";
                newCate.pm_id = 1;
                newCate.dept = 0;
                newCate.user_id = user.user_id;
                newCate.p_project_no = p_project_no;
                newCate.discipline_id = discipline.id;
                newCate.explan = "";
                newCate = await getRepository(EdmsCategory).save(newCate);
                return newCate;
            };
            const NewDocument = async (
                doc_no: string,
                issue_code: string,
                title: string,
                issued_date: Date,
                user: EdmsUser,
                project_no: number,
                cate_no: number,
                stage_type: EdmsStageType[],
                plan_date: Date
            ): Promise<EdmsDocument> => {
                let newDocu = new EdmsDocument();
                newDocu.project_no = project_no;
                newDocu.cate_no = cate_no;
                newDocu.docu_code = doc_no;
                newDocu.docu_type = "001";
                newDocu.process_code = "B";
                newDocu.create_by = user.username;
                newDocu.stage_code = issue_code;
                newDocu.docu_subject = title;
                newDocu.user_id = user.user_id;
                newDocu.is_use = 1;
                newDocu.is_vp = 1;
                newDocu.area_id = -1;
                newDocu.wv_rate = 0;
                newDocu.plan_rate = 0;
                newDocu.actual_rate = 0;
                newDocu.revision = 0;
                newDocu.create_tm = issued_date;
                newDocu.explan = "";
                newDocu.status = "";
                newDocu = await getRepository(EdmsDocument).save(newDocu);
                function DefaultData(username: string, plan_date: Date, docu_no: number, user_id: number) {
                    this.create_by = username;
                    this.create_tm = plan_date;
                    this.is_use = 1;
                    this.plan_dt = plan_date;
                    this.status = "001";
                    this.docu_no = docu_no;
                    this.file_no = 0;
                    this.user_id = user_id;
                    this.actual_rate = 0;
                    this.revision = 1;
                }

                let stage_list: EdmsStage[] = [];
                let default_data = new DefaultData(user.username, plan_date, newDocu.docu_no, user.user_id);
                for (var stage of stage_type) {
                    let newStage = new EdmsStage();
                    let newStage2 = null;
                    Object.assign(newStage, default_data);
                    if (stage.stage_name == "Start") {
                        newStage.actual_dt = issued_date;
                        newStage.stage_type = "";
                        newStage.stage_code = stage.stage_name;
                    } else if (stage.stage_name == "As-Built") {
                        newStage.stage_type = "";
                        newStage.stage_code = stage.stage_name;
                    } else {
                        newStage2 = new EdmsStage();
                        Object.assign(newStage2, default_data);

                        newStage.stage_code = stage.stage_name;
                        newStage.stage_type = "i";
                        newStage2.stage_code = stage.stage_name;
                        newStage2.stage_type = "i";
                    }
                    stage_list.push(newStage);
                    if (newStage2) stage_list.push(newStage2);
                }
                await getRepository(EdmsStage).save(stage_list);
                return newDocu;
            };
            for (var d of excelData) {
                let idx = 2;
                let len = d.data.length;
                for (; idx < len; idx++) {
                    dclUploadWorker.setDclUpload(id, undefined, idx);
                    let data = d.data[idx];
                    let po_no = data[keyIndexData["po_no"]];
                    let discipline = data[keyIndexData["discipline"]];
                    let doc_no = data[keyIndexData["doc_no"]];
                    // let rev = data[keyIndexData["rev"]];
                    let plan_date = ExcelDateToJSDate(data[keyIndexData["plan_date"]]);
                    let title = data[keyIndexData["title"]];
                    let issue_code = data[keyIndexData["issue_code"]];
                    let issued_date = ExcelDateToJSDate(data[keyIndexData["issued_date"]]);

                    if (doc_no != undefined && doc_no && typeof doc_no == "string" && doc_no.indexOf("Doc No") == -1) {
                        // discipline add
                        let existDisc = existDisciplineList.find(raw => raw.name == discipline);
                        if (existDisc == undefined) {
                            let newDisc = await NewDiscipline(discipline, user, project.project_no);
                            existDisciplineList.push(newDisc);
                            existDisc = newDisc;
                        }
                        // category add
                        let existCate = existCategoryList.find(raw => raw.cate_name == discipline);
                        if (existCate == undefined) {
                            let newCate = await NewCategory(existDisc, user, project.project_no, p_project.project_no);
                            existCategoryList.push(newCate);
                            existCate = newCate;
                        }
                        //
                        // document add
                        let existDocu = existDocuList.find(raw => raw.docu_code == doc_no);
                        if (existDocu == undefined) {
                            let newDocu = await NewDocument(
                                doc_no,
                                issue_code,
                                title,
                                issued_date,
                                user,
                                project.project_no,
                                existCate.cate_no,
                                stage_type,
                                plan_date
                            );
                            existDocuList.push(newDocu);
                            existDocu = newDocu;
                        } else {
                            await getConnection()
                                .createQueryBuilder()
                                .update(EdmsDocument)
                                .set({ docu_subject: title, modify_by: user.username, modify_tm: new Date() })
                                .where(`docu_no=${existDocu.docu_no}`)
                                .execute();
                        }
                        //
                    } else {
                        // 인덱스 키 설정
                        // 이걸 자동으로 설정되게 해야하나 굳이..
                        keyIndexData = {
                            po_no: 0,
                            doc_no: 3,
                            rev: 4,
                            plan_date: 7,
                            title: 8,
                            discipline: 9,
                            issue_code: 11,
                            issued_date: 12,
                        };
                    }
                }
            }
            dclUploadWorker.removeDclUpload(id);
            globalWorkerObj.dclWorkerInstance.refreshData();
            //#endregion
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        getFailedResponse(res, err);
    }
});

/***********************************************
 * VPIS to DB
 * method : POST
 * Params
 * exFilePath : excel file uploaded Path
 * projNo : EdmsProjectType->project_no
 * Process
 * 1. 우선 전체개수만 파악하고 파일만 받은다음 success 내려준다.
 * 2. 백그라운드에서 데이터들 인서트함.
 ***********************************************/
router.post("/collect_file_build_vpis", async (req: Request, res: Response) => {
    const { exFilePath, projNo } = req.body;
    try {
        if (req.app.get("edms_user_id") != -1) {
            let user = await getRepository(EdmsUser).findOne({ user_id: req.app.get("edms_user_id"), is_use: 1 });
            let project = await getRepository(EdmsProjectType).findOne({ project_no: projNo });
            let p_project = await getRepository(EdmsProjects).findOne({ project_no: project.p_project_no });
            let stage_type = await getRepository(EdmsStageType).find();
            if (user == undefined) throw "잠시 후에 다시 시도해주세요";
            if (project == undefined) throw "프로젝트가 선택되지 않았습니다. 다시 시도해주세요";
            //#region 1
            let id = new Date().getTime();
            let excelData = GetExcelFileData(exFilePath);
            let total = 0;
            for (var d of excelData) total += d.data.length;
            dclUploadWorker.setDclUpload(id, total, 0);
            getSuccessResponse(res, { dcl_id: id });
            //#endregion
            //#region Excel All sheet data => DB
            for(var d of excelData){
                if(d.data){
                    let vpDatas = getVPISExcelData(d.data, project.project_code);
                    let idx = 0;
                    let len = vpDatas.length;
                    for (; idx < len; idx++) {
                        dclUploadWorker.setDclUpload(id, undefined, idx);
                        let data = vpDatas[idx];
                        let doc_no = data.doc_no;
                        let plan_date = data.plan_date ? moment(data.plan_date).toDate() : new Date();
                        let issued_date = data.actual_date ? moment(data.actual_date).toDate() : new Date();
                        if (doc_no != undefined && doc_no && typeof doc_no == "string" && doc_no.indexOf("Doc No") == -1) {
                            await MakeVP(data.doc_no, user, {
                                docuTitle: data.title,
                                planDate: plan_date,
                                actualDate: issued_date,
                            });
                        }
                    }
                }
            }
            dclUploadWorker.removeDclUpload(id);
            globalWorkerObj.dclWorkerInstance.refreshData();
            //#endregion
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        getFailedResponse(res, err);
    }
});

router.post("/collect_file_build_dcl", async (req: Request, res: Response) => {
    // 1. discipline 텍스트 파싱해서 : 오른쪽에 있는 문자
    // 2. No. 텍스트 파싱해서 몇번째 행부터 실제 dcl 데이터인지 체크해서 시작하는 행 변수 정의
    try {
        if (req.app.get("edms_user_id") != -1) {
            let id = new Date().getTime();
            let Alldata = GetExcelFileData(req.body.exFilePath);
            const { workbook } = await getExcelStyles(req.body.exFilePath, 0, 0);
            let Allsheet = Alldata[0].sheet;
            let user = await getRepository(EdmsUser).findOne({
                user_id: req.app.get("edms_user_id"),
                is_use: 1,
            });
            let total = 0;
            let count = 0;
            for (var d = 0; d < Alldata.length; d++) {
                let data = Alldata[d].data;
                total = total + data.length;
            }

            dclUploadWorker.setDclUpload(id, total, count);
            //Data
            let proj_type_no = req.body.projNo;
            let project = await getRepository(EdmsProjectType).findOne({ project_no: proj_type_no, is_use: 1 });
            let proj_no = project.p_project_no;
            let docu_list = await getRepository(EdmsDocument).find({
                where: { project_no: proj_type_no, is_use: 1 },
                order: { docu_no: "DESC" },
            });
            let cate = await getRepository(EdmsCategory).find({
                project_no: proj_type_no,
                is_use: 1,
            });
            // 송전선로 예외처리
            let is_transmission = project.project_code.indexOf("Transmission") != -1;
            //
            let StageType = await getRepository(EdmsStageType).find({ where: { is_use: 1 } });
            getSuccessResponse(res, { dcl_id: id });
            let all_stages = await getRepository(EdmsStage).find({ where: { is_use: 1 } });
            for (var d = is_transmission ? 2 : 0; d < Alldata.length; d++) {
                let sheet = Allsheet[d];
                if (sheet.indexOf(`TR`) != -1 || sheet.indexOf(`Summary`) != -1) continue;
                let data = Alldata[d].data;
                let dcl_no = -1;
                // dept 는 1부터 시작
                let cate_list = [];
                let dept = 0;
                let holdDept = 0;
                let pcate_no = 0;
                let cate_no;

                let _data = null;
                let pfa = null;
                let weight_list = null;
                let DocStage = [];

                let idx: any = {};
                for (var i = 0; i < data.length; i++) {
                    //
                    dclUploadWorker.setDclUpload(id, undefined, count++);
                    if (_data == null || dcl_no == -1)
                        for (var raw of data[i]) {
                            if (raw && raw != null) {
                                if (raw.toString().indexOf(`Discipline`) != -1) {
                                    dcl_no = await newDiscipline(raw, user, proj_type_no);
                                } else if (raw.toString().indexOf(`No.`) != -1) {
                                    _data = data[i];
                                    Object.assign(idx, {
                                        No: _data.indexOf(`No.`),
                                        DocNo: _data.findIndex(
                                            raw => typeof raw == "string" && DCL_DOCU_NO_REGEX.exec(raw)
                                        ),
                                        DocTitle: _data.indexOf(`Doc. Title`),
                                        WV: _data.indexOf("W/V"),
                                        Plan: _data.indexOf("Plan"),
                                        Actual: _data.indexOf("Actual"),
                                        remark: _data.indexOf("Remark"),
                                    });
                                    pfa = data[i + 1];
                                    weight_list = data[i + 2];
                                }
                            }
                        }
                    else if (DocStage.length == 0) {
                        _data.map((raw, index: number) => {
                            if (raw.toString().indexOf(`Area`) != -1) Object.assign(idx, { area: index });

                            for (var s of StageType) {
                                if (raw.toString().indexOf(s.stage_name) != -1) {
                                    let _type = 0;
                                    let revisionF = 0;
                                    let forecast = -1;
                                    let approval = -1;
                                    let weight = 0.0;

                                    if (raw.indexOf(`Issue`) != -1) _type = 1;
                                    else if (raw.indexOf(`Approval`) != -1) _type = 2;
                                    if (s.stage_name == `As-Built` && _type == 0) _type = 2;
                                    // var regex = /[^0-9|^A-Z]/g;
                                    // 알파벳이나 숫자를 인식하여 리비전 파악함
                                    if (raw.indexOf(`REV`) != -1) {
                                        let { revision } = get_document_number(raw.toString());
                                        revisionF = revision;
                                    }
                                    if (pfa[index + 1]) {
                                        if (pfa[index + 1].indexOf(`F`) != -1) {
                                            forecast = index + 1;
                                            approval = index + 2;
                                            weight = weight_list[index + 2];
                                        } else if (pfa[index + 1].indexOf(`A`) != -1) {
                                            approval = index + 1;
                                            weight = weight_list[index + 1];
                                        }
                                        DocStage.push({
                                            index,
                                            raw,
                                            name: s.stage_name,
                                            _type,
                                            revisionF,
                                            pfa: { forecast, approval, weight },
                                        });
                                    } else {
                                        continue;
                                    }
                                }
                            }
                        });
                    } else {
                        let xlsxData = null;
                        if (data[i] && data[i].length == 0) continue;
                        xlsxData = [...data[i]];
                        if (
                            (((xlsxData[idx.No] && typeof xlsxData[idx.No] == "string") || // no 자리에 알파벳이거나
                                (xlsxData[idx.DocNo] && xlsxData[idx.DocNo].length > 0)) && // no 자리도없고 docTitle도 없는경우에 카테고리로 판단
                                xlsxData[idx.DocTitle] == "") ||
                            xlsxData[idx.DocTitle] == undefined
                        ) {
                            if (
                                xlsxData[idx.No] &&
                                xlsxData[idx.No].length > 1 &&
                                xlsxData[idx.No].split &&
                                xlsxData[idx.No].indexOf("-") != -1
                            )
                                dept = xlsxData[idx.No].split(`-`).length - 1;
                            let cate_name = xlsxData[idx.DocNo];

                            pcate_no = dept == 0 ? 0 : cate_list[dept - 1];
                            if (cate_name == undefined || cate_name.length == 0) continue;
                            dept += 1;
                            cate_no = await newCategoryDcl(
                                cate,
                                user,
                                pcate_no,
                                cate_name,
                                dept,
                                proj_no,
                                proj_type_no,
                                dcl_no
                            );
                            if (cate_list[dept - 1]) {
                                cate_list[dept - 1] = cate_no;
                            } else {
                                cate_list.push(cate_no);
                            }
                            // 송전선로
                            if (
                                xlsxData[idx.No] &&
                                xlsxData[idx.No].indexOf &&
                                xlsxData[idx.No].indexOf("A") != -1 &&
                                xlsxData[idx.DocNo].indexOf("단계") != -1
                            )
                                holdDept = dept;
                        } else if (
                            (xlsxData[idx.No] && typeof xlsxData[idx.No] == "number") || // no 가있거나
                            (xlsxData[idx.DocTitle] &&
                                xlsxData[idx.DocTitle].length > 0 &&
                                xlsxData[DocStage[0].index]) || // doc title 이있고, 스테이지가 있다면 도큐먼트로 판단
                            (xlsxData[idx.DocNo] && xlsxData[idx.DocNo].length > 0) // document number 가 있나?
                        ) {
                            //category depth 초기화
                            dept = holdDept;
                            //
                            //#region 송전선로는 물결표시씀;
                            let docu_no_list = [];
                            let nowRowStyle = await getExcelStyles(null, d, i, workbook);
                            if (
                                xlsxData[idx.remark] &&
                                xlsxData[idx.remark].indexOf("삭제") != -1 &&
                                ((nowRowStyle.foreground && nowRowStyle.foreground.indexOf("D0CECE") != -1) ||
                                    (nowRowStyle.background && nowRowStyle.background.indexOf("D0CECE")))
                            ) {
                                console.log("해당 로우는 삭제된 도큐먼트입니다!");
                            } else {
                                if (is_transmission) {
                                    if (xlsxData[idx.DocNo].indexOf("~") != -1) {
                                        const { code, max, min } = GetDocuNoRangeFromDocNo(xlsxData[idx.DocNo]);
                                        if (min > 0 && max > 0) {
                                            for (var j = min; j <= max; j++) {
                                                docu_no_list.push(code.replace("Number", j.toString()));
                                            }
                                        }
                                    } else {
                                        docu_no_list.push(xlsxData[idx.DocNo]);
                                    }
                                } else {
                                    docu_no_list.push(xlsxData[idx.DocNo]);
                                }
                            }
                            //#region findDocu2EdmsDocu
                            for (var docu_no of docu_no_list) {
                                xlsxData[idx.DocNo] = docu_no;
                                let find_docu = docu_list.find(obj => {
                                    if (docu_no == undefined) return false;
                                    return (
                                        obj.docu_code.toLocaleLowerCase().localeCompare(docu_no.toLocaleLowerCase()) ==
                                        0
                                    );
                                });
                                let area_id = -1;
                                if (idx.area) area_id = await newArea(xlsxData[idx.area], user, proj_type_no);
                                if (cate_no != undefined && cate_no != null && docu_no) {
                                    if (find_docu == undefined) {
                                        //console.log("NEW DOCU!!", docu_no);
                                        let newDocu = await newDocuDcl(
                                            user,
                                            idx,
                                            xlsxData,
                                            cate_no,
                                            DocStage,
                                            proj_type_no,
                                            area_id
                                        );
                                        if (newDocu) docu_list.push(newDocu);
                                    } else {
                                        await originDocuDcl(
                                            user,
                                            idx,
                                            xlsxData,
                                            cate_no,
                                            DocStage,
                                            find_docu,
                                            proj_type_no,
                                            area_id,
                                            all_stages
                                        );
                                    }
                                } else {
                                    // console.log("EXIST DOCU!!", docu_no);
                                }
                            }
                            //#endregion
                        }
                    }
                }
            }
            // 삭제된 도큐먼트 제거
            // if (docu_list.length > 0) {
            //     await getConnection()
            //         .createQueryBuilder()
            //         .update(EdmsDocument)
            //         .set({ is_use: 0 })
            //         .where(`docu_no IN (${docu_list.map(raw => raw.docu_no).join(",")})`)
            //         .execute();
            // }

            dclUploadWorker.removeDclUpload(id);
            globalWorkerObj.dclWorkerInstance.refreshData();
            console.log("dcl upload finish!");
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        return getFailedResponse(res);
    }
});

/***********************************************
 * 주기기 데이터 to DB
 * method : POST
 * Params
 * exFilePath : excel file uploaded Path
 * projNo : EdmsProjectType->project_no
 * Process
 * 1. 우선 전체개수만 파악하고 파일만 받은다음 success 내려준다.
 * 2. 백그라운드에서 데이터들 인서트함.
 * file_name, title 에서 적절한 정규식으로 잘라낸 특이점을 갖고, 현재 TR에 있는 성과물들을 찾아서 연결한다.
 ***********************************************/
router.post("/collect_file_build_plant", async (req: Request, res: Response) => {
    const { exFilePath, projNo } = req.body;
    try {
        if (req.app.get("edms_user_id") != -1) {
            let user = await getRepository(EdmsUser).findOne({ user_id: req.app.get("edms_user_id"), is_use: 1 });
            let project = await getRepository(EdmsProjectType).findOne({ project_no: projNo });
            if (user == undefined) throw "잠시 후에 다시 시도해주세요";
            if (project == undefined) throw "프로젝트가 선택되지 않았습니다. 다시 시도해주세요";
            //#region 1
            let id = new Date().getTime();
            let excelData = GetExcelFileData(exFilePath);
            let total = 0;
            for (var d of excelData) total += d.data.length;
            dclUploadWorker.setDclUpload(id, total, 0);
            getSuccessResponse(res, { dcl_id: id });
            //#endregion
            //#region 2
            let pDatas = getPlanetExcelData(excelData[0].data, project.project_code);
            let idx = 0;
            let len = pDatas.length;
            for (; idx < len; idx++) {
                try {
                    dclUploadWorker.setDclUpload(id, undefined, idx);
                    let data = pDatas[idx];
                    let newData = new EdmsPlantFiles();
                    newData.transmittal = data.transmittal;
                    newData.equipment = data.equipment;
                    newData.mdl = data.mdl;
                    newData.customer_transmittal = data.customer_transmittal;
                    newData.contract_due_date = validDate(data.contract_due_date)
                        ? new Date(data.contract_due_date)
                        : null;
                    newData.issue_date = validDate(data.issue_date) ? new Date(data.issue_date) : null;
                    newData.file_name = data.file_name;
                    newData.title = data.title;
                    newData.rev = data.rev;
                    newData.document_issue = data.document_issue;
                    newData.for_contractual_review = data.for_contractual_review;
                    newData.for_contractual_approval = data.for_contractual_approval;
                    newData.status_issued = data.status_issued;
                    newData.documentum_folder_link = data.documentum_folder_link;
                    newData.customer_return_xml = data.customer_return_xml;
                    newData.user_id = user.user_id;
                    newData.project_no = project.project_no;
                    let insertData = await getRepository(EdmsPlantFiles).save(newData);
                    let _compared = await comaprePlantFiles(data);
                    // 탐색된 데이터가 있다면 연결.
                    // TODO :: 주기기 데이터를 연결하는 또다른 함수가 필요할것으로 보임.
                    if (_compared.file_no) {
                        await getConnection()
                            .createQueryBuilder()
                            .update(EdmsPlantFiles)
                            .set({ file_no: _compared.file_no, wp_idx: _compared.wp_idx })
                            .where("id=:id", { id: insertData.id })
                            .execute();
                    }
                    console.log(idx, _compared);
                } catch (err) {
                    console.log(err);
                }
            }
            dclUploadWorker.removeDclUpload(id);
            //#endregion
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
        getFailedResponse(res, err);
    }
});

router.post("/create_file", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    let user = await getRepository(EdmsUser).findOne({ user_id });
    try {
        const default_stages = await getDefaultStages();
        // let proj = await getRepository(EdmsProjectType).findOne({ project_no : req.body.project_no });
        let file = req.files[0];
        let newFile = new EdmsFiles();
        newFile.project_no = req.body.project_no;
        newFile.cate_no = req.body.cate_no;
        newFile.docu_no = req.body.docu_no;
        newFile.root_path = `${edmsFileDir}${file.filename}`;
        newFile.repo_path = ``;
        let split_file_code = req.body.file_code.split("_");
        newFile.origin_file_code = split_file_code[0] + "_" + split_file_code[1];
        newFile.file_code = req.body.file_code;
        newFile.file_name = req.body.file_name;
        newFile.original_file_name = req.body.original_file_name;
        newFile.file_type = getFileExtensionType(req.body.file_type, req.body.original_file_name);
        newFile.fversion = req.body.fversion;
        newFile.is_last_version = req.body.is_last_version;
        newFile.regi_dt = req.body.regi_dt;
        newFile.create_by = req.body.create_by;
        newFile.create_tm = new Date();
        newFile.weight = "";
        newFile.history = req.body.history;
        newFile.stage_code = default_stages[0];
        newFile.user_id = user.user_id;
        newFile.file_ext = getFileExtension(req.body.original_file_name);
        let insertEmp = await getRepository(EdmsFiles).save(newFile);
        let ext = file.originalname.split(".")[file.originalname.split(".").length - 1];
        let _filePath = await mvEdmsFile(
            req.body.project_no,
            req.body.cate_no,
            req.body.docu_no,
            insertEmp.file_no,
            file.path,
            req.body.fversion,
            ext
        );
        insertEmp.repo_path = _filePath;
        await getConnection()
            .createQueryBuilder()
            .update(EdmsFiles)
            .set({ repo_path: insertEmp.repo_path })
            .where("file_no = :id", { id: insertEmp.file_no })
            .execute();

        return getSuccessResponse(res, {
            insert_file: {
                ...insertEmp,
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_file", async (req: Request, res: Response) => {
    try {
        if (req.body.file_no) {
            let edit_file = await getRepository(EdmsFiles).findOne({
                file_no: req.body.file_no,
                is_use: 1,
            });

            let update = {};
            if (req.body.project_no) Object.assign(update, { project_no: req.body.project_no });
            if (req.body.cate_no) Object.assign(update, { cate_no: req.body.cate_no });
            if (req.body.docu_no) Object.assign(update, { docu_no: req.body.docu_no });
            if (req.body.root_path) Object.assign(update, { root_path: req.body.root_path });
            if (req.body.repo_path) Object.assign(update, { repo_path: req.body.repo_path });
            if (req.body.file_code) Object.assign(update, { file_code: req.body.file_code });
            if (req.body.file_name) Object.assign(update, { file_name: req.body.file_name });
            if (req.body.file_type) Object.assign(update, { file_type: req.body.file_type });
            if (req.body.fversion) Object.assign(update, { fversion: req.body.fversion });
            if (req.body.is_last_version) Object.assign(update, { is_last_version: req.body.is_last_version });
            if (req.body.regi_dt) Object.assign(update, { regi_dt: req.body.regi_dt });
            if (req.body.modify_by) Object.assign(update, { modify_by: req.body.modify_by });
            if (req.body.modify_tm) Object.assign(update, { modify_tm: req.body.modify_tm });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ ...update })
                .where("file_no=:id", { id: edit_file.file_no })
                .execute();
            return getSuccessResponse(res, edit_file);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_file", async (req: Request, res: Response) => {
    const _file_no = parseInt(req.query.file_no.toString());
    const _page_type = parseInt(req.query.page_type.toString()); //0: 성과물을 다운받는 페이지, 1: 첨부파일을 다운받는 페이지
    try {
        if (_file_no && _page_type != undefined) {
            let file: any;
            let proc: any;
            if (_page_type == 0) {
                file = await getRepository(EdmsFiles).findOne({ file_no: _file_no, is_use: 1 });
            } else if (_page_type == 1) {
                file = await getRepository(EdmsOtherFiles).findOne({ file_no: _file_no, is_use: 1 });
                if (file.wp_idx) {
                    proc = await getRepository(WorkProc).findOne({ wp_idx: file.wp_idx, is_use: 1 });
                }
            }

            return getSuccessResponse(res, { file: file, proc: proc });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

/******************************************************************************
 * VP Master Document List
 * Method : GET
 * Param
 * exFilePath : excel file upload path
 * project_no : EdmsProjectType->project_no
 * Purpose
 * HENC 에서 작성중인 'VP Master Document List' 엑셀 데이터를 추출.
 * 각 프로젝트별로 존재.
 ******************************************************************************/
router.get("/get_exfile_data_vp", async (req: Request, res: Response) => {
    const exFileDataIdx = {
        po_no: 0,
        vendor: 1,
        doc_no: 3,
        rev_no: 4,
        plan_date: 7,
        title: 8,
        discipline: 9,
    };
    let excelDataList = [];
    try {
        if (req.app.get("edms_user_id") != -1 && req.query.exFilePath) {
            let excelDatas = GetExcelFileData(JSON.parse(req.query.exFilePath.toString()))[0].data;
            let excelDatasLength = excelDatas.length;
            let idx = 13; // 위에 쓸데없는 컬럼들 모두 제외
            for (; idx < excelDatasLength; idx++) {
                let data = excelDatas[idx];
                if (data[exFileDataIdx.doc_no] != null && typeof data[exFileDataIdx.doc_no] == "string") {
                    excelDataList.push({
                        po_no: data[exFileDataIdx.po_no],
                        vendor: data[exFileDataIdx.vendor],
                        doc_no: data[exFileDataIdx.doc_no],
                        rev_no: data[exFileDataIdx.rev_no],
                        plan_date: ExcelDateToJSDate(data[exFileDataIdx.plan_date]),
                        title: data[exFileDataIdx.title],
                        discipline: data[exFileDataIdx.discipline],
                    });
                }
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    } finally {
        return getSuccessResponse(res, excelDataList);
    }
});

/******************************************************************************
 * Vendor Print Index Schedule 파일 데이터 가져오기
 * Method : GET
 * Param
 * exFilePath : excel file upload path
 * project_no : EdmsProjectType->project_no
 * Purpose
 * VPIS 파일을 추출.
 * VP coordination procedure 문서를 통해 discipline 을 결정.
 * 프록시저 상에 VP-TEP-{discipline code}-0001 로 생성되는 규칙을 바탕으로 공종 확인.
 ******************************************************************************/
router.get("/get_exfile_data_vpis", async (req: Request, res: Response) => {
    var exFileDataIdx = {
        no: -1,
        doc_no: -1,
        title: -1,
        plan_date: -1,
        actual_date: -1,
    };

    let excelDataList = [];
    try {
        if (req.app.get("edms_user_id") != -1 && req.query.exFilePath) {
            const project_no = parseInt(req.query.project_no.toString());
            let project = await getRepository(EdmsProjectType).findOne({ project_no: project_no });
            let excelDatas = GetExcelFileData(JSON.parse(req.query.exFilePath.toString()));
            for(var d of excelDatas){
                if(d.data){
                    let _result = getVPISExcelData(d.data, project.project_code);
                    excelDataList = [...excelDataList, ..._result];
                }
            }
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    } finally {
        return getSuccessResponse(res, excelDataList);
    }
});

/******************************************************************************
 * Method : GET
 * Param
 * exFilePath : excel file upload path
 * project_no : EdmsProjectType->project_no
 * Purpose
 * 주기기 Documentum Transmittal Log 파일 데이터 가져오기
 * TODO :: filename 과 title을 비교해서 TR을 생성해줌
 ******************************************************************************/
router.get("/get_exfile_data_plant", async (req: Request, res: Response) => {
    let excelDataList = [];
    try {
        if (req.app.get("edms_user_id") != -1 && req.query.exFilePath) {
            const project_no = parseInt(req.query.project_no.toString());
            let project = await getRepository(EdmsProjectType).findOne({ project_no: project_no });
            let excelDatas = GetExcelFileData(JSON.parse(req.query.exFilePath.toString()))[0].data;
            excelDataList = getPlanetExcelData(excelDatas, project.project_code);
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    } finally {
        return getSuccessResponse(res, excelDataList);
    }
});

router.get("/get_exfile_data", async (req: Request, res: Response) => {
    const exFileDataIdx = {
        project: 0,
        project_type: 1,
        discipline: 2,
        area: 3,
        cate: [4, 5, 6],
        file_type: 7,
        file_name: 8,
        now_stage: 9,
        revision: 10,
        version: 11,
        creator: 12,
        docu_code: 13,
        docu_title: 14,
        Start: { p: 15, f: 16, a: 17 },
        IFA_Issue: { p: 18, f: 19, a: 20, reply: 21, assign: 22 },
        IFA_Approval: { p: 23, f: 24, a: 25, reply: 26, assign: 27 },
        AFC_Issue: { p: 28, f: 29, a: 30, reply: 31, assign: 32 },
        AFC_Approval: { p: 33, f: 34, a: 35, reply: 36, assign: 37 },
        As_Built_Approval: { p: 38, f: 39, a: 40, reply: 41, assign: 42 },
        remark: 43,
    };

    try {
        if (req.app.get("edms_user_id") != -1 && typeof req.query.exFilePath == "string") {
            let data = GetExcelFileData(JSON.parse(req.query.exFilePath))[0].data;
            let exfile_data = [];
            for (var i = 0; i < data.length; i++) {
                let xlsxData = null;
                if (data[i] && data[i].length == 0) continue;
                xlsxData = data[i];
                // file object create
                let file: any = {
                    project_type: xlsxData[exFileDataIdx.project_type],
                    discipline: xlsxData[exFileDataIdx.discipline],
                    area: xlsxData[exFileDataIdx.area],
                    cate: [
                        xlsxData[exFileDataIdx.cate[0]],
                        xlsxData[exFileDataIdx.cate[1]],
                        xlsxData[exFileDataIdx.cate[2]],
                    ],
                    file_type: xlsxData[exFileDataIdx.file_type],
                    file_name: xlsxData[exFileDataIdx.file_name],
                    now_stage: xlsxData[exFileDataIdx.now_stage],
                    revision: xlsxData[exFileDataIdx.revision],
                    version: xlsxData[exFileDataIdx.version],
                    creator: xlsxData[exFileDataIdx.creator],
                    docu_code: xlsxData[exFileDataIdx.docu_code],
                    docu_title: xlsxData[exFileDataIdx.docu_title],
                    Start_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.Start.p]),
                    Start_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.Start.f]),
                    Start_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.Start.a]),
                    IFA_Issue_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Issue.p]),
                    IFA_Issue_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Issue.f]),
                    IFA_Issue_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Issue.a]),
                    IFA_Issue_reply: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Issue.reply]),
                    IFA_Issue_assign: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Issue.assign]),
                    IFA_Approval_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Approval.p]),
                    IFA_Approval_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Approval.f]),
                    IFA_Approval_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Approval.a]),
                    IFA_Approval_reply: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Approval.reply]),
                    IFA_Approval_assign: ExcelDateToJSDate(xlsxData[exFileDataIdx.IFA_Approval.assign]),
                    AFC_Issue_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Issue.p]),
                    AFC_Issue_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Issue.f]),
                    AFC_Issue_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Issue.a]),
                    AFC_Issue_reply: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Issue.reply]),
                    AFC_Issue_assign: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Issue.assign]),
                    AFC_Approval_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Approval.p]),
                    AFC_Approval_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Approval.f]),
                    AFC_Approval_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Approval.a]),
                    AFC_Approval_reply: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Approval.reply]),
                    AFC_Approval_assign: ExcelDateToJSDate(xlsxData[exFileDataIdx.AFC_Approval.assign]),
                    As_Built_Approval_P: ExcelDateToJSDate(xlsxData[exFileDataIdx.As_Built_Approval.p]),
                    As_Built_Approval_F: ExcelDateToJSDate(xlsxData[exFileDataIdx.As_Built_Approval.f]),
                    As_Built_Approval_A: ExcelDateToJSDate(xlsxData[exFileDataIdx.As_Built_Approval.a]),
                    As_Built_Approval_reply: ExcelDateToJSDate(xlsxData[exFileDataIdx.As_Built_Approval.reply]),
                    As_Built_Approval_assign: ExcelDateToJSDate(xlsxData[exFileDataIdx.As_Built_Approval.assign]),
                    remark: xlsxData[exFileDataIdx.remark],
                };
                exfile_data.push(file);
                // file object create end
            }
            // console.log(cnt, files.length);
            return getSuccessResponse(res, { exfile_data });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res, true);
});

router.get("/get_exfile_data_dcl", async (req: Request, res: Response) => {
    const { exFilePath, project_no } = req.query;
    try {
        if (req.app.get("edms_user_id") != -1 && typeof exFilePath == "string") {
            let Alldata = GetExcelFileData(JSON.parse(exFilePath));
            let Allsheet = Alldata[0].sheet;
            let StageType = await getRepository(EdmsStageType).find();
            let project = await getRepository(EdmsProjectType).findOne({ project_no: parseInt(project_no.toString()) });
            let exfile_data = [];
            let category;
            let isTransMission = false;
            if (project.project_code.indexOf("Transmission") != -1) isTransMission = true;
            // console.log(Alldata.length);
            for (var d = isTransMission ? 0 : 0; d < Alldata.length; d++) {
                let data = Alldata[d].data;
                let sheet = Allsheet[d];
                if (sheet.indexOf(`TR`) != -1 || sheet.indexOf(`Summary`) != -1) continue;
                let dcl_text = ``;
                let DocStage = [];
                //stage 타입별 Issue, Approval 분류와 리비전체크
                let _data = null;
                let pfa = null;
                let weight_list = null;
                let idx: any = {};
                //
                let DocNoText = ``;
                // console.log(data.length);
                for (var i = 0; i < data.length; i++) {
                    if (_data == null)
                        for (var raw of data[i]) {
                            if (raw && raw != null) {
                                if (raw.toString().indexOf(`Discipline`) != -1) {
                                    dcl_text = raw.replace(`Discipline :`, ``);
                                } else if (raw.toString().indexOf(`No.`) != -1) {
                                    _data = data[i];
                                    Object.assign(idx, {
                                        No: _data.indexOf(`No.`),
                                        DocNo: _data.findIndex(
                                            raw => typeof raw == "string" && DCL_DOCU_NO_REGEX.exec(raw)
                                        ),
                                        DocTitle: _data.indexOf(`Doc. Title`),
                                    });
                                    pfa = data[i + 1];
                                    weight_list = data[i + 2];
                                }
                            }
                        }
                    else if (DocStage.length == 0) {
                        _data.map((raw: any, index: number) => {
                            if (raw.toString().indexOf(`Area`) != -1) Object.assign(idx, { area: index });
                            for (var s of StageType) {
                                if (raw.indexOf(s.stage_name) != -1) {
                                    let _type = 0;
                                    // 리비전 기본값 -1에서 0으로 수정
                                    let revision = 0;
                                    // 스테이지 테이블의 이슈 어프로벌 분리를 위함 1 = 이슈 2 = 어프로벌 0 = 스타트일 경우
                                    if (raw.indexOf(`Issue`) != -1) _type = 1;
                                    else if (raw.indexOf(`Approval`) != -1) _type = 2;
                                    if (s.stage_name == `As-Built` && _type == 0) _type = 2;
                                    // var regex = /[^0-9]/g;
                                    // 알파벳이나 숫자를 인식하여 리피전 파악
                                    if (raw.indexOf(`REV`) != -1) {
                                        let rev = raw.toString();
                                        rev = rev.match(/\(.*\)/gi);
                                        rev += "";
                                        rev = rev.split("(").join("");
                                        rev = rev.split(")").join("");
                                        rev = rev.replace(`REV.`, "");
                                        if (isNaN(parseInt(rev))) revision = rev.charCodeAt(0) - 64;
                                        else revision = parseInt(rev);
                                    }
                                    // if (raw.indexOf(`REV`) != -1) revision = raw.replace(regex, "");
                                    let forecast = -1;
                                    let approval = -1;
                                    let weight = 0.0;
                                    //F 와 A 를 인식하여 비중치 인덱스 값을 정의
                                    if (pfa[index + 1]) {
                                        if (pfa[index + 1].indexOf(`F`) != -1) {
                                            forecast = index + 1;
                                            approval = index + 2;
                                            weight = weight_list[index + 2];
                                        } else if (pfa[index + 1].indexOf(`A`) != -1) {
                                            approval = index + 1;
                                            weight = weight_list[index + 1];
                                        }
                                        // 알아낸 각종인덱스 값들을 배열에 넣어줌
                                        DocStage.push({
                                            index,
                                            raw,
                                            name: s.stage_name,
                                            _type,
                                            revision,
                                            pfa: { forecast, approval, weight },
                                        });
                                    } else {
                                        continue;
                                    }
                                }
                            }
                        });
                    } else {
                        let xlsxData = null;
                        if (data[i] && data[i].length == 0) continue;
                        xlsxData = data[i];
                        if (xlsxData[idx.No] && typeof xlsxData[idx.No] == "number") {
                            let file: any = {};
                            if (xlsxData[idx.DocNo]) DocNoText = xlsxData[idx.DocNo];
                            Object.assign(file, {
                                sheet: dcl_text + ` / ` + category,
                            });
                            Object.assign(file, { docu_name: DocNoText });
                            Object.assign(file, { file_name: xlsxData[idx.DocTitle] });
                            Object.assign(file, { area: xlsxData[idx.area] });
                            let stage_list = [];
                            for (var DocS of DocStage) {
                                stage_list.push({
                                    stage: DocS.name,
                                    date: ExcelDateToJSDate(xlsxData[DocS.index]),
                                    type: DocS._type, // Issue, Approval
                                    revs: DocS.revision,
                                    weight: DocS.pfa.weight,
                                });
                            }
                            Object.assign(file, { stage_list }); // 스테이지 정보를 오브젝트로 추가
                            exfile_data.push(file);
                        } else if (xlsxData[idx.No] && typeof xlsxData[idx.No] == "string") {
                            category = xlsxData[idx.DocNo];
                        }
                    }
                }
            }
            return getSuccessResponse(res, exfile_data);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_file_list", async (req: Request, res: Response) => {
    try {
        let _emps = await getRepository(EdmsFiles).find({
            where: {
                docu_no: Number(req.query.docu_no),
                is_use: 1,
            },
            order: {
                origin_file_code: "ASC",
                fversion: "DESC",
            },
        });
        let exist_file_codes = [];
        let emps = [];
        for (var emp of _emps) {
            if (exist_file_codes.indexOf(emp.origin_file_code) != -1) {
                continue;
            }
            exist_file_codes.push(emp.origin_file_code);

            emps.push(emp);
        }
        // if (emps.length != 0) {
        return getSuccessResponse(res, emps);
        // }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// mydocument -> 상세보기
// 필터링 없이 해당 도큐먼트에 있는 파일들 모두 불러오는 API
// 파일에 권한이 있어야함
router.get("/get_files_list", async (req: Request, res: Response) => {
    try {
        let file_list: any[] = [];

        let files = await getRepository(EdmsFiles).find({
            where: {
                docu_no: Number(req.query.docu_no),
                is_use: 1,
            },
        });

        return getSuccessResponse(res, files);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/download_files", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1) {
            let zip_urls = [];
            let ids: number[] = req.query.ids[0].split(`,`);
            let type = req.query.isrecent;
            let files = await getRepository(EdmsFiles).find({
                where: { docu_no: In(ids), is_use: 1 },
                order: { fversion: "DESC" },
            });
            let origin_files: any[] = [];
            for (var file of files) {
                let filtered = origin_files.filter(
                    raw => raw.original_file_name == file.original_file_name && raw.docu_no == file.docu_no
                );
                if (file.repo_path == "") continue;
                if (filtered.length == 0) origin_files.push(file);
                if (type == `1`) zip_urls.push(file.root_path);
            }
            if (type == `0`) {
                zip_urls = [];
                for (var f of origin_files) {
                    zip_urls.push(f.root_path);
                }
            }
            return await zipFolders(req.query.filename.toString(), zip_urls, req, res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getSuccessResponse(res);
    // return getFailedResponse(res);
});

//#region 하나의 파일에 버전별로 업로드 되는 기능 API
router.get("/get_file_history", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1) {
            const { file_code } = req.query;
            let file_list = await getRepository(EdmsFiles).find({
                where: { origin_file_code: file_code, is_use: 1 },
                order: { fversion: "ASC" },
            });
            return getSuccessResponse(res, file_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// 같은 문서의 같은 파일들의 history
// jinsu
router.get("/get_files_history", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1) {
            const { files_no, docu_no } = req.query;

            let file_list = await getRepository(EdmsFiles).find({
                where: { docu_no: docu_no, is_use: 1 },
                order: { fversion: "ASC" },
            });
            // if (typeof files_no == "string") {
            //     let _data = file_list.find(raw => raw.file_no == parseInt(files_no));
            //     if (_data) {
            //         files_histories.push(_data);
            //     }
            // } else {
            //     for (let i = 0; i < files_no.length; i++) {
            //         let _data = file_list.find(raw => raw.file_no == files_no[i]);
            //         if (_data) {
            //             files_histories.push(_data);
            //         }
            //     }
            // }

            return getSuccessResponse(res, file_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/new_version_file", async (req: Request, res: Response) => {
    try {
        const { file_code, fversion, history, stage_code, docu_no } = req.body;
        if (req.app.get("edms_user_id") == -1) throw new Error("user_id is none");
        const file = req.files[0];
        const user_id = req.app.get("edms_user_id");
        if (user_id != undefined) {
            let _file_no_list: any[] = [];

            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });

            let _file_list = await getRepository(EdmsFiles).find({
                docu_no: docu_no,
                is_use: 1,
            });

            let stage_list = await getRepository(EdmsStage).find({
                where: { is_use: 1, docu_no: docu_no },
                order: { actual_dt: "DESC", stage_no: "ASC" },
            });
            let stageData = getFileStageData("", stage_list);
            let _prev_file = _file_list.find(raw => raw.file_code == file_code);

            let newfilecode: any;
            let _ = file_code.split("_");
            _[2] = "V" + fillZero(3, (parseInt(_[2].replace("V", "")) + 1).toString());
            newfilecode = _.join("_");

            // 새로운 버전 파일 생성
            let newFile = new EdmsFiles();

            newFile.project_no = _prev_file.project_no;
            newFile.cate_no = _prev_file.cate_no;
            newFile.docu_no = _prev_file.docu_no;
            newFile.root_path = `${edmsFileDir}${file.filename}`;
            newFile.repo_path = ``;
            newFile.origin_file_code = _[0] + "_" + _[1];
            newFile.file_code = newfilecode;
            newFile.file_name = file.filename;
            newFile.original_file_name = file.originalname;
            newFile.file_type = getFileExtensionType("", file.originalname);
            newFile.fversion = fversion != "" ? fversion : 1;
            newFile.is_last_version = "Y";
            newFile.regi_dt = new Date();
            newFile.create_by = user.username;
            newFile.create_tm = new Date();
            newFile.history = history;
            newFile.stage_code = stageData.full_stage_code;
            newFile.user_id = _prev_file.user_id;
            newFile.revision = stageData.revision;
            newFile.file_ext = getFileExtension(file.originalname);

            let insertEmp = await getRepository(EdmsFiles).save(newFile);

            let ext = file.originalname.split(".")[file.originalname.split(".").length - 1];
            let _filePath = await mvEdmsFile(
                _prev_file.project_no.toString(),
                _prev_file.cate_no.toString(),
                _prev_file.docu_no.toString(),
                insertEmp.file_no,
                file.path,
                fversion != "" ? fversion : 1,
                ext
            );
            insertEmp.repo_path = _filePath;

            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ repo_path: insertEmp.repo_path })
                .where("file_no = :id", { id: insertEmp.file_no })
                .execute();

            for (let list of _file_list) {
                if (list.file_no != insertEmp.file_no) {
                    _file_no_list.push(list.file_no);
                }
            }

            // 최신버전을 newFile로 나머지 is_last_version N으로 수정
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ is_last_version: "N" })
                .where("file_no IN(:no)", { no: _file_no_list })
                .execute();

            return getSuccessResponse(res, {
                new_file: {
                    ...insertEmp,
                },
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

//#endregion

router.get("/get_now_file_code", async (req: Request, res: Response) => {
    try {
        const { docu_no } = req.query;
        let files = await getRepository(EdmsFiles).find({
            where: { docu_no: docu_no, is_use: 1 },
            order: { file_code: "DESC" },
        });
        let file_code = "";
        if (files.length == 0) {
            file_code = `${docu_no}_N001_V001`;
        } else {
            let file = files[0];
            let _ = file.file_code.split("_");
            _[1] = "N" + fillZero(3, (parseInt(_[1].replace("N", "")) + 1).toString());
            _[2] = "V0001";
            file_code = _.join("_");
        }
        return getSuccessResponse(res, file_code);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/review_comment_file", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1 && req.files) {
            return getSuccessResponse(res, { files: req.files });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

const REVIEW_GROUP_LENGTH = 5;
export const GetReviewData = async (fileData: any) => {
    // file_data = express.multer.file
    let data = GetExcelFileData(fileData)[0].data;
    let imageData = await GetExcelImageData(fileData);
    let review_data = [];
    let dataIdx = {};
    if (data[4] && data[4].length > 0) {
        let idx = 0;
        let rev_id = 0;
        let result_id = 0;
        let comment_id = 0;
        let reply_id = 0;
        let create_by_id = 0;
        let change_id = 0;
        for (var d of data[4]) {
            if (typeof d == "string") {
                let key = d.toLocaleLowerCase();
                if (key.indexOf("no") != -1 && key.indexOf("sheet") == -1 && key.indexOf("note") == -1) {
                    Object.assign(dataIdx, { No: idx });
                } else if (key.indexOf("document number") != -1) {
                    Object.assign(dataIdx, { Document_Number: idx });
                } else if (key.indexOf("description") != -1) {
                    Object.assign(dataIdx, { Description: idx });
                } else if (key.indexOf("rev") != -1 && key.indexOf("review") == -1) {
                    Object.assign(dataIdx, { ["Rev" + rev_id]: idx });
                    rev_id += 1;
                } else if (key.indexOf("note") != -1) {
                    Object.assign(dataIdx, { ["Review_Result" + result_id]: idx });
                    result_id += 1;
                } else if (key.indexOf("page") != -1) {
                    Object.assign(dataIdx, { Page_Sheet_No: idx });
                } else if (key.indexOf("comment") != -1) {
                    Object.assign(dataIdx, { ["Review_Comment" + comment_id]: idx });
                    comment_id += 1;
                } else if (key.indexOf("reply") != -1) {
                    Object.assign(dataIdx, { ["Reply" + reply_id]: idx });
                    reply_id += 1;
                } else if (key.indexOf("작") != -1) {
                    Object.assign(dataIdx, { ["create_by" + create_by_id]: idx });
                    create_by_id += 1;
                } else if (key.indexOf("설계") != -1) {
                    Object.assign(dataIdx, { ["Design_Change" + change_id]: idx });
                    change_id += 1;
                } else if (key.indexOf("완료") != -1) {
                    Object.assign(dataIdx, { completion: idx });
                }
            }
            idx += 1;
        }
    }

    for (var i = 5; i < data.length; i++) {
        let xlsxData = null;
        if (data[i] && data[i].length == 0) continue;
        xlsxData = data[i];
        let now_idx = 0;
        // file object create
        //#region 도큐먼트 번호 나누는 과정
        let doc_number = xlsxData[dataIdx["Document_Number"]]
            ? xlsxData[dataIdx["Document_Number"]].replace(/["']+/gi, "")
            : "";
        let document_numbers = [];
        let description = xlsxData[dataIdx["Description"]]
            ? xlsxData[dataIdx["Description"]].replace(/["']+/gi, "")
            : "";
        let revision = xlsxData[dataIdx["Rev" + now_idx]];
        let comment = xlsxData[dataIdx["Review_Comment" + now_idx]];
        let code = xlsxData[dataIdx["Review_Result" + now_idx]];
        now_idx += 1;
        let description_list = [];
        let document_number_origin = null; // 도큐먼트 번호의 기준이 될 변수
        if (
            (doc_number.indexOf("~") != -1 || doc_number.indexOf(",") != -1) &&
            revision != undefined &&
            code != undefined &&
            comment != undefined
        ) {
            // ~ 이나 , 가 있으면 진행
            let doc_number_split = doc_number.split("\n");
            for (let _doc_number of doc_number_split) {
                // 줄바꿈으로 해놓은것중에 range 가 아닐경우처리
                if (_doc_number.indexOf("~") == -1 && _doc_number.indexOf(",") == -1) continue;
                doc_number = doc_number.replace(_doc_number, "");
                document_number_origin = _doc_number.split(/[ ~ |,]/gi)[0]; // 전부 split한거에서 첫번째꺼를 기준으로 잡는것이 규칙
                if (document_number_origin.indexOf("code") == -1) {
                    document_numbers = [...document_numbers, document_number_origin];
                    let comma = _doc_number.split(","); // 우선 , 부터 처리
                    for (var j = 1; j < comma.length; j++) {
                        _doc_number = _doc_number.replace("," + comma[j], ""); // 컴마로 구분된 도큐먼트 넘버 삭제
                        let _ = document_number_origin.split("");
                        let now = comma[j].trim().replace(/\r\n/gi, "");
                        _.splice(document_number_origin.length - now.length, now.length, now);
                        document_numbers.push(_.join(""));
                    }
                    _doc_number.replace(/,/gi, ""); // 컴마 다 날려줌
                    let range = _doc_number.split("~");
                    for (var k = 1; k < range.length; k++) {
                        if (range[k].length > 0) {
                            let _ = document_number_origin.split("");
                            let now = range[k].trim();
                            let sliced = document_number_origin.slice(
                                document_number_origin.length - now.length,
                                document_number_origin.length
                            );
                            let start = sliced.replace(/[^\d+]/gi, "");
                            let end = now.replace(/[^\d+]/gi, "");
                            let startNum = parseInt(start);
                            let endNum = parseInt(end);
                            for (var l = startNum + 1; l <= endNum; l++) {
                                let m = sliced;
                                m = m.replace(/\d+/gi, zeroPad(l, start.length));
                                _.splice(document_number_origin.length - now.length, document_number_origin.length, m);
                                document_numbers.push(_.join(""));
                            }
                            break;
                        }
                    }
                }
            }
        }
        //엔터처리한것들
        if (doc_number.indexOf("\r\n") != -1) {
            let splited = doc_number.split("\r\n");
            document_numbers = [...document_numbers, ...splited];
        } else if (doc_number.indexOf("\n") != -1) {
            let splited = doc_number.split("\n");
            document_numbers = [...document_numbers, ...splited];
        }
        if (description.indexOf("\r\n") != -1) {
            let splited = description.split("\r\n");
            description_list = [...splited];
        } else if (description.indexOf("\n") != -1) {
            let splited = description.split("\n");
            description_list = [...splited];
        } else if (document_numbers.length > 1) {
            for (let m = 0; m < document_numbers.length; m++) {
                description_list.push(description);
            }
        }
        //
        if (doc_number != "" && description != "") {
            document_numbers.push(doc_number);
        } else if (doc_number == "" && description != "") {
            document_numbers.push("-");
        }
        if (description_list.length == 0) description_list.push(description);
        // 검출한 도큐먼트 넘버중에 code 라는 텍스트가 있으면 그냥 넘어가기
        if (document_numbers.find(raw => raw.indexOf("code") != -1)) continue;
        //
        for (let j = 0; j < document_numbers.length; j++) {
            let file: any = {
                No: xlsxData[dataIdx["No"]],
                Document_Number: document_numbers[j],
                Description: description_list[j],
                Page_Sheet_No: xlsxData[dataIdx["Page_Sheet_No"]],
            };
            let now_idx = 0;
            // let nowReviewResult = xlsxData[dataIdx["Review_Result0"]];
            while (dataIdx["Review_Result" + now_idx]) {
                let reviewImg = imageData
                    ? imageData.find(raw => raw.row == i && raw.col == dataIdx["Review_Comment" + now_idx])
                    : undefined;
                let replyImg = imageData
                    ? imageData.find(raw => raw.row == i && raw.col == dataIdx["Reply" + now_idx])
                    : undefined;
                Object.assign(file, {
                    ["rev" + now_idx]: xlsxData[dataIdx["Rev" + now_idx]],
                    ["result" + now_idx]: xlsxData[dataIdx["Review_Result" + now_idx]],
                    ["review" + now_idx]: xlsxData[dataIdx["Review_Comment" + now_idx]],
                    ["create_by" + now_idx]: xlsxData[dataIdx["create_by" + now_idx]],
                    ["reply" + now_idx]: xlsxData[dataIdx["Reply" + now_idx]],
                    ["change" + now_idx]: xlsxData[dataIdx["Design_Change"] + now_idx],
                    ["date" + now_idx]: moment().format("YYYY-MM-DD HH:mm:ss"),
                    ["review_attach" + now_idx]: reviewImg ? reviewImg.name : "",
                    ["reply_attach" + now_idx]: replyImg ? replyImg.name : "",
                });
                now_idx += 1;
                // nowReviewResult = xlsxData[dataIdx["Review_Result" + now_idx]];
            }
            const completion = xlsxData[dataIdx["completion"]];
            Object.assign(file, {
                completion: completion ? completion : "-", // 전체 길이 마지막에 추가.
            });
            review_data.push(file);
        }
    }
    return review_data;
};

router.get("/get_review_data", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != -1 && Array.isArray(req.query.file_data)) {
            let fileData = req.query.file_data;
            let review_data = [];
            for (var _file of fileData) {
                let file = JSON.parse(_file.toString());
                let data = await GetReviewData(file);
                if (data.length > 0) review_data = [...review_data, ...data];
            }
            return getSuccessResponse(res, { review_data });
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res, "잘못된 엑셀파일을 업로드 하였습니다. 확인 후 다시 시도해주세요.");
});

router.get("/get_count_upload_edms", async (req: Request, res: Response) => {
    try {
        return getSuccessResponse(res, dclUploadWorker.dcl_upload_list);
    } catch (err) {
        logger.error;
    }
    return getFailedResponse(res);
});

router.get("/get_native_file_list", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    try {
        if (user_id) {
            let data = await getConnection().query(`
                SELECT 
                    ed.project_no,
                    ed.cate_no,
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
                    ef.create_tm as 'file_create_tm'
                FROM edms_files ef
                JOIN (
                    SELECT max(ef.file_no) as file_no, ed.docu_no 
                    FROM edms_files ef 
                    INNER JOIN edms_document ed
                        ON ed.docu_no = ef.docu_no
                WHERE ef.is_use = 1 AND ef.is_last_version = 'Y'
                GROUP BY ed.docu_no) as files
                ON ef.file_no = files.file_no
                INNER JOIN edms_document ed
                ON ed.docu_no = files.docu_no
            `);
            return getSuccessResponse(res, data);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_edms_other_file_list", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            return getSuccessResponse(res, {
                other_file_list: globalWorkerObj.otherWorkResult.list,
                ext_list: globalWorkerObj.otherWorkResult.ext,
            });
        } catch (err) {
            logger.error(err);
        }
        return getFailedResponse(res);
    });
});

export default router;
