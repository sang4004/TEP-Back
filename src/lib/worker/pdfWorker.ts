/******************************************************************************
 * edms_files, edms_other_files 데이터를 pdf 로 변환 후 streamDocs 에 등록하는 워커
 * PdfData, OtherPdfData 에 등록한다.
 * 매 10초마다 검사하며, 최대 10개씩 묶어서 처리함 ( 병렬처리 )
 *
 ******************************************************************************/
import "../../env";
import "../../global";
import { parentPort, workerData, isMainThread } from "worker_threads";
import fs from "fs";
import { getConnection, getRepository } from "typeorm";
import axios from "axios";
import { workerNamespace as NS } from "Worker";
import { EdmsFiles } from "../../entity/EdmsFiles";
import { PDFData } from "../../entity/PdfData";
import { OtherPDFData } from "../../entity/OtherPdfData";
import { EdmsOtherFiles } from "../../entity/EdmsOtherFiles";
import Database from "../simpleDatabase";
import Query from "./query/pdfQueries";

const database = new Database(process.env.TYPEORM_DATABASE);
const fileOrigin = process.env.PDF_SERVER_URL;
const pdfCallbackUri = `${fileOrigin}/api/v1/${globalThis.PDF_GATEWAY_CALLBACK}`;
const pdfURI = process.env.PDF_GATEWAY_HOST;
const taskBuildURI = `${pdfURI}/pdf-gateway/api/task/build`;
const PDF_STREAMDOCS_HOST = process.env.PDF_STREAMDOCS_HOST;
const PDF_STREAMDOCS_REGIST_API = `${PDF_STREAMDOCS_HOST}/streamdocs/v4/documents/external-resources`;

interface taskBuildType {
    file_no: number;
    oid: string;
}

interface registExtraResponseType {
    file_no: number;
    sid: string;
}

async function RegistStreamDocs(cb: NS.PdfGatewayCallbackParams) {
    const conn = await database.getConnection();
    console.log("RegistStreamDocs START");
    if (cb.status == "SUCCESS" && cb.oid) {
        let pdfData = await conn
            .getRepository(cb.pdfType == "default" ? PDFData : OtherPDFData)
            .findOne({ oid: cb.oid });
        let isExist = fs.existsSync(decodeURIComponent(cb.outputUri).replace("file:/", ""));
        if (pdfData && isExist) {
            let body = {
                externalResource: cb.outputUri,
            };
            const opt = {
                headers: { "Content-Type": "application/json" },
            };
            let res = await axios.post(PDF_STREAMDOCS_REGIST_API, body, opt);
            console.log(res.data.streamdocsId);
            let data: NS.PdfRegistResponse = res.data;
            if (data.streamdocsId) {
                await conn
                    .createQueryBuilder()
                    .update(cb.pdfType == "default" ? PDFData : OtherPDFData)
                    .set({ sid: data.streamdocsId })
                    .where("id=:id", { id: pdfData.id })
                    .execute();

                return { sid: data.streamdocsId, file_no: pdfData.file_no };
            }
        }
    }
    return { sid: null, file_no: null };
}

async function genPdfData(file_no: number, repo_path: string, oid: string, type: NS.pdfType = "default") {
    const conn = await database.getConnection();
    let pdfData = type == "default" ? new PDFData() : new OtherPDFData();
    pdfData.file_no = file_no;
    pdfData.repo_path = repo_path;
    pdfData.oid = oid;
    pdfData.data = "data";
    pdfData.sid = "";
    await conn.getRepository(type == "default" ? PDFData : OtherPDFData).save(pdfData);
}

async function taskBuild(file: EdmsFiles | EdmsOtherFiles, type: NS.pdfType = "default"): Promise<taskBuildType> {
    try {
        let _repoPath = file.repo_path.split(".");
        let ext = _repoPath.pop(); // extension 버리기
        let output = _repoPath.join(".") + ".pdf";
        // 이미 PDF일경우 변환 건너뛰기
        if (ext.indexOf("zip") == -1 || ext.indexOf("msg") == -1) {
            let fakeOid = file.file_no + "_sid";
            try {
                await genPdfData(file.file_no, file.repo_path, fakeOid, type);
                const val = await RegistStreamDocs({
                    oid: fakeOid,
                    completedAt: 0,
                    createdAt: 0,
                    id: "id",
                    inputFileLength: 10,
                    inputUri: "",
                    name: file.repo_path,
                    outputFileLength: 0,
                    outputUri: `file:/${globalThis.PDF_HOME_PATH}/${encodeURI(file.repo_path)}`,
                    pdfType: type,
                    queuedAt: 0,
                    startedAt: 0,
                    status: "SUCCESS",
                    updatedAt: 0,
                });
                parentPort.postMessage({ ...val, type: "registSD" });
            } catch (err) {}
            return { file_no: file.file_no, oid: fakeOid };
        }
        //
        const data = {
            inputUri: `file:/${globalThis.PDF_HOME_PATH}/${encodeURI(file.repo_path)}`,
            outputUri: `file:/${globalThis.PDF_HOME_PATH}/${encodeURI(output)}`,
            taskName: file.repo_path,
            callbackUri: pdfCallbackUri + "/" + type,
        };
        const opt = {
            headers: { "Content-Type": "application/json" },
        };

        let res = await axios.post(taskBuildURI, data, opt);
        if (res.status == 200 && res.data.oid) {
            console.log("REGISTED!");
            await genPdfData(file.file_no, file.repo_path, res.data.oid, type);

            return { file_no: file.file_no, oid: res.data.oid };
        } else {
            await genPdfData(file.file_no, file.repo_path, "", type);
        }
    } catch (e) {
        // console.log(e);
        await genPdfData(file.file_no, file.repo_path, "", type);
    }
}

async function registPdf(): Promise<taskBuildType[]> {
    const conn = await database.getConnection();
    const isLive = process.env.NODE_ENV == "live";
    const waitFiles = await conn.query(isLive ? Query.waitFileQueryReal : Query.waitFileQuery);
    const waitOtherFiles = await conn.query(isLive ? Query.waitOtherFileQueryReal : Query.waitOtherFileQuery);
    let tasks = [];
    for (var file of waitFiles) {
        console.log("TASK BUILD!! : ", file.file_no);
        let task = await taskBuild(file);
        tasks.push(task);
    }
    for (var ofile of waitOtherFiles) {
        console.log("TASK BUILD OTHER!! : ", ofile.file_no);
        let task = await taskBuild(ofile, "other");
        tasks.push(task);
    }

    return tasks;
}

//#region extra
async function registExtra() {
    const conn = await database.getConnection();
    const isLive = process.env.NODE_ENV == "live";
    const convertedFiles = await conn.query(isLive ? Query.convertedFileQueryReal : Query.convertedFileQuery);
    const convertedOtherFiles = await conn.query(isLive ? Query.waitOtherFileQueryReal : Query.waitOtherFileQuery);
    let tasks: registExtraResponseType[] = [];
    let otherTasks: registExtraResponseType[] = [];
    for (var file of convertedFiles) {
        console.log("Regist Extra!! : ", file.file_no);
        let task = await RegistExtraStreamDocs(file);
        tasks.push(task);
    }
    for (var ofile of convertedOtherFiles) {
        console.log("Regist Extra OTHER!! : ", ofile.file_no);
        let task = await RegistExtraStreamDocs(ofile, "other");
        otherTasks.push(task);
    }
    // update create_tm
    await conn
        .createQueryBuilder()
        .update(PDFData)
        .set({ create_tm: new Date() })
        .where("file_no IN (:nos)", { nos: tasks.map(raw => raw.file_no) })
        .execute();
    await conn
        .createQueryBuilder()
        .update(OtherPDFData)
        .set({ create_tm: new Date() })
        .where("file_no IN (:nos)", { nos: otherTasks.map(raw => raw.file_no) })
        .execute();
}

async function RegistExtraStreamDocs(
    pdfData: PDFData | OtherPDFData,
    pdfType: NS.pdfType = "default"
): Promise<registExtraResponseType> {
    let _repoPath = pdfData.repo_path.split(".");
    _repoPath.pop(); // extension 버리기
    let output = _repoPath.join(".") + ".pdf";
    let isExist = fs.existsSync(output);
    const conn = await database.getConnection();
    console.log("RegistExtraStreamDocs START");
    if (pdfData && pdfData.oid && isExist) {
        let externalResource = `file:/${globalThis.PDF_HOME_PATH}/${encodeURI(output)}`;
        if (output.indexOf("hdc_backend") != -1 || output.indexOf("DocuResult") != -1) {
            externalResource = `file:/${encodeURI(output)}`;
        }
        let body = {
            externalResource: externalResource,
        };
        const opt = {
            headers: { "Content-Type": "application/json" },
        };
        let res = await axios.post(PDF_STREAMDOCS_REGIST_API, body, opt);
        console.log(res.data.streamdocsId);
        let data: NS.PdfRegistResponse = res.data;
        if (data.streamdocsId) {
            await conn
                .createQueryBuilder()
                .update(pdfType == "default" ? PDFData : OtherPDFData)
                .set({ sid: data.streamdocsId })
                .where("id=:id", { id: pdfData.id })
                .execute();

            return { sid: data.streamdocsId, file_no: pdfData.file_no };
        }
    }
    return { sid: null, file_no: pdfData.file_no };
}

function ExtraTask() {
    let isExtraTasking = false;
    return {
        runTask() {
            console.log(
                `===================PDF Worker Run Extra Task Status:${
                    isExtraTasking ? "Running" : "Waiting"
                }===================`
            );
            if (!isExtraTasking) {
                isExtraTasking = true;
                registExtra()
                    .then(val => {})
                    .finally(() => (isExtraTasking = false));
            }
        },
    };
}
//#endregion extra

function Task() {
    let isTasking = false;
    return {
        runTask() {
            console.log(
                `===================PDF Worker Run Task Status:${isTasking ? "Running" : "Waiting"}===================`
            );
            if (!isTasking) {
                isTasking = true;
                registPdf()
                    .then(val => {
                        parentPort.postMessage(val);
                    })
                    .finally(() => {
                        isTasking = false;
                    });
            }
        },
    };
}
if (!isMainThread && parentPort) {
    let task = Task();
    task.runTask();
    setInterval(task.runTask, 1000 * 45);

    // let extraTask = ExtraTask();
    // extraTask.runTask();
    // setInterval(extraTask.runTask, 1000 * 60);

    parentPort.on("message", (msg: NS.PdfGatewayCallbackParams) => {
        if (msg.oid) {
            RegistStreamDocs(msg).then(val => {
                parentPort.postMessage({ ...val, type: "registSD" });
            });
        }
    });
}
