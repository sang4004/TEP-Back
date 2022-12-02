/* ------------------------------------------------------------------- */
// EX)
/*
{
  plant: {
    'E-0001': [ [Object] ],
    'E-0002': [ [Object] ],
    'E-0003': [ [Object] ],
    'E-0004': [ [Object] ],
    'E-0005': [ [Object] ],
    'E-0009': [ [Object] ],
    'E-0011': [ [Object] ],
    'E-0013': [ [Object] ],
    'E-0014': [ [Object] ],
    'E-0015': [ [Object] ],
    'E-0016': [ [Object] ],
    'F-0001': [ [Object] ],
    'H-0001': [ [Object] ],
    'I-0001': [ [Object] ],
    'I-0002': [ [Object] ],
    'I-0006': [ [Object] ],
    'I-0013': [ [Object] ],
    'I-0014': [ [Object] ],
    'I-0016': [ [Object] ],
    'I-0018': [ [Object] ],
    'I-0019': [ [Object] ],
    'I-0020': [ [Object] ],
    'I-0021': [ [Object] ],
    'I-0022': [ [Object] ],
    'I-0023': [ [Object] ],
    'I-0024': [ [Object] ],
    'I-0025': [ [Object] ],
    'I-0027': [ [Object] ],
    'I-0028': [ [Object] ],
    'I-0029': [ [Object] ],
    'I-0030': [ [Object] ],
    'P-0001-P-01': [ [Object] ],
    'P-0002': [ [Object] ],
    'P-0003': [ [Object] ],
    'P-0004': [ [Object] ],
    'P-0005': [ [Object] ],
    'P-0006': [ [Object] ],
    'P-0007': [ [Object] ],
    'P-0007-P-02': [ [Object] ],
    'P-0009': [ [Object] ],
    'P-0011': [ [Object] ],
    'P-0012': [ [Object] ],
    'P-0013': [ [Object] ],
    'P-0014': [ [Object] ],
    'P-0015': [ [Object] ],
    'P-0016': [ [Object] ],
    'P-0017': [ [Object] ],
    'P-0019': [ [Object] ],
    'P-0022': [ [Object] ],
    'P-0025': [ [Object] ],
    'P-0028': [ [Object] ],
    'P-0030': [ [Object] ],
    'R-0002': [ [Object] ],
    'R-0003': [ [Object] ],
    'R-0004': [ [Object] ],
    'R-0005': [ [Object] ],
    'R-0006': [ [Object] ],
    'R-0007': [ [Object] ],
    'R-0008': [ [Object] ],
    'R-0009(CHANGED)': [ [Object] ],
    'R-0010(CHANGED)': [ [Object] ],
    'R-0011': [ [Object] ],
    'R-0012': [ [Object] ],
    'R-0013': [ [Object] ],
    'R-0014': [ [Object] ],
    'S-0001': [ [Object] ],
    'S-0002': [ [Object] ],
    'S-0003': [ [Object] ],
    'S-0004': [ [Object] ],
    'S-0005': [ [Object] ],
    'S-0006': [ [Object] ],
    'S-0007': [ [Object] ],
    'S-0008': [ [Object] ],
    'S-0009': [ [Object] ],
    'S-0011': [ [Object] ]
  },
  lng: {
    HVAC: [ [Object] ],
    '계장': [
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object]
    ],
    '배관': [
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object]
    ],
    '소방': [ [Object] ],
    '전기': [
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object]
    ],
    '철근': [ [Object] ]
  }
}
*/
/* ------------------------------------------------------------------- */
import path from "path";
import moment from "moment";
import XLSX from "xlsx";

import { CallDirTree, DirResultType } from "./pathutil";
const isLive = process.env.NODE_ENV == "live";

const PLAN_DATE_POSITION = {
    "POWER PLANT": 7,
    "LNG TANK": 6,
};
const VPIS_DISCIPLINE = {
    R: "HVAC, 기계",
    S: "장치",
    P: "소방, 배관",
    E: "전기",
    I: "계장",
    H: "HVAC, 기계",
    F: "소방, 배관",
    G: "General",
};

const getVPISExcelData = (excelDatas: any[], projectCode: string) => {
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

const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

const GetExcelFileData = (file: any): any[] => {
    try {
        if (
            file.mimetype.indexOf("xls") != -1 ||
            file.mimetype.indexOf("xml") != -1 ||
            file.mimetype.indexOf("excel") != -1 ||
            file.mimetype.indexOf("XLS") != -1
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
        console.error(err);
    }
    return null;
};

const PLANT_FOLDERS = [
    { key: "E-0000", val: "E" },
    { key: "F-0000", val: "F" },
    { key: "H-0000", val: "H" },
    { key: "I-0000", val: "I" },
    { key: "P-0000", val: "P" },
    { key: "R-0000", val: "R" },
    { key: "S-0000", val: "S" },
];

const findNameOfEquipment = (exData: any) => {
    let nameofequipment = "";
    if (exData && exData.length > 0) {
        exData[0].data.map(excelData => {
            let name = excelData.find(d => d && d.indexOf && d.indexOf("NAME OF EQUIPMENT") != -1);
            if (name)
                nameofequipment = name
                    .replace(/NAME OF EQUIPMENT/gi, "")
                    .replace(/NAME OF EQUIPMENT /gi, "")
                    .replace(": ", "")
                    .replace(" :", "")
                    .replace(":", "")
                    .replace(" ", "");
        });
    }
    return nameofequipment;
};

const findVPISDocuments = (exData: any, isPlant: boolean) => {
    let documents = [];
    if (exData && exData.length > 0) {
        documents = getVPISExcelData(exData, isPlant ? "POWER PLANT" : "LNG TANK");
    }
    return documents;
};

const makePlant = (tree: any) => {
    let plant = {};

    for (var p of PLANT_FOLDERS) {
        plant[VPIS_DISCIPLINE[p.val]] = {};
    }

    for (var key of Object.keys(tree.plant)) {
        // key[0] : "E"
        // tree.plant[key] : [Object(name,documents)]
        // tree.plant[key][0] : 플랜트는 하나뿐임
        // tree.plant[key][0].name : Name Of Equipment
        plant[VPIS_DISCIPLINE[key[0]]][key + "\n" + tree.plant[key][0].name] = tree.plant[key][0].documents.map(
            docu => docu.doc_no
        );
    }


    return plant;
};

const makeLNG = (tree: any) => {
    let lng = {};
    for (var key of Object.keys(tree.lng)) {
        lng[key] = {};
        tree.lng[key].map(data => {
            if (data.name != "") {
                lng[key][data.name] = data.documents.map(docu => docu.doc_no);
            } else if (lng[key]["other"]) {
                lng[key]["other"].push(data.documents.map(docu => docu.doc_no));
            } else {
                lng[key]["other"] = [...data.documents.map(docu => docu.doc_no)];
            }
        });
    }
    return lng;
};

export const generateVPTree = (): { plant: any; lng: any } => {
    var vpisTree: DirResultType[] = [];
    var tree = { plant: {}, lng: {} };
    const _path = path.resolve(__dirname, "../../VPIS");
    CallDirTree(_path, vpisTree);

    vpisTree.map((raw, idx) => {
        let isPlant = true;
        let isPlantFolder = raw.folder.indexOf(isLive ? "Plant" : "Plant/") != -1;
        let isLNGFolder = raw.folder.indexOf(isLive ? "LNG" : "LNG/") != -1;
        if (isPlantFolder) {
        } else if (isLNGFolder) {
            isPlant = false;
        }
        if (isPlantFolder || isLNGFolder) {
            raw.items.map((file, idx) => {
                const ext = getFileExtension(file);
                if (ext == "xls" || ext == "xlsx" || ext == "XLS") {
                    let key = isPlant ? "plant" : "lng";
                    // console.log(key, file, fs.existsSync(file));
                    let splited = file.split(isLive ? "\\" : "/");
                    // let filename = splited[splited.length - 1];
                    let folder = splited[splited.length - 2];
                    let pathIdx = 0;
                    for (var i = splited.length; i >= 0; i--) {
                        pathIdx = i;
                        if (splited[i] == "VPIS") break;
                    }
                    let exData = GetExcelFileData({
                        mimetype: ext,
                        path: splited.slice(pathIdx, splited.length).join("/"),
                    });
                    let name = "",
                        documents = [];
                    if (exData) {
                        name = findNameOfEquipment(exData);
                        documents = findVPISDocuments(exData[0].data, isPlant);
                    }
                    if (Array.isArray(tree[key][folder])) {
                        tree[key][folder].push({ name: name, documents: documents });
                    } else {
                        tree[key][folder] = [{ name: name, documents: documents }];
                    }
                }
            });
        }
    });
    // console.log(tree, vpisTree.length);
    // console.log(tree["lng"]["전기"][0]);
    // 데이터 가공
    // 발전소의 경우
    let plant = {};
    let lng = {};
    plant = makePlant(tree);
    // LNG 탱크의 경우
    // lng = makeLNG(tree)
    lng = makeLNG(tree);
    return { plant: plant, lng: lng };
};
