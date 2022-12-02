/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity :
 * sendrecv
 * mydocument api
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Transaction } from "typeorm";
import moment from "moment";
import {
    EdmsDocument,
    User,
    WorkTmpBox,
    EdmsStage,
    EdmsFiles,
    EdmsCategory,
    EdmsProjectType,
    EdmsUser,
    EdmsAuthority,
} from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { getFileExtensionType, getFileExtension, MoveFile, fillZero, mvEdmsFile } from "@/lib/utils";
import { getDefaultStages, GetNextStage } from "@/routes/api/v1/edms/utils";
import { edmsFileDir } from "@/constant";

const router = express.Router();

// file code 생성
const newFileCode = async (docu_no: number) => {
    try {
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
        return file_code;
    } catch (err) {
        logger.error(err);
    }
    return "";
};

const changeFileVersion = async (files: any, docuNo: number, cate_no: number) => {
    let newFileVersion: number[] = [];
    let temp: number = 0;

    for (var i = 0; i < files.length; i++) {
        let fileCheck = await getRepository(EdmsFiles).find({
            docu_no: docuNo,
            cate_no: cate_no,
            original_file_name: files[i].originalname,
            is_use: 1,
        });

        if (fileCheck.length != 0) {
            temp = fileCheck[fileCheck.length - 1].fversion + 1;
        } else {
            temp = 1;
        }
        newFileVersion.push(temp);
    }
    return newFileVersion;
};

// 일괄업로드 말고 파일단일 업로드 기능. 현재는 지원안함.
router.post("/create_mydocument", async (req: Request, res: Response) => {
    const user_id = req.app.get("edms_user_id");
    let user = await getRepository(EdmsUser).findOne({
        is_use: 1,
        user_id: user_id,
    });
    const {
        create_by,
        project_no,
        cate_no,
        docu_code,
        docu_type,
        docu_subject,
        //weigth, : 가중치 부분 삭제 되어서 일단 빈값 입력
        explan,
        //process_code, : 승인 필요 부분 삭제되어서 일단 빈값 입력
        status,
        plan_submit_dt,
        real_submit_dt,
        plan_dates,
        actual_dates,
        stage_list,
        file_type,
        is_last_version,
        regi_dt,
        fversion,
        docuNo,
        stage_code,
        area_id,
    } = req.body;

    let checkDocuCode = await getRepository(EdmsDocument).find({
        docu_code: docu_code,
        is_use: 1,
    });

    const default_stages = await getDefaultStages();
    try {
        const createFile = async (
            docu_no: number,
            file_code: string,
            fversion: number,
            stage_code: string,
            file_key: string
        ) => {
            let newFile = new EdmsFiles();
            const file = req.files[file_key];
            const ext = getFileExtension(file.originalname);

            newFile.project_no = project_no;
            newFile.cate_no = cate_no;
            newFile.docu_no = docu_no;
            newFile.user_id = user.user_id;
            newFile.root_path = `${edmsFileDir}${file.filename}`;
            newFile.repo_path = ``;
            let split_file_code = file_code.split("_");
            newFile.origin_file_code = split_file_code[0] + "_" + split_file_code[1];
            newFile.file_code = file_code;
            newFile.file_name = file.filename;
            newFile.original_file_name = file.originalname;
            newFile.file_type = getFileExtensionType(file_type, file.originalname);
            newFile.fversion = fversion;
            newFile.is_last_version = "Y";
            newFile.regi_dt = regi_dt ? moment(regi_dt).toDate() : new Date();
            newFile.create_by = create_by;
            newFile.create_tm = new Date();
            newFile.weight = "";
            newFile.history = explan;
            newFile.stage_code = stage_code;
            newFile.user_id = user.user_id;
            newFile.file_ext = ext;

            let insertFile = await getRepository(EdmsFiles).save(newFile);

            let _filePath = await mvEdmsFile(
                project_no,
                cate_no,
                String(docu_no),
                insertFile.file_no,
                file.path,
                fversion,
                ext
            );

            insertFile.repo_path = _filePath;
            await getConnection()
                .createQueryBuilder()
                .update(EdmsFiles)
                .set({ repo_path: _filePath })
                .where("file_no = :id", { id: insertFile.file_no })
                .execute();

            return insertFile;
        };

        // 문서 중복 체크 & 새 문서 추가 일 때
        if (checkDocuCode[0] == null && docuNo == -1) {
            // 문서 등록
            let new_doc = new EdmsDocument();

            new_doc.project_no = project_no;
            new_doc.cate_no = cate_no;
            new_doc.docu_code = docu_code;
            new_doc.docu_type = docu_type;
            new_doc.docu_subject = docu_subject;
            new_doc.explan = explan;
            //process_code : 승인 필요 부분 삭제되어서 일단 빈값 입력
            new_doc.stage_code = "A";
            new_doc.process_code = "B";
            new_doc.plan_submit_dt = plan_submit_dt ? moment(plan_submit_dt).toDate() : new Date();
            new_doc.real_submit_dt = real_submit_dt ? moment(real_submit_dt).toDate() : new Date();
            new_doc.status = status;
            new_doc.create_by = create_by;
            new_doc.create_tm = new Date();
            new_doc.user_id = user.user_id;
            new_doc.area_id = area_id ? area_id : -1;

            let insert_doc = await getRepository(EdmsDocument).save(new_doc);
            //
            // let _edms_cate = await getRepository(EdmsCategory).find({
            //     is_use: 1,
            //     cate_no: insert_doc.cate_no,
            // });
            // authority 추가
            // let newAuth = new EdmsAuthority();

            // newAuth.read = 1;
            // newAuth.write = 1;
            // newAuth.delete = 0;
            // newAuth.download = 1;
            // newAuth.user_id = user.user_id;
            // newAuth.docu_no = insert_doc.docu_no;
            // newAuth.cate_no = insert_doc.cate_no;
            // newAuth.area_id = insert_doc.area_id;
            // newAuth.company_id = user.company_id;
            // newAuth.project_no = _edms_cate[0].p_project_no;
            // newAuth.project_type_no = _edms_cate[0].project_no;
            // newAuth.discipline_id = _edms_cate[0].discipline_id;

            // await getRepository(EdmsAuthority).save(newAuth);
            //

            // tmp_box 등록
            let newTmpBox = new WorkTmpBox();
            newTmpBox.project_no = project_no;
            newTmpBox.docu_no = insert_doc.docu_no;
            newTmpBox.owner_id = user.user_id;
            newTmpBox.create_by = create_by;
            newTmpBox.create_tm = new Date();

            await getRepository(WorkTmpBox).save(newTmpBox);

            // 파일 등록
            let new_file_code = await newFileCode(insert_doc.docu_no);
            let insertFiles = [];

            if (req.files.length > 0 && new_file_code != "" && user_id != -1) {
                for (var file_key of Object.keys(req.files)) {
                    let insertFile = await createFile(
                        insert_doc.docu_no,
                        new_file_code,
                        fversion,
                        default_stages[0],
                        file_key
                    );
                    insertFiles.push(insertFile);

                    // 스테이지 등록
                    // let stages: EdmsStage[] = [];
                    // let stage_list_arr = stage_list.split(",");
                    // let plan_dates_arr = plan_dates.split(",");
                    // let actual_dates_arr = actual_dates.split(",");

                    // for (var i = 0; i < plan_dates_arr.length; i++) {
                    //     let stage = new EdmsStage();
                    //     stage.create_by = create_by;
                    //     stage.create_tm = new Date();
                    //     stage.file_no = insertFile.file_no;
                    //     stage.docu_no = insert_doc.docu_no;
                    //     stage.stage_code = stage_list_arr[i];
                    //     stage.status = "001";
                    //     stage.plan_dt = plan_dates_arr[i];
                    //     stage.actual_dt = actual_dates_arr[i];
                    //     stage.user_id = user_id;
                    //     stages.push(stage);
                    // }

                    // await getRepository(EdmsStage).save(stages);
                }

                // file 있을 때
                return getSuccessResponse(res, {
                    insert_data: {
                        ...insert_doc,
                        ...insertFiles,
                    },
                    result: true,
                });
            } else {
                // file 없을 때
                return getSuccessResponse(res, {
                    insert_data: {
                        ...insert_doc,
                    },
                    result: true,
                });
            }
        }
        // 기존 문서에 파일 업로드 할 때
        else {
            let newFileVersions = await changeFileVersion(req.files, docuNo, cate_no);
            let new_file_code = await newFileCode(docuNo);
            let insertFiles = [];

            // 파일 등록
            if (req.files != null && new_file_code != "" && user_id != -1) {
                for (var file_key of Object.keys(req.files)) {
                    //version
                    let _fversion = fversion;
                    if (newFileVersions[file_key] !== 1) _fversion = newFileVersions[file_key];
                    //stage_code
                    let _stage_code = stage_code;
                    if (stage_code === "") _stage_code = checkDocuCode[0].stage_code;

                    let insertFile = await createFile(docuNo, new_file_code, _fversion, _stage_code, file_key);

                    insertFiles.push(insertFile);
                }

                return getSuccessResponse(res, {
                    insert_data: {
                        ...insertFiles,
                    },
                    result: true,
                });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

// 스테이지 코드 변경
router.post("/edit_stage_code", async (req: Request, res: Response) => {
    const { noList, stage } = req.body;
    try {
        let fileNo_list = [];
        let all_files = await getRepository(EdmsFiles).find({ is_use: 1 });
        if (Array.isArray(noList)) {
            await getConnection().transaction(async tr => {
                for (var no of noList) {
                    // 파일 찾기
                    let files = all_files.filter(raw => raw.docu_no == no);
                    if (files.length == 0) continue;
                    files.sort((a, b) => b.fversion - a.fversion);

                    fileNo_list.push(files[0].file_no);

                    // update file stage code
                    await tr
                        .createQueryBuilder()
                        .update(EdmsFiles)
                        .set({ stage_code: stage })
                        .where("file_no = :id ", { id: files[0].file_no })
                        .execute();

                    let stage_type = stage.indexOf("Issue") != -1 ? "i" : stage.indexOf("Approval") != -1 ? "a" : "";
                    let stage_code = stage.replace("Issue", "").replace("Approval", "");

                    await tr
                        .createQueryBuilder()
                        .update(EdmsStage)
                        .set({ actual_dt: new Date() })
                        .where("docu_no = :docu_no AND stage_code = :code AND stage_type = :type AND revision > -1", {
                            docu_no: no,
                            code: stage_code,
                            type: stage_type,
                        })
                        .execute();
                }
            });
        }
        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
