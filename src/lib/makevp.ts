/******************************************************************************
 * entity :
 * EdmsProjectType, EdmsDiscipline, EdmsCategory, EdmsDocument
 * VP Document Numbering Procedure
 *
 ******************************************************************************/

import { EntityManager, getConnection, getRepository } from "typeorm";
import moment from "moment";
import {
    EdmsProjectType,
    EdmsDiscipline,
    EdmsCategory,
    EdmsDocument,
    EdmsUser,
    EdmsStageType,
    EdmsStage,
} from "@/entity";
import { fillZero } from "@/lib/utils";
import { logger } from "@/lib/winston";

const replaceAll = (origin: string, find: string, replace: string) => {
    while (true) {
        origin = origin.replace(find, replace);
        if (origin.indexOf(find) != -1) continue;
        return origin;
    }
};

// 발전소 관련
const project_code = "TEP"; // 프로젝트 code
const item_types = {
    // Item 번호
    R: "Mechanical", // rotating
    S: "Stationary", // static
    P: "Piping",
    E: "Electric",
    I: "Instrument",
    F: "FF",
    H: "HVAC",
};
const disp_codes = {
    // 분야 코드
    PM: "Project Management",
    PR: "Process",
    ME: "Mechanical (Common)",
    RO: "Mechanical (Rotating)",
    ST: "Mechanical (Stationary)",
    PI: "Piping",
    EL: "Electrical",
    IN: "Instrument",
    CV: "Civil",
    AR: "Architecture",
    SS: "Steel Structure",
    FF: "Fire Fighting",
    HV: "HVAC",
    PQ: "Quality",
    OT: "Others",
};
const doc_drawing_codes = {
    // 도서/도면 유형 코드
    //PM
    DB: "Data Book, As-Built",
    LI: "List, Drawing List, Index",
    MA: "Manual",
    OT: "Other",
    PL: "Plan",
    PR: "Procedure",
    RE: "Report",
    RK: "Progress Report",
    SC: "Schedule",
    //PR / RO / ST
    CA: "Calculation",
    DS: "Data Sheet",
    FD: "Flow Diagram",
    // LI: "List, Drawing List, Index",
    // OT: "Other",
    PI: "P&ID",
    // PR: "Procedure",
    // RE: "Report",
    SP: "Specification (Basic Design, Description)",
    //PI
    BM: "Engineering B/M",
    // CA: "Calculation",
    GA: "General Arrangement (Location, Plan)",
    IS: "Isometric Drawing",
    // LI: "List, Drawing List, Index",
    // OT: "Other",
    PA: "Piping Arrangement",
    PD: "Plan Drawing (Plot Plan, Layout, etc.)",
    // PR: "Procedure",
    // RE: "Report",
    // SP: "Specification (Basic Design, Description)",
    SU: "Support Detail/Drawing",
    TD: "Typical Drawing",
    //EL
    // BM: "Engineering B/M",
    // CA: "Calculation",
    CF: "Configuration",
    CS: "Cable & Connection Schedule",
    // GA: "General Arrangement (Location, Plan)",
    ID: "Installation Detail & Fixture Schedule",
    LD: "Logic Diagram",
    // LI: "List, Drawing List, Index",
    // OT: "Other",
    // PL: "Plan",
    // RE: "Report",
    SD: "Single Line Diagram",
    SL: "Symbol & Legend",
    // SP: "Specification (Basic Design, Description)",
    SQ: "Schematic & Sequence Diagram",
    //IN
    AG: "Display Diagram",
    // CA: "Calculation",
    // CS: "Cable & Connection Schedule",
    // CF: "Configuration (Control System Configuration - DCS 등)",
    // DS: "Data Sheet",
    // ID: "Installation Detail",
    IF: "Interface Diagram",
    // LD: "Logic & Loop Diagram",
    // LI: "List, Drawing List, Index",
    LO: "Instrument & Control/Electronic Room Layout",
    LS: "Level Setting Diagram",
    // MA: "Manual",
    // OT: "Other",
    // SL: "Symbol & Legend",
    // SP: "Specification (Basic Design, Description)",
    WD: "Wiring Layout Diagram",
    //CV
    // BM: "Engineering B/M",
    // CA: "Calculation",
    CD: "Civil Drawing (Site preparation)",
    DP: "Drainage Drawing (Storm & Sewage Drainage)",
    FA: "Foundation Arrangement (Detail, Plan)",
    // GA: "General Arrangement (Location, Plan)",
    GF: "Gate & Fence Drawing",
    // OT: "Other",
    // RE: "Report",
    RP: "Road & Paving Drawing",
    // SP: "Specification (Basic Design, Description)",
    ST: "Standard",
    UU: "Underground Utilities Drawing",
    //AR / SS
    AC: "Architecture Concrete Drawing",
    AD: "Architecture Drawing",
    // BM: "Engineering B/M",
    // CA: "Calculation",
    GD: "General Drawing",
    LC: "Landscape Drawing",
    // OT: "Other",
    // RE: "Report",
    // SP: "Specification (Basic Design, Description)",
    SS: "Steel Structure Drawing",
    // ST: "Standard",
    //FF
    // BM: "Engineering B/M",
    // CA: "Calculation",
    DD: "Detail Drawing",
    // DS: "Data Sheet",
    // GA: "General Arrangement (Location, Plan)",
    // IS: "Isometric Drawing",
    // LI: "List, Drawing List, Index",
    // OT: "Other",
    // PD: "Plan Drawing (Plot Plan, Layout, etc.)",
    // PI: "P&ID",
    PP: "Piping Plan",
    // RE: "Report",
    // SL: "Symbol & Legend",
    // SP: "Specification (Basic Design, Description)",
    // TD: "Typical Drawing",
    //HV
    // BM: "Engineering B/M",
    // CA: "Calculation",
    // DD: "Detail Drawing",
    // DS: "Data Sheet",
    EL: "Equipment Schedule (List)",
    // GA: "General Arrangement (Location, Plan)",
    // IS: "Isometric Drawing",
    // LI: "List, Drawing List, Index",
    // OT: "Other",
    // PD: "Plan Drawing (Plot Plan, Layout, etc.)",
    // PI: "P&ID",
    // RE: "Report",
    // SL: "Symbol & Legend",
    // SP: "Specification (Basic Design, Description)",
    // TD: "Typical Drawing",
    //QA / QC
    // SP: "Specification",
    // PL: "Plan",
    // PR: "Procedure",
    // MA: "Manual",
    // SC: "Schedule",
    // OT: "Other",
};
// LNG 관련
const doc_chars = {
    // Document Characteristic
    "01": "Layout/Arrangement Drawing & Plot Planp",
    "02": "Prospective Drawing",
    "03": "Side View",
    "04": "Longitudinal Section",
    "05": "Cross Section View",
    "06": "Sectional Drawing",
    "07": "Elevation Drawing",
    "08": "Longitudinal & Plan Drawing",
    "09": "Plan Drawing",
    "10": "Outline Drawing",
    "11": "Structural Drawing",
    "12": "Window Drawing",
    "13": "Development Drawing",
    "14": "Re-bar Drawing",
    "15": "Piping Drawing",
    "16": "Detail Drawing",
    "17": "Installation Drawing",
    "18": "Design Drawing",
    "19": "Assembly Drawing",
    "20": "Fabrication Drawing",
    "21": "Name Plate Drawing",
    "22": "Partial Assembly Drawing",
    "23": "System Diagram",
    "24": "One/Three Line Diagram",
    "25": "Wiring Diagram",
    "26": "Connection Diagram",
    "27": "Internal & Back Wiring Diagram",
    "28": "Sequence/Elementary/Schematic Diagram",
    "29": "Logic Diagram",
    "30": "Block Diagram",
    "31": "Flow Diagram",
    "32": "P&I Diagram",
    "33": "Other Drawing",
    "34": "ISO Matrix",
    "35": "Legend, Drawing List",
    "36": "Relief & Land Registration map",
    "37": "Original Drawing & Viewer Drawing",
    BM: "Bills of Material",
    CA: "Calculation Sheet",
    DA: "Data Sheet",
    DO: "General Document",
    ES: "EPC Statement",
    GU: "Guide(or Manual)",
    PH: "Philosophy",
    PR: "Procedure",
    SU: "Summary",
    SP: "Material/Construction Spec.",
    RE: "Study/Review Report",
};
const cop = "L";
const po_symbol = {
    // discipline code for LNG project
    R: "Rotating",
    S: "Stationary",
    P: "Piping",
    E: "Electrical",
    I: "Instrument & Control",
    H: "HVAC",
    F: "Fire Fighting",
    G: "General",
};

export const get_file_info = (docu_code: string, project_code: string) => {
    let code_split = docu_code.split("-");
    let discipline_code = "";
    let cate_code = "";
    let discipline = undefined;
    let category = undefined;
    let new_docu_code = "";
    let docu_subject = "";
    if (project_code == "Power Plant") {
        // 발전소 Numbering (예시: VP-TEP-S0001-ST-CA-0001)
        // code_split[0] : VP
        // code_split[1] : TEP
        // code_split[2] : S0001 (Item 번호)
        // code_split[3] : ST (분야 코드)
        // code_split[4] : CA (도서/도면 유형 코드)
        // code_split[5] : 0001 (일련번호)

        // Item 번호 확인
        // if (!item_types[code_split[2][0]]) return;
        discipline_code = code_split[2][0];
        discipline = item_types[discipline_code];
        if (!discipline) return;
        let item_number = format_serial_number(4, code_split[2].slice(1, code_split[2].length));
        if (!item_number) return;
        code_split[2] = code_split[2][0] + item_number;
        // 분야 코드 내용 불러오기
        // discipline_code = code_split[3];
        // discipline = disp_codes[discipline_code];
        // if (!discipline) return;
        cate_code = code_split[3];
        category = disp_codes[cate_code];
        if (!category) return;
        // 도서/도면 유형 코드 불러오기
        // cate_code = code_split[4];
        // category = doc_drawing_codes[cate_code];
        // if (!category) return;
        docu_subject = doc_drawing_codes[code_split[4]];
        if (!docu_subject) return;
        // 일련번호 확인
        code_split[5] = format_serial_number(4, code_split[5]);
        if (!code_split[5]) return;
    } else if (project_code == "LNG Tank") {
        // LNG Numbering (예시: VP-TEP-E-0005-25-0001-L-(001))
        // code_split[0] : VP
        // code_split[1] : TEP
        // code_split[2] : E (PO Symbol)
        // code_split[3] : 0005 (PO Symbol)
        // code_split[4] : 25 (Document Characteristic)
        // code_split[5] : 0001 (Serial number)
        // code_split[6] : L
        // (optional) code_split[7] : 001 (Sub-serial number)

        // PO Symbol 확인
        discipline_code = code_split[2][0];
        discipline = po_symbol[discipline_code];
        if (!discipline) return;
        // 일련번호 확인
        code_split[3] = format_serial_number(4, code_split[3]);
        if (!code_split[3]) return;
        // Document Characteristic 확인
        cate_code = code_split[4];
        category = doc_chars[cate_code];
        if (!category) return;
        // 일련번호 확인
        code_split[5] = format_serial_number(4, code_split[5]);
        if (!code_split[5]) return;
        // if (code_split.length == 7) {
        //     code_split[6] = format_serial_number(3, code_split[6]);
        //     if (!code_split[6]) return;
        // }
        docu_subject = category;
    }
    new_docu_code = code_split.join("-");
    return {
        discipline_code: discipline_code,
        discipline: discipline,
        cate_code: cate_code,
        category: category,
        docu_code: new_docu_code,
        docu_subject: docu_subject,
    };
};

export const get_vp_document_number = (filename: string) => {
    let pp_regex = /(VP-TEP-\w\d+-\w\w-\w\w-\d+)/g; // 발전소 Numbering (예시: VP-TEP-S0001-ST-CA-0001) // project_code = 'Power Plant'
    let lng_regex_list = [
        // project_code = 'LNG Tank'
        /(VP-TEP-\w-\d+-\w\w-\d+-L)/g, // LNG Numbering (예시: VP-TEP-E-0005-25-0001-L)
        /(VP-TEP-\w-\d+-\w\w-\d+-L-\d+)/g, // LNG Numbering (예시: VP-TEP-E-0005-25-0001-L-001)
    ];
    let result = null;
    let docu_code = "";
    let project_code = "";

    // 대소문자구분, 0 개수체크, 띄어쓰기 정도는 알아서 수행
    let name = replaceAll(filename, " ", ""); // document number 사이의 띄어쓰기 제거
    name = name.toUpperCase(); // 소문자가 있는 경우 전부 대문자로 변환

    result = pp_regex.exec(name);
    if (result && result.length > 0) {
        docu_code = result[0].replace("_", "");
        project_code = "Power Plant";
    }
    for (var regex of lng_regex_list) {
        result = regex.exec(name);
        if (result && result.length > 0) {
            docu_code = result[0].replace("_", "");
            project_code = "LNG Tank";
        }
    }

    return { docu_code: docu_code, project_code: project_code };
};

export const format_serial_number = (leng, serial: string) => {
    // possible accepting cases
    // 1. exactly right (serial.length == 4)
    // 2. fixable
    //  - serial.length < 4 : pad zeros
    //  - serial.length > 4 && code_split[0:len-4] are all 0s
    if (serial.length <= leng) {
        return fillZero(leng, serial);
    } else if (serial.slice(0, serial.length - leng) == fillZero(serial.length - leng, "")) {
        return serial.slice(-leng);
    }
};

// filename ex) VP-TEP-S0001-ST-CA-0001_Strength Calculation Sheet_R0_Code2.pdf
export const MakeVP = async (
    filename: string,
    user: EdmsUser | { user_id: number; username: string },
    vpisData?: { docuTitle: string; planDate: Date; actualDate: Date }
) => {
    let madeDocu: EdmsDocument = undefined;
    if (vpisData) {
        if (!moment(vpisData.planDate).isValid()) {
            vpisData.planDate = new Date();
        }
        if (!moment(vpisData.actualDate).isValid()) {
            vpisData.actualDate = new Date();
        }
    }
    try {
        filename = filename.replace(/\s/g, "");
        let { docu_code, project_code } = get_vp_document_number(filename);
        if (docu_code == "") {
            // 에러 처리. 파일 제목에 document code를 찾을 수 없거나 포맷이 잘못되어 있음
            logger.log("error", "MAKE VP :: docu_code is null ");
            return;
        }
        let isProject = await getRepository(EdmsProjectType).findOne({ project_code: project_code }); // need
        if (isProject) {
            let file_info = get_file_info(docu_code, project_code);
            if (!file_info) {
                // 에러 처리. document code의 구분 코드가 잘못되어 있거나 시리얼 넘버가 overflow됨
                logger.log("error", "MAKE VP :: file_info is null ");
                return;
            }
            docu_code = file_info.docu_code;
            // checking exist document
            madeDocu = await getRepository(EdmsDocument).findOne({ docu_code: docu_code });
            if (!madeDocu) {
                // create discipline
                let discipline = await getRepository(EdmsDiscipline).findOne({
                    project_no: isProject.project_no,
                    code: file_info.discipline_code,
                    is_vp: 1,
                });
                if (!discipline) {
                    discipline = new EdmsDiscipline();
                    discipline.project_no = isProject.project_no;
                    discipline.code = file_info.discipline_code;
                    discipline.name = file_info.discipline;
                    discipline.is_vp = 1;
                    discipline.create_by = user.username;

                    discipline = await getRepository(EdmsDiscipline).save(discipline);
                }

                // create category
                let category = await getRepository(EdmsCategory).findOne({
                    project_no: isProject.project_no,
                    cate_code: file_info.cate_code,
                    discipline_id: discipline.id,
                    is_vp: 1,
                });
                if (!category) {
                    category = new EdmsCategory();
                    category.project_no = isProject.project_no;
                    category.p_project_no = 1;
                    category.cate_code = file_info.cate_code;
                    category.cate_name = file_info.category;
                    category.discipline_id = discipline.id;
                    category.is_vp = 1;
                    category.create_by = user.username;

                    category.is_root = false;
                    category.pm_id = 1;
                    category.pcate_no = 0;
                    category.explan = "";
                    category.status = "0";
                    category.is_approval = true;

                    category = await getRepository(EdmsCategory).save(category);
                }
                // create document
                madeDocu = new EdmsDocument();
                madeDocu.project_no = isProject.project_no;
                madeDocu.cate_no = category.cate_no;
                madeDocu.docu_code = docu_code;
                madeDocu.docu_subject = file_info.docu_subject;
                madeDocu.process_code = "B";
                madeDocu.create_tm = new Date();
                madeDocu.area_id = -1; // -1 고정
                madeDocu.is_vp = 1;
                madeDocu.create_by = user.username;
                madeDocu.user_id = user.user_id;
                madeDocu.docu_type = "001";
                madeDocu.explan = "";
                madeDocu.status = "";
                madeDocu.revision = 0;
                if (vpisData) {
                    madeDocu.docu_subject = vpisData.docuTitle;
                    madeDocu.plan_submit_dt = vpisData.planDate;
                    madeDocu.real_submit_dt = vpisData.actualDate;
                }

                madeDocu = await getRepository(EdmsDocument).save(madeDocu);
                let stage_type = await getRepository(EdmsStageType).find({
                    where: { is_use: 1 },
                });
                for (var stage of stage_type) {
                    let new_stage = new EdmsStage();
                    new_stage.create_by = user.username;
                    new_stage.create_tm = new Date();
                    new_stage.is_use = 1;
                    new_stage.plan_dt = new Date();
                    new_stage.actual_dt = new Date();
                    new_stage.status = "001";
                    new_stage.stage_code = stage.stage_name;
                    new_stage.revision = 0;
                    new_stage.stage_type = stage.is_type == true ? "i" : "";
                    new_stage.actual_rate = 0;
                    new_stage.forecast_dt = null;
                    new_stage.docu_no = madeDocu.docu_no;
                    new_stage.file_no = 0;
                    await getRepository(EdmsStage).save(new_stage);

                    if (stage.is_type) {
                        let new_stage_a = new EdmsStage();
                        new_stage_a.create_by = user.username;
                        new_stage_a.create_tm = new Date();
                        new_stage_a.is_use = 1;
                        new_stage_a.plan_dt = new Date();
                        new_stage_a.actual_dt = new Date();
                        new_stage_a.status = "001";
                        new_stage_a.stage_code = stage.stage_name;
                        new_stage_a.revision = 0;
                        new_stage_a.stage_type = "a";
                        new_stage_a.actual_rate = 0;
                        new_stage_a.forecast_dt = null;
                        new_stage_a.docu_no = madeDocu.docu_no;
                        new_stage_a.file_no = 0;
                        await getRepository(EdmsStage).save(new_stage_a);
                    }
                }
            } else {
                logger.log("error", "MAKE VP :: exist document err");
                console.log(vpisData.planDate, vpisData.actualDate);
                if (vpisData) {
                    await getConnection()
                        .createQueryBuilder()
                        .update(EdmsDocument)
                        .set({
                            docu_subject: vpisData.docuTitle,
                            plan_submit_dt: vpisData.planDate,
                            real_submit_dt: vpisData.actualDate,
                            modify_tm: new Date(),
                        })
                        .where("docu_no = :id", { id: madeDocu.docu_no })
                        .execute();
                }
            }
        }
    } catch (err) {
        logger.log("error", "MAKE VP :: undefined err : ", err);
        return undefined;
    } finally {
        return madeDocu;
    }
};
