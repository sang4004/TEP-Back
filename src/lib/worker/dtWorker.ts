import "../../env";
import "../../global";
import { parentPort, workerData, isMainThread } from "worker_threads";
import { workerNamespace } from "Worker";
import fs from "fs";
///////////////////////////
import Database from "../simpleDatabase";
import Query from "./query/countpingQueries";
import html3img from "../html3img.js";
import PDFUtil from "../PDFUtil";
import { CallDirTree, DirResultType } from "../PathUtil";
import { uploadOfficialPdfFolder, uploadGeneralOfficialPdfFolder } from "../../constant";
import { getGeneralDocument } from "../formatGeneralDocument";
// 공문 다운로드 자동화 라이브러리
import MakeDocumentQuery from "./query/makedocumentQueries";
import { Organization } from "../../entity/Organization";
import { OrganizationType } from "../../entity/OrganizationType";
import { User } from "../../entity/User";
import { Signdata } from "../../entity/Signdata";
import { SignRegister } from "../../entity/SignRegister";

import {
    getTEPOffcialDocument,
    getHENCCompOffcialDocument,
    getSHINHANCompOffcialDocument,
    getSHINHANSiteOffcialDocument,
    getHTCCompOffcialDocument,
    getHENCSiteOffcialDocument,
    getHTCSiteOffcialDocument,
    getYNJCompOffcialDocument,
    getYNJSiteOffcialDocument,
} from "../formatOfficialDocument";
//
// 일반문서 다운로드 라이브러리
import MakeGeneralDocQuery from "./query/makeGeneralDocumentQueries";
//
import { getGeneralFilename, getOfficialFilename } from "../../routes/api/v1/digitalsign/utils";
const isLive = process.env.NODE_ENV == "live";
const tempQuery = Query.countPing["tempQuery" + (isLive ? "Real" : "")];
const signCountQuery = Query.countPing["signCountQuery" + (isLive ? "Real" : "")];
const groupSendQuery = Query.countPing["groupSendQuery" + (isLive ? "Real" : "")];
const groupRecvQuery = Query.countPing["groupRecvQuery" + (isLive ? "Real" : "")];
const generalGroupRecvQuery = Query.countPing["generalGroupRecvQuery" + (isLive ? "Real" : "")];
const generalGroupSendQuery = Query.countPing["generalGroupSendQuery" + (isLive ? "Real" : "")];
const tepGeneralGroupSendQuery = Query.countPing["tepGeneralGroupSendQuery" + (isLive ? "Real" : "")];
const recvQuery = Query.countPing["recvQuery" + (isLive ? "Real" : "")];
const generalRecvQuery = Query.countPing["generalRecvQuery" + (isLive ? "Real" : "")];
const generalSendQuery = Query.countPing["generalSendQuery" + (isLive ? "Real" : "")];
const generalTempQuery = Query.countPing["generalTempQuery" + (isLive ? "Real" : "")];
const generalCountQuery = Query.countPing["generalCountQuery" + (isLive ? "Real" : "")];
const completeSendQuery = Query.countPing["signCompleteSendQuery" + (isLive ? "Real" : "")];
const generalCompleteSendQuery = Query.countPing["generalCompleteSendQuery" + (isLive ? "Real" : "")];
const signingMineQuery = Query.countPing["signingMineCountQuery" + (isLive ? "Real" : "")];
const generalSigningMineQuery = Query.countPing["generalSigningMineQuery" + (isLive ? "Real" : "")];
const rejectMineQuery = Query.countPing["rejectMineCountQuery" + (isLive ? "Real" : "")];
const generalRejectMineQuery = Query.countPing["generalRejectMineQuery" + (isLive ? "Real" : "")];

const SIGN_ID_TXT_PATH = `${uploadOfficialPdfFolder}/last_sign_id.txt`;
const GENERAL_DOC_SIGN_ID_TXT_PATH = `${uploadGeneralOfficialPdfFolder}/last_general_doc_sign_id.txt`;

const database = new Database(process.env.TYPEORM_DATABASE);
const connection = database.getConnection();

async function getCountPingAll(): Promise<workerNamespace.countPingResultType> {
    try {
        const conn = await connection;
        let signing: workerNamespace.countPingType[] = [];
        let reject: workerNamespace.countPingType[] = [];
        let complete: workerNamespace.countPingType[] = [];
        let sent: workerNamespace.countPingType[] = [];
        let regist: workerNamespace.countPingType[] = [];
        let signingGeneral: workerNamespace.countPingType[] = [];
        let rejectGeneral: workerNamespace.countPingType[] = [];
        let completeGeneral: workerNamespace.countPingType[] = [];

        let temp = await conn.query(tempQuery);
        let signCount = await conn.query(signCountQuery);
        let groupSend = await conn.query(groupSendQuery);
        let groupRecv = await conn.query(groupRecvQuery);
        let generalGroupRecv = await conn.query(generalGroupRecvQuery);
        let generalGroupSend = await conn.query(generalGroupSendQuery);
        let tepGeneralGroupSend = await conn.query(tepGeneralGroupSendQuery);
        let recv = await conn.query(recvQuery);
        let generalRecv = await conn.query(generalRecvQuery);
        let generalSend = await conn.query(generalSendQuery);
        let generalTemp = await conn.query(generalTempQuery);
        let generalCount = await conn.query(generalCountQuery);
        let completeSend = await conn.query(completeSendQuery);
        let generalCompleteSend = await conn.query(generalCompleteSendQuery);
        let signingMine = await conn.query(signingMineQuery);
        let generalSigningMine = await conn.query(generalSigningMineQuery);
        let rejectMine = await conn.query(rejectMineQuery);
        let generalRejectMine = await conn.query(generalRejectMineQuery);

        // counts 가공
        for (var c of signCount) {
            signing.push({ count: c.signing, id: c.id });
            reject.push({ count: c.reject, id: c.id });
            regist.push({ count: c.regist, id: c.id });
            complete.push({ count: c.complete, id: c.id });
            sent.push({ count: c.sent, id: c.id });
        }
        for (var c of generalCount) {
            signingGeneral.push({ count: c.signing, id: c.id });
            completeGeneral.push({ count: c.complete, id: c.id });
            rejectGeneral.push({ count: c.reject, id: c.id });
        }
        //
        return {
            temp: temp,
            signing: signing,
            reject: reject,
            complete: complete,
            sent: sent,
            regist: regist,
            recv: recv,
            group_sent: groupSend,
            group_recv: groupRecv,
            recv_general_doc: generalRecv,
            send_general_doc: generalSend,
            group_recv_general_doc: generalGroupRecv,
            group_send_general_doc: generalGroupSend,
            tep_group_send_general_doc: tepGeneralGroupSend,
            temp_general_doc: generalTemp,
            signing_general_doc: signingGeneral,
            reject_general_doc: rejectGeneral,
            complete_general_doc: completeGeneral,
            complete_is_send: [...completeSend, ...generalCompleteSend],
            signing_is_approval: [...signingMine, ...generalSigningMine],
            reject_is_re_request: [...rejectMine, ...generalRejectMine],
        };
    } catch (err) {
        console.error(err);
    }
}

function Task() {
    let isTasking = false;
    return {
        runTask() {
            console.log(`======Digitalsign Worker Run Task Status:${isTasking ? "Running" : "Waiting"}======`);
            if (!isTasking) {
                isTasking = true;
                getCountPingAll()
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

// 도큐먼트 생성해서 pdf 저장하는 용도
// 한번에 최대 10개씩 생성. ( 만들어진 PDF에 이름들을 signdata 랑 연결시켜서 최근 signdata 알아내야함. )
// 결재가 끝난 문서들을 만든다. ( 발신된거 & 접수 완료 )
// 5분당 한번씩 돌며, 생성된 PDF는 특정경로에 저장
const subFieldQuery: string = MakeDocumentQuery["getSubFieldQuery" + (isLive ? "Real" : "")];
const outRefererQuery: string = MakeDocumentQuery["getOutRefererQuery" + (isLive ? "Real" : "")];
const signLineQuery: string = MakeDocumentQuery["getSignLineQuery" + (isLive ? "Real" : "")];
const getSignIdListQuery: string = MakeDocumentQuery["getSignIdListQuery" + (isLive ? "Real" : "")];

async function makeDocumentPdf() {
    let pdfPath: string;
    var results: DirResultType[] = [];

    // 결재포함, 미포함 OR 발신문서, 수신문서 구분
    let sign_type_list: {
        sign_type: number;
        file_type: number;
    }[] = [
        { sign_type: 0, file_type: 0 },
        { sign_type: 1, file_type: 1 },
        { sign_type: 0, file_type: 1 },
        { sign_type: 1, file_type: 0 },
    ];
    let textFile: {
        contnet: string;
        path: string;
    } = { contnet: "", path: "" };

    const SIGN_FORM_INDEX = {
        TEP_company: 37, // 통영현장
        SHINHAN_company: 38, // 신한본사
        SHINHAN_site: 39, // 신한현장
        HENC_company: 41, // 한화본사
        HTC_company: 43, // 휴먼텍본사
        HENC_site: 47, // 한화현장
        HTC_site: 63, // 휴먼텍현장
        YNJ_site: 65, // 와이엔제이이엔씨현장
        YNJ_compnay: 66, // 와이엔제이이엔씨본사
    };

    const getOfficialDocument = async (
        form_id: number,
        sign_data: Signdata,
        sign_company: string,
        sign_register: string,
        sign_line: any[],
        out_referer: any[],
        sub_field_name: string
    ) => {
        let official_document: string = "";
        if (form_id == SIGN_FORM_INDEX.TEP_company) {
            // 통영 현장
            official_document = getTEPOffcialDocument(sign_data, sign_company, sign_register, sign_line, out_referer);
        } else if (form_id == SIGN_FORM_INDEX.SHINHAN_company) {
            // 신한본사
            official_document = getSHINHANCompOffcialDocument(
                sign_data,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.SHINHAN_site) {
            // 신한현장
            official_document = getSHINHANSiteOffcialDocument(
                sign_data,
                sub_field_name,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.HENC_company) {
            // 한화 본사
            official_document = getHENCCompOffcialDocument(
                sign_data,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.HTC_company) {
            // 휴먼텍 본사
            official_document = getHTCCompOffcialDocument(
                sign_data,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.HENC_site) {
            // 한화 현장
            official_document = getHENCSiteOffcialDocument(
                sign_data,
                sub_field_name,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.HTC_site) {
            // 휴먼텍 현장
            official_document = getHTCSiteOffcialDocument(
                sign_data,
                sub_field_name,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.YNJ_compnay) {
            //ynj본사
            official_document = getYNJCompOffcialDocument(
                sign_data,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        } else if (form_id == SIGN_FORM_INDEX.YNJ_site) {
            //ynj현장
            official_document = getYNJSiteOffcialDocument(
                sign_data,
                sign_company,
                sign_register,
                sign_line,
                out_referer
            );
        }
        return official_document;
    };

    const getLastSignId = async () => {
        let _text = "";
        try {
            _text = fs.readFileSync(SIGN_ID_TXT_PATH, "utf-8");
        } catch (err) {
            // last_sign_id is none
            fs.writeFileSync(SIGN_ID_TXT_PATH, "0");
            _text = "0";
        } finally {
            textFile = {
                contnet: _text,
                path: SIGN_ID_TXT_PATH,
            };
        }
    };

    let conn = await connection;
    conn.transaction(async tr => {
        await getLastSignId();
        let last_id = textFile.contnet;
        try {
            let users = await tr.getRepository(User).find();
            let org = await tr.getRepository(Organization).find();
            let org_type = await tr.getRepository(OrganizationType).find();
            let subField_list = await conn.query(subFieldQuery);

            let last_sign_id: string = textFile.contnet;

            let id_list = await tr.query(getSignIdListQuery.replace("@last_id", `${last_sign_id}`));

            for (var id of id_list) {
                let _id = id.id;
                last_id = _id;
                let sign_data = await tr.getRepository(Signdata).findOne({ id: _id });
                let sign_company = org_type.find(raw => raw.id == sign_data.group_id).company;

                //접수 회사 찾기
                let sign_register = await tr.getRepository(SignRegister).findOne({ sign_id: _id });
                let register_user = users.find(raw => raw.id == sign_register.user_id);
                let register_org = org.find(raw => raw.id == register_user.group_id);
                let register_company = org_type.find(raw => raw.id == register_org.group_id);

                let out_referer = await tr.query(outRefererQuery.replace("@id", `${_id.toString()}`));

                let sub_field_name: string = "";
                if (subField_list.length > 0) {
                    let sub_field_user = subField_list.find(raw => raw.group_id == sign_data.group_id);
                    sub_field_name = sub_field_user ? sub_field_user.username : "";
                }

                for (var i = 0; i < sign_type_list.length; i++) {
                    let sign_type: number = sign_type_list[i].sign_type;
                    let file_type: number = sign_type_list[i].file_type;

                    let sign_line: any[] = [];
                    if (sign_type == 1) {
                        sign_line = await tr.query(signLineQuery.replace("@id", `${_id.toString()}`));
                    }

                    let official_document = await getOfficialDocument(
                        sign_data.form_id,
                        sign_data,
                        sign_company,
                        register_company.company,
                        sign_line,
                        out_referer,
                        sub_field_name
                    );
                    let officialImg = await html3img(official_document, { encoding: "base64" });
                    let officiaURL = officialImg.image,
                        officiaSize = officialImg.size;

                    // 발신문서 하나 수신문서 하나 총 2가지 만들기
                    let _filename = await getOfficialFilename(
                        file_type == 1 ? true : false,
                        sign_data.document_code,
                        sign_type.toString()
                    );

                    let officialPDF = PDFUtil.ImageData2PDF(
                        _filename,
                        officiaURL,
                        {
                            height: officiaSize.height,
                            width: officiaSize.width,
                        },
                        uploadOfficialPdfFolder
                    );
                    pdfPath = officialPDF.path;
                }
            }

            await conn;
        } catch (err) {
            console.log(err);
        } finally {
            // 마지막으로 생성한 sign_id 저장
            fs.writeFileSync(SIGN_ID_TXT_PATH, last_id.toString());
        }
    });

    return pdfPath;
}

function MakeDocumentTask() {
    let isTasking = false;
    return {
        runTask() {
            console.log(`======Make Document PDF Worker Run Task Status:${isTasking ? "Running" : "Waiting"}======`);
            if (!isTasking) {
                isTasking = true;
                makeDocumentPdf()
                    .then(val => {
                        // console.log(val);
                    })
                    .finally(() => {
                        isTasking = false;
                    });
            }
        },
    };
}

// 일반문서 PDF 자동생성 태스크
const generalDocQuery = MakeGeneralDocQuery["getGeneralDoc" + (isLive ? "Real" : "")];
const generalDocSignLineQuery = MakeGeneralDocQuery["getGeneralDocSignline" + (isLive ? "Real" : "")];
const generalDocSenderQuery = MakeGeneralDocQuery["getGeneralDocSender" + (isLive ? "Real" : "")];
const generalDocReferQuery = MakeGeneralDocQuery["getGeneralDocRefer" + (isLive ? "Real" : "")];
const generalDocFilesQuery = MakeGeneralDocQuery["getGeneralDocFiles" + (isLive ? "Real" : "")];
async function makeGeneralDocumentPdf() {
    const replaceVariable = (target: string, keyword: string, replace: string) => {
        let _reg = new RegExp(keyword, "g");
        return target.replace(_reg, replace);
    };
    const getLastSignId = async () => {
        let _text = "";
        try {
            _text = fs.readFileSync(GENERAL_DOC_SIGN_ID_TXT_PATH, "utf-8");
        } catch (err) {
            // last_sign_id is none
            fs.writeFileSync(GENERAL_DOC_SIGN_ID_TXT_PATH, "0");
            _text = "0";
        } finally {
            return {
                contnet: _text,
                path: GENERAL_DOC_SIGN_ID_TXT_PATH,
            };
        }
    };

    let conn = await connection;
    conn.transaction(async tr => {
        let last = await getLastSignId();
        let last_id = last.contnet;
        try {
            let docDatas = await tr.query(replaceVariable(generalDocQuery, "@last_id", last.contnet));
            for (var data of docDatas) {
                let signLine = await tr.query(replaceVariable(generalDocSignLineQuery, "@general_doc_id", data.id));
                let senders = await tr.query(replaceVariable(generalDocSenderQuery, "@general_doc_id", data.id));
                let referers = await tr.query(replaceVariable(generalDocSenderQuery, "@general_doc_id", data.id));
                let attached = await tr.query(replaceVariable(generalDocFilesQuery, "@general_doc_id", data.id));
                // 발신, 수신, 결재 포함, 미포함 문서 총 4개 생성
                // 결재 포함
                let general_document = await getGeneralDocument(
                    data.creator,
                    data.code,
                    data,
                    signLine,
                    senders,
                    referers,
                    attached
                );

                let generalImg = await html3img(general_document, { encoding: "base64" });
                let generalURL = generalImg.image,
                    generalSize = generalImg.size;

                let _filename = getGeneralFilename(true, data.id, data.code_no, "1");

                let generalPDF = PDFUtil.ImageData2PDF(
                    _filename,
                    generalURL,
                    {
                        height: generalSize.height,
                        width: generalSize.width,
                    },
                    uploadGeneralOfficialPdfFolder
                );

                _filename = getGeneralFilename(false, data.id, data.code_no, "1");

                generalPDF = PDFUtil.ImageData2PDF(
                    _filename,
                    generalURL,
                    {
                        height: generalSize.height,
                        width: generalSize.width,
                    },
                    uploadGeneralOfficialPdfFolder
                );
                //결재 미포함
                general_document = await getGeneralDocument(
                    data.creator,
                    data.code,
                    data,
                    undefined,
                    senders,
                    referers,
                    attached
                );

                generalImg = await html3img(general_document, { encoding: "base64" });
                (generalURL = generalImg.image), (generalSize = generalImg.size);

                _filename = getGeneralFilename(true, data.id, data.code_no, "0");

                generalPDF = PDFUtil.ImageData2PDF(
                    _filename,
                    generalURL,
                    {
                        height: generalSize.height,
                        width: generalSize.width,
                    },
                    uploadGeneralOfficialPdfFolder
                );

                _filename = getGeneralFilename(false, data.id, data.code_no, "0");

                generalPDF = PDFUtil.ImageData2PDF(
                    _filename,
                    generalURL,
                    {
                        height: generalSize.height,
                        width: generalSize.width,
                    },
                    uploadGeneralOfficialPdfFolder
                );
                last_id = data.id;
            }
        } catch (err) {
            console.log("Make General Document Err : ", err);
        } finally {
            fs.writeFileSync(GENERAL_DOC_SIGN_ID_TXT_PATH, last_id.toString());
        }
    });
}

function MakeGeneralDocumentTask() {
    let isTasking = false;
    return {
        runTask() {
            console.log(
                `======Make General Document PDF Worker Run Task Status:${isTasking ? "Running" : "Waiting"}======`
            );
            if (!isTasking) {
                isTasking = true;
                makeGeneralDocumentPdf()
                    .then(val => {
                        // console.log(val);
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
    setInterval(task.runTask, 1000 * 30);
    if (isLive) {
        let makeTask = MakeDocumentTask();
        makeTask.runTask();
        setInterval(makeTask.runTask, 1000 * 60);

        let makeGeneralTask = MakeGeneralDocumentTask();
        makeGeneralTask.runTask();
        setInterval(makeGeneralTask.runTask, 1000 * 60);
    }
}
