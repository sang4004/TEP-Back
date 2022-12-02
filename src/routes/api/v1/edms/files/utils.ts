import moment from "moment";
import { EntityManager, getConnection, getRepository } from "typeorm";
//////////////////////////////////////
import {
    EdmsCategory,
    EdmsUser,
    EdmsDiscipline,
    EdmsDocument,
    EdmsStage,
    EdmsArea,
    EdmsPlantFiles,
    EdmsOtherFiles,
} from "@/entity";
import { PathCheck, ExcelDateToJSDate } from "@/lib/utils";
import { logger } from "@/lib/winston";

export const GetDocuNoRangeFromDocNo = (target: string) => {
    const regDocuNoRange = /(\d+)~(\d+)/g;
    let result = regDocuNoRange.exec(target);
    try {
        if (result && result.length > 2) {
            let min = parseInt(result[1]);
            let max = parseInt(result[2]);
            if (!isNaN(min) && !isNaN(max)) {
                let code = target.replace(result[0], "Number"); // TEP-TL-GD--T
                return { min: min, max: max, code: code };
            }
        }
    } catch (err) {
        return { min: 0, max: 0, code: "" };
    }
    return { min: 0, max: 0, code: "" };
};

const VPIS_DISCIPLINE = {
    R: "Rotating",
    S: "Stationary",
    P: "Piping",
    E: "Electric",
    I: "Instrument & Control",
    H: "HVAC",
    F: "Fire Fighting",
    G: "General",
};
const PLAN_DATE_POSITION = {
    "POWER PLANT": 7,
    "LNG TANK": 6,
};

export const getVPISExcelData = (excelDatas: any[], projectCode: string) => {
    let excelDataList: {
        no: number;
        doc_no: string;
        title: string;
        plan_date: string;
        actual_date: string;
        discipline: string;
    }[] = [];
    var exFileDataIdx = {
        no: -1,
        doc_no: -1,
        title: -1,
        plan_date: -1,
        actual_date: -1,
    };
    let excelDatasLength = excelDatas.length;
    let idx = 0;
    try {
        for (; idx < excelDatasLength; idx++) {
            let data = excelDatas[idx];
            let no = -1;
            let doc_no = -1;
            let doc_title = -1;
            data.map((raw, idx) => {
                if (raw && typeof raw == "string") {
                    let _no = raw.toLocaleLowerCase().indexOf("no");
                    let _doc_no = raw.replace(/\s/g, "").toLocaleLowerCase().indexOf("documentno");
                    let _doc_title = raw.replace(/\s/g, "").toLocaleLowerCase().indexOf("documenttitle");
                    if (_no != -1 && no == -1) no = idx;
                    else if (_doc_no != -1 && doc_no == -1) doc_no = idx;
                    else if (_doc_title != -1 && doc_title == -1) doc_title = idx;
                }
            });
            if (no != -1 && doc_no != -1 && doc_title != -1) {
                const pIdx = PLAN_DATE_POSITION[projectCode.toUpperCase()];
                exFileDataIdx.no = no;
                exFileDataIdx.doc_no = doc_no;
                exFileDataIdx.title = doc_title;
                if (pIdx) {
                    exFileDataIdx.plan_date = no + 6;
                    exFileDataIdx.actual_date = no + 6;
                }
                break;
            }
        }
        idx = 1; // 위에 쓸데없는 컬럼들 모두 제외
        for (; idx < excelDatasLength; idx++) {
            let data = excelDatas[idx];
            const doc_no = data[exFileDataIdx.doc_no];
            const no = data[exFileDataIdx.no];
            const title = data[exFileDataIdx.title];
            const plan_date =
                data[exFileDataIdx.plan_date] && typeof data[exFileDataIdx.plan_date] == "string"
                    ? data[exFileDataIdx.plan_date].replace(" △  ", "").replace(/[A-Za-z]+/g, " ")
                    : "";
            const nextData = excelDatas[idx + 1];
            let actual_date = "";
            if (nextData && nextData[exFileDataIdx.actual_date]) {
                if (typeof nextData[exFileDataIdx.actual_date] == "string") {
                    actual_date = excelDatas[idx + 1][exFileDataIdx.actual_date].replace(" △   ");
                } else {
                    actual_date = excelDatas[idx + 1][exFileDataIdx.actual_date].toString();
                }
            }

            //get disciplien letter
            const dLetter = /VP-TEP-(\w)-\d+/gi.exec(doc_no);
            let discipline = "";
            if (dLetter && dLetter.length > 1) {
                let l = dLetter[1];
                discipline = VPIS_DISCIPLINE[l];
            }

            // console.log("no :: ", no, " doc_no :: ", doc_no, " title :: ",  title);
            if (typeof doc_no == "string" && typeof title == "string") {
                // no, document no, document title 그대로 값이 있는경우 패스
                if (doc_no.toLocaleLowerCase().indexOf("document no") != -1) {
                    continue;
                }
                //
                let _plan_date = moment();
                if (plan_date) _plan_date = moment(plan_date);
                excelDataList.push({
                    no: no ? no : idx,
                    doc_no: doc_no,
                    title: title,
                    plan_date: _plan_date.isValid() ? _plan_date.format("YYYY.MM.DD") : plan_date,
                    actual_date:
                        actual_date && _plan_date.isValid() ? moment(plan_date).year() + "." + actual_date : "",
                    discipline: discipline,
                });
            }
        }
    } catch (err) {
        console.log(err);
    } finally {
        return excelDataList;
    }
};

// LEGACY
const PLANET_EXCEL_IDX_KEYWORDS = {
    transmittal: "Transmittal #",
    equipment: "Equipment",
    mdl: "MDL/MLI",
    customer_transmittal: "Customer Transmittal #",
    contract_due_date: "Contract Due Date",
    issue_date: "Issue Date",
    file_name: "File Name",
    title: "Title",
    rev: "GE Document Rev.",
    document_issue: "Document Issue",
    for_contractual_review: "For Contractual Review",
    for_contractual_approval: "For Contractual Approval",
    status_issued: "Status Issued",
    documentum_folder_link: "Documentum Folder Link",
    customer_return_xml: "Customer Return XMTL #",
    review_result: "Review Result and Code #",
};
interface PLANT_EXCEL_TYPES {
    transmittal: string;
    equipment: string;
    mdl: string;
    customer_transmittal: string;
    contract_due_date: string;
    issue_date: string;
    file_name: string;
    title: string;
    rev: string;
    document_issue: string;
    for_contractual_review: string;
    for_contractual_approval: string;
    status_issued: string;
    documentum_folder_link: string;
    customer_return_xml: string;
    review_result: string;
    // DB
    file_no?: number;
    wp_idx?: number;
}
export const getPlanetExcelData = (excelDatas: any[], projectCode: string): PLANT_EXCEL_TYPES[] => {
    let excelDataList: {
        // id: number;
        transmittal: string;
        equipment: string;
        mdl: string;
        customer_transmittal: string;
        contract_due_date: string;
        issue_date: string;
        file_name: string;
        title: string;
        rev: string;
        document_issue: string;
        for_contractual_review: string;
        for_contractual_approval: string;
        status_issued: string;
        documentum_folder_link: string;
        customer_return_xml: string;
        review_result: string;
    }[] = [];
    var exFileDataIdx = {
        transmittal: -1,
        equipment: -1,
        mdl: -1,
        customer_transmittal: -1,
        contract_due_date: -1,
        issue_date: -1,
        file_name: -1,
        title: -1,
        rev: -1,
        document_issue: -1,
        for_contractual_review: -1,
        for_contractual_approval: -1,
        status_issued: -1,
        documentum_folder_link: -1,
        customer_return_xml: -1,
        review_result: -1,
    };
    let excelDatasLength = excelDatas.length;
    let id = 0;
    try {
        for (; id < excelDatasLength; id++) {
            let data = excelDatas[id];
            data.map((raw, idx) => {
                if (raw && typeof raw == "string") {
                    let d = raw.toLocaleLowerCase();
                    Object.keys(exFileDataIdx).map(key => {
                        if (
                            exFileDataIdx[key] == -1 &&
                            d.indexOf(PLANET_EXCEL_IDX_KEYWORDS[key].toLocaleLowerCase()) != -1
                        )
                            exFileDataIdx[key] = idx;
                    });
                }
            });
            if (Object.values(exFileDataIdx).find(r => r == -1) == undefined) {
                break;
            }
        }
        console.log(exFileDataIdx);
        id = 2;
        for (; id < excelDatasLength; id++) {
            let data = excelDatas[id];
            let result = {
                // id: id,
                transmittal: "",
                equipment: "",
                mdl: "",
                customer_transmittal: "",
                contract_due_date: "",
                issue_date: "",
                file_name: "",
                title: "",
                rev: "",
                document_issue: "",
                for_contractual_review: "",
                for_contractual_approval: "",
                status_issued: "",
                documentum_folder_link: "",
                customer_return_xml: "",
                review_result: "",
            };
            Object.keys(result).map(key => {
                try {
                    if (key != "id") {
                        let d = data[exFileDataIdx[key]];
                        if (key == "issue_date" || key == "contract_due_date") d = ExcelDateToJSDate(d);
                        result[key] = d;
                    }
                } catch (err) {
                    console.log(err);
                }
            });
            // console.log(result);
            excelDataList.push(result);
        }
    } catch (err) {
        console.log(err);
    } finally {
        return excelDataList;
    }
};

// msg code
// 1 : 일치하는 파일이 없습니다.
// 2 : 잘못된 프로젝트 코드입니다.
// 3 : 잘못된 카테고리 코드입니다.
// 4 : 잘못된 도큐먼트 코드입니다.
// 3 : 잘못된 리비전입니다.
export const newCategoryDcl = async (
    cate_list: EdmsCategory[],
    user: EdmsUser,
    pcate_no: number,
    code: string,
    _dept: number,
    proj_no: number,
    proj_type_no: number,
    dcl_no: number
) => {
    const exist = cate_list.find(raw => raw.cate_name == code);
    if (exist && exist != undefined) {
        // let update_cate = {};
        // Object.assign(update_cate, {
        //     pcate_no :
        // });
        // await getConnection()
        //     .createQueryBuilder()
        //     .update(EdmsCategory)
        //     .set({ ...update_cate })
        //     .where("cate_no=:id", { id: exist.cate_no })
        //     .execute();
        return exist.cate_no;
    } else {
        // 카테고리 생성
        let new_cate = new EdmsCategory();
        new_cate.project_no = proj_type_no;
        new_cate.p_project_no = proj_no;
        new_cate.discipline_id = dcl_no;
        new_cate.is_root = _dept == 0;
        new_cate.pcate_no = pcate_no;
        new_cate.dept = _dept;
        new_cate.cate_code = code;
        new_cate.cate_name = code;
        new_cate.create_tm = new Date();
        new_cate.create_by = user.username;
        new_cate.weight = 0;
        new_cate.pm_id = user.user_id;
        new_cate.is_approval = true;
        new_cate.status = `0`;
        new_cate.explan = ``;
        let _path = `${proj_no}/`;
        let _cates = ``;
        if (pcate_no != 0) _cates = `${pcate_no}/`;
        new_cate.dir_path = _path + _cates;
        let insertCate = await getRepository(EdmsCategory).save(new_cate);
        await PathCheck(_path + _cates + `${insertCate.cate_no}/`);
        return new_cate.cate_no;
    }
};

export const newDocuDcl = async (
    user: EdmsUser,
    idx: any,
    data: any,
    cate_no: number,
    doc_stage: any[],
    proj_no: number,
    area_id: number
) => {
    // 문서 생성
    let new_docu: any;
    await getConnection().transaction(async tr => {
        try {
            new_docu = new EdmsDocument();
            new_docu.project_no = proj_no;
            new_docu.cate_no = cate_no;
            new_docu.docu_type = `001`;
            new_docu.docu_code = data[idx.DocNo] ? data[idx.DocNo] : ``;
            new_docu.docu_subject = data[idx.DocTitle] ? data[idx.DocTitle] : ``;
            new_docu.weight = `0`;
            new_docu.explan = "";
            new_docu.stage_code = "A";
            new_docu.process_code = "B";
            new_docu.status = "";
            new_docu.area_id = area_id ? area_id : -1;
            new_docu.user_id = user.user_id;
            new_docu.create_by = user.username.toString();
            new_docu.create_tm = new Date();
            new_docu.wv_rate = data[idx.WV] ? data[idx.WV] : 0;
            new_docu.plan_rate = data[idx.Plan] ? data[idx.Plan] : 0;
            new_docu.actual_rate = data[idx.Actual] ? data[idx.Actual] : 0;
            await tr.getRepository(EdmsDocument).save(new_docu);
            for (var DocS of doc_stage) {
                let _stage = DocS.name;
                let idx = DocS.index;
                let new_stage: any = new EdmsStage();
                new_stage.docu_no = new_docu.docu_no;
                new_stage.stage_code = _stage;
                if (idx != -1) {
                    new_stage.plan_dt = ExcelDateToJSDate(data[DocS.index]);
                    new_stage.forecast_dt = ExcelDateToJSDate(data[DocS.pfa.forecast]);
                    new_stage.actual_dt = ExcelDateToJSDate(data[DocS.pfa.approval]);
                }
                new_stage.revision = DocS.revision != `` ? DocS.revision : 0;
                new_stage.stage_type = DocS._type == 1 ? `i` : DocS._type == 2 ? "a" : ``;
                new_stage.actual_rate = DocS.pfa.weight ? DocS.pfa.weight : 0;
                new_stage.status = "001";
                new_stage.create_by = user.username;
                new_stage.create_tm = new Date();
                new_stage.is_use = 1;
                await tr.getRepository(EdmsStage).save(new_stage);
            }
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
    });
    return new_docu;
};

export const originDocuDcl = async (
    user: EdmsUser,
    idx: any,
    data: any,
    cate_no: number,
    doc_stage: any[],
    docu: EdmsDocument,
    proj_no: number,
    area_id: number,
    all_stages: EdmsStage[]
) => {
    // 문서 생성
    try {
        let update_docu = {};
        Object.assign(update_docu, {
            project_no: proj_no,
            cate_no: cate_no,
            docu_subject: data[idx.DocTitle] ? data[idx.DocTitle] : ``,
            modify_by: user.username.toString(),
            modify_tm: new Date(),
            area_id: area_id ? area_id : -1,
            user_id: user.user_id,
            is_use: 1,
            wv_rate: data[idx.WV] ? data[idx.WV] : 0,
            plan_rate: data[idx.Plan] ? data[idx.Plan] : 0,
            actual_rate: data[idx.Actual] ? data[idx.Actual] : 0,
        });
        await getConnection()
            .createQueryBuilder()
            .update(EdmsDocument)
            .set({ ...update_docu })
            .where("docu_no=:id", { id: docu.docu_no })
            .execute();

        let now_stage = all_stages.filter(raw => raw.docu_no == docu.docu_no);

        await getConnection().transaction(async tr => {
            for (var DocS of doc_stage) {
                let stage_code = DocS.name;
                let stage_type = ``;
                if (DocS._type == 1) stage_type = `i`;
                else if (DocS._type == 2) stage_type = `a`;
                let idx = DocS.index;
                let plan_dt = ExcelDateToJSDate(data[idx]);
                let forecast_dt = ExcelDateToJSDate(data[DocS.pfa.forecast]);
                let actual_dt = ExcelDateToJSDate(data[DocS.pfa.approval]);
                let revision = DocS.revision;
                let actual_rate = DocS.pfa.weight;

                let stage = now_stage.find(
                    raw => raw.stage_code == stage_code && raw.stage_type == stage_type && raw.revision == revision
                );
                if (stage) {
                    let update_stage = {};
                    if (plan_dt != null) Object.assign(update_stage, { plan_dt: plan_dt });
                    if (forecast_dt != null) Object.assign(update_stage, { forecast_dt: forecast_dt });
                    if (actual_dt != null) Object.assign(update_stage, { actual_dt: actual_dt });
                    Object.assign(update_stage, { modify_by: user.username });
                    Object.assign(update_stage, { is_use: 1 });
                    Object.assign(update_stage, { modify_tm: new Date() });
                    await tr
                        .createQueryBuilder()
                        .update(EdmsStage)
                        .set({ ...update_stage })
                        .where("stage_no=:id", { id: stage.stage_no })
                        .execute();
                } else {
                    let new_stage: any = new EdmsStage();
                    new_stage.docu_no = docu.docu_no;
                    new_stage.stage_code = stage_code;
                    if (plan_dt !== null) new_stage.plan_dt = plan_dt;
                    if (forecast_dt !== null) new_stage.forecast_dt = forecast_dt;
                    if (actual_dt !== null) new_stage.actual_dt = actual_dt;
                    new_stage.revision = revision;
                    new_stage.stage_type = stage_type;
                    new_stage.actual_rate = actual_rate ? actual_rate : 0;
                    new_stage.status = "001";
                    new_stage.create_by = user.username;
                    new_stage.create_tm = new Date();
                    new_stage.is_use = 1;
                    await tr.getRepository(EdmsStage).save(new_stage);
                }
            }
        });
    } catch (err) {
        logger.error(err + doc_stage);
    }
};

export const newDiscipline = async (dcl: string, user: any, projNo: number) => {
    let dcl_text = dcl.replace(`Discipline :`, ``);
    let sheet = await getRepository(EdmsDiscipline).find({ name: dcl_text, project_no: projNo, is_use: 1 });
    let dcl_no;
    if (sheet.length > 0) {
        dcl_no = sheet[0].id;
    } else {
        let newDcl = new EdmsDiscipline();
        newDcl.name = dcl_text;
        newDcl.create_by = user.username;
        newDcl.create_tm = new Date();
        newDcl.project_no = projNo;
        let insertDcl = await getRepository(EdmsDiscipline).save(newDcl);
        dcl_no = insertDcl.id;
    }
    return dcl_no;
};

export const newArea = async (area: string, user: any, projNo: number) => {
    let _area = await getRepository(EdmsArea).find({ name: area, is_use: 1 });
    let area_id;
    if (_area.length > 0) {
        area_id = _area[0].id;
    } else if (area != "" && area != null) {
        let newArea = new EdmsArea();
        newArea.name = area;
        newArea.create_by = user.username;
        newArea.create_tm = new Date();
        newArea.project_no = projNo;
        let insertArea = await getRepository(EdmsArea).save(newArea);
        area_id = insertArea.id;
    }
    return area_id;
};

export const comaprePlantFiles = async (data: PLANT_EXCEL_TYPES) => {
    try {
        if (data.file_name) {
            data.file_name.replace("'", "");
            const FILE_EXTENSION_REGEX = /\.[^.\\/:*?"<>|\r\n]+$/g;
            // 확장자만 제거해서 확인
            let source1 = FILE_EXTENSION_REGEX.exec(data.file_name);
            if (source1) {
                data.file_name = data.file_name.replace(source1[0], "");
            }
            let _file1 = data.file_name;
            // 공백 split 후 첫번쨰 값으로 확인
            let source2 = data.file_name.split(" ");
            let _file2 = source2[0];
            // 언더바를 기준으로 언더바 이전까지 탐색
            let source3 = data.file_name.split("_");
            let _file3 = source3[0];
            // Customer Transmittal
            let _file4 = data.customer_transmittal;
            let files = await getConnection().query(`
                SELECT * FROM edms_other_files
                WHERE 
                    file_name like '%${_file1}%' OR
                    file_name like '%${_file2}%' OR
                    file_name like '%${_file3}%' OR
                    file_name like '%${_file4}%'
            `);
            if (files.length > 0) {
                data.file_no = files[0].file_no;
                data.wp_idx = files[0].wp_idx;
            }
        }
    } catch (err) {
        console.log("comparePlantFiles Error : ", err);
    }
    return data;
};
