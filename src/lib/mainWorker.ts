// import PQueue from "p-queue";
import { getConnection, getRepository, In } from "typeorm";
import { EdmsArea } from "@/entity";
import { getDateValue } from "@/lib/utils";
import { Worker, isMainThread } from "worker_threads";
import { workerTS } from "./worker";
import path from "path";
import { workerNamespace } from "Worker";

export const globalWorkerObj: workerNamespace.globalWorkerObjType = {
    dclWorkerInstance: null,
    dclWorkResult: {},
    vpWorkResult: {},
    plantWorkResult: {},
    workExtResult: {},
    otherWorkResult: {},
    pdfWorkerInstance: null,
    pdfWorkerResult: [],
    dtWorkerInstance: null,
    dtWorkerResult: undefined,
    edmsWorkerInstance: null,
    edmsWorkerResult: undefined,
    vpPlantFolderResult: {},
    vpLngFolderResult: {},
};

export class DclWorker {
    // pool: PQueue;
    receiveWorker: Worker;
    constructor() {
        if (globalWorkerObj.dclWorkerInstance != null) return globalWorkerObj.dclWorkerInstance;

        // this.pool = new PQueue({ concurrency: 1, intervalCap: 1, interval: 5 });
        this.receiveWorker = workerTS(path.resolve(__dirname, "./worker/dclWorker.ts"), {});
        this.receiveWorker.on("message", (msg: any) => {
            globalWorkerObj.dclWorkResult = msg.dclWorkResult;
            globalWorkerObj.vpWorkResult = msg.vpWorkResult;
            globalWorkerObj.otherWorkResult = msg.otherWorkResult;
            globalWorkerObj.workExtResult = msg.workExtResult;
            globalWorkerObj.plantWorkResult = msg.plantWorkResult;
            globalWorkerObj.vpPlantFolderResult = msg.vpPlantFolderResult;
            globalWorkerObj.vpLngFolderResult = msg.vpLngFolderResult;
        });
        globalWorkerObj.dclWorkerInstance = this;
    }

    refreshData() {
        this.receiveWorker.postMessage("refresh");
    }
}

// PDF Gateway Worker epapyrus.com
export class PdfWorker {
    receiveWorker: Worker;
    constructor() {
        if (globalWorkerObj.pdfWorkerInstance != null) return globalWorkerObj.pdfWorkerInstance;

        this.receiveWorker = workerTS(path.resolve(__dirname, "./worker/pdfWorker.ts"), {});
        this.receiveWorker.on("error", err => console.log("PDFWorker Error : ", err));
        this.receiveWorker.on("message", (msg: any) => {
            if (msg.type == "regist") {
                globalWorkerObj.pdfWorkerResult.push({ file_no: msg.file_no, oid: msg.oid, sid: null });
            } else if (msg.type == "registSD") {
                let d = globalWorkerObj.pdfWorkerResult.find(raw => raw.file_no == msg.file_no);
                if (d) d.sid = msg.sid;
            }
        });
        globalWorkerObj.pdfWorkerInstance = this;
    }

    async registStreamDocs(cb: workerNamespace.PdfGatewayCallbackParams) {
        this.receiveWorker.postMessage(cb);
    }
}

// Digitalsign Ping Worker
export class DTWorker {
    receiveWorker: Worker;
    constructor() {
        if (globalWorkerObj.dtWorkerInstance != null) return globalWorkerObj.dtWorkerInstance;

        this.receiveWorker = workerTS(path.resolve(__dirname, "./worker/dtWorker.ts"), {});
        this.receiveWorker.on("error", err => console.log("DTWorker Error : ", err));
        this.receiveWorker.on("message", (msg: workerNamespace.countPingResultType) => {
            if (msg) {
                globalWorkerObj.dtWorkerResult = msg;
            }
        });
        globalWorkerObj.dtWorkerInstance = this;
    }
}

// Edms Countping Worker
export class EdmsWorker {
    receiveWorker: Worker;
    constructor() {
        if (globalWorkerObj.edmsWorkerInstance != null) return globalWorkerObj.edmsWorkerInstance;

        this.receiveWorker = workerTS(path.resolve(__dirname, "./worker/edmsWorker.ts"), {});
        this.receiveWorker.on("error", err => console.log("EDMSWorker Error : ", err));
        this.receiveWorker.on("message", (msg: workerNamespace.countPingEdmsResultType) => {
            if (msg) {
                globalWorkerObj.edmsWorkerResult = msg;
            }
        });
        globalWorkerObj.edmsWorkerInstance = this;
    }
}
