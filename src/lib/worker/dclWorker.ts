/******************************************************************************
 * entity : EdmsOtherFiles
 * EdmsProjectType, EdmsDiscipline, EdmsCategory, EdmsDocument, EdmsFiles
 * EdmsOtherFiles
 * DCL, V/P, ETC Data preload
 *
 ******************************************************************************/
import "../../env";
import "../../global";
import { parentPort, workerData, isMainThread } from "worker_threads";
import { getConnection, getRepository } from "typeorm";
import moment from "moment";
import { EdmsArea } from "../../entity/EdmsArea";
import Database from "../simpleDatabase";
import Queries from "./query/dclQueries";
import { EdmsProjectType } from "../../entity/EdmsProjectType";
import { generateVPTree } from "../generateVPTree";

const database = new Database(process.env.TYPEORM_DATABASE);
const isLive = process.env.NODE_ENV == "live";

const getDclQuery = isLive ? Queries.getDclReal : Queries.getDcl;
const getDclFilesQuery = isLive ? Queries.getDclFilesReal : Queries.getDclFiles;
const getOtherFilesQuery = isLive ? Queries.getOtherFilesReal : Queries.getOtherFiles;
const getOtherFilesExtQuery = isLive ? Queries.getOtherFilesExtReal : Queries.getOtherFilesExt;
const getDclFilesExtQuery = isLive ? Queries.getDclFilesExtReal : Queries.getDclFilesExt;
const getPlantFilesQuery = isLive ? Queries.getPlantFilesReal : Queries.getPlantFiles;

const getDateValue = (time: any, format?: string) => {
    return time ? moment(time).format(format ? format : "YYYY-MM-DD HH:mm") : null;
};
const vpisOtherFolderKey = "other";

async function getData() {
    const vpTree = generateVPTree();
    const globalWorkerObj = {
        dclWorkerInstance: null,
        dclWorkResult: {},
        vpWorkResult: {},
        workExtResult: {},
        otherWorkResult: { list: [], ext: [] },
        plantWorkResult: {},
        vpPlantFolderResult: vpTree.plant,
        vpLngFolderResult: vpTree.lng,
    };
    const conn = await database.getConnection();
    await conn.transaction(async tr => {
        // dcl datas
        let dclDatas = await tr.query(getDclQuery);
        let files = await tr.query(getDclFilesQuery);
        let areas = await getRepository(EdmsArea).find({ is_use: 1 });
        for (var data of dclDatas) {
            const project_no = data.project_no;
            let is_vp = data.is_vp == 1;
            let file = files.find(raw => raw.docu_no == data.docu_no);
            let area = areas.find(raw => raw.id == data.area_id);
            let existIdx = -1;
            let code: string = data.docu_code;

            if (is_vp && ( project_no == 1 || project_no == 42)) {
                for (var [key, value] of Object.entries(globalWorkerObj.vpPlantFolderResult)) {
                    for (var [_key, _value] of Object.entries(value)) {
                        if (_value.find(raw => raw == code)) {
                            Object.assign(data, { folder: [key, _key] });
                            break;
                        }
                    }
                }
                if (data.folder == undefined) Object.assign(data, { folder: [vpisOtherFolderKey] });
            } else if (is_vp && ( project_no == 2 || project_no == 43)) {
                for (var [key, value] of Object.entries(globalWorkerObj.vpLngFolderResult)) {
                    for (var [_key, _value] of Object.entries(value)) {
                        if (_value.find(raw => raw == code)) {
                            Object.assign(data, { folder: [key, _key] });
                            break;
                        }
                    }
                    if (data.folder == undefined) Object.assign(data, { folder: [vpisOtherFolderKey] });
                }
            }
            // 이미 처리한 데이터의 경우 덮어쓰기만 한다.
            if (is_vp) {
                let res = globalWorkerObj.vpWorkResult[project_no];
                existIdx = res ? res.findIndex(raw => raw.docu_no === data.docu_no) : -1;
                if (existIdx != -1) {
                    Object.assign(res[existIdx], {
                        [data.planKey]: data.plan_dt
                            ? getDateValue(data.plan_dt, "YYYY-MM-DD")
                            : res[existIdx][data.planKey]
                            ? res[existIdx][data.planKey]
                            : "",
                        [data.foreKey]: data.forecast_dt
                            ? getDateValue(data.forecast_dt, "YYYY-MM-DD")
                            : res[existIdx][data.foreKey]
                            ? res[existIdx][data.foreKey]
                            : "",
                        [data.actKey]: data.actual_dt
                            ? getDateValue(data.actual_dt, "YYYY-MM-DD")
                            : res[existIdx][data.actKey]
                            ? res[existIdx][data.actKey]
                            : "",
                    });
                }
            } else {
                let res = globalWorkerObj.dclWorkResult[project_no];
                existIdx = res ? res.findIndex(raw => raw.docu_no === data.docu_no) : -1;
                if (existIdx != -1) {
                    Object.assign(res[existIdx], {
                        [data.planKey]: data.plan_dt
                            ? getDateValue(data.plan_dt, "YYYY-MM-DD")
                            : res[existIdx][data.planKey]
                            ? res[existIdx][data.planKey]
                            : "",
                        [data.foreKey]: data.forecast_dt
                            ? getDateValue(data.forecast_dt, "YYYY-MM-DD")
                            : res[existIdx][data.foreKey]
                            ? res[existIdx][data.foreKey]
                            : "",
                        [data.actKey]: data.actual_dt
                            ? getDateValue(data.actual_dt, "YYYY-MM-DD")
                            : res[existIdx][data.actKey]
                            ? res[existIdx][data.actKey]
                            : "",
                    });
                }
            }
            //
            if (existIdx === -1) {
                Object.assign(data, {
                    [data.planKey]: data.plan_dt ? getDateValue(data.plan_dt, "YYYY-MM-DD") : "",
                    [data.foreKey]: data.forecast_dt ? getDateValue(data.forecast_dt, "YYYY-MM-DD") : "",
                    [data.actKey]: data.actual_dt ? getDateValue(data.actual_dt, "YYYY-MM-DD") : "",
                });
                if (file) {
                    Object.assign(data, {
                        stage_code: file.stage_code,
                        revision: file.revision,
                        file_type: file.file_type,
                        file_name: file.file_name,
                        repo_path: file.repo_path,
                        file_code: file.file_code,
                        create_by: file.create_by,
                        file_no: file.file_no,
                        file_ext: file.file_ext,
                    });
                } else {
                    Object.assign(data, {
                        stage_code: "Start",
                        revision: "미접수",
                        file_name: "파일 없음.",
                        repo_path: "",
                        file_no: -1,
                    });
                }
                if (area) {
                    Object.assign(data, {
                        area: area.name,
                    });
                }

                if (is_vp) {
                    if (globalWorkerObj.vpWorkResult[project_no]) {
                        globalWorkerObj.vpWorkResult[project_no].push(data);
                    } else {
                        Object.assign(globalWorkerObj.vpWorkResult, { [project_no]: [data] });
                    }
                } else {
                    if (globalWorkerObj.dclWorkResult[project_no]) {
                        globalWorkerObj.dclWorkResult[project_no].push(data);
                    } else {
                        Object.assign(globalWorkerObj.dclWorkResult, { [project_no]: [data] });
                    }
                }
            }
        }
        // DCL File Ext
        let projects = await tr.getRepository(EdmsProjectType).find();
        for (var p of projects) {
            let ext = await tr.query(getDclFilesExtQuery.replace("@project_no", p.project_no.toString()));
            let dcl = ext.filter(raw => raw.is_vp == 0).map(e => ({ file_ext: e.file_ext }));
            let vp = ext.filter(raw => raw.is_vp == 1).map(e => ({ file_ext: e.file_ext }));
            Object.assign(globalWorkerObj.workExtResult, { [p.project_no]: { dcl: dcl, vp: vp } });
        }
        // EdmsOtherFiles
        globalWorkerObj.otherWorkResult.list = await tr.query(getOtherFilesQuery);
        globalWorkerObj.otherWorkResult.ext = await tr.query(getOtherFilesExtQuery);
        // EdmsPlantFiles
        let plantFiles = await tr.query(getPlantFilesQuery);
        for (var file of plantFiles) {
            if (globalWorkerObj.plantWorkResult[file.project_no]) {
                globalWorkerObj.plantWorkResult[file.project_no].push(file);
            } else {
                Object.assign(globalWorkerObj.plantWorkResult, { [file.project_no]: [file] });
            }
        }
    });
    console.log("!!DCL WORKER GET_DCL_LIST END!!");
    return globalWorkerObj;
}

if (!isMainThread && parentPort) {
    console.log("!!DCL WORKER GET_DCL_LIST START!!");
    getData().then(val => {
        parentPort.postMessage(val);
    });

    setInterval(() => {
        getData().then(val => {
            parentPort.postMessage(val);
        });
    }, 1000 * 60 * 10);

    parentPort.on("message", (msg: string) => {
        if (msg == "refresh") {
            getData().then(val => {
                parentPort.postMessage(val);
            });
        }
    });
}
