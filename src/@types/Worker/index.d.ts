import { DclWorker, DTWorker, EdmsWorker, PdfWorker } from "../../lib/mainWorker";
declare module "Worker" {
    export namespace workerNamespace {
        type pdfType = "default" | "other";

        interface PdfGatewayCallbackParams {
            id: string;
            oid: string;
            name: string;
            inputUri: string;
            inputFileLength: number;
            outputUri: string;
            outputFileLength: number;
            status: string;
            createdAt: number;
            queuedAt: number;
            startedAt: number;
            completedAt: number;
            updatedAt: number;
            pdfType: pdfType;
        }

        interface PdfRegistResponse {
            alink: string;
            createAt: string;
            updatedAt: string;
            givenName: string;
            docName: string;
            fileSize: number;
            deleted: boolean;
            crypted: boolean;
            hasPassword: boolean;
            type: string;
            originExists: boolean;
            externalId: string;
            streamdocsId: string;
            secureId: string;
        }

        interface globalWorkerObjType {
            dclWorkerInstance: DclWorker;
            dclWorkResult?: any;
            vpWorkResult?: any;
            plantWorkResult?: any;
            workExtResult?: any;
            otherWorkResult?: any;
            pdfWorkerInstance: PdfWorker;
            pdfWorkerResult?: { sid: string; oid: string; file_no: number }[];
            dtWorkerInstance: DTWorker;
            dtWorkerResult: countPingResultType;
            edmsWorkerInstance: EdmsWorker;
            edmsWorkerResult: countPingEdmsResultType;
            vpPlantFolderResult?: any;
            vpLngFolderResult?: any;
        }

        type countPingType = {
            id: number;
            count: string;
            is_read?: number;
        };

        interface countPingResultType {
            temp: countPingType[];
            signing: countPingType[];
            reject: countPingType[];
            complete: countPingType[];
            sent: countPingType[];
            regist: countPingType[];
            recv: countPingType[];
            group_sent: countPingType[];
            group_recv: countPingType[];
            recv_general_doc: countPingType[];
            send_general_doc: countPingType[];
            group_recv_general_doc: countPingType[];
            group_send_general_doc: countPingType[];
            tep_group_send_general_doc: countPingType[];
            temp_general_doc: countPingType[];
            signing_general_doc: countPingType[];
            reject_general_doc: countPingType[];
            complete_general_doc: countPingType[];
            complete_is_send: countPingType[];
            signing_is_approval: countPingType[];
            reject_is_re_request: countPingType[];
        }

        type countPingEdmsType = {
            user_id: number;
            count: string;
        };

        interface countPingEdmsResultType {
            drn: countPingEdmsType[];
            tr: countPingEdmsType[];
        }
    }
}
