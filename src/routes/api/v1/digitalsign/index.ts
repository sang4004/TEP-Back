/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * entity : 
    * Digitalsign
        * 전자 결재
 * api : 
    * get_sign_list
        - 타입 : GET
        - 파라미터 : 
        - 기능 : 사원 리스트 불러오기
        - paylaod : {
            organization : string[]
        }
******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Not, Repository } from "typeorm";
import {
    Signform,
    Signdata,
    DocCopType,
    DocType,
    DocOrganizationType,
    DocProjCodeType,
    Organization,
    Signline,
    User,
    SignRecvList,
    Signcomment,
    SignReferer,
    Signfile,
    OrganizationType,
    GeneralDocRecvList,
    GeneralDocData,
    GeneralDocCode,
    GeneralDocReferer,
    GeneralDocFile,
    SignRegister,
    GeneralDocSignline,
    GeneralDocComment,
    PositionType,
} from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import {
    SetDataToHtml,
    GetDataFromHtml,
    getMoment,
    deleteFile,
    getDate,
    getDateTime,
    getDateValue,
} from "@/lib/utils";
import { fileDir } from "../../../../constant"
import { sendMail } from "@/lib/mailer";
import { logger } from "@/lib/winston";
import { globalWorkerObj } from "@/lib/mainWorker";
import fs from "fs";
import { GenerateZip } from "@/lib/zip";
import { CallDirTree, DirResultType } from "@/lib/PathUtil";
import html3img from "@/lib/html3img";
import { getGeneralFilename, getOfficialFilename } from "./utils";
import { getYNJCompOffcialDocument } from "../../../../lib/formatOfficialDocument";
const isLive = process.env.NODE_ENV == "live";
const router = express.Router();

router.post("/get_document_code", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let document_code, document_code_text, document_no, last_document, docId, _list: any[];
            document_code = "";
            document_code_text = "";
            document_no = ``;
            _list = [];

            let sign_form = await getRepository(Signform).findOne({ id: req.body.form_id });
            let year = new Date().getFullYear();

            last_document = await getConnection().query(
                `
                    SELECT * FROM signdata sd 
                    WHERE sd.form_id IN ( SELECT id FROM signform WHERE select_num_id = ? ) AND sd.document_year = ${year}
                    ORDER BY sd.document_id DESC;
                `,
                [sign_form.select_num_id]
            );
            docId = last_document[0] ? last_document[0].document_id + 1 : 1;
            switch (sign_form.select_num_id) {
                case 8:
                        document_code = `YNJ(통영)`
                        document_no = ``;
                    break;
                case 7:
                        document_code = `YNJ `
                        document_no = `${year.toString().substring(2)}`;
                    break;
                case 6:
                    document_code = `신한-통영 제`;
                    document_no = `${year.toString().substring(2)}`;
                    break;
                case 5:
                    document_code = `HTC - `;
                    document_code_text = ` `;
                    document_no = `${year.toString().substring(2)}`;
                    break;
                case 4:
                    document_code = `HTC - `;
                    document_no = `${year.toString().substring(2)}`;
                    break;
                case 3:
                    document_code = `신한 제`;
                    document_no = `${year.toString().substring(2)}`;
                    break;
                case 2:
                    document_code = `통영에코 제 `;
                    document_no = `${year.toString()}`;
                    break;
                case 1:
                default:
                    let _user = await getRepository(User).findOne({ id: req.body.recv_id });
                    let _org_group_id = -1;
                    if (_user) {
                        let _org = await getRepository(Organization).findOne({
                            id: _user.group_id,
                        });
                        _org_group_id = _org.group_id;
                    }
                    let send_org_id = await getRepository(Organization).findOne({
                        id: req.body.send_id,
                    });
                    last_document = await getConnection().query(
                        `
                            SELECT 
                                document_id 
                            FROM 
                                signdata 
                            WHERE 
                                cop_id = ? and 
                                doc_type_id = ? and 
                                doc_org_send_id = ? and 
                                doc_org_recv_id = ? and 
                                doc_proj_code_id = ? and
                                document_year = ${year}
                            ORDER BY document_id DESC;
                        `,
                        [
                            req.body.cop_id,
                            2,
                            send_org_id ? (send_org_id.is_head ? 3 : 2) : -1,
                            _org_group_id,
                            1,
                        ]
                    );
                    let cop = await getRepository(DocCopType).findOne({ id: req.body.cop_id });
                    let doc = await getRepository(DocType).findOne({ id: 2 });
                    //한화 예외처리
                    let _group_id = sign_form.group_id;
                    if (sign_form.group_id == 4) {
                        let org = await getRepository(Organization).findOne({
                            id: sign_form.org_id,
                        });
                        if (org.is_head) _group_id = 5;
                    }
                    let send = await getRepository(DocOrganizationType).findOne({
                        group_id: _group_id,
                    });
                    let recv = await getRepository(DocOrganizationType).findOne({
                        group_id: _org_group_id,
                    });
                    let proj = await getRepository(DocProjCodeType).findOne({ id: 1 });
                    docId = last_document.length > 0 ? last_document[0].document_id + 1 : 1;
                    if (_user && _org_group_id != -1)
                        document_code = `${cop.doc_key}-${doc.doc_key}${send.doc_key}-${recv.doc_key}-${proj.doc_key}`;
                    else
                        document_code = `${cop.doc_key}-${doc.doc_key}${send.doc_key}-${proj.doc_key}`;
                    break;
            }

            return getSuccessResponse(res, {
                code: document_code,
                text: document_code_text,
                document_no,
                docId,
                last_document,
                _list,
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_count_ping", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            const user_id = req.app.get("user_id");
            let _user = await getRepository(User).findOne({ id: user_id });
            let _organization = await getRepository(Organization).findOne({ id: _user.group_id })
            const dt = globalWorkerObj.dtWorkerResult;
            let data = {
                temp: dt.temp.find(raw=> raw.id == _user.id),
                signing: dt.signing.find(raw=>raw.id == _user.id),
                reject: dt.reject.find(raw=> raw.id == _user.id),
                complete: dt.complete.find(raw=> raw.id == _user.id),
                sent: dt.sent.find(raw=> raw.id == _user.id),
                regist: dt.regist.find(raw=> raw.id == _user.id),
                recv: dt.recv.find(raw=> raw.id == _user.id),
                group_sent: dt.group_sent.find(raw=> raw.id == _user.id),
                group_recv: dt.group_recv.find(raw=> raw.id == _user.id),
                recv_general_doc: dt.recv_general_doc.find(raw=> raw.id == _user.id),
                send_general_doc: dt.send_general_doc.find(raw=> raw.id == _user.id),
                group_recv_general_doc: dt.group_recv_general_doc.find(raw=> raw.id == _user.id),
                group_send_general_doc: dt.group_send_general_doc.find(raw=> raw.id == _user.id),
                temp_general_doc: dt.temp_general_doc.find(raw=> raw.id == _user.id),
                signing_general_doc: dt.signing_general_doc.find(raw=> raw.id == _user.id),
                reject_general_doc: dt.reject_general_doc.find(raw=> raw.id == _user.id),
                complete_general_doc: dt.complete_general_doc.find(raw=> raw.id == _user.id),
                complete_is_send:dt.complete_is_send.find(raw=> raw.id == _user.id),
                signing_is_approval: dt.signing_is_approval.find(raw=> raw.id == _user.id),
                reject_is_re_request: dt.reject_is_re_request.find(raw=> raw.id == _user.id),
                recv_is_read : 0,
                grecv_is_read : 0
            };
            data.recv_is_read = data.recv && data.recv.is_read === 0 ? 1 : 0;
            data.grecv_is_read = data.recv_general_doc && data.recv_general_doc.is_read === 0 ? 1 : 0;
            
            // LEGACY 
            // TEP 사람의 경우 회사의 모든 개수. 
            if(_organization.group_id == 1){
                let tepGroupSendData = dt.tep_group_send_general_doc.find(raw=> raw.id == _user.id);
                if(tepGroupSendData){
                    Object.assign(data, {group_send_general_doc : tepGroupSendData});
                }
            } 

            return getSuccessResponse(res, {
                time: new Date().getTime(),
                temp: data.temp ? parseInt(data.temp.count) : 0,
                signing: data.signing ? parseInt(data.signing.count) : 0,
                reject: data.reject ? parseInt(data.reject.count) : 0,
                complete: data.complete ? parseInt(data.complete.count) : 0,
                sent: data.sent ? parseInt(data.sent.count) : 0,
                regist: data.regist ? parseInt(data.regist.count) : 0,
                recv: data.recv ? parseInt(data.recv.count) : 0,
                recv_is_read: data.recv_is_read,
                group_sent: data.group_sent ? parseInt(data.group_sent.count) : 0,
                group_recv: data.group_recv ? parseInt(data.group_recv.count) : 0,
                recv_general_doc: data.recv_general_doc ? parseInt(data.recv_general_doc.count) : 0,
                grecv_is_read: data.grecv_is_read,
                send_general_doc: data.send_general_doc ? parseInt(data.send_general_doc.count) : 0,
                group_recv_general_doc: data.group_recv_general_doc ? parseInt(data.group_recv_general_doc.count) : 0,
                group_send_general_doc: data.group_send_general_doc ? parseInt(data.group_send_general_doc.count) : 0,
                temp_general_doc: data.temp_general_doc ? parseInt(data.temp_general_doc.count) : 0,
                signing_general_doc: data.signing_general_doc ? parseInt(data.signing_general_doc.count) : 0,
                reject_general_doc: data.reject_general_doc ? parseInt(data.reject_general_doc.count) : 0,
                complete_general_doc: data.complete_general_doc ? parseInt(data.complete_general_doc.count) : 0,
                complete_is_send: data.complete_is_send ? parseInt(data.complete_is_send.count) : 0,
                signing_is_approval: data.signing_is_approval ? parseInt(data.signing_is_approval.count) : 0,
                reject_is_re_request: data.reject_is_re_request ? parseInt(data.reject_is_re_request.count) : 0,
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getSuccessResponse(res, {
        time : new Date().getTime(),
        temp: 0,
        signing: 0,
        reject: 0,
        complete: 0,
        sent: 0,
        regist: 0,
        recv: 0,
        recv_is_read: 0,
        group_sent: 0,
        group_recv: 0,
        recv_general_doc: 0,
        grecv_is_read: 0,
        send_general_doc: 0,
        group_recv_general_doc: 0,
        group_send_general_doc: 0,
        temp_general_doc: 0,
        signing_general_doc: 0,
        reject_general_doc: 0,
        complete_general_doc: 0,
        complete_is_send: 0,
        signing_is_approval: 0,
        reject_is_re_request: 0,
    });
});

router.get("/get_signing_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getRepository(Signdata).query(
                `
                    SELECT
                    sd.id as id,
                    sd.title as title,
                    sf.form as form,
                    sd.updated_at as 'time',
                    u.username as creator,
                    sd.created_at as 'date'
                    FROM signdata sd 
                    INNER JOIN signform sf 
                        ON sf.id = sd.form_id 
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN signline sl
                        ON sl.sign_id = sd.id 
                            AND sl.user_id = ?
                            AND sl.state = '2'
                    where sd.sign_state='1'
                    ORDER BY sd.updated_at DESC;
                `,
                [req.app.get("user_id")]
            );
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_all_sign_box_list", async (req: Request, res: Response) => {
    try{
        if (req.app.get("user_id") != null) {
            let _user = await getRepository(User).findOne({
                id: req.app.get("user_id"),
            });
            let _org = await getRepository(Organization).findOne({
                id: _user.group_id,
            });
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_sign_box_list", async (req: Request, res: Response) => {    
    const whereQuery = isLive 
        ? '( sd.sign_state = 3 or sd.sign_state = 6 or sd.sign_state = 10 ) AND sd.original_sign_id = -1' 
        : '( sd.sign_state = "3" or sd.sign_state = "6" or sd.sign_state = "10" ) AND sd.original_sign_id = -1'
    try {
        if (req.app.get("user_id") != null) {
            let _user = await getRepository(User).findOne({
                id: req.app.get("user_id"),
            });
            let _org = await getRepository(Organization).findOne({
                id: _user.group_id,
            });
            let gid = _org.group_id;
            let type = true;
            if (req.query.type == `user`) type = true;
            else if (req.query.type == undefined) type = true;
            else type = false;

            let sign_state = parseInt(req.query.state.toString());
            
            let listQuery = `
                SELECT
                    DISTINCT sd.id AS id,
                    sd.document_code,
                    sd.doc_type_id,
                    sf.title AS form,
                    sd.updated_at AS 'time',
                    u.id AS uid,
                    u.username AS creator,
                    sd.created_at AS 'date',
                    e.name AS 'group',
                    sd.title AS 'title',
                    sd.sign_state,
                    sl.state,
                    sd.is_regist AS 'is_regist',
                    sd.is_re_request AS 'is_request',
                    sd.doc_recv,
                    sf.group_id AS 'form_group_id'
                FROM signdata sd
                LEFT JOIN signform sf
                    ON sf.id = sd.form_id 
                INNER JOIN users u
                    ON u.id = sd.user_id
                INNER JOIN organization e
                    ON e.id = u.group_id
                INNER JOIN signline sl
                    ON sl.sign_id = sd.id 
                ${
                    type
                        ? `AND sl.user_id = ` + _user.id
                        : `AND sl.user_id = u.id`
                }
                WHERE sd.sign_state = '${req.query.state}'
                ${type ? `` : `AND u.group_id = ` + _user.group_id}
                /* ORDER BY sd.updated_at DESC; */
            `;
            if (sign_state == 2) {
                listQuery = `
                    SELECT
                        DISTINCT sd.id AS id,
                        sd.document_code,
                        sd.doc_type_id,
                        sf.title AS form,
                        sd.updated_at AS 'time',
                        u.id AS uid,
                        u.username AS creator,
                        sd.created_at AS 'date',
                        e.name AS 'group',
                        sd.title AS 'title',
                        sd.sign_state,
                        sl.state,
                        sd.is_regist AS 'is_regist',
                        sd.is_re_request AS 'is_request',
                        sd.doc_recv,
                        sf.group_id AS 'form_group_id'
                    FROM signdata sd
                    LEFT JOIN signform sf
                        ON sf.id = sd.form_id 
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN organization e
                        ON e.id = u.group_id
                    INNER JOIN signline sl
                        ON sl.sign_id = sd.id 
                        AND ( sl.state = 3 OR sl.state = 1 )
                        ${
                            type
                                ? `AND sl.user_id = ` + _user.id
                                : `AND sl.user_id = u.id`
                        }
                    ${isLive ? 'WHERE sd.sign_state not in (0,1,4)' : 'WHERE sd.sign_state not in ("0", "1", "4")'}
                    /* ORDER BY sd.updated_at DESC; */
                `;
            } else if (sign_state == 3) {
                listQuery = `
                    SELECT
                        DISTINCT sd.id AS id,
                        sd.document_code,
                        sf.title AS form,
                        sd.doc_type_id,
                        sd.updated_at AS 'time',
                        u.id AS uid,
                        u.username AS creator,
                        sd.sended_at AS 'date',
                        e.name AS 'group',
                        sd.title AS 'title',
                        sd.sign_state,
                        sl.state,
                        sd.is_regist AS 'is_regist',
                        sd.is_re_request AS 'is_request',
                        sd.doc_recv,
                        sf.group_id AS 'form_group_id'
                    FROM signdata sd
                    LEFT JOIN signform sf
                        ON sf.id = sd.form_id 
                    INNER JOIN users u
                        ON u.id = sd.user_id
                        ${
                            type || gid == 1
                                ? ``
                                : `AND u.group_id = ` + _user.group_id
                        }
                    INNER JOIN organization e
                        ON e.id = u.group_id
                        ${type == false && gid == 1 ? `AND e.group_id = 1` : ``}
                    INNER JOIN signline sl
                        ON sl.sign_id = sd.id 
                        ${
                            type
                                ? `AND ( sl.user_id = ${_user.id} AND sl.state = 1 )`
                                : `AND sl.user_id = u.id`
                        }
                    INNER JOIN signline sl2
                        ON sl2.sign_id = sd.id
                    WHERE 
                        ${whereQuery} 
                        AND (sd.sign_state = 10 OR (
                            ${
                                type 
                                ? `sl2.user_id = sl.user_id AND sl2.state = 1`
                                : `sl2.user_id = u.id`
                            }
                        ))
                    /* ORDER BY sd.updated_at DESC; */
                `;
            }

            let orderQuery = sign_state == 3 ? `ORDER BY MAX(sd.date) DESC;` : `ORDER BY MAX(sd.time) DESC;`

            let list = await getConnection().query(`
                SELECT
                    sd.id,
                    MAX(sd.document_code) AS 'document_code',
                    MAX(sd.doc_type_id) AS 'doc_type_id',
                    MAX(sd.time) AS 'time',
                    MAX(sd.uid) AS 'uid',
                    MAX(sd.creator) AS 'creator',
                    MAX(sd.date) AS 'date',
                    MAX(sd.group) AS 'group',
                    MAX(sd.title) AS 'title',
                    MAX(sd.sign_state) AS 'sign_state',
                    MAX(sd.is_regist) AS 'is_regist',
                    MAX(sd.doc_recv) AS 'doc_recv',
                    MAX(sd.form_group_id) AS 'form_group_id',
                    MAX(ot.company) AS 'company',
                    (
                        CASE WHEN MAX(sd.form_group_id) > 0 AND MAX(ot.company) IS NOT NULL
                        THEN CONCAT(MAX(ot.company), '_', MAX(sd.form))
                        ELSE MAX(sd.form)
                        END
                    ) AS 'form',
                    COUNT(srl.id) AS 'recv_sum',
                    SUM( CASE WHEN srl.is_read = 1 THEN 1 ELSE 0 END) AS 'read_sum',
                	CASE WHEN MAX(sd.form_group_id) = MAX(uot.id) THEN '발신문서' ELSE '수신문서' END AS 'document_type'
                FROM (${listQuery}) sd
                INNER JOIN users u
                    ON u.id = ${_user.id}
                INNER JOIN organization uo
                    ON uo.id = u.group_id
                INNER JOIN organization_type uot
                    ON uot.id = uo.group_id
                INNER JOIN signline sl
                    ON sl.sign_id = sd.id
                INNER JOIN users slu
                    ON slu.id = sl.user_id
                LEFT JOIN organization_type ot
                    ON ot.id = sd.form_group_id
                LEFT JOIN signdata sdOrigin
                    ON sdOrigin.original_sign_id = sd.id
                LEFT JOIN sign_recv_list srl
                    ON (srl.sign_id = sdOrigin.id OR srl.sign_id = sd.id)
                    AND srl.is_refer = 0
                GROUP BY sd.id
                ${orderQuery}
            `);
            
            let final = [];
            for (var l of list) {
                let signers = await getConnection().query(`
                    SELECT
                        sd.id,
                        sl.state,
                        u.username,
                        u.id AS 'uid'
                    FROM signdata sd
                    INNER JOIN signline sl
                        ON sl.sign_id = sd.id
                    INNER JOIN users u
                        ON u.id = sl.user_id
                    WHERE sd.id = ${l.id}
                    ORDER BY sl.order DESC;
                `);
                // 반려자일 경우
                if (l.sign_state == 4) {
                    let reject_signer = signers.find(raw=>parseInt(raw.state) == 4);
                    if (reject_signer) {
                        l.reject_signer = reject_signer.username;
                    }
                }
                if (signers.length > 0) l.last_signer = signers[0].username;
                if (l.sign_state == 1) {
                    signers.reverse();
                    for (var signer of signers) {
                        if (signer.state == 2) {
                            l.next_signer = signer.username;
                            l.next_signer_id = signer.uid;
                            final.push(l);
                            break;
                        }
                    }
                } else {
                    final.push(l);
                }
            }
            let _general_list = [];
            if (sign_state != 3) {
                _general_list = await getConnection().query(`
                    SELECT 
                        sd.id AS id,
                        sd.code_no AS document_code,
                        dCode.text AS form,
                        sd.updated_at AS 'time',
                        u.username AS creator,
                        sd.created_at AS 'date',
                        e.name AS 'group',
                        sd.title AS 'title',
                        sd.state AS 'sign_state',
                        sl.state,
                        sd.is_regist AS 'is_regist',
                        sd.sended_at,
                        1 AS 'is_general_doc',
                        '일반문서' AS 'document_type'
                    FROM general_doc_signline sl
                    INNER JOIN general_doc_data sd
                        ON sd.state = ${req.query.state}
                    INNER JOIN general_doc_code dCode
                        ON dCode.id = sd.code_id
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN organization e
                        ON e.id = u.group_id
                    WHERE sl.user_id = ${_user.id} AND sl.general_doc_id = sd.id
                    ORDER BY sd.updated_at DESC;
                `);
            }
            let general_list = [];
            for (var l of _general_list) {
                let signers = await getConnection().query(`
                    SELECT
                        gd.id,
                        gsl.state,
                        u.username,
                        u.id AS 'uid'
                    FROM general_doc_data gd
                    INNER JOIN general_doc_signline gsl
                        ON gsl.general_doc_id = gd.id
                    INNER JOIN users u
                        ON u.id = gsl.user_id
                    WHERE gd.id = ${l.id}
                    ORDER BY gsl.order DESC;
                `);

                // 반려자일 경우
                if (l.sign_state == 4) {
                    let reject_signer = signers.find(raw=> raw.state == 4);
                    if (reject_signer) {
                        l.reject_signer = reject_signer.username;
                    }
                }

                l.last_signer = signers[0].username;
                if (l.sign_state == 1) {
                    signers.reverse();
                    for (var signer of signers) {
                        if (signer.state == 2) {
                            l.next_signer = signer.username;
                            l.next_signer_id = signer.uid;
                            general_list.push(l);
                            break;
                        }
                    }
                } else {
                    general_list.push(l);
                }
            }
            if (general_list.length > 0) {
                final = [...final, ...general_list];
                final = final.sort((a: any, b: any) => {
                    return b.time - a.time;
                });
            }
            return getSuccessResponse(res, final);
        }
    } catch (err) {
        console.log(err);
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_temp_box_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getRepository(Signdata).query(`
                    SELECT
                        sd.id AS id,
                        sd.document_code,
                        sf.title AS form,
                        sd.updated_at AS 'time',
                        u.username AS creator,
                        sd.created_at AS 'date',
                        e.name AS 'group',
                        sd.title AS 'title',
                        sd.sign_state,
                        sd.is_regist,
                        sf.group_id AS 'form_group_id'
                    FROM signdata sd 
                    LEFT JOIN signform sf 
                        ON sf.id = sd.form_id 
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN organization e
                        ON e.id = u.group_id
                    WHERE ( sd.sign_state = '0' || sd.sign_state = '5' || sd.sign_state = '7'  )
                        AND sd.user_id = ${req.app.get("user_id")}
                        AND ( sd.original_sign_id = -1 OR sd.is_regist = 1 )
                    ORDER BY sd.updated_at DESC;
                `);

            let general_list = await getRepository(GeneralDocData).query(`
                    SELECT
                        sd.id AS id,
                        sd.code_no AS 'document_code',
                        dCode.text AS form,
                        sd.updated_at AS 'time',
                        u.username AS creator,
                        sd.created_at AS 'date',
                        e.name AS 'group',
                        sd.title AS 'title',
                        sd.state AS 'sign_state',
                        sd.is_regist,
                        1 AS 'is_general_doc'
                    FROM general_doc_data sd 
                    INNER JOIN general_doc_code dCode
                        ON dCode.id = sd.code_id
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN organization e
                        ON e.id = u.group_id
                    WHERE ( sd.state = 0 OR sd.state = 5 OR sd.state = 7  )
                        AND sd.user_id = ${req.app.get("user_id")}
                    ORDER BY sd.updated_at DESC;
                `);
            let final = [...list, ...general_list];
            for (var l of final) {
                if (l.is_general_doc) {
                    l.document_type = "일반문서";
                }

                if (l.form_group_id && l.form_group_id != 0) {
                    let org = await getRepository(OrganizationType).findOne({
                        id: l.form_group_id,
                    });
                    l.form = org.company + "_" + l.form;
                }
            }

            for (var l of list) {
                let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
                let org = await getRepository(Organization).findOne({ id: _user.group_id });
                let org_type = await getRepository(OrganizationType).findOne({ id: org.group_id });
                if (org_type.id == l.form_group_id) {
                    l.document_type = "발신문서";
                } else {
                    l.document_type = "수신문서";
                }
            }
            final = final.sort((a: any, b: any) => {
                return b.time - a.time;
            });

            return getSuccessResponse(res, final);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

export const recvBoxQuery = (user_id: string, user_org_type: string, userIdType: string, groupType: string, targetUser: string, visibleType: string, registType: string)=> {
    return`
    SELECT
        sd.id AS 'id',
        sd.doc_type_id AS 'doc_type_id',
        sd.doc_sender AS 'doc_sender',
        sd.document_code AS 'document_code',
        sd.title AS 'title',
        sd.regist_sign_id AS 'regist_sign_id',
        sd.sign_state AS 'sign_state',
        sd.is_regist AS 'is_regist',
        CASE WHEN sf.group_id != 0 THEN CONCAT(o_type.company, '_', sf.title) ELSE sf.title END AS 'form',
        sd.updated_at AS 'time',
        sd.created_at AS 'date',
        sd.sended_at AS 'sended_at',
        sd.registed_at AS 'registed_at',
        u.username AS 'creator',
        e.name AS 'group',
        e.group_id,
        o_type.company AS 'company',
        sf.group_id AS 'form_group_id',
        srl.id AS 'recv_id',
        srl.is_refer,
        (
        SELECT 
            CASE WHEN sr.sign_id = sd.id THEN u.username ELSE sd.custom_register END AS 'username'
        FROM signregister sr 
        INNER JOIN users u 
            ON u.id = sr.user_id
        WHERE sr.sign_id = sd.id
        ) AS 'receiver',
        CASE WHEN srl.sign_id = sd.id AND srl.visible = 1 AND srl.user_id = ${user_id} THEN srl.is_read ELSE 0 END AS 'is_read',
        COUNT(srl.id) AS 'recv_sum',
        SUM( CASE WHEN srl.is_read = 1 THEN 1 ELSE 0 END) AS 'read_sum',
        CASE WHEN srl.user_id = ${user_id} THEN srl.is_read ELSE -1 END AS 'user_read',
        CASE WHEN sr.user_id = ${user_id} THEN 'true' ELSE 'false' END AS 'is_register',
        CASE WHEN ${user_org_type} = sf.group_id THEN '발신문서' ELSE '수신문서' END AS 'document_type'
        FROM sign_recv_list srl
        INNER JOIN signdata sd
            ON sd.id = srl.sign_id
        INNER JOIN signform sf 
            ON sf.id = sd.form_id
        LEFT JOIN signregister sr
            ON sr.sign_id = sd.id AND sr.user_id = ${user_id}
        LEFT JOIN signreferer srf
            ON srf.user_id = ${user_id}
        INNER JOIN users u
            ON u.id = ${userIdType}
        INNER JOIN organization e
            ON e.id = u.group_id ${groupType}            
        LEFT JOIN organization_type o_type
            ON o_type.id = sf.group_id
        WHERE (${targetUser} ${visibleType} ${registType} AND (sd.sended_at IS NOT NULL OR sd.registed_at IS NOT NULL)) OR (sd.doc_type_id = 3 AND sd.sign_state = '8')
        AND (NOT sd.is_regist = 1 AND sd.sign_state NOT IN(0, 1, 2))
        GROUP BY srl.id, sr.id, srf.id, sd.id;
    `;
} 

export const recvBoxQueryReal = (user_id: string,  user_org_type: string, userIdType: string, groupType: string, targetUser: string, visibleType: string, registType: string) =>{
    return `
        SELECT
            MAX(sd.id) AS 'id',
            MAX(sd.doc_type_id) AS 'doc_type_id',
            MAX(sd.doc_sender) AS 'doc_sender',
            MAX(sd.document_code) AS 'document_code',
            MAX(sd.title) AS 'title',
            MAX(sd.regist_sign_id) AS 'regist_sign_id',
            MAX(sd.sign_state) AS 'sign_state',
            MAX(sd.is_regist) AS 'is_regist',
            CASE WHEN NOT MAX(sf.group_id) = 0 THEN CONCAT(MAX(o_type.company), '_', MAX(sf.title)) ELSE MAX(sf.title) END AS 'form',
            MAX(u.username) AS 'creator',
            MAX(sd.updated_at) AS 'time',
            MAX(sd.created_at) AS 'date',
            MAX(sd.registed_at) AS 'registed_at',
            MAX(sd.sended_at) AS 'sended_at',
            MAX(e.name) AS 'group',
            MAX(e.group_id) AS 'group_id',
            MAX(o_type.company) AS 'company',
            MAX(sf.group_id) AS 'form_group_id',
            MAX(srl.id) AS 'recv_id',
            MAX(srl.is_refer) AS 'is_refer',
            (
            SELECT 
                CASE WHEN MAX(sr.sign_id)= sd.id THEN MAX(u.username) ELSE MAX(sd.custom_register) END AS 'username'
            FROM signregister sr WITH(NOLOCK)
            INNER JOIN users u WITH(NOLOCK)
                ON u.id = sr.user_id
            WHERE sr.sign_id = sd.id
            ) AS 'receiver',
            CASE WHEN MAX(srl.visible) = 1 AND MAX(srl.user_id) = ${user_id} THEN MAX(srl.is_read) ELSE 0 END AS 'is_read',
            COUNT(srl.id) AS 'recv_sum',
            SUM( CASE WHEN srl.is_read = 1 THEN 1 ELSE 0 END) AS 'read_sum',
            CASE WHEN MAX(srl.user_id) = ${user_id} THEN MAX(srl.is_read) ELSE -1 END AS 'user_read',
            CASE WHEN MAX(sr.user_id) = ${user_id} THEN 1 ELSE 0 END AS 'is_register',
            CASE WHEN MAX(srl.is_refer) = 1 THEN 1
                ELSE MAX(srf.is_out_refer) END AS 'is_out_refer',
            CASE WHEN ${user_org_type} = MAX(sf.group_id) THEN '발신문서' ELSE '수신문서' END AS 'document_type'
        FROM sign_recv_list AS srl WITH(NOLOCK)
        INNER JOIN signdata AS sd WITH(NOLOCK)
            ON sd.id = srl.sign_id
        INNER JOIN signform AS sf WITH(NOLOCK)
            ON sf.id = sd.form_id
        LEFT JOIN signregister AS sr WITH(NOLOCK)
            ON sr.sign_id = sd.id AND sr.user_id = ${user_id}
        LEFT JOIN signreferer AS srf WITH(NOLOCK)
            ON srf.user_id = ${user_id}
        INNER JOIN users AS u WITH(NOLOCK)
            ON u.id = ${userIdType}
        INNER JOIN organization AS e WITH(NOLOCK)
            ON e.id = u.group_id ${groupType}
        LEFT JOIN organization_type AS o_type WITH(NOLOCK)
            ON o_type.id = sf.group_id
        WHERE (${targetUser} ${visibleType} ${registType} AND (sd.sended_at IS NOT NULL OR sd.registed_at IS NOT NULL)) OR (sd.doc_type_id = 3 AND sd.sign_state = '8')
        AND (NOT sd.is_regist = 1 AND sd.sign_state NOT IN(0, 1, 2))
        GROUP BY sd.id;
    `;
} 

router.get("/get_recv_box_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            let org = await getRepository(Organization).findOne({ id: _user.group_id });
            let org_type = await getRepository(OrganizationType).find();
            let user_org_type = org_type.find(raw=>raw.id == org.group_id);
            let gid = org.group_id;
            let type = 'true';
            if (req.query.type == `user` || req.query.type == undefined) type = 'true';  
            else type = 'false';

            let userIdType = type == "true" ? `sd.user_id` : `srl.user_id`;
            const getGroupQuery = (type: string) => {
                if (type == "true") {
                    return "";
                } else {
                    if (gid == 1 || (gid != 1 && _user.admin_level <= 3)) {
                        return `AND e.group_id = ${gid}`;
                    } else {
                        return "";
                    }
                }
            };
            let groupType = getGroupQuery(type);
            let targetUser = type == "true"
                    ? `srl.user_id = ${_user.id} AND`
                    : gid == 1
                    ? ''
                    : `u.group_id = ${_user.group_id} AND`;

            let visibleType = type == 'false' && gid == 1 ? 'srl.visible = 1' : 'srl.visible = 1';
            let registType = type == "true" ? '' : `AND sd.is_regist = 1`

            let list: any[] = await getRepository(Signdata).query(
                isLive
                    ? recvBoxQueryReal(
                          _user.id.toString(),
                          user_org_type.id.toString(),
                          userIdType,
                          groupType,
                          targetUser,
                          visibleType,
                          registType
                      )
                    : recvBoxQuery(
                          _user.id.toString(),
                          user_org_type.id.toString(),
                          userIdType,
                          groupType,
                          targetUser,
                          visibleType,
                          registType
                      )
            );
                
            let exist_ids = [];
            let newList = [];
            list.sort((a: any, b: any) => {
                let a_dt: any;
                let b_dt: any;
                if (a.registed_at != null) a_dt = a.registed_at;
                else a_dt = a.sended_at;
                if (b.registed_at != null) b_dt = b.registed_at;
                else b_dt = b.sended_at;
                return b_dt - a_dt;
            });

            let last_signer_list = await getConnection().query(`
                SELECT
                    sl.sign_id,
                    u.username
                FROM signline sl
                INNER JOIN users u 
                    ON u.id = sl.user_id
                ORDER BY sl.id DESC;
            `);            

            for (var l of list) {
                //중복제거
                if (exist_ids.indexOf(l.id) != -1) continue;
                exist_ids.push(l.id);

                let last_signer = last_signer_list.filter(raw=> raw.sign_id == (l.original_sign_id != -1 ? l.original_sign_id : l.id));
                if (last_signer.length > 0) l.last_signer = last_signer[0].username;
                else l.last_signer = "";

                
                if (l.is_refer && (type == 'true' || gid != 1)) {
                    //부서문서함에서 내부참조자는 안보이게
                    if (type == 'false' && l.is_out_refer == 0) continue;
                } else l.is_out_refer = true;
                
                newList.push(l);
            }
            return getSuccessResponse(res, newList);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/new_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let new_sign = new Signdata(); // signdata init
            let form_data = await getRepository(Signform).findOne({ id: req.body.form_id });
            let user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            let user_pos = await getRepository(PositionType).findOne({ id: user.position });
            let group = await getRepository(Organization).findOne({ id: user.group_id });
            let company_group = await getRepository(OrganizationType).findOne({
                id: group.group_id,
            });
            let form_group = await getRepository(Organization).findOne({ id: form_data.org_id });
            let head_sign = null;
            let doc_send = -1;
            if (company_group.id == 4) doc_send = 2;
            if (req.body.is_head) {
                if (company_group.id == 4) doc_send = 3;
                let _user = await getRepository(User).find({
                    sub_field: 1,
                    group_id: req.body.org_id,
                    is_delete : false,
                });
                let _group = await getRepository(Organization).find({
                    group_id: req.body.org_id,
                    name: `대표이사`,
                });
                let _ceo = await getRepository(User).find({
                    group_id: _group.length > 0 ? _group[0].id : 0,
                    is_delete : false
                });
                if (_user.length > 0)
                    head_sign = _user[0].sign_img ? _user[0].sign_img : _user[0].signature_img;
                else {
                    // 현장인데 현장대리인이 없을 경우에 본사 양식으로 변경 (한화만)
                    if (form_group.id == 4 && form_group && form_group.is_head) {
                        let main_group = await getRepository(Organization).findOne({
                            group_id: company_group.id,
                            is_head: 0,
                        });
                        form_data = await getRepository(Signform).findOne({
                            org_id: main_group.id,
                        });
                        doc_send = 2;
                    }
                    if (_ceo.length > 0)
                        head_sign = _ceo[0].sign_img ? _ceo[0].sign_img : _ceo[0].signature_img;
                    else head_sign = company_group.signature_img;
                }
            } else {
                let _group = await getRepository(Organization).findOne({
                    group_id: company_group.id,
                    name: `대표이사`,
                });
                if (_group) {
                    let _ceo = await getRepository(User).findOne({
                        group_id: _group.id,
                        position: 1,
                        is_delete : false
                    });
                    if (_ceo) head_sign = _ceo.sign_img;
                }
            }
            // 수신인
            let recv_str = "";
            let recv_company_id = -1;
            if (req.body.regist_list && req.body.regist_list.length > 0) {
                let recv_user = await getRepository(User).findOne({ id: req.body.regist_list[0] });
                if (recv_user) {
                    let org = await getRepository(Organization).findOne({ id: recv_user.group_id });
                    recv_company_id = org.group_id;
                }
            }

            let recv_list = [];
            if (req.body.recv_list && req.body.recv_list.length > 0) {
                recv_list = await getConnection().query(`
                    SELECT 
                        u.username,
                        o.name as 'part',
                        p.name as 'pos',
                        u.signature_img,
                        o.group_id,
                        o_type.company
                        FROM users u 
                        INNER JOIN organization o 
                        ON o.id = u.group_id
                        INNER JOIN organization_type o_type
                        ON o_type.id = o.group_id 
                        INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE u.id in (${req.body.recv_list})
                `);

                for (var reciever of recv_list) {
                    if (recv_str.length != 0) recv_str += " , ";
                    recv_str += `${reciever.company} ${reciever.pos}`;
                }
            } else if (req.body.recv_custom == undefined || req.body.recv_custom.length == 0) {
                throw new Error("수신 목록이 없습니다.");
            }
            //직접입력시
            if (req.body.recv_custom) {
                if (recv_str.length != 0) recv_str += " , ";
                recv_str += req.body.recv_custom;
            }
            //
            //참조
            let refer_str = "";
            let refer_list = [];
            if (req.body.refer_list && req.body.refer_list.length > 0) {
                refer_list = await getConnection().query(`
                        SELECT 
                            u.id,
                            o.name as 'part',
                            u.username,
                            p.name as 'position',
                            o.group_id as 'org_id',
                            o_type.company
                        FROM users u
                        INNER JOIN organization o
                        ON o.id = u.group_id
                        INNER JOIN organization_type o_type
                        ON o_type.id = o.group_id
                        INNER JOIN position_type p
                        ON p.id = u.position
                        WHERE u.id in (${req.body.refer_list})
                        ORDER BY o.group_id ASC, p.priority ASC;
                    `);

                for (var refer of refer_list) {
                    if (refer_str.length != 0) refer_str += " , ";
                    if (refer.position.indexOf("대표이사") != -1)
                        refer_str += `${refer.company} 대표이사`;
                    else refer_str += `${refer.company} ${refer.position} ${refer.username}`;
                }
            }

            if (req.body.ref_custom) {
                if (refer_str.length != 0) refer_str += " , ";
                refer_str += req.body.ref_custom;
            }
            //
            new_sign.user_id = req.app.get("user_id");
            new_sign.document_id = req.body.docId;
            new_sign.document_code = req.body.docCode;
            new_sign.form_id = form_data.id;
            new_sign.group_id = form_data.group_id != 0 ? form_data.group_id : doc_send;
            new_sign.department_id = 0;
            new_sign.title = req.body.title;
            new_sign.html = SetDataToHtml(form_data.html, [], []);
            new_sign.html_header = form_data.header;
            new_sign.html_footer = form_data.footer;
            new_sign.doc_sender = ` ${user_pos ? user_pos.name : ""} ${user.username}`;
            new_sign.doc_date = getDate();
            new_sign.doc_tel = user.phone_number;
            new_sign.doc_fax = user.fax_number ? user.fax_number : company_group.fax;
            new_sign.doc_address = company_group.address;
            new_sign.doc_email = user.email;
            new_sign.doc_recv = recv_str;
            if (req.body.ref_custom) {
                new_sign.doc_cc = req.body.ref_custom;
            }
            new_sign.cop_id = req.body.cop_id;
            new_sign.doc_type_id = 2;
            new_sign.doc_org_send_id = doc_send;
            new_sign.doc_org_recv_id = recv_company_id;
            new_sign.doc_proj_code_id = 1;
            new_sign.issue_signature_img =
                form_data.group_id == 0
                    ? user.signature_img
                    : head_sign != null
                    ? head_sign
                    : company_group.signature_img;
            new_sign.recv_signature_img =
                form_data.group_id == 0 && recv_list[0] ? recv_list[0].signature_img : null;
            new_sign.custom_register = req.body.reg_custom ? req.body.reg_custom : "";
            new_sign.custom_referer = req.body.ref_custom ? req.body.ref_custom : "";
            new_sign.document_year = new Date().getFullYear();
            let insertSign = await getRepository(Signdata).save(new_sign);

            let receive_list = [];
            let new_signdata_list = [];
            for (var recv of req.body.regist_list) {
                let recv_user = await getRepository(User).findOne({ id: recv });
                if (!recv_user) continue;
                let org = await getRepository(Organization).findOne({ id: recv_user.group_id });
                let new_register = new SignRegister();
                new_register.sign_id = new_sign.id;
                new_register.user_id = recv;
                await getRepository(SignRegister).save(new_register);
                // 멀티 접수자에 따른 여러 signdata 로우 추가
                let new_signdata = new Signdata();
                Object.assign(new_signdata, {
                    ...insertSign,
                    original_sign_id: insertSign.id,
                    id: null,
                    recv_company_id: org.group_id,
                });
                let insertSignData = await getRepository(Signdata).save(new_signdata);
                new_signdata_list.push(insertSignData);
                //

                // 각 로우에서 참조 텍스트 표시를 위한 referer 추가
                for (let refer of refer_list) {
                    let new_refer = new SignReferer();
                    new_refer.sign_id = insertSignData.id;
                    new_refer.user_id = refer.id;
                    new_refer.is_out_refer = 1;
                    await getRepository(SignReferer).save(new_refer);
                }
                //

                let new_sign_register = new SignRegister();
                new_sign_register.sign_id = insertSignData.id;
                new_sign_register.user_id = recv;
                await getRepository(SignRegister).save(new_sign_register);

                receive_list.push({
                    sign_id: insertSignData.id,
                    user_id: recv,
                    visible: false,
                    is_doc_mng: true,
                });
            }

            for (var recv of req.body.recv_list) {
                let recv_user = await getRepository(User).findOne({ id: recv });
                if (!recv_user) continue;
                let org = await getRepository(Organization).findOne({ id: recv_user.group_id });
                let signdata = new_signdata_list.filter(
                    (raw, idx) => raw.recv_company_id == org.group_id
                );
                if (receive_list.filter((raw, idx) => raw.user_id == recv).length > 0) continue;
                else if (signdata.length == 0 && !req.body.reg_custom) continue;
                receive_list.push({
                    sign_id: req.body.reg_custom ? insertSign.id : signdata[0].id,
                    user_id: recv,
                    visible: false,
                    is_doc_mng: false,
                });
            }

            // 외부참조자 추가
            for (let refer of refer_list) {
                let new_refer = new SignReferer();
                new_refer.sign_id = insertSign.id;
                new_refer.user_id = refer.id;
                new_refer.is_out_refer = 1;
                await getRepository(SignReferer).save(new_refer);
                let recv_user = await getRepository(User).findOne({ id: refer.id });
                let org = await getRepository(Organization).findOne({ id: recv_user.group_id });
                let signdata = new_signdata_list.filter(
                    (raw, idx) => raw.recv_company_id == org.group_id
                );
                if (
                    receive_list.filter((raw, idx) => raw.user_id == refer.id).length > 0 ||
                    signdata.length == 0
                )
                    continue;
                receive_list.push({
                    sign_id: signdata[0].id,
                    user_id: refer.id,
                    visible: 0,
                    is_doc_mng: 0,
                });
            }

            await getConnection()
                .createQueryBuilder()
                .insert()
                .into(SignRecvList)
                .values(receive_list)
                .execute();

            let new_sign_line = new Signline();
            new_sign_line.user_id = user.id;
            new_sign_line.sign_id = insertSign.id;
            new_sign_line.state = 1;
            new_sign_line.order = 0;

            let insertLine = await getRepository(Signline).save(new_sign_line);

            let sign_data = await getRepository(Signdata).query(
                `
                        SELECT 
                            sd.*,
                            sf.form,
                            sf.org_id AS 'form_org_id'
                        FROM signdata sd
                        INNER JOIN signform sf
                            ON sf.id = sd.form_id
                        WHERE sd.id = ?
                    `,
                [insertSign.id]
            );

            let sign_line = await getRepository(Signline).query(
                `
                    SELECT 
                        sl.id,
                        sl.state,
                        u.username,
                        u.email,
                        u.profile_img,
                        u.id AS 'user_id',
                        o.name as groupname,
                        o.company
                        FROM signline sl
                        INNER JOIN users u
                            ON u.id = sl.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        WHERE sl.id = ?;
                    `,
                [insertLine.id]
            );
            let sign_org = await getConnection().query(
                `
                    SELECT 
                        u.id,
                        u.id as 'user_id',
                        u.username,
                        e.name AS groupname,
                        e.company,
                        u.email,
                        u.admin_level,
                        p.name AS position,
                        p.priority
                    FROM organization e
                    INNER JOIN organization_type e_type
                        ON e_type.id = e.group_id
                    INNER JOIN users u
                        ON u.group_id = e.id
                        AND u.admin_level != 1
                        AND u.is_delete = 0
                    INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE e.name NOT LIKE '%관리자%'
                    ${form_data.group_id != 0 ? "AND e.group_id = ?" : ""}
                    ORDER BY e_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
                `,
                [form_data.group_id]
            );

            if (sign_data[0].is_regist) {
                let user_org = await getConnection().query(
                    `
                    select 
                        o_type.id 
                    from users u 
                    inner join organization o on o.id = u.group_id 
                    inner join organization_type o_type on o_type.id = o.group_id 
                    where 
                    u.id = ?
                    `,
                    [req.app.get("user_id")]
                );
                sign_org = await getConnection().query(
                    `
                    SELECT 
                        u.id,
                        u.id as 'user_id',
                        u.username,
                        e.name AS groupname,
                        e.company,
                        u.email,
                        u.admin_level,
                        p.name AS position,
                        p.priority
                    FROM organization e
                    INNER JOIN organization_type e_type
                        ON e_type.id = e.group_id
                    INNER JOIN users u
                        ON u.group_id = e.id
                        AND u.admin_level != 1
                        AND u.is_delete = 0
                    INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE e.group_id = ? AND e.name NOT LIKE '%관리자%'
                    ORDER BY e_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
                `,
                    [user_org[0].id]
                );
            }

            let referer_line = await getRepository(SignReferer).query(
                `
                    SELECT 
                        rf.id,
                        u.username,
                        u.email,
                        u.profile_img,
                        u.signature_img,
                        u.id AS 'user_id',
                        o.name as 'groupname',
                        o.company as 'company',
                        p.name as 'position'
                        FROM signreferer rf
                        INNER JOIN users u
                            ON u.id = rf.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        INNER JOIN position_type p
                            ON u.position = p.id
                        WHERE rf.sign_id = ?;
                    `,
                [insertSign.id]
            );

            if (sign_data.length > 0) {
                sign_data[0].doc_cc = refer_str;

                let user_org = await getRepository(Organization).findOne({ id: user.group_id });
                let user_org_type = await getRepository(OrganizationType).findOne({
                    id: user_org.group_id,
                });
                let document_type = "";
                if (user_org_type.id == form_data.group_id) {
                    document_type = "발신문서";
                } else {
                    document_type = "수신문서";
                }
                sign_data[0].pdf_name = `${document_type}_${
                    sign_data.sended_at
                        ? getDateValue(sign_data.sended_at)
                        : getDateValue(sign_data.updated_at)
                }_${sign_data.document_code}`;
                return getSuccessResponse(res, {
                    sign_data: sign_data[0],
                    sign_line,
                    sign_org,
                    referer_line,
                });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            if (typeof req.query.sign_id == "string") {
                let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
                let _user_org = await getRepository(Organization).findOne({ id: _user.group_id });
                let _user_org_type = await getRepository(OrganizationType).findOne({
                    id: _user_org.group_id,
                });
                let _sign_data = await getRepository(Signdata).query(
                    `
                    SELECT 
                        sd.*,
                        sd.html_header as 'doc_header',
                        sd.html_footer as 'doc_footer',
                        sf.title as 'form_title',
                        sf.form,
                        sf.form_key,
                        sf.group_id as 'form_group_id',
                        sf.org_id AS 'form_org_id',
                        e.name AS 'group',
                        e.company AS 'company'
                    FROM signdata sd
                    INNER JOIN signform sf
                        ON sf.id = sd.form_id
                    INNER JOIN organization e
                    	ON e.group_id = sf.group_id
                    WHERE sd.id = ?
                    `,
                    [req.query.sign_id]
                );

                if (_sign_data == undefined || _sign_data.length == 0)
                    throw Error("잘못된 결재 정보");

                let sign_data = _sign_data[0];
                let recv_data = await getRepository(SignRecvList).findOne({
                    sign_id: parseInt(req.query.sign_id),
                    user_id: req.app.get("user_id"),
                });
                let sign_line = await getRepository(Signline).query(
                    `
                        SELECT 
                            sl.id,
                            sl.state,
                            u.username,
                            u.email,
                            u.profile_img,
                            u.signature_img,
                            sl.approval_at,
                            sl.created_at,
                            u.id AS 'user_id',
                            o.name as groupname,
                            o.company,
                            p.name as 'position'
                        FROM signline sl
                        INNER JOIN users u
                            ON u.id = sl.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        INNER JOIN position_type p
                            ON p.id = u.position
                        WHERE sl.sign_id = ?
                        ORDER BY sl.order ASC;
                    `,
                    [req.query.sign_id]
                );

                let signed_user = await getConnection().query(
                    `
                        select
                            u.id,
                            u.username,
                            sl.state,
                            sl.order,
                            o_type.id as 'org_id',
                            u.doc_mng,
                            p.name as 'position'
                        from signline sl
                        inner join signdata sd
                            on sd.id = sl.sign_id
                            and sd.id = ?
                        inner join users u
                            on u.id = sl.user_id
                        inner join organization o
                            on o.id = u.group_id
                        inner join organization_type o_type
                            on o_type.id = o.group_id
                        inner join position_type p
                            on p.id = u.position
                        where state = 1 || state = 3
                            order by sl.order desc limit 1`,
                    [req.query.sign_id]
                );

                let referer_line = await getRepository(SignReferer).query(
                    `
                        SELECT 
                            rf.id,
                            u.username,
                            u.email,
                            u.profile_img,
                            u.signature_img,
                            u.id AS 'user_id',
                            o.name as 'groupname',
                            o.company as 'company',
                            p.name as 'position'
                        FROM signreferer rf
                        INNER JOIN users u
                            ON u.id = rf.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        INNER JOIN position_type p
                            ON u.position = p.id
                        WHERE rf.sign_id = ? AND rf.is_out_refer = 0;
                    `,
                    [req.query.sign_id]
                );

                let sign_comment = await getConnection().query(
                    `
                    SELECT
                        sc.created_at,
                        sc.comment,
                        sc.comment,
                        u.username,
                        o.name as 'group',
                        p.name as 'position',
                        sc.type
                        FROM signcomment sc
                        INNER JOIN users u
                            ON u.id = sc.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        INNER JOIN position_type p
                            ON p.id = u.position
                        WHERE sc.sign_id = ?;
                    `,
                    [req.query.sign_id]
                );
                // sign file list
                let sign_files = await getRepository(Signfile).find({ sign_id: sign_data.id });
                //
                // 문서 채번
                let sign_form = await getRepository(Signform).findOne({ id: sign_data.form_id });
                //const { document_code } = await getDocumentId(sign_data, sign_form, sign_data.document_id, false, sign_data.sign_state < 2);
                //
                // 문서 조직
                let sign_org = await getConnection().query(
                    `
                    SELECT 
                        u.id,
                        u.id as 'user_id',
                        u.username,
                        u.sub_field,
                        u.signature_img,
                        u.sign_img,
                        e.name AS groupname,
                        e.company,
                        u.email,
                        u.admin_level,
                        p.name AS position,
                        o_type.signature_img,
                        p.priority
                    FROM organization e
                    INNER JOIN users u
                        ON u.group_id = e.id
                        AND u.admin_level != 1
                        AND u.is_delete = 0
                    INNER JOIN position_type p
                        ON p.id = u.position
                    INNER JOIN organization_type o_type
                        ON o_type.id = e.group_id
                    WHERE e.name NOT LIKE '%관리자%'
                    ${
                        sign_data.is_regist
                            ? "AND e.group_id =" + _user_org_type.id
                            : sign_form.group_id != 0
                            ? "AND e.group_id = " + sign_form.group_id
                            : ""
                    }
                    ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
                `,
                    [sign_form.group_id]
                );

                let sign_register = null;
                sign_register = await getConnection().query(`
                    SELECT
                        u.username,
                        o.name AS groupname,
                        p.name AS position,
                        o_type.company
                    FROM users u
                    INNER JOIN signregister sr
                        ON sr.sign_id = ${req.query.sign_id}
                    INNER JOIN position_type p
                        ON p.id = u.position
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN organization_type o_type
                        ON o_type.id = o.group_id
                    WHERE u.id = sr.user_id;
                `);
                if (sign_data.is_regist) {
                    let user_org = await getConnection().query(
                        `
                        select 
                            o_type.id 
                        from users u 
                        inner join organization o on o.id = u.group_id 
                        inner join organization_type o_type on o_type.id = o.group_id 
                        where 
                        u.id = ?
                        `,
                        [req.app.get("user_id")]
                    );
                    sign_org = await getConnection().query(
                        `
                        SELECT 
                            u.id,
                            u.id as 'user_id',
                            u.username,
                            e.name AS groupname,
                            e.company,
                            u.email,
                            u.admin_level,
                            p.name AS position,
                            o_type.signature_img,
                            p.priority
                        FROM organization e
                        INNER JOIN users u
                            ON u.group_id = e.id
                            AND u.admin_level != 1
                            AND u.is_delete = 0
                        INNER JOIN position_type p
                            ON p.id = u.position
                        INNER JOIN organization_type o_type
                            ON o_type.id = e.group_id
                        WHERE e.group_id = ? AND e.name NOT LIKE '%관리자%'
                        ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
                    `,
                        [user_org[0].id]
                    );
                    //regist_sign_id
                }

                let same_org_check = await getConnection().query(
                    `
                    SELECT * 
                        FROM users u 
                        INNER JOIN organization o 
                        ON o.id = u.group_id 
                        INNER JOIN organization_type o_type 
                        ON o_type.id = o.group_id 
                            AND o_type.id = ?
                        WHERE u.id = ?
                `,
                    [signed_user[0] ? signed_user[0].org_id : -1, req.app.get("user_id")]
                );
                // 수신 회사 텍스트 생성
                sign_data.recv_company_list = sign_data.doc_recv;
                //
                // 참조처 텍스트 생성
                let out_referer = await getConnection().query(`
                    SELECT 
                        u.username,
                        o_type.company as 'company',
                        p.name as 'position'
                    FROM signreferer rf
                    INNER JOIN users u
                        ON u.id = rf.user_id
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN organization_type o_type
                        ON o_type.id = o.group_id
                    INNER JOIN position_type p
                        ON u.position = p.id
                    WHERE rf.sign_id = ${sign_data.id} AND rf.is_out_refer = 1;
                `);
                let refer_str = "";
                for (var refer of out_referer) {
                    if (refer_str.length != 0) refer_str += " , ";
                    if (refer.position.indexOf("대표이사") != -1)
                        refer_str += `${refer.company} ${refer.position}`;
                    else refer_str += `${refer.company} ${refer.position} ${refer.username}`;
                }
                sign_data.doc_cc = refer_str;
                let creator_user_id = sign_data.user_id;
                if (sign_data.is_regist == 1) {
                    let original_sign_data = await getRepository(Signdata).findOne({
                        id: sign_data.original_sign_id,
                    });
                    if (original_sign_data) creator_user_id = original_sign_data.user_id;
                }
                let create_user = await getRepository(User).findOne({ id: creator_user_id });
                if (create_user) {
                    let create_user_position = await getRepository(PositionType).findOne({
                        id: create_user.position,
                    });
                    sign_data.creator = `${create_user_position.name} ${create_user.username}`;
                }

                let received_sign_at_comp = "";
                if (sign_data.original_sign_id == -1) {
                    let recv_sign_datas = await getRepository(Signdata).find({
                        original_sign_id: sign_data.id,
                    });
                    for (var data of recv_sign_datas) {
                        if (data.is_regist && data.registed_at && data.recv_company_id != -1) {
                            let recv_sign_register = await getConnection().query(`
                                SELECT
                                    o_type.company
                                FROM signregister sr
                                INNER JOIN users u
                                    ON u.id = sr.user_id
                                INNER JOIN organization o
                                    ON o.id = u.group_id
                                INNER JOIN organization_type o_type
                                    ON o_type.id = o.group_id
                                WHERE sr.sign_id = ${data.id}
                            `);
                            if (recv_sign_register && recv_sign_register.length > 0) {
                                if (received_sign_at_comp.length > 0) received_sign_at_comp += "\n";
                                received_sign_at_comp += `${getDateValue(data.registed_at)} ${
                                    recv_sign_register[0].company
                                }`;
                            }
                        }
                    }
                }
                sign_data.received_sign_at_comp = received_sign_at_comp;
                //pdf naming
                let user_org = await getRepository(Organization).findOne({ id: _user.group_id });
                let user_org_type = await getRepository(OrganizationType).findOne({
                    id: user_org.group_id,
                });
                let document_type = "";
                if (user_org_type.id == sign_form.group_id) {
                    document_type = "발신문서";
                } else {
                    document_type = "수신문서";
                }
                sign_data.pdf_name = `${document_type}_${
                    sign_data.sended_at
                        ? getDateValue(sign_data.sended_at)
                        : getDateValue(sign_data.updated_at)
                }_${sign_data.document_code}`;
                //
                return getSuccessResponse(res, {
                    sign_data,
                    is_doc_mng: recv_data ? recv_data.is_doc_mng : false,
                    sign_line,
                    signed_user,
                    referer_line,
                    sign_comment,
                    sign_files,
                    sign_org,
                    sign_register: sign_register && sign_register.length > 0 ? sign_register : null,
                    is_diff_org: same_org_check.length == 0,
                });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.delete("/delete_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            const id = parseInt(req.query.sign_id.toString());
            let sign = await await getRepository(Signdata).findOne({
                id: id,
                user_id: req.app.get("user_id"),
            });
            if (sign) {
                let files = await getRepository(Signfile).find({ sign_id: sign.id });
                if (files.length > 0) {
                    for (var file of files) {
                        await deleteFile(file.filename);
                    }
                }
                await getRepository(Signdata).delete({ id: sign.id });
                await getRepository(SignRecvList).delete({ sign_id: sign.id });
                await getRepository(Signline).delete({ sign_id: sign.id });
                await getRepository(SignReferer).delete({ sign_id: sign.id });
                await getRepository(SignRegister).delete({ sign_id: sign.id });
                await getRepository(Signfile).delete({ sign_id: sign.id });

                let original_sign_datas = await getRepository(Signdata).find({
                    original_sign_id: sign.id,
                });
                for (var sd of original_sign_datas) {
                    await getRepository(Signdata).delete({ id: sd.id });
                    await getRepository(SignRecvList).delete({ sign_id: sd.id });
                    await getRepository(Signline).delete({ sign_id: sd.id });
                    await getRepository(SignReferer).delete({ sign_id: sd.id });
                    await getRepository(SignRegister).delete({ sign_id: sd.id });
                    await getRepository(Signfile).delete({ sign_id: sd.id });
                }
            }
            await getRepository(SignRecvList).delete({ sign_id: sd.id });
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/set_sign_referer", async (req: Request, res: Response) => {
    try {
        const referer_line = await getRepository(SignReferer).find({
            where: { sign_id: req.body.sign_id, is_out_refer: 0 },
        });
        const sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });
        for (let referer of req.body.referer_line) {
            if (referer_line.find((val, idx) => val.user_id == referer)) continue;
            let new_referer_line = new SignReferer();
            new_referer_line.user_id = referer;
            new_referer_line.sign_id = req.body.sign_id;
            await getRepository(SignReferer).save(new_referer_line);
            let new_recv = new SignRecvList();
            new_recv.user_id = referer;
            new_recv.is_refer = 1;
            new_recv.sign_id = req.body.sign_id;
            new_recv.visible = false;
            await getRepository(SignRecvList).save(new_recv);
        }
        for (let referer of referer_line) {
            if (req.body.referer_line.indexOf(referer.user_id) != -1) continue;
            await getRepository(SignReferer).delete(referer);
            await getRepository(SignRecvList).delete({
                sign_id: req.body.sign_id,
                user_id: referer.user_id,
            });
        }
        // recvlist 비교 필요

        // let refer_list = await getConnection()
        //     .query(`
        //         SELECT
        //             u.id,
        //             o.company,
        //             o.name,
        //             u.username,
        //             p.name AS 'position'
        //         FROM users u
        //         INNER JOIN organization o
        //         ON o.id = u.group_id
        //         INNER JOIN signreferer sf
        //         ON sf.sign_id = ${req.body.sign_id}
        //         INNER JOIN position_type p
        //         ON p.id = u.position
        //         WHERE u.id = sf.user_id
        //     `);
        // let refer_str = "";
        // for(var refer of refer_list){
        //     if(refer_str.length != 0)
        //         refer_str += " , ";
        //     refer_str += `${refer.company} ${refer.username} ${refer.position}`;
        // }
        // sign_data.doc_cc = refer_str;
        // await getRepository(Signdata).update(sign_data.id, sign_data);

        return getSuccessResponse(res, { cc_str: sign_data.doc_cc });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/set_sign_line", async (req: Request, res: Response) => {
    try {
        const sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });
        const exist_line = await getRepository(Signline).find({
            where: { sign_id: req.body.sign_id },
        });
        if (req.body.sign_line) {
            for (var i = 0; i < req.body.sign_line.length; i++) {
                //} let line of req.body.sign_line){
                let findIdx = exist_line.findIndex(
                    (val, idx) => val.user_id == req.body.sign_line[i]
                );
                if (findIdx != -1) {
                    exist_line[findIdx].order = i;
                    await getRepository(Signline).update(
                        exist_line[findIdx].id,
                        exist_line[findIdx]
                    );
                } else {
                    let new_sign_line = new Signline();
                    new_sign_line.user_id = req.body.sign_line[i];
                    new_sign_line.sign_id = req.body.sign_id;
                    new_sign_line.state =
                        req.body.deferer_line.indexOf(req.body.sign_line[i]) != -1 ? 8 : 2;
                    new_sign_line.order = i;
                    await getRepository(Signline).save(new_sign_line);
                }
            }
            for (let line of exist_line) {
                if (
                    req.body.sign_line.indexOf(line.user_id) != -1 ||
                    line.user_id == sign_data.user_id
                )
                    continue;
                await getRepository(Signline).delete(line);
            }
        }

        if (req.body.deferer_line) {
            for (var i = 0; i < req.body.deferer_line.length; i++) {
                let findIdx = exist_line.findIndex(
                    (val, idx) => val.user_id == req.body.deferer_line[i]
                );
                if (findIdx != -1) {
                    exist_line[findIdx].state = 8;
                    await getRepository(Signline).update(
                        exist_line[findIdx].id,
                        exist_line[findIdx]
                    );
                }
            }
            const deferer_line = await getRepository(Signline).find({
                where: { sign_id: req.body.sign_id, state: 8 },
            });
            for (let line of deferer_line) {
                if (
                    req.body.deferer_line.indexOf(line.user_id) != -1 ||
                    line.user_id == sign_data.user_id
                )
                    continue;
                line.state = 2;
                await getRepository(Signline).update(line.id, line);
            }
        }
        let list = await getConnection().query(
            `
                SELECT 
                    sl.id,
                    sl.state,
                    u.username,
                    u.email,
                    u.profile_img,
                    u.signature_img,
                    sl.approval_at,
                    sl.created_at,
                    u.id AS 'user_id',
                    o.name as groupname,
                    o.company,
                    p.id as 'pid',
                    p.name as 'position',
                    p.priority as 'priority'
                FROM signline sl
                INNER JOIN users u
                    ON u.id = sl.user_id
                INNER JOIN organization o
                    ON o.id = u.group_id
                INNER JOIN position_type p
                    ON p.id = u.position
                WHERE sl.sign_id = ?
                ORDER BY sl.order ASC;
            `,
            [req.body.sign_id]
        );
        sign_data.is_ceo_signed = 0;
        for (var doc of list) {
            if (doc.state == 8 && doc.pid == 1) {
                sign_data.is_ceo_signed = 1;
                await getRepository(Signdata).update(sign_data.id, sign_data);
            }
        }
        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/temporary_save_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({
                id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });

            sign_data.title = !req.body.header
                ? ""
                : GetDataFromHtml(req.body.header + req.body.html, ["title"], []).input.toString();
            sign_data.html = req.body.html ? req.body.html : "";
            sign_data.html_header = req.body.header ? req.body.header : "";
            sign_data.html_footer = req.body.footer ? req.body.footer : "";
            sign_data.updated_at = new Date();
            await getRepository(Signdata).update(sign_data.id, sign_data);
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/request_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({
                id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });
            sign_data.sign_state = 1;
            if (sign_data.doc_type_id != 3) {
                sign_data.title = !req.body.header
                    ? ""
                    : GetDataFromHtml(
                          req.body.header + req.body.html,
                          ["title"],
                          []
                      ).input.toString();
                sign_data.html = req.body.html ? req.body.html : "";
                sign_data.html_header = req.body.header ? req.body.header : "";
                sign_data.html_footer = req.body.footer ? req.body.footer : "";
            }
            sign_data.updated_at = new Date();
            await getRepository(Signdata).update(sign_data.id, sign_data);

            if (!sign_data.is_regist)
                await getConnection()
                    .createQueryBuilder()
                    .update(Signdata)
                    .set({
                        title: !req.body.header
                            ? ""
                            : GetDataFromHtml(
                                  req.body.header + req.body.html,
                                  ["title"],
                                  []
                              ).input.toString(),
                        html: req.body.html ? req.body.html : "",
                        html_header: req.body.header ? req.body.header : "",
                        html_footer: req.body.footer ? req.body.footer : "",
                        updated_at: new Date(),
                    })
                    .where("original_sign_id = :id", { id: sign_data.id })
                    .execute();

            let sign_line = await getRepository(Signline).find({ sign_id: req.body.sign_id });
            // 재상신시 기존 반려했던 유저를 다시 결재가 가능하도록 처리.
            for (var line of sign_line) {
                if (line.state == 4) {
                    let updateRow = await getConnection()
                        .createQueryBuilder()
                        .update(Signline)
                        .set({ state: 2 })
                        .where("id = :id", { id: line.id })
                        .execute();
                    break;
                }
            }
            let _user = await getRepository(User).findOne({
                id: sign_line.length > 1 ? sign_line[1].user_id : sign_line[0].user_id,
            });
            let group = await getRepository(Organization).findOne({ id: _user.group_id });
            let company_group = await getRepository(OrganizationType).findOne({
                id: group.group_id,
            });
            let temp = true;
            if (company_group.id == 1) {
                for (var line of sign_line) {
                    let _user = await getRepository(User).findOne({ id: line.user_id });
                    let _org = await getRepository(Organization).findOne({ id: _user.group_id });
                    if (_org.group_id == 1 && _org.name == "대표이사") temp = false;
                }
            } else if (sign_data.is_regist) {
                temp = false;
            } else {
                temp = false;
            }
            if (temp) {
                // let new_sign_line = new Signline();
                // let team_leader = await getConnection().query(`
                //     SELECT
                //         u.id
                //         FROM users u
                //     INNER JOIN organization o
                //         ON o.name = '경영지원팀'
                //     INNER JOIN position_type p
                //         ON p.id = u.position
                //     WHERE u.group_id = o.id
                //         ORDER BY p.priority ASC;
                // `);
                // new_sign_line.user_id = team_leader[0].id;
                // new_sign_line.sign_id = req.body.sign_id;
                // new_sign_line.state = 2;
                // new_sign_line.order = sign_line.length+1;
                // await getRepository(Signline).save(new_sign_line);
            }
            await sendMail(
                _user.email,
                `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 요청 안내`,
                `결재 요청이 있습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/view/${sign_data.id}">결재 바로가기</a>`
            );
            //
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_comment = new Signcomment();
            sign_comment.sign_id = req.body.sign_id;
            sign_comment.comment = req.body.comment;
            sign_comment.user_id = req.app.get("user_id");
            sign_comment.type = 0;
            await getRepository(Signcomment).save(sign_comment);

            let updateRow = await getConnection()
                .createQueryBuilder()
                .update(Signdata)
                .set({
                    html: req.body.html,
                    html_header: req.body.header,
                    html_footer: req.body.footer,
                    title: GetDataFromHtml(
                        req.body.header + req.body.html,
                        ["title"],
                        []
                    ).input.toString(),
                })
                .where("id = :id", { id: req.body.sign_id })
                .execute();
            if (updateRow.affected > 0) return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/approval_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(Signline).find({
                where: { sign_id: req.body.sign_id, user_id: req.app.get("user_id") },
            });

            if (sign_line.length > 0) {
                if (sign_line[0].state == 3) return getSuccessResponse(res, false);
                sign_line[0].state = 3;
                sign_line[0].updated_at = new Date();
                sign_line[0].approval_at = new Date();
                await getRepository(Signline).update(sign_line[0].id, sign_line[0]);

                // 모든 결재가 완료되었는지 확인
                let not_sign_lines = await getRepository(Signline).find({
                    where: { sign_id: req.body.sign_id, state: 2 },
                });
                let sign_data = await getRepository(Signdata).findOne({
                    where: { id: req.body.sign_id },
                });
                let sign_form = await getRepository(Signform).findOne({ id: sign_data.form_id });
                if (not_sign_lines.length == 0) {
                    // const { docId, document_code } = await getDocumentId(sign_data, sign_form);
                    sign_data.sign_state = 2;
                    sign_data.document_id = sign_data.document_id;
                    sign_data.html = SetDataToHtml(
                        sign_data.html,
                        [{ doc_id: sign_data.document_code }],
                        []
                    );
                    await getRepository(Signdata).update(req.body.sign_id, sign_data);
                    let _user = await getRepository(User).findOne({ id: sign_data.user_id });
                    if (sign_data.is_regist && sign_data.original_sign_id != -1) {
                        // 접수한 문서 내부참조시
                        await getConnection()
                            .createQueryBuilder()
                            .update(SignRecvList)
                            .set({ sign_id: sign_data.id })
                            .where("sign_id = :id", { id: sign_data.original_sign_id })
                            .execute();
                    } else {
                        let in_refer = await getRepository(SignReferer).find({
                            sign_id: sign_data.id,
                            is_out_refer: 0,
                        });
                        let receive_list = [];
                        for (var ref of in_refer) {
                            receive_list.push({
                                sign_id:
                                    sign_data.original_sign_id != -1
                                        ? sign_data.original_sign_id
                                        : sign_data.id,
                                user_id: ref.user_id,
                                is_refer: 1,
                                visible: true,
                            });
                        }
                        await getConnection()
                            .createQueryBuilder()
                            .insert()
                            .into(SignRecvList)
                            .values(receive_list)
                            .execute();
                    }

                    await sendMail(
                        _user.email,
                        `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 완료`,
                        `귀하의 결재가 완료 되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/view/${sign_data.id}">결재 바로가기</a>`
                    );
                } else {
                    let _user = await getRepository(User).findOne({
                        id: not_sign_lines[0].user_id,
                    });
                    await sendMail(
                        _user.email,
                        `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 차례`,
                        `귀하의 결재 차례 입니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/view/${sign_data.id}">결재 바로가기</a>`
                    );
                }
                // 결재 코멘트 남기기
                if (req.body.comment && req.body.comment.length > 0) {
                    let sign_comment = new Signcomment();
                    sign_comment.comment = req.body.comment;
                    sign_comment.sign_id = sign_data.id;
                    sign_comment.user_id = req.app.get("user_id");
                    sign_comment.type = 2;
                    await getRepository(Signcomment).save(sign_comment);
                }
            }
            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/deferer_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(Signline).find({
                where: { sign_id: req.body.sign_id, user_id: req.app.get("user_id") },
            });
            if (sign_line.length > 0) {
                sign_line[0].state = 9;
                sign_line[0].updated_at = new Date();
                sign_line[0].approval_at = new Date();
                await getRepository(Signline).update(sign_line[0].id, sign_line[0]);
            }
            let sign_data = await getRepository(Signdata).findOne({
                where: { id: req.body.sign_id },
            });
            // 결재 코멘트 남기기
            if (req.body.comment && req.body.comment.length > 0) {
                let sign_comment = new Signcomment();
                sign_comment.comment = req.body.comment;
                sign_comment.sign_id = sign_data.id;
                sign_comment.user_id = req.app.get("user_id");
                sign_comment.type = 2;
                await getRepository(Signcomment).save(sign_comment);
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/prev_approval_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(Signline).find({
                where: { sign_id: req.body.sign_id, user_id: req.app.get("user_id") },
            });
            if (sign_line.length > 0) {
                if (sign_line[0].state == 6) return getSuccessResponse(res, false);
                sign_line[0].state = 6;
                sign_line[0].updated_at = new Date();
                sign_line[0].approval_at = new Date();
                await getRepository(Signline).update(sign_line[0].id, sign_line[0]);

                let prev_line = await getRepository(Signline).find({
                    sign_id: req.body.sign_id,
                    user_id: Not(req.app.get("user_id")),
                    state: 2,
                });
                let _user = await getRepository(User).findOne({ id: sign_line[0].user_id });
                let group = await getRepository(Organization).findOne({ id: _user.group_id });
                let company_group = await getRepository(OrganizationType).findOne({
                    id: group.group_id,
                });
                let temp = false;
                for (var line of prev_line) {
                    let team_leader = await getConnection().query(`
                        SELECT 
                            u.id
                            FROM users u 
                        INNER JOIN organization o 
                            ON o.name = '경영지원팀' 
                        INNER JOIN position_type p 
                            ON p.id = u.position
                        WHERE u.group_id = o.id
                            ORDER BY p.priority DESC;
                    `);
                    if (
                        company_group.id == 1 &&
                        team_leader.length > 0 &&
                        team_leader[0].id == line.user_id
                    )
                        temp = true;
                    else line.state = 7;
                    await getRepository(Signline).update(line.id, line);
                }
                // 결재 문서 완료처리
                let sign_data = await getRepository(Signdata).findOne({
                    where: { id: req.body.sign_id },
                });
                sign_data.sign_state = temp ? 1 : 2;
                await getRepository(Signdata).update(req.body.sign_id, sign_data);

                // 전결 코멘트 남기기
                if (req.body.comment && req.body.comment.length > 0) {
                    let sign_comment = new Signcomment();
                    sign_comment.comment = req.body.comment;
                    sign_comment.sign_id = sign_data.id;
                    sign_comment.user_id = req.app.get("user_id");
                    sign_comment.type = 4;
                    await getRepository(Signcomment).save(sign_comment);
                }
                return getSuccessResponse(res, true);
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/send_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({
                id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });
            sign_data.sign_state = 3;
            sign_data.sended_at = getDateTime();
            await getRepository(Signdata).update(sign_data.id, sign_data);
            await getConnection()
                .createQueryBuilder()
                .update(Signdata)
                .set({
                    sign_state: 3,
                    sended_at: getDateTime(),
                    title: sign_data.title,
                    html: sign_data.html,
                    html_header: sign_data.html_header,
                    html_footer: sign_data.html_footer,
                })
                .where({ original_sign_id: sign_data.id })
                .execute();
            // 수신자 , 참조자
            // 처음 추가해준 수신, 참조인의 수신함에서도 보이도록
            await getConnection()
                .createQueryBuilder()
                .update(SignRecvList)
                .set({ visible: true })
                .where({ sign_id: sign_data.id })
                .execute();
            // 수신자, 참조자 메일 전송
            let sign_recver = await getRepository(SignRecvList).find({ sign_id: sign_data.id });
            for (var recver of sign_recver) {
                let _user = await getRepository(User).findOne({ id: recver.user_id });
                await sendMail(
                    _user.email,
                    `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 수신`,
                    `공문서가 수신되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/recv/${sign_data.id}">결재 바로가기</a>`
                );
            }

            let signdatas = await getRepository(Signdata).find({ original_sign_id: sign_data.id });
            let files = await getRepository(Signfile).find({ sign_id: sign_data.id });
            for (var signdata of signdatas) {
                if (signdata.original_sign_id == -1) continue;
                await getConnection()
                    .createQueryBuilder()
                    .update(SignRecvList)
                    .set({ visible: true })
                    .where({ sign_id: signdata.id })
                    .execute();
                let sign_recver = await getRepository(SignRecvList).find({ sign_id: signdata.id });
                for (var recver of sign_recver) {
                    let _user = await getRepository(User).findOne({ id: recver.user_id });
                    await sendMail(
                        _user.email,
                        `[통영에코파워 문서관리시스템 알림] <${signdata.title}> 수신`,
                        `공문서가 수신되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/recv/${sign_data.id}">결재 바로가기</a>`
                    );
                }
                for (var file of files) {
                    let new_sign_file = new Signfile();
                    new_sign_file.filename = file.filename;
                    new_sign_file.sign_id = signdata.id;
                    new_sign_file.size = file.size;
                    new_sign_file.url = file.url;
                    await getRepository(Signfile).save(new_sign_file);
                }
            }
            let receive_list = [];
            let refer_list = await getRepository(SignReferer).find({
                sign_id: sign_data.id,
                is_out_refer: 1,
            });
            for (var ref of refer_list) {
                if (
                    receive_list.find((val, idx) => val.user_id == ref.user_id) ||
                    sign_data.is_regist
                )
                    continue;
                let recv_user = await getRepository(User).findOne({ id: ref.user_id });
                let org = await getRepository(Organization).findOne({ id: recv_user.group_id });
                let signdata = await getRepository(Signdata).findOne({
                    original_sign_id: sign_data.id,
                    recv_company_id: org.group_id,
                });
                receive_list.push({
                    sign_id: signdata ? signdata.id : sign_data.id,
                    user_id: ref.user_id,
                    is_refer: 1,
                    visible: true,
                });
                await sendMail(
                    recv_user.email,
                    `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 수신`,
                    `공문서가 수신되었습니다.<br /><a target="_blank" href="${
                        process.env.ORIGIN
                    }/document/recv/${signdata ? signdata.id : sign_data.id}">결재 바로가기</a>`
                );
            }

            await getConnection()
                .createQueryBuilder()
                .insert()
                .into(SignRecvList)
                .values(receive_list)
                .execute();
            //
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_sign_forms", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            if (!user.approved) throw Error("인증되지 않은 유저입니다.");
            if (user.admin_level == 1) {
                let _list = await getRepository(Signform).query(`
                    SELECT 
                    sf.id, 
                    sf.title, 
                    sf.form,
                    o_type.company,
                    sf.cop_type_id,
                    sf.doc_type_id,
                    sf.doc_org_id,
                    sf.doc_proj_id
                    FROM signform sf
                    INNER JOIN organization_type o_type
                        ON o_type.id = sf.group_id
                    ORDER BY sf.form_order ASC, o_type.id asc;
                `);
                let list = [];
                let exist = [];
                for (var l of _list) {
                    if (exist.indexOf(l.id) == -1) {
                        list.push(l);
                        exist.push(l.id);
                    }
                }
                return getSuccessResponse(res, [...list]);
            }
            let list = await getRepository(Signform).query(
                `
                    SELECT 
                        sf.id, 
                        sf.title, 
                        sf.form,
                        e.name, 
                        e.company,
                        p.name as 'position',
                        sf.cop_type_id,
                        sf.doc_type_id,
                        sf.doc_org_id,
                        sf.doc_proj_id,
                        sf.org_id
                    FROM signform sf 
                    INNER JOIN users u
                        ON u.id = ?
                    INNER JOIN organization e 
                        ON e.id = u.group_id
                        and e.group_id = sf.group_id
                    INNER JOIN organization_type e_type
                        ON e_type.id = e.group_id
                    INNER JOIN position_type p
                        ON u.position = p.id
                    WHERE sf.is_delete = 0 AND NOT sf.id = 0
                    ORDER BY sf.form_order ASC, e_type.id ASC;
                `,
                [req.app.get("user_id")]
            );
            for (var _list of list) {
                if (_list.org_id != 0) {
                    let _org = await getRepository(Organization).findOne({ id: _list.org_id });
                    _list.ishead = _org.is_head;
                }
            }
            return getSuccessResponse(res, [...list]);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_normal_document_user_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let _user_list = await getConnection().query(`
                SELECT 
                    u.id,
                    u.username,
                    o_type.company,
                    o.name as 'part',
                    o_type.id as 'org_id',
                    o_type.company_abbr as 'com_abbr',
                    p.name AS position
                FROM users u
                INNER JOIN position_type p
                    ON p.id = u.position
                INNER JOIN organization o
                    ON o.id = u.group_id
                    AND o.name NOT LIKE '%관리자%'
                INNER JOIN organization_type o_type
                    ON o_type.id = o.group_id
                WHERE u.admin_level != 1 AND u.is_delete = 0 AND u.approved = 1
                ORDER BY o_type.id ASC, o.group_order DESC, p.priority ASC, u.username ASC;
            `);
            let user_list = [];
            let doc_org_list = await getRepository(DocOrganizationType).find();
            for (var u of _user_list) {
                let doc_org = doc_org_list.find(raw=> raw.group_id == u.org_id);
                if(doc_org){
                    u.doc_group_id = doc_org.id;
                }
                user_list.push(u);
            }
            return getSuccessResponse(res, user_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_sign_form_details", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            let userOrg = await getRepository(Organization).findOne({ id: user.group_id });
            if (!user.approved) throw Error("인증되지 않은 유저입니다.");
            let total = [];
            let list = await getRepository(Signform).find({
                select: ["id", "title", "select_num_id", "group_id"],
                where : { id : Not(0) },
                order: { group_id: "ASC" },
            });
            let copList = await getRepository(DocCopType).find({ select: ["id", "text"] });
            let docTypeList = await getRepository(DocType).find({ select: ["id", "text"] });
            let docOrgList = await getConnection().query(`
                SELECT 
                    doc.*,
                    o_type.id as 'org_group_id'
                FROM doc_organization_type doc
                INNER JOIN organization_type o_type
                    ON o_type.id = doc.group_id
                WHERE doc.group_id = ${userOrg.group_id};
            `);
            let recv_list = await getConnection().query(`
                SELECT 
                    doc.*,
                    o_type.id as 'org_group_id'
                FROM doc_organization_type doc
                INNER JOIN organization o 
                    ON o.id = ${user.group_id}
                INNER JOIN organization_type o_type
                    ON o_type.id = doc.group_id
            `);
            let docProjCode = await getRepository(DocProjCodeType).find({ select: ["id", "text"] });
            let _user_list = await getConnection().query(`
                    SELECT 
                        u.id,
                        u.username,
                        u.approved,
                        u.sub_field,
                        o_type.company,
                        o.name as 'part',
                        o_type.id as 'org_id',
                        o_type.company_abbr as 'com_abbr',
                        p.name AS position,
                        p.priority
                    FROM users u
                    INNER JOIN position_type p
                        ON p.id = u.position
                    INNER JOIN organization o
                        ON o.id = u.group_id
                        AND o.name NOT LIKE '%관리자%'
                    INNER JOIN organization_type o_type
                        ON o_type.id = o.group_id
                    WHERE u.admin_level != 1 AND u.is_delete = 0 AND u.approved = 1
                    ORDER BY o_type.id ASC, o.group_order DESC, o.name ASC, p.priority ASC, u.username ASC;
                `);
            let user_list = [];
            let doc_org_list = await getRepository(DocOrganizationType).find();
            for (var u of _user_list) {
                if (u.org_id == userOrg.group_id) continue;
                let doc_org = doc_org_list.find(raw=> raw.group_id == u.org_id);
                u.doc_group_id = doc_org.id;
                user_list.push(u);
            }
            let doc_mng_list = await getConnection().query(`
                SELECT 
                    u.id, 
                    u.username,
                    u.doc_mng,
                    o_type.company,
                    o_type.id as 'org_id',
                    doc.id as 'doc_group_id'
                FROM users u
                INNER JOIN organization o
                    ON u.group_id = o.id
                INNER JOIN organization_type o_type
                    ON o_type.id = o.group_id
                INNER JOIN doc_organization_type doc
                    ON doc.group_id = o_type.id
            `);
            let doc_mng_list_public = doc_mng_list.filter(raw=> raw.doc_mng == 1);
            for (var l of list) {
                let obj = { ...l };
                let otype = await getRepository(OrganizationType).findOne({ id: l.group_id });
                if (l.select_num_id == 1) {
                    Object.assign(obj, { cop: copList });
                    Object.assign(obj, { docType: docTypeList });
                    Object.assign(obj, { vendor: docOrgList });
                    Object.assign(obj, { beneficiary: docOrgList });
                    Object.assign(obj, { projectCode: docProjCode });
                }
                Object.assign(obj, { recv: recv_list });
                Object.assign(obj, { recv_doc_mng: l.group_id == 0 ? doc_mng_list : doc_mng_list_public });
                Object.assign(obj, { refer: user_list });
                Object.assign(obj, { company: otype.company });
                total.push(obj);
            }
            return getSuccessResponse(res, total);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_organization_chart", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getRepository(Organization).query(`
                    SELECT 
                        u.id,
                        u.id as 'user_id',
                        u.username,
                        e.name AS groupname,
                        e.company,
                        e.id AS 'org_id',
                        u.email,
                        u.admin_level,
                        p.name AS position
                    FROM organization e
                    INNER JOIN users u
                        ON u.group_id = e.id
                        AND u.admin_level != 1
                        AND u.admin_level != 5
                        AND u.is_delete = 0
                        AND u.approved = 1
                    INNER JOIN position_type p
                        ON p.id = u.position
                    INNER JOIN organization_type o_type
                        ON o_type.id = e.group_id
                    WHERE e.name NOT LIKE '%관리자%'
                    ORDER BY o_type.id ASC, e.group_order DESC, p.priority ASC, u.username ASC;
                `);
            let alllist = await getRepository(Organization).query(`
                            SELECT
                            u.id,
                            u.id as 'user_id',
                            u.username,
                            e.name AS groupname,
                            e.company,
                            e.id AS 'org_id',
                            u.email,
                            u.admin_level,
                            p.name AS position
                        FROM organization e
                        INNER JOIN users u
                            ON u.group_id = e.id
                            AND u.admin_level != 1
                            AND u.admin_level != 5
                            AND u.is_delete = 0
                            AND u.approved = 1
                        INNER JOIN position_type p
                            ON p.id = u.position
                        INNER JOIN organization_type o_type
                            ON o_type.id = e.group_id
                        WHERE e.name NOT LIKE '%관리자%'
                        ORDER BY o_type.id, p.priority , u.username ASC;
                    `);
            return getSuccessResponse(res, { list: list, alllist: alllist });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getSuccessResponse(res);
});

router.get("/get_sign_line", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getConnection().query(
                `
                    SELECT 
                        sl.id,
                        sl.state,
                        u.username,
                        u.email,
                        u.profile_img,
                        u.signature_img,
                        sl.approval_at,
                        sl.created_at,
                        u.id AS 'user_id',
                        o.id AS 'group_id',
                        o.name as groupname,
                        o.company,
                        p.name as 'position',
                        p.priority as 'priority'
                    FROM signline sl
                    INNER JOIN users u
                        ON u.id = sl.user_id
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE sl.sign_id = ?
                    ORDER BY sl.order ASC;
                `,
                [req.query.sign_id]
            );

            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/reject_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });
            let creator = await getRepository(User).findOne({ id: sign_data.user_id });

            sign_data.sign_state = 4;
            await getRepository(Signdata).update(sign_data.id, sign_data);

            let sign_line = await getRepository(Signline).findOne({
                sign_id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });

            sign_line.state = 4;
            await getRepository(Signline).update(sign_line.id, sign_line);

            let sign_comment = new Signcomment();
            sign_comment.sign_id = req.body.sign_id;
            sign_comment.comment = req.body.comment;
            sign_comment.type = 1;
            sign_comment.user_id = req.app.get("user_id");
            await getRepository(Signcomment).save(sign_comment);
            await sendMail(
                creator.email,
                `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 반려`,
                `귀하의 결재가 반려 되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/view/${sign_data.id}">결재 바로가기</a>`
            );
            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/cancel_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });

            if (req.body.user_state != 1) {
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(Signline)
                    .set({ state: 2 })
                    .where("sign_id = :id AND user_id = :userid ", {
                        id: req.body.sign_id,
                        userid: req.app.get("user_id"),
                    })
                    .execute();
            } else {
                let is_sign_line = await getRepository(Signline).findOne({
                    state: 3,
                    sign_id: req.body.sign_id,
                });
                if (is_sign_line) return getSuccessResponse(res, false);
                sign_data.sign_state = 0;
                await getRepository(Signdata).update(sign_data.id, sign_data);
            }
            let sign_comment = new Signcomment();
            sign_comment.sign_id = req.body.sign_id;
            sign_comment.comment = req.body.comment;
            sign_comment.type = 3;
            sign_comment.user_id = req.app.get("user_id");
            await getRepository(Signcomment).save(sign_comment);

            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

const uploadBlockScopeReg = /[\!|\*||\;|\:|\@|\&|\=|\+|\$|\/|\?|\#]/gi;
router.post("/upload_file", async (req: Request, res: Response) => {
    let errMsg = '';
    try {
        const file = req.files[0];
        let checkReg = new RegExp(uploadBlockScopeReg);
        let checkRegResult = checkReg.exec(file.filename)
        if(checkRegResult != null){
            errMsg = checkRegResult[0] + ' 특수문자는 파일이름에 포함될 수 없습니다.';
            throw new Error("특수문자 에러");
        }
        if (req.app.get("user_id")) {
            let upload = new Signfile();
            upload.url = `${fileDir + file.filename}`;
            upload.sign_id = req.body.sign_id;
            upload.size = file.size;
            upload.filename = `${file.filename}`;
            await getRepository(Signfile).save(upload);
            let list = await getRepository(Signfile).find({ sign_id: req.body.sign_id });
            return getSuccessResponse(res, list);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, errMsg);
});

router.delete("/delete_file", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            const file_id = parseInt(req.query.file_id.toString())
            let sign_file = await getRepository(Signfile).findOne({ id: file_id });
            if (sign_file) {
                await deleteFile(sign_file.filename); //file delete
                await getRepository(Signfile).remove(sign_file);
            }
            return getSuccessResponse(res);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/regist_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            let _user_org = await getRepository(Organization).findOne({ id: _user.group_id });
            let sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });
            let sign_recv = await getRepository(SignRecvList).findOne({
                sign_id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });
            let referer = await getRepository(SignReferer).findOne({
                sign_id: req.body.sign_id,
                user_id: req.app.get("user_id"),
            });

            if (sign_data.sign_state == 6 || (referer && referer.is_out_refer == 0))
                return getSuccessResponse(res, { res: false });

            let sign_files = await getRepository(Signfile).find({
                sign_id:
                    sign_data.original_sign_id != -1
                        ? sign_data.original_sign_id
                        : req.body.sign_id,
            });
            let sign_register = await getRepository(SignRegister).findOne({
                sign_id: req.body.sign_id,
            });
            let sign_referer = await getRepository(SignReferer).find({
                sign_id: req.body.sign_id,
                is_out_refer: 1,
            });
            sign_data.sign_state = 6;
            sign_data.registed_at = getDateTime();
            sign_data.is_regist = true;

            let new_sign_data = new Signdata();
            new_sign_data.form_id = sign_data.form_id;
            new_sign_data.group_id = _user_org.group_id;
            new_sign_data.title = sign_data.title;
            new_sign_data.html = sign_data.html;
            new_sign_data.html_header = sign_data.html_header;
            new_sign_data.html_footer = sign_data.html_footer;
            new_sign_data.cop_id = sign_data.cop_id;
            new_sign_data.doc_type_id = sign_data.doc_type_id;
            new_sign_data.doc_org_send_id = sign_data.doc_org_send_id;
            new_sign_data.doc_org_recv_id = sign_data.doc_org_recv_id;
            new_sign_data.doc_proj_code_id = sign_data.doc_proj_code_id;
            new_sign_data.department_id = 0;
            new_sign_data.issue_signature_img = sign_data.issue_signature_img;
            new_sign_data.recv_signature_img = sign_data.recv_signature_img;
            new_sign_data.document_id = sign_data.document_id;
            new_sign_data.sended_at = sign_data.sended_at;
            new_sign_data.registed_at = getDateTime();
            new_sign_data.doc_sender = sign_data.doc_sender;
            new_sign_data.doc_tel = sign_data.doc_tel;
            new_sign_data.doc_fax = sign_data.doc_fax;
            new_sign_data.doc_email = sign_data.doc_email;
            new_sign_data.doc_recv = sign_data.doc_recv;
            new_sign_data.doc_date = sign_data.doc_date;
            new_sign_data.document_code = sign_data.document_code;
            new_sign_data.user_id = sign_register.user_id;
            new_sign_data.sign_state = 0;
            // 기존 문서 정보를 위한 original id 부여
            new_sign_data.original_sign_id = sign_data.id;
            //채번
            //
            new_sign_data.document_id = sign_data.document_id;
            new_sign_data.is_regist = true;
            new_sign_data.document_year = sign_data.document_year;
            //
            let insertSign = await getRepository(Signdata).save(new_sign_data);
            sign_data.regist_sign_id = insertSign.id;
            await getRepository(Signdata).update(sign_data.id, sign_data);
            let new_line = new Signline();
            new_line.user_id = sign_register.user_id;
            new_line.sign_id = insertSign.id;
            new_line.state = 1;
            await getRepository(Signline).save(new_line);

            let new_register = new SignRegister();
            new_register.user_id = sign_register.user_id;
            new_register.sign_id = insertSign.id;
            await getRepository(SignRegister).save(new_register);

            //file 복사
            for (var file of sign_files) {
                let new_sign_file = new Signfile();
                new_sign_file.filename = file.filename;
                new_sign_file.sign_id = insertSign.id;
                new_sign_file.size = file.size;
                new_sign_file.url = file.url;
                await getRepository(Signfile).save(new_sign_file);
            }
            //

            // 참조자 텍스트를 위한 참조자 복사
            for (var refer of sign_referer) {
                let new_sign_refer = new SignReferer();
                new_sign_refer.sign_id = insertSign.id;
                new_sign_refer.user_id = refer.user_id;
                new_sign_refer.is_out_refer = 1;
                await getRepository(SignReferer).save(new_sign_refer);
            }

            let updateRow = await getConnection()
                .createQueryBuilder()
                .update(SignRecvList)
                .set({ is_doc_mng: false })
                .where("sign_id = :id AND user_id = :userid ", {
                    id: req.body.sign_id,
                    userid: req.app.get("user_id"),
                })
                .execute();

            return getSuccessResponse(res, {
                res: true,
                regist_id: new_sign_data.user_id == req.app.get("user_id") ? new_sign_data.id : -1,
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_regist_box_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getRepository(Signdata).query(
                `
                    SELECT
                        sd.*,
                        sf.title AS form,
                        sd.updated_at AS 'time',
                        u.username AS creator,
                        sd.created_at AS 'date',
                        sd.registed_at AS 'regist_date',
                        e.name AS 'group',
                        o_type.company AS 'company',
                        sd.is_regist AS 'is_regist',
                        sf.group_id AS 'form_group_id'
                    FROM signdata sd 
                    INNER JOIN signform sf 
                        ON sf.id = sd.form_id 
                    INNER JOIN users u
                        ON u.id = sd.user_id
                    INNER JOIN organization e
                        ON e.id = u.group_id
                    INNER JOIN organization_type o_type
                        ON o_type.id = e.group_id
                    WHERE sd.is_regist = true and sd.user_id = ?
                    ORDER BY sd.updated_at DESC;
                `,
                [req.app.get("user_id")]
            );

            for (var l of list) {
                let signform = await getRepository(Signform).findOne({ id: l.form_id });
                // const { document_code } = await getDocumentId(l, signform, l.document_id, true );
                // l.document_code = document_code;
                let last_signer = await getConnection().query(
                    `
                        SELECT 
                            u.username
                        FROM
                            signline sl
                        INNER JOIN users u
                            ON u.id = sl.user_id
                        WHERE
                            sl.sign_id = ?
                        ORDER BY sl.id DESC;
                    `,
                    [l.id]
                );
                if (last_signer.length > 0) l.last_signer = last_signer[0].username;
                else l.last_signer = "";
            }

            for (var l of list) {
                let org = await getConnection().query(`
                    SELECT 
                        ot.id
                    FROM users u
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN organization_type ot
                        ON ot.id = o.group_id
                    WHERE u.id = ${req.app.get("user_id")};
                `);
                if (org.id == l.form_group_id) {
                    l.document_type = "발신문서";
                } else {
                    l.document_type = "수신문서";
                }
            }

            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/re_request_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(Signdata).findOne({ id: req.body.sign_id });
            let sign_files = await getRepository(Signfile).find({ sign_id: req.body.sign_id });
            let sign_referer = await getRepository(SignReferer).find({ sign_id: req.body.sign_id });
            let sign_register = await getRepository(SignRegister).find({
                sign_id: req.body.sign_id,
            });
            sign_data.is_re_request = true;
            await getRepository(Signdata).update(sign_data.id, sign_data);

            let new_sign_data = new Signdata();
            new_sign_data = sign_data;
            Object.assign(new_sign_data, {
                id: null,
                user_id: req.app.get("user_id"),
                sign_state: 0,
                is_re_request: false,
                updated_at: new Date(),
            });
            let insertSign = await getRepository(Signdata).save(new_sign_data);

            for (var file of sign_files) {
                let new_file = new Signfile();
                new_file = file;
                Object.assign(new_file, { id: null, sign_id: insertSign.id });
                await getRepository(Signfile).save(new_file);
            }

            // 기존 참조자들 모두 반영
            for (var refer of sign_referer) {
                let new_referer = new SignReferer();
                new_referer = refer;
                Object.assign(new_referer, { id: null, sign_id: insertSign.id });
                await getRepository(SignReferer).save(new_referer);
            }
            // 기존 접수자들 모두 반영
            for (var register of sign_register) {
                let new_register = new SignRegister();
                new_register = register;
                Object.assign(new_register, { id: null, sign_id: insertSign.id });
                await getRepository(SignRegister).save(new_register);
            }
            //기존 접수 문서들 모두 반영
            await getConnection()
                .createQueryBuilder()
                .update(Signdata)
                .set({
                    original_sign_id: insertSign.id,
                })
                .where("original_sign_id = :id", { id: req.body.sign_id })
                .execute();
            // await getRepository(Signline).delete({ sign_id : sign_data.id });
            let new_line = new Signline();
            new_line.user_id = req.app.get("user_id");
            new_line.sign_id = new_sign_data.id;
            new_line.state = 1;
            await getRepository(Signline).save(new_line);
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
});

router.get("/get_general_code", async (req: Request, res: Response) => {
    try {
        let codes = await getRepository(GeneralDocCode).find({ order: { order: "ASC" } });
        let _codes = [];
        for (var code of codes) {
            if (code.is_delete) continue;
            if (code.file_id) {
                let default_file = await getRepository(GeneralDocFile).findOne({
                    id: code.file_id,
                });
                _codes.push({
                    ...code,
                    file: default_file,
                });
            } else _codes.push(code);
        }
        return getSuccessResponse(res, _codes);
    } catch (err) {}
    return getFailedResponse(res);
});

//
router.post("/new_general_doc", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let new_gen = new GeneralDocData();
            let new_code = await getRepository(GeneralDocCode).findOne({ id: req.body.code });
            let user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            new_gen.user_id = user.id;
            new_gen.state = 0;
            new_gen.code_id = new_code.id;
            new_gen.group_id = user.group_id;
            let insertDocSign = await getRepository(GeneralDocData).save(new_gen);
            let new_sign_line = new GeneralDocSignline();
            new_sign_line.user_id = user.id;
            new_sign_line.general_doc_id = insertDocSign.id;
            new_sign_line.state = 1;
            new_sign_line.order = 0;
            let insertLine = await getRepository(GeneralDocSignline).save(new_sign_line);

            const doc_data = await getConnection().query(`
                SELECT
                    doc.*,
                    u.username
                FROM general_doc_data doc
                INNER JOIN users u
                    ON u.id = doc.user_id
                WHERE doc.id = ${new_gen.id}
            `);
            const _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            const _org = await getRepository(Organization).findOne({ id: _user.group_id });
            const sign_org = await getConnection().query(`
                SELECT 
                    u.id,
                    u.id as 'user_id',
                    u.username,
                    u.sub_field,
                    u.signature_img,
                    u.sign_img,
                    e.name AS groupname,
                    e.company,
                    u.email,
                    u.admin_level,
                    p.name AS position,
                    o_type.signature_img,
                    p.priority
                FROM organization e
                INNER JOIN users u
                    ON u.group_id = e.id
                    AND u.admin_level != 1
                    AND u.is_delete = 0
                INNER JOIN position_type p
                    ON p.id = u.position
                INNER JOIN organization_type o_type
                    ON o_type.id = e.group_id
                WHERE e.name NOT LIKE '%관리자%' AND e.group_id = ${_org.group_id}
                ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
            `);

            doc_data[0].pdf_name = `${"일반문서"}_${
                insertDocSign.sended_at
                    ? getDateValue(insertDocSign.sended_at)
                    : getDateValue(insertDocSign.updated_at)
            }_${doc_data[0].code_no}.pdf`;

            return getSuccessResponse(res, { doc_data: doc_data[0], sign_org });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// general_doc_id => 일반문서 아이디
// recv_list => 수신자 아이디 리스트
router.post("/set_general_doc_recv", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            const general_doc_id = req.body.general_doc_id;
            const exist_recv = await getRepository(GeneralDocRecvList).find({
                general_doc_id: general_doc_id,
            });
            if (req.body.recv_list) {
                const recv_list = req.body.recv_list;
                for (var i = 0; i < recv_list.length; i++) {
                    let findIdx = exist_recv.findIndex((val, idx) => val.user_id == recv_list[i]);
                    if (findIdx == -1) {
                        let new_recv = new GeneralDocRecvList();
                        new_recv.user_id = recv_list[i];
                        new_recv.general_doc_id = general_doc_id;
                        new_recv.visible = 0;
                        await getRepository(GeneralDocRecvList).save(new_recv);
                    }
                }
                for (let recv of exist_recv) {
                    if (recv_list.indexOf(recv.user_id) != -1) continue;
                    await getRepository(GeneralDocRecvList).delete(recv);
                }
            }
            const list = await getConnection().query(`
                SELECT
                    recv.*,
                    u.username
                FROM general_doc_recv_list recv
                INNER JOIN users u
                    ON u.id = recv.user_id
                WHERE recv.general_doc_id = ${general_doc_id}
            `);
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// general_doc_id => 일반문서 아이디
// referer_line => 참조자 유저 아이디 리스트
router.post("/set_general_doc_referer", async (req: Request, res: Response) => {
    try {
        const general_doc_id = req.body.general_doc_id;
        const referer_list = req.body.referer_line;
        const referer_line = await getRepository(GeneralDocReferer).find({
            general_doc_id: general_doc_id,
        });
        for (let referer of referer_list) {
            if (referer_line.find((val, idx) => val.user_id == referer)) continue;
            let new_referer_line = new GeneralDocReferer();
            new_referer_line.user_id = referer;
            new_referer_line.general_doc_id = general_doc_id;
            await getRepository(GeneralDocReferer).save(new_referer_line);
        }
        for (let referer of referer_line) {
            if (referer_list.indexOf(referer.user_id) != -1) continue;
            await getRepository(GeneralDocReferer).delete(referer);
        }
        let refer_list = await getRepository(GeneralDocReferer).find({
            general_doc_id: general_doc_id,
        });

        return getSuccessResponse(res, refer_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_new_general_doc", async (req: Request, res: Response) => {
    try {
        const _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
        const _org = await getRepository(Organization).findOne({ id: _user.group_id });
        const sign_org = await getConnection().query(`
            SELECT 
                u.id,
                u.id as 'user_id',
                u.username,
                u.sub_field,
                u.signature_img,
                u.sign_img,
                e.name AS groupname,
                e.company,
                u.email,
                u.admin_level,
                p.name AS position,
                o_type.signature_img,
                p.priority
            FROM organization e
            INNER JOIN users u
                ON u.group_id = e.id
                AND u.admin_level != 1
                AND u.is_delete = 0
            INNER JOIN position_type p
                ON p.id = u.position
            INNER JOIN organization_type o_type
                ON o_type.id = e.group_id
            WHERE e.name NOT LIKE '%관리자%' AND e.group_id = ${_org.group_id}
            ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
        `);

        return getSuccessResponse(res, {
            sign_org,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// general_doc_id => 일반문서 아이디
router.get("/get_general_doc", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != -1 && typeof req.query.general_doc_id == "string") {
            const general_doc_id = parseInt(req.query.general_doc_id);
            const doc_data = await getConnection().query(`
                SELECT
                    doc.*,
                    u.username
                FROM general_doc_data doc
                INNER JOIN users u
                    ON u.id = doc.user_id
                WHERE doc.id = ${general_doc_id}
            `);

            let doc_read_list = await getConnection().query(`
                SELECT
                    recv.*,
                    u.username
                FROM general_doc_recv_list recv
                INNER JOIN users u
                    ON u.id = recv.user_id
                WHERE recv.general_doc_id = ${general_doc_id}
            `);

            const doc_recv = await getConnection().query(`
                SELECT
                    recv.*,
                    u.username
                FROM general_doc_recv_list recv
                INNER JOIN users u
                    ON u.id = recv.user_id
                WHERE recv.general_doc_id = ${general_doc_id} AND is_refer = 0
            `);

            const doc_referer = await getConnection().query(`
                SELECT
                    referer.*,
                    u.username
                FROM general_doc_referer referer
                INNER JOIN users u
                    ON u.id = referer.user_id
                WHERE referer.general_doc_id = ${general_doc_id}
            `);
            const _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            const _org = await getRepository(Organization).findOne({ id: _user.group_id });
            const sign_org = await getConnection().query(`
                SELECT 
                    u.id,
                    u.id as 'user_id',
                    u.username,
                    u.sub_field,
                    u.signature_img,
                    u.sign_img,
                    e.name AS groupname,
                    e.company,
                    u.email,
                    u.admin_level,
                    p.name AS position,
                    o_type.signature_img,
                    p.priority
                FROM organization e
                INNER JOIN users u
                    ON u.group_id = e.id
                    AND u.admin_level != 1
                    AND u.is_delete = 0
                INNER JOIN position_type p
                    ON p.id = u.position
                INNER JOIN organization_type o_type
                    ON o_type.id = e.group_id
                WHERE e.name NOT LIKE '%관리자%' AND e.group_id = ${_org.group_id}
                ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
            `);

            const doc_files = await getRepository(GeneralDocFile).find({
                general_doc_id: general_doc_id,
            });

            let doc_register = await getConnection().query(`
                SELECT
                    u.username,
                    o.name AS groupname,
                    p.name AS position
                FROM users u
                INNER JOIN general_doc_register sr
                    ON sr.general_doc_id = ${req.query.general_doc_id}
                INNER JOIN position_type p
                    ON p.id = u.position
                INNER JOIN organization o
                    ON o.id = u.group_id
                INNER JOIN organization_type o_type
                    ON o_type.id = o.group_id
                WHERE u.id = sr.user_id;
            `);

            let signed_user = await getConnection().query(`
                select
                    u.id,
                    u.username,
                    sl.state,
                    sl.order,
                    o_type.id as 'org_id',
                    u.doc_mng,
                    p.name as 'position'
                from general_doc_signline sl
                inner join general_doc_data sd
                    on sd.id = sl.general_doc_id
                    and sd.id = ${req.query.general_doc_id}
                inner join users u
                    on u.id = sl.user_id
                inner join organization o
                    on o.id = u.group_id
                inner join organization_type o_type
                    on o_type.id = o.group_id
                inner join position_type p
                    on p.id = u.position
                where sl.state = 1 || sl.state = 3
                    order by sl.order desc limit 1
                `);

            let next_signed_user = await getConnection().query(`
                    select
                        u.id,
                        u.username,
                        sl.state,
                        sl.order,
                        o_type.id as 'org_id',
                        u.doc_mng,
                        p.name as 'position'
                    from general_doc_signline sl
                    inner join general_doc_data sd
                        on sd.id = sl.general_doc_id
                        and sd.id = ${req.query.general_doc_id}
                    inner join users u
                        on u.id = sl.user_id
                    inner join organization o
                        on o.id = u.group_id
                    inner join organization_type o_type
                        on o_type.id = o.group_id
                    inner join position_type p
                        on p.id = u.position
                    where sl.state = 2
                        order by sl.order asc limit 1
                    `);

            let sign_comment = await getConnection().query(`
                SELECT
                    sc.created_at,
                    sc.comment,
                    u.username,
                    o.name as 'group',
                    p.name as 'position',
                    sc.type
                    FROM general_doc_comment sc
                    INNER JOIN users u
                        ON u.id = sc.user_id
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE sc.general_doc_id = ${req.query.general_doc_id};
                `);

            let time_txt = doc_data[0].sended_at
                ? getDateValue(doc_data[0].sended_at)
                : getDateValue(doc_data[0].updated_at);
            doc_data[0].pdf_name = `${"일반문서"}_${time_txt}_${doc_data[0].code_no}.pdf`;

            let same_org_check = await getConnection().query(
                `
                SELECT * 
                    FROM users u 
                    INNER JOIN organization o 
                    ON o.id = u.group_id 
                    INNER JOIN organization_type o_type 
                    ON o_type.id = o.group_id 
                        AND o_type.id = ?
                    WHERE u.id = ?
            `,
                [signed_user[0] ? signed_user[0].org_id : -1, req.app.get("user_id")]
            );

            return getSuccessResponse(res, {
                doc_data: doc_data[0],
                doc_read_list: doc_read_list,
                doc_recv,
                doc_referer,
                doc_files,
                sign_org,
                sign_comment,
                signed_user,
                next_signed_user,
                doc_register,
                is_diff_org: same_org_check.length == 0,
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/set_general_doc_IsRead", async (req: Request, res: Response) => {
    try {
        const general_doc_id = req.body.general_doc_id;

        let updateDocRecv = await getConnection()
            .createQueryBuilder()
            .update(GeneralDocRecvList)
            .set({
                is_read: 1,
            })
            .where("general_doc_id = :id AND user_id = :user_id", {
                id: general_doc_id,
                user_id: req.app.get("user_id"),
            })
            .execute();

        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/set_doc_is_read", async (req: Request, res: Response) => {
    try {
        const sign_id = req.body.sign_id;

        let updateDocRecv = await getConnection()
            .createQueryBuilder()
            .update(SignRecvList)
            .set({
                is_read: 1,
            })
            .where("sign_id = :id AND user_id = :user_id", {
                id: sign_id,
                user_id: req.app.get("user_id"),
            })
            .execute();

        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/set_general_doc_code", async (req: Request, res: Response) => {
    try {
        let gDoc_codes = await getConnection().query(
            `SELECT * FROM general_doc_code g WHERE g.order < 100 ORDER BY g.order DESC;`
        );
        let new_code = new GeneralDocCode();
        // new_code.code = req.body.code;
        new_code.text = req.body.text;
        new_code.file_id = req.body.file_id;
        new_code.order = gDoc_codes.length > 0 ? gDoc_codes[0].order + 1 : 0;

        await getRepository(GeneralDocCode).save(new_code);
        let list = await getRepository(GeneralDocCode).find();
        let _codes = [];
        for (var code of list) {
            if (code.file_id) {
                let default_file = await getRepository(GeneralDocFile).findOne({
                    id: code.file_id,
                });
                _codes.push({
                    ...code,
                    file: default_file,
                });
            } else _codes.push(code);
        }
        return getSuccessResponse(res, { doc_code: _codes });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post(
    "/upload_general_doc_code_file",
    async (req: Request, res: Response) => {
        try {
            if (req.app.get("user_id")) {
                let file = req.files[0];
                let upload = new GeneralDocFile();
                upload.url = `${fileDir + file.filename}`;
                upload.general_doc_id = 0;
                upload.size = file.size;
                upload.filename = `${file.filename}`;
                await getRepository(GeneralDocFile).save(upload);

                return getSuccessResponse(res, { file: upload });
            }
        } catch (e) {
            logger.error(e);
        }
        return getFailedResponse(res);
    }
);

router.get("/get_general_doc_list", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != -1) {
            let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
            let _org = await getRepository(Organization).findOne({ id: _user.group_id });
            let gid = _org.group_id;
            let text = req.query.type;
            let searchType = req.query.searchType;
            let searchText = req.query.searchText;
            let isContent = searchType == "1" && searchText.length > 0;
            let _group = false;
            let _type = false;
            switch (text) {
                case `send`:
                    _group = false;
                    _type = true;
                    break;
                case `recv`:
                    _group = false;
                    _type = false;
                    break;
                case `groupsend`:
                    _group = true;
                    _type = true;
                    break;
                case `grouprecv`:
                    _group = true;
                    _type = false;
                    break;
            }
            let doc_list;
            if (_type) {
                doc_list = await getConnection().query(`
                    SELECT 
                        doc.id,
                        doc.created_at,
                        doc.user_id,
                        doc.title,
                        doc.sended_at,
                        doc.state,
                        doc.code_id,
                        doc.code_no,
                        doc.sender,
                        doc.reply,
                        doc.group_id,
                        ${isContent ? 'doc.content,' : ''}
                        code.text AS 'code',
                        u.username AS 'creator',
                        gdf.count AS 'file_count'
                    FROM general_doc_data doc 
                    INNER JOIN general_doc_code code 
                        ON code.id = doc.code_id
                    INNER JOIN users u 
                        ON u.id = doc.user_id
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    LEFT JOIN (SELECT general_doc_id, COUNT(id) AS 'count' FROM general_doc_file GROUP BY general_doc_id) AS gdf
                        ON gdf.general_doc_id = doc.id
                    WHERE 
                        ${
                            _group
                                ? gid == 1
                                    ? `o.group_id = 1`
                                    : `doc.group_id = ${_user.group_id}`
                                : `doc.user_id = ${_user.id}`
                        } 
                        AND ( doc.state = 3 OR doc.state = 6 )
                    ORDER BY doc.id DESC
                `);
            } else {
                if (_group) {
                    doc_list = await getConnection().query(`
                        SELECT 
                            doc.id,
                            doc.created_at,
                            doc.user_id,
                            doc.title,
                            doc.sended_at,
                            doc.state,
                            doc.code_id,
                            doc.code_no,
                            doc.sender,
                            doc.reply,
                            doc.group_id,
                            ${isContent ? 'doc.content,' : ''}
                            code.text AS 'code',
                            (select username from users where id = doc.user_id ) as 'creator',
                            gdf.count AS 'file_count'
                        FROM general_doc_data doc 
                        INNER JOIN organization o
                            ON ${gid == 1 ? `o.group_id = 1` : `o.id =${_user.group_id}`}
                        INNER JOIN users docUser 
                            ON docUser.group_id=${gid == 1 ? "o.id" : _user.group_id}
                        INNER JOIN general_doc_recv_list grl 
                            ON grl.visible = 1
                            AND grl.user_id = docUser.id
                        INNER JOIN general_doc_code code
                            ON code.id = doc.code_id
                        LEFT JOIN (SELECT general_doc_id, COUNT(id) AS 'count' FROM general_doc_file GROUP BY general_doc_id) AS gdf
                            ON gdf.general_doc_id = doc.id
                        WHERE
                            doc.id = grl.general_doc_id
                        ORDER BY doc.id DESC
                    `);
                } else {
                    doc_list = await getConnection().query(
                        `
                        SELECT 
                            doc.id,
                            doc.created_at,
                            doc.user_id,
                            doc.title,
                            doc.sended_at,
                            doc.state,
                            doc.code_id,
                            doc.code_no,
                            doc.sender,
                            doc.reply,
                            doc.group_id,
                            ${isContent ? 'doc.content,' : ''}
                            code.text AS 'code',
                            u.username AS 'creator',
                            gdf.count AS 'file_count'
                        FROM general_doc_data doc 
                        INNER JOIN general_doc_code code 
                            ON code.id = doc.code_id
                        INNER JOIN users u 
                            ON u.id = doc.user_id
                        INNER JOIN general_doc_recv_list gdrl
                            ON gdrl.user_id = ${_user.id}
                            AND gdrl.visible = 1
                        LEFT JOIN (SELECT general_doc_id, COUNT(id) AS 'count' FROM general_doc_file GROUP BY general_doc_id) AS gdf
							ON gdf.general_doc_id = doc.id
                        WHERE doc.id = gdrl.general_doc_id
                        ORDER BY doc.id DESC`);
                }
            }

            let new_doc_list = [];
            let exist_ids = [];
            for (var doc of doc_list) {
                if (exist_ids.indexOf(doc.id) != -1) continue;
                if(req.query.paging && exist_ids.length > 10) break;
                
                exist_ids.push(doc.id);
                new_doc_list.push(doc);
            }

            let recv_list = [];
            if(exist_ids.length > 0){
                recv_list = await getConnection().query(`
                    SELECT 
                        general_doc_id,
                        visible AS 'visible',
                        user_id AS 'user_id',
                        is_read AS 'is_read'
                    FROM general_doc_recv_list
                    WHERE general_doc_id IN (${exist_ids.join(',')})
                `);
            }

            for(var doc of new_doc_list){
                const allRecv = recv_list.filter(raw=> raw.general_doc_id == doc.id);
                const recv = allRecv.find(raw=> raw.user_id == _user.id && raw.general_doc_id == doc.id && raw.visible == 1);
                if (doc.state == 3 && recv) {
                    doc.is_read = recv.is_read;
                }
                doc.recv_sum = allRecv.length;
                doc.read_sum = allRecv.filter(raw => raw.is_read == 1).length;
            }
            return getSuccessResponse(res, new_doc_list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});


// general_doc_id => 일반문서 아이디
// title => 제목
// content => 내용
// code => 코드 아이디
router.post("/set_general_doc", async (req: Request, res: Response) => {
    try {
        const general_doc_id = req.body.general_doc_id;
        const title = req.body.title;
        const content = req.body.content;
        const code = req.body.code;
        const code_no = req.body.code_no;
        const sender = req.body.sender;
        const reply = req.body.doc_reply;
        let updateRow = await getConnection()
            .createQueryBuilder()
            .update(GeneralDocData)
            .set({
                title: `${title ? title : ""}`,
                content: `${content ? content : ""}`,
                code_id: code,
                code_no: code_no,
                sender: sender,
                reply: reply,
                updated_at: new Date(),
            })
            .where("id = :id", { id: general_doc_id })
            .execute();

        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// general_doc_id => 일반문서 아이디
// title => 제목
// content => 내용
// code => 코드 아이디
router.post("/send_general_doc", async (req: Request, res: Response) => {
    try {
        const general_doc_id = req.body.general_doc_id;

        let gDoc_data = await getRepository(GeneralDocData).findOne({ id: general_doc_id });
        let gDoc_refer = await getRepository(GeneralDocReferer).find({
            general_doc_id: general_doc_id,
        });
        let gDoc_recv = await getRepository(GeneralDocRecvList).find({
            general_doc_id: general_doc_id,
        });
        let gDoc_signline = await getRepository(GeneralDocSignline).find({
            general_doc_id: general_doc_id,
        });
        let gDoc_files = await getRepository(GeneralDocFile).find({
            general_doc_id: general_doc_id,
        });
        let recv_user_emails = [];

        await getConnection()
            .createQueryBuilder()
            .update(GeneralDocData)
            .set({ sended_at: new Date() })
            .where({ id: general_doc_id })
            .execute();

        let new_general_doc_data = new GeneralDocData();
        new_general_doc_data = gDoc_data;
        Object.assign(new_general_doc_data, { id: null, state: 3, sended_at: new Date() });
        let insert_gDoc_data = await getRepository(GeneralDocData).save(new_general_doc_data);

        for (var refer of gDoc_refer) {
            let new_refer = new GeneralDocReferer();
            new_refer.user_id = refer.user_id;
            new_refer.general_doc_id = insert_gDoc_data.id;
            await getRepository(GeneralDocReferer).save(new_refer);

            let new_recv = new GeneralDocRecvList();
            new_recv.user_id = refer.user_id;
            new_recv.general_doc_id = insert_gDoc_data.id;
            new_recv.visible = 1;
            new_recv.is_refer = 1;
            await getRepository(GeneralDocRecvList).save(new_recv);
            let _user = await getRepository(User).findOne({ id: refer.user_id });
            recv_user_emails.push(_user.email);
        }

        for (var recv of gDoc_recv) {
            let new_recv = new GeneralDocRecvList();
            new_recv.user_id = recv.user_id;
            new_recv.general_doc_id = insert_gDoc_data.id;
            new_recv.visible = 1;
            await getRepository(GeneralDocRecvList).save(new_recv);
            let _user = await getRepository(User).findOne({ id: recv.user_id });
            recv_user_emails.push(_user.email);
        }

        for (var line of gDoc_signline) {
            let new_line = new GeneralDocSignline();
            new_line = line;
            Object.assign(new_line, { id: null, general_doc_id: insert_gDoc_data.id });
            await getRepository(GeneralDocSignline).save(new_line);
        }

        for (var file of gDoc_files) {
            let new_file = new GeneralDocFile();
            new_file = file;
            Object.assign(new_file, { id: null, general_doc_id: insert_gDoc_data.id });
            await getRepository(GeneralDocFile).save(new_file);
        }

        // 일반문서 수신자, 참조자 메일 발송
        for (var email of recv_user_emails) {
            await sendMail(
                email,
                `[통영에코파워 문서관리시스템 알림] <${insert_gDoc_data.title}> 수신`,
                `일반문서가 수신되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/normal/view/${insert_gDoc_data.id}">결재 바로가기</a>`
            );
        }

        // let updateDocRecv = await getConnection()
        //     .createQueryBuilder()
        //     .update(GeneralDocRecvList)
        //     .set({
        //         visible : 1
        //      })
        //     .where("general_doc_id = :id", {id : general_doc_id})
        //     .execute();

        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// general_doc_id => 일반문서 아이디
router.post(
    "/upload_general_doc_file",
    async (req: Request, res: Response) => {
        let errMsg = '';
        try {
            if (req.app.get("user_id")) {
                const general_doc_id = req.body.general_doc_id;
                if (req.files.length > 0) {
                    for (var key of Object.keys(req.files)) {
                        let file = req.files[key];
                        let checkReg = new RegExp(uploadBlockScopeReg);
                        let checkRegResult = checkReg.exec(file.filename)
                        if(checkRegResult != null){
                            errMsg = checkRegResult[0] + ' 특수문자는 파일이름에 포함될 수 없습니다.';
                            throw new Error("특수문자 에러");
                        }
                        let upload = new GeneralDocFile();
                        upload.url = `${encodeURIComponent(
                            fileDir + file.filename
                        )}`;
                        upload.general_doc_id = general_doc_id;
                        upload.size = file.size;
                        upload.filename = `${file.filename}`;
                        await getRepository(GeneralDocFile).save(upload);
                    }
                }
                let list = await getRepository(GeneralDocFile).find({
                    general_doc_id: general_doc_id,
                });
                return getSuccessResponse(res, list);
            }
        } catch (e) {
            logger.error(e);
        }
        return getFailedResponse(res, errMsg);
    }
);

// file_id => 파일 아이디
router.delete("/delete_general_doc_file", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            const file_id = parseInt(req.query.file_id.toString());
            let doc_file = await getRepository(GeneralDocFile).findOne({ id: file_id });
            if (doc_file) {
                await deleteFile(doc_file.filename); //file delete
                await getRepository(GeneralDocFile).remove(doc_file);
            }
            return getSuccessResponse(res);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/edit_general_doc_code", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            let updateDocRecv = await getConnection()
                .createQueryBuilder()
                .update(GeneralDocCode)
                .set({
                    text: req.body.code_text,
                })
                .where("id = :id", { id: req.body.code_id })
                .execute();
            let doc_codes = await getRepository(GeneralDocCode).find({ order: { id: "ASC" } });
            return getSuccessResponse(res, doc_codes);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.delete("/delete_general_doc_code", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            const code_id = parseInt(req.query.code_id.toString())
            await getConnection()
                .createQueryBuilder()
                .update(GeneralDocCode)
                .set({ is_delete: true })
                .where({ id: code_id });
            let codes = await getRepository(GeneralDocCode).find({ order: { order: "ASC" } });
            let _codes = [];
            for (var code of codes) {
                if (code.is_delete) continue;
                _codes.push(code);
            }
            return getSuccessResponse(res, _codes);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.get("/get_general_sign_line", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let list = await getConnection().query(`
                    SELECT 
                        sl.id,
                        sl.state,
                        u.username,
                        u.email,
                        u.profile_img,
                        u.signature_img,
                        sl.approval_at,
                        sl.created_at,
                        u.id AS 'user_id',
                        o.id AS 'group_id',
                        o.name as groupname,
                        o.company,
                        p.name as 'position',
                        p.priority as 'priority'
                    FROM general_doc_signline sl
                    INNER JOIN users u
                        ON u.id = sl.user_id
                    INNER JOIN organization o
                        ON o.id = u.group_id
                    INNER JOIN position_type p
                        ON p.id = u.position
                    WHERE sl.general_doc_id = ${req.query.general_doc_id}
                    ORDER BY sl.order ASC;
                `);

            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/set_general_doc_sign_line", async (req: Request, res: Response) => {
    try {
        const general_doc_data = await getRepository(GeneralDocData).findOne({
            id: req.body.general_doc_id,
        });
        const exist_line = await getRepository(GeneralDocSignline).find({
            general_doc_id: req.body.general_doc_id,
        });
        if (req.body.sign_line) {
            for (var i = 0; i < req.body.sign_line.length; i++) {
                let findIdx = exist_line.findIndex(
                    (val, idx) => val.user_id == req.body.sign_line[i]
                );
                if (findIdx != -1) {
                    exist_line[findIdx].order = i;
                    await getRepository(GeneralDocSignline).update(
                        exist_line[findIdx].id,
                        exist_line[findIdx]
                    );
                } else {
                    let new_sign_line = new GeneralDocSignline();
                    new_sign_line.user_id = req.body.sign_line[i];
                    new_sign_line.general_doc_id = req.body.general_doc_id;
                    new_sign_line.state =
                        req.body.deferer_line.indexOf(req.body.sign_line[i]) != -1 ? 8 : 2;
                    new_sign_line.order = i; 
                    await getRepository(GeneralDocSignline).save(new_sign_line);
                }
            }
            for (let line of exist_line) {
                if (
                    req.body.sign_line.indexOf(line.user_id) != -1 ||
                    line.user_id == general_doc_data.user_id
                )
                    continue;
                await getRepository(GeneralDocSignline).delete(line);
            }
        }

        if (req.body.deferer_line) {
            for (var i = 0; i < req.body.deferer_line.length; i++) {
                let findIdx = exist_line.findIndex(
                    (val, idx) => val.user_id == req.body.deferer_line[i]
                );
                if (findIdx != -1) {
                    exist_line[findIdx].state = 8;
                    await getRepository(GeneralDocSignline).update(
                        exist_line[findIdx].id,
                        exist_line[findIdx]
                    );
                }
            }
            const deferer_line = await getRepository(GeneralDocSignline).find({
                general_doc_id: req.body.general_doc_id,
                state: 8,
            });
            for (let line of deferer_line) {
                if (
                    req.body.deferer_line.indexOf(line.user_id) != -1 ||
                    line.user_id == general_doc_data.user_id
                )
                    continue;
                line.state = 2;
                await getRepository(GeneralDocSignline).update(line.id, line);
            }
        }
        let list = await getConnection().query(`
                SELECT 
                    sl.id,
                    sl.state,
                    u.username,
                    u.email,
                    u.profile_img,
                    u.signature_img,
                    sl.approval_at,
                    sl.created_at,
                    u.id AS 'user_id',
                    o.name as groupname,
                    o.company,
                    p.id as 'pid',
                    p.name as 'position',
                    p.priority as 'priority'
                FROM general_doc_signline sl
                INNER JOIN users u
                    ON u.id = sl.user_id
                INNER JOIN organization o
                    ON o.id = u.group_id
                INNER JOIN position_type p
                    ON p.id = u.position
                WHERE sl.general_doc_id = ${req.body.general_doc_id}
                ORDER BY sl.order ASC;
            `);

        return getSuccessResponse(res, list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.delete("/delete_general_doc", async (req: Request, res: Response) => {
    try {
        const general_doc_id = parseInt(req.query.general_doc_id.toString());
        let general_doc_data = await getRepository(GeneralDocData).findOne({
            id: general_doc_id,
            user_id: req.app.get("user_id"),
        });
        if (general_doc_data) {
            let files = await getRepository(GeneralDocFile).find({
                general_doc_id: general_doc_data.id,
            });
            if (files.length > 0) {
                for (var file of files) {
                    await deleteFile(file.filename);
                }
            }
            await getRepository(GeneralDocData).delete({ id: general_doc_id });
        }
        await getRepository(GeneralDocRecvList).delete({ general_doc_id: general_doc_id });
        return getSuccessResponse(res);
    } catch (err) {}
    return getFailedResponse(res, "삭제 불가한 문서입니다.");
});

router.post("/request_general_doc", async (req: Request, res: Response) => {
    try {
        let sign_line = await getRepository(GeneralDocSignline).find({
            general_doc_id: req.body.general_doc_id,
        });
        // 재상신시 기존 반려했던 유저를 다시 결재가 가능하도록 처리.
        for (var line of sign_line) {
            if (line.state == 4) {
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(GeneralDocSignline)
                    .set({ state: 2 })
                    .where("id = :id", { id: line.id })
                    .execute();
                break;
            }
        }
        let _user = await getRepository(User).findOne({
            id: sign_line.length > 1 ? sign_line[1].user_id : sign_line[0].user_id,
        });
        const general_doc_id = req.body.general_doc_id;
        const title = req.body.title;
        const content = req.body.content;
        const code = req.body.code;
        const code_no = req.body.code_no;
        const sender = req.body.sender;
        const reply = req.body.doc_reply;
        let updateDocData = await getConnection()
            .createQueryBuilder()
            .update(GeneralDocData)
            .set({
                title: `${title}`,
                content: `${content}`,
                code_id: code,
                code_no: code_no,
                sender: sender,
                reply: reply,
                state: 1,
                sended_at: new Date(),
            })
            .where("id = :id", { id: general_doc_id })
            .execute();
        let sign_data = await getRepository(GeneralDocData).findOne({ id: general_doc_id });
        if (sign_line.length == 1) {
            let updateDocData = await getConnection()
                .createQueryBuilder()
                .update(GeneralDocData)
                .set({
                    state: 2,
                })
                .where("id = :id", { id: req.body.general_doc_id })
                .execute();
            return getSuccessResponse(res);
        }
        await sendMail(
            _user.email,
            `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 요청 안내`,
            `결재 요청이 있습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/normal/view/${sign_data.id}">결재 바로가기</a>`
        );
        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/re_request_general_doc", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let doc_data = await getRepository(GeneralDocData).findOne({
                id: req.body.general_doc_id,
            });
            let doc_file = await getRepository(GeneralDocFile).find({
                general_doc_id: req.body.general_doc_id,
            });
            let doc_recv_list = await getRepository(GeneralDocRecvList).find({
                general_doc_id: req.body.general_doc_id,
            });
            let doc_referer = await getRepository(GeneralDocReferer).find({
                general_doc_id: req.body.general_doc_id,
            });

            doc_data.is_re_request = true;
            await getRepository(GeneralDocData).update(doc_data.id, doc_data);

            let new_doc_data = doc_data;
            Object.assign(new_doc_data, { id: null, state: 0 });
            let insertData = await getRepository(GeneralDocData).save(new_doc_data);

            for (var file of doc_file) {
                let new_file = new GeneralDocFile();
                new_file = file;
                Object.assign(new_file, { id: null, general_doc_id: insertData.id });
                await getRepository(GeneralDocFile).save(new_file);
            }

            for (var recv of doc_recv_list) {
                let new_recv = new GeneralDocRecvList();
                new_recv = recv;
                Object.assign(new_recv, { id: null, general_doc_id: insertData.id });
                await getRepository(GeneralDocRecvList).save(new_recv);
            }

            for (var refer of doc_referer) {
                let new_refer = new GeneralDocReferer();
                new_refer = refer;
                Object.assign(new_refer, { id: null, general_doc_id: insertData.id });
                await getRepository(GeneralDocReferer).save(new_refer);
            }

            let new_line = new GeneralDocSignline();
            new_line.user_id = req.app.get("user_id");
            new_line.general_doc_id = insertData.id;
            new_line.state = 1;
            await getRepository(GeneralDocSignline).save(new_line);
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/cancel_general_doc", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(GeneralDocData).findOne({
                id: req.body.general_doc_id,
            });

            if (req.body.user_state != 1) {
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(GeneralDocSignline)
                    .set({ state: 2 })
                    .where("sign_id = :id AND user_id = :userid ", {
                        id: req.body.sign_id,
                        userid: req.app.get("user_id"),
                    })
                    .execute();
            } else {
                let is_sign_line = await getRepository(GeneralDocSignline).findOne({
                    state: 3,
                    general_doc_id: req.body.general_doc_id,
                });
                if (is_sign_line) return getSuccessResponse(res, false);
                sign_data.state = 0;
                await getRepository(GeneralDocData).update(sign_data.id, sign_data);
            }
            let sign_comment = new Signcomment();
            sign_comment.sign_id = req.body.sign_id;
            sign_comment.comment = req.body.comment;
            sign_comment.type = 3;
            sign_comment.user_id = req.app.get("user_id");
            await getRepository(Signcomment).save(sign_comment);

            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/approval_general_doc_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(GeneralDocSignline).findOne({
                general_doc_id: req.body.general_doc_id,
                user_id: req.app.get("user_id"),
            });

            if (sign_line) {
                sign_line.state = 3;
                sign_line.updated_at = new Date();
                sign_line.approval_at = new Date();
                await getRepository(GeneralDocSignline).update(sign_line.id, sign_line);
            }
            // 모든 결재가 완료되었는지 확인
            let not_sign_lines = await getRepository(GeneralDocSignline).find({
                general_doc_id: req.body.general_doc_id,
                state: 2,
            });
            let sign_data = await getRepository(GeneralDocData).findOne({
                id: req.body.general_doc_id,
            });
            if (not_sign_lines.length == 0) {
                sign_data.state = 2;
                await getRepository(GeneralDocData).update(req.body.general_doc_id, sign_data);
                let _user = await getRepository(User).findOne({ id: sign_data.user_id });
                await sendMail(
                    _user.email,
                    `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 완료`,
                    `귀하의 결재가 완료 되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/normal/view/${sign_data.id}">결재 바로가기</a>`
                );
            } else {
                let _user = await getRepository(User).findOne({ id: not_sign_lines[0].user_id });
                await sendMail(
                    _user.email,
                    `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 결재 차례`,
                    `귀하의 결재 차례 입니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/normal/view/${sign_data.id}">결재 바로가기</a>`
                );
            }
            // 결재 코멘트 남기기
            if (req.body.comment && req.body.comment.length > 0) {
                let sign_comment = new GeneralDocComment();
                sign_comment.comment = req.body.comment;
                sign_comment.general_doc_id = sign_data.id;
                sign_comment.user_id = req.app.get("user_id");
                sign_comment.type = 2;
                await getRepository(GeneralDocComment).save(sign_comment);
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});
router.post("/prev_approval_general_doc_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(GeneralDocSignline).find({
                where: { general_doc_id: req.body.general_doc_id, user_id: req.app.get("user_id") },
            });
            if (sign_line.length > 0) {
                sign_line[0].state = 6;
                sign_line[0].updated_at = new Date();
                sign_line[0].approval_at = new Date();
                await getRepository(GeneralDocSignline).update(sign_line[0].id, sign_line[0]);
            }
            let prev_line = await getRepository(GeneralDocSignline).find({
                general_doc_id: req.body.general_doc_id,
                user_id: Not(req.app.get("user_id")),
                state: 2,
            });
            let _user = await getRepository(User).findOne({ id: sign_line[0].user_id });
            let group = await getRepository(Organization).findOne({ id: _user.group_id });
            let company_group = await getRepository(OrganizationType).findOne({
                id: group.group_id,
            });
            let temp = false;
            for (var line of prev_line) {
                line.state = 7;
                await getRepository(GeneralDocSignline).update(line.id, line);
            }
            // 결재 문서 완료처리
            let sign_data = await getRepository(GeneralDocData).findOne({
                where: { id: req.body.general_doc_id },
            });
            sign_data.state = 2;
            await getRepository(GeneralDocData).update(req.body.general_doc_id, sign_data);

            // 전결 코멘트 남기기
            if (req.body.comment && req.body.comment.length > 0) {
                let sign_comment = new GeneralDocComment();
                sign_comment.comment = req.body.comment;
                sign_comment.general_doc_id = sign_data.id;
                sign_comment.user_id = req.app.get("user_id");
                sign_comment.type = 4;
                await getRepository(GeneralDocComment).save(sign_comment);
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/deferer_general_doc_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_line = await getRepository(GeneralDocSignline).find({
                general_doc_id: req.body.general_doc_id,
                user_id: req.app.get("user_id"),
            });
            if (sign_line.length > 0) {
                sign_line[0].state = 9;
                sign_line[0].updated_at = new Date();
                sign_line[0].approval_at = new Date();
                await getRepository(GeneralDocSignline).update(sign_line[0].id, sign_line[0]);
            }
            let sign_data = await getRepository(GeneralDocData).findOne({ id: req.body.sign_id });
            // 결재 코멘트 남기기
            if (req.body.comment && req.body.comment.length > 0) {
                let sign_comment = new GeneralDocComment();
                sign_comment.comment = req.body.comment;
                sign_comment.general_doc_id = sign_data.id;
                sign_comment.user_id = req.app.get("user_id");
                sign_comment.type = 2;
                await getRepository(GeneralDocComment).save(sign_comment);
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/reject_general_doc_sign", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let sign_data = await getRepository(GeneralDocData).findOne({
                id: req.body.general_doc_id,
            });
            let creator = await getRepository(User).findOne({ id: sign_data.user_id });

            sign_data.state = 4;
            await getRepository(GeneralDocData).update(sign_data.id, sign_data);

            let sign_line = await getRepository(GeneralDocSignline).findOne({
                general_doc_id: req.body.general_doc_id,
                user_id: req.app.get("user_id"),
            });

            sign_line.state = 4;
            await getRepository(GeneralDocSignline).update(sign_line.id, sign_line);

            let sign_comment = new GeneralDocComment();
            sign_comment.general_doc_id = req.body.general_doc_id;
            sign_comment.comment = req.body.comment;
            sign_comment.type = 1;
            sign_comment.user_id = req.app.get("user_id");
            await getRepository(GeneralDocComment).save(sign_comment);
            await sendMail(
                creator.email,
                `[통영에코파워 문서관리시스템 알림] <${sign_data.title}> 반려`,
                `귀하의 결재가 반려 되었습니다.<br /><a target="_blank" href="${process.env.ORIGIN}/document/view/${sign_data.id}">결재 바로가기</a>`
            );
            return getSuccessResponse(res, true);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/new_offline_sign", async (req: Request, res: Response) => {
    const user_id = req.app.get("user_id");
    try {
        if (user_id != null) {
            let signcheck = await getRepository(Signdata).find({ document_code: req.body.docCode });
            let new_sign_id = 0;
            if (signcheck.length == 0) {
                let user = await getRepository(User).findOne({ id: req.app.get("user_id") });
                let org = await getRepository(Organization).findOne({ id: user.group_id });
                let new_sign = new Signdata();
                new_sign.user_id = user_id;
                new_sign.group_id = org.group_id;
                new_sign.document_code = req.body.docCode;
                new_sign.title = req.body.title;
                if (req.body.type == 0) {
                    new_sign.doc_sender = req.body.vendor;
                    new_sign.registed_at = req.body.date;
                    new_sign.doc_recv = user.username;
                    new_sign.sign_state = 8;
                } else if (req.body.type == 1) {
                    new_sign.doc_recv = req.body.vendor;
                    new_sign.sended_at = req.body.date;
                    new_sign.doc_sender = user.username;
                    new_sign.sign_state = 10;
                } else {
                    new_sign.doc_sender = req.body.vendor;
                    new_sign.registed_at = req.body.date;
                    new_sign.doc_recv = user.username;
                    new_sign.sign_state = 0;
                }
                new_sign.department_id = 0;
                new_sign.html = "";
                new_sign.form_id = 0;
                new_sign.cop_id = -1;
                new_sign.doc_type_id = 3;
                new_sign.doc_org_send_id = -1;
                new_sign.doc_org_recv_id = -1;
                new_sign.doc_proj_code_id = 1;
                new_sign.document_year = new Date().getFullYear();

                let insertSign = await getRepository(Signdata).save(new_sign);

                let new_sign_recv_list = new SignRecvList();
                new_sign_recv_list.sign_id = new_sign.id;
                new_sign_recv_list.user_id = user_id;
                new_sign_recv_list.is_read = 0;
                new_sign_recv_list.visible = true;
                new_sign_recv_list.is_refer = 0;
                new_sign_recv_list.is_doc_mng = false;
                await getRepository(SignRecvList).save(new_sign_recv_list);

                let new_sign_register = new SignRegister();
                new_sign_register.sign_id = new_sign.id;
                new_sign_register.user_id = user_id;
                await getRepository(SignRegister).save(new_sign_register);

                let new_sign_line = new Signline();
                new_sign_line.user_id = user.id;
                new_sign_line.sign_id = insertSign.id;
                new_sign_line.state = 1;
                new_sign_line.order = 0;
                await getRepository(Signline).save(new_sign_line);

                new_sign_id = new_sign.id;
            }
            return getSuccessResponse(res, new_sign_id);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_offline_sign_list", async (req: Request, res: Response) => {
    try {
        let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
        let _org = await getRepository(Organization).findOne({ id: _user.group_id });
        let sign_data = await getRepository(Signdata).find({ 
            where : { group_id: _org.group_id, doc_type_id : 3 },
            order: { sended_at: "DESC" },
        });

        let off_recv = sign_data.filter((obj: any) => obj.sign_state == 8);
        let off_sign = sign_data.filter((obj: any) => obj.sign_state < 8);
        let off_send = sign_data.filter((obj: any) => obj.sign_state == 10);
        return getSuccessResponse(res, { offrecv: off_recv, offsign: off_sign, offsend: off_send });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_offline_sign", async (req: Request, res: Response) => {
    try {
        let _user = await getRepository(User).findOne({ id: req.app.get("user_id") });
        let _user_org = await getRepository(Organization).findOne({ id: _user.group_id });
        let _user_org_type = await getRepository(OrganizationType).findOne({
            id: _user_org.group_id,
        });

        let sign_data = await getRepository(Signdata).find({ group_id: _user_org.group_id });
        let off_sign: any = sign_data.filter((obj: any) => obj.id == req.query.sign_id)[0];
        off_sign.form_key = "offline_form";
        off_sign.pdf_name = `오프라인문서_${getDateValue(off_sign.updated_at)}_${off_sign.document_code}`;

        let files = await getRepository(Signfile).find();
        let off_files = files.filter((obj: any) => obj.sign_id == req.query.sign_id);

        let off_sign_line = await getConnection().query(
            `
                SELECT 
                    sl.id,
                    sl.state,
                    u.username,
                    u.email,
                    u.profile_img,
                    u.signature_img,
                    sl.approval_at,
                    sl.created_at,
                    u.id AS 'user_id',
                    o.id AS 'group_id',
                    o.name as groupname,
                    o.company,
                    p.name as 'position',
                    p.priority as 'priority'
                FROM signline sl
                INNER JOIN users u
                    ON u.id = sl.user_id
                INNER JOIN organization o
                    ON o.id = u.group_id
                INNER JOIN position_type p
                    ON p.id = u.position
                WHERE sl.sign_id = ${req.query.sign_id}
                ORDER BY sl.order ASC;
            `
        );
        
        let referer_line = await getRepository(SignReferer).query(
            `
                        SELECT 
                            rf.id,
                            u.username,
                            u.email,
                            u.profile_img,
                            u.signature_img,
                            u.id AS 'user_id',
                            o.name as 'groupname',
                            o.company as 'company',
                            p.name as 'position'
                        FROM signreferer rf
                        INNER JOIN users u
                            ON u.id = rf.user_id
                        INNER JOIN organization o
                            ON o.id = u.group_id
                        INNER JOIN position_type p
                            ON u.position = p.id
                        WHERE rf.sign_id = ? AND rf.is_out_refer = 0;
                    `,
            [req.query.sign_id]
        );

        let sign_org = await getConnection().query(`
                    SELECT 
                        u.id,
                        u.id as 'user_id',
                        u.username,
                        u.sub_field,
                        u.signature_img,
                        u.sign_img,
                        e.name AS groupname,
                        e.company,
                        u.email,
                        u.admin_level,
                        p.name AS position,
                        o_type.signature_img,
                        p.priority
                    FROM organization e
                    INNER JOIN users u
                        ON u.group_id = e.id
                        AND u.admin_level != 1
                        AND u.is_delete = 0
                    INNER JOIN position_type p
                        ON p.id = u.position
                    INNER JOIN organization_type o_type
                        ON o_type.id = e.group_id
                    WHERE e.name NOT LIKE '%관리자%'
                    AND e.group_id = ${_user_org_type.id}
                    ORDER BY o_type.id ASC, e.group_order DESC, e.name ASC, p.priority ASC, u.username ASC;
                `);

        let signed_user = await getConnection().query(
            `
                        select
                            u.id,
                            u.username,
                            sl.state,
                            sl.order,
                            o_type.id as 'org_id',
                            u.doc_mng,
                            p.name as 'position'
                        from signline sl
                        inner join signdata sd
                            on sd.id = sl.sign_id
                            and sd.id = ?
                        inner join users u
                            on u.id = sl.user_id
                        inner join organization o
                            on o.id = u.group_id
                        inner join organization_type o_type
                            on o_type.id = o.group_id
                        inner join position_type p
                            on p.id = u.position
                        where state = 1 || state = 3
                            order by sl.order desc limit 1`,
            [req.query.sign_id]
        );

        let sign_comment = await getConnection().query(
            `
                            SELECT
                                sc.created_at,
                                sc.comment,
                                sc.comment,
                                u.username,
                                o.name as 'group',
                                p.name as 'position',
                                sc.type
                                FROM signcomment sc
                                INNER JOIN users u
                                    ON u.id = sc.user_id
                                INNER JOIN organization o
                                    ON o.id = u.group_id
                                INNER JOIN position_type p
                                    ON p.id = u.position
                                WHERE sc.sign_id = ?;
                            `,
            [req.query.sign_id]
        );
        return getSuccessResponse(res, {
            sign_data: off_sign,
            files: off_files,
            sign_line: off_sign_line,
            referer_line,
            sign_org,
            signed_user,
            sign_comment,
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/recovery_general_doc_files", async (req: Request, res: Response) => {
    let g_doc_data = await getRepository(GeneralDocData).find();
    for (var d of g_doc_data) {
        let files = await getRepository(GeneralDocFile).find({ general_doc_id: d.id });
        // console.log("general doc data id :: ", d.id, files.length);
        if (files.length > 0) {
            if (d.title != "" && d.content != "") {
                let d2 = g_doc_data.filter(
                    raw =>
                        raw.title.indexOf(d.title) != -1 &&
                        raw.content.indexOf(d.content) != -1 &&
                        raw.sender.indexOf(d.sender) != -1
                );
                // let d2 = await getRepository(GeneralDocData).find({ title : d.title , content : d.content, sender : d.sender });
                for (var exist of d2) {
                    // console.log("exist id : ", exist.id);
                    if (exist.id == d.id) continue;
                    let exist_files = await getRepository(GeneralDocFile).find({
                        general_doc_id: exist.id,
                    });
                    if (exist_files.length > 0) continue;
                    for (var f of files) {
                        if (f.size > 0) {
                            let new_file = new GeneralDocFile();
                            new_file = f;
                            Object.assign(new_file, { id: null, general_doc_id: exist.id });
                            await getRepository(GeneralDocFile).save(new_file);
                        }
                    }
                }
            }
        }
    }
});

import { uploadOfficialPdfFolder, uploadGeneralOfficialPdfFolder, uploadFolder } from "@/constant";
router.get("/download_official_document", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            var results: DirResultType[] = [];

            let downloadFileList: {
                dest_path: string;
                file_path: string;
            }[] = [];

            let attach_list: {
                dest_path: string;
                file_path: string;
            }[] = [];

            const id_list =
                typeof req.query.id_list == "string" ? req.query.id_list.split(",").filter(raw => raw != "") : [];
            const user_id = typeof req.query.user_id == "string" ? parseInt(req.query.user_id.toString()) : 0;
            const sign_type = typeof req.query.sign_type == "string" ? req.query.sign_type.toString() : "";

            if (id_list.length == 0 || sign_type == "" || user_id == 0) throw "잠시 후에 다시 시도해주세요.";

            let folder = CallDirTree(uploadOfficialPdfFolder, results);

            let users = await tr.getRepository(User).find();
            let org = await tr.getRepository(Organization).find();
            let org_type = await tr.getRepository(OrganizationType).find();
            let signform = await tr.getRepository(Signform).find();

            // 다운받는 유저 회사 찾기
            let down_user = users.find(raw => raw.id == user_id);
            let user_org = org.find(raw => raw.id == down_user.group_id);
            let user_org_type = org_type.find(raw => raw.id == user_org.group_id);

            for (var id of id_list) {
                let _id = parseInt(id);
                let sign_data = await tr.getRepository(Signdata).findOne({ id: _id });

                //기존문서는 첨부파일만 다운로드 받을 수 있도록 
                if(sign_data.sign_state < 8){
                    //공문의 회사 찾기
                    let docu_company = signform.find(raw => raw.id == sign_data.form_id);

                    //파일명 찾기
                    let file_name = await getOfficialFilename(
                        user_org_type.id == docu_company.group_id,
                        sign_data.document_code,
                        sign_type
                    );
                        
                    let target = folder.tree.children.find(raw => raw.name == file_name);
                        
                    if (target && fs.existsSync(target.path)) {
                        downloadFileList.push({
                            dest_path: `${sign_data.document_code}` + "/" + target.name,
                            file_path: target.path,
                        });
                    }
                }

                let attach : any;
                //첨부파일 찾기
                if (isLive) {
                    attach = await tr.query(`
                    SELECT
                        sd.document_code,
                        sf.filename
                    FROM signfile sf
                    INNER JOIN signdata sd
                        ON sd.id = sf.sign_id
                    WHERE sign_id = ${id}
                `);

                    for (var a of attach) {
                        let _file_name = decodeURIComponent(a.filename);

                        attach_list.push({
                            dest_path: a.document_code + "/" + _file_name,
                            file_path: uploadFolder + _file_name,
                        });
                    }
                } else {
                    attach = await tr.query(`
                    SELECT
                        CONCAT(sd.document_code, "/" ,sf.filename) AS 'dest_path',
                        CONCAT("uploads", "/", sf.filename) AS 'file_path'
                    FROM signfile sf
                    INNER JOIN signdata sd
                        ON sd.id = sf.sign_id
                    WHERE sign_id = ${id};
                `);

                    for (var a of attach) {
                        attach_list.push({
                            dest_path: a.dest_path,
                            file_path: a.file_path,
                        });
                    }
                }
            }

            const filename = `${getMoment(new Date()).format("YY-MM-DD SSS")}_공문서.zip`;

            res.setHeader("Content-disposition", "attachment; filename=" + encodeURI(filename));
            res.setHeader("Content-Type", "application/zip; charset=utf-8");

            let output = await GenerateZip(
                filename,
                [
                    ...downloadFileList.map(raw => {
                        return raw.file_path;
                    }),
                    ...attach_list.map(raw => {
                        return raw.file_path;
                    }),
                ],
                [
                    ...downloadFileList.map(raw => {
                        return raw.dest_path;
                    }),
                    ...attach_list.map(raw => {
                        return raw.dest_path;
                    }),
                ]
            );

            let filestream = fs.createReadStream(output);
            filestream.pipe(res);

            logger.log("down", `[id: ${down_user.id}, User Email: ${down_user.email}, File Path: ${output}]`);
            fs.unlinkSync(output);

            return res;
        } catch (err) {
            logger.error(err);
        }
        return getFailedResponse(res);
    });
});

router.get("/download_general_official_document", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            var results: DirResultType[] = [];

            let downloadFileList: {
                dest_path: string;
                file_path: string;
            }[] = [];

            let attach_list: {
                dest_path: string;
                file_path: string;
            }[] = [];

            const id_list =
                typeof req.query.id_list == "string" ? req.query.id_list.split(",").filter(raw => raw != "") : [];
            const user_id = typeof req.query.user_id == "string" ? parseInt(req.query.user_id.toString()) : 0;
            const sign_type = typeof req.query.sign_type == "string" ? req.query.sign_type.toString() : "";

            if (id_list.length == 0 || sign_type == "" || user_id == 0) throw "잠시 후에 다시 시도해주세요.";

            let folder = CallDirTree(uploadGeneralOfficialPdfFolder, results);

            let down_user = await tr.getRepository(User).findOne({ where: { id: user_id } });
            let user_org = await tr.getRepository(Organization).findOne({ where: { id: down_user.group_id } });
            let user_org_type = await tr.getRepository(OrganizationType).findOne({ where: { id: user_org.group_id } });

            for (var id of id_list) {
                let _id = parseInt(id);
                let data = await tr.query(`
                    SELECT 
                        gd.*,
                        org_type.id AS 'org_id'
                    FROM general_doc_data gd
                    INNER JOIN users u
                        ON u.id = gd.user_id
                    INNER JOIN organization org
                        ON org.id = u.group_id
                    INNER JOIN organization org_type
                        ON org_type.id = org.group_id
                    WHERE gd.id=${_id}
                `);
                if (data.length > 0) {
                    data = data[0];
                }

                //파일명 찾기
                let file_name = getGeneralFilename(user_org_type.id == data.org_id, data.id, data.code_no, sign_type);

                let attach_list: {
                    dest_path: string;
                    file_path: string;
                }[] = [];

                let attach : any;

                //첨부파일 찾기
                if (isLive) {
                    attach = await tr.query(`
                    SELECT
                        sd.document_code,
                        sf.filename
                    FROM signfile sf
                    INNER JOIN signdata sd
                        ON sd.id = sf.sign_id
                    WHERE sign_id = ${id}
                `);

                    for (var a of attach) {
                        let _file_name = decodeURIComponent(a.filename);

                        attach_list.push({
                            dest_path: a.document_code + "/" + _file_name,
                            file_path: uploadFolder + _file_name,
                        });
                    }
                } else {
                    attach = await tr.query(`
                    SELECT
                        CONCAT(sd.document_code, "/" ,sf.filename) AS 'dest_path',
                        CONCAT("uploads", "/", sf.filename) AS 'file_path'
                    FROM signfile sf
                    INNER JOIN signdata sd
                        ON sd.id = sf.sign_id
                    WHERE sign_id = ${id};
                `);

                    for (var a of attach) {
                        attach_list.push({
                            dest_path: a.dest_path,
                            file_path: a.file_path,
                        });
                    }
                }

                let target = folder.tree.children.find(raw => raw.name == file_name + ".pdf");

                if (target && fs.existsSync(target.path)) {
                    downloadFileList.push({
                        dest_path: `${data.code_no}` + "/" + data.title + ".pdf",
                        file_path: target.path,
                    });
                }
            }

            if (downloadFileList.length > 0) {
                const filename = `${getMoment(new Date()).format("YY-MM-DD SSS")}_일반문서.zip`;

                res.setHeader("Content-disposition", "attachment; filename=" + encodeURI(filename));
                res.setHeader("Content-Type", "application/zip; charset=utf-8");

                let output = await GenerateZip(
                    filename,
                    [
                        ...downloadFileList.map(raw => {
                            return raw.file_path;
                        }),
                        ...attach_list.map(raw => {
                            return raw.file_path;
                        }),
                    ],
                    [
                        ...downloadFileList.map(raw => {
                            return raw.dest_path;
                        }),
                        ...attach_list.map(raw => {
                            return raw.dest_path;
                        }),
                    ]
                );

                let filestream = fs.createReadStream(output);
                filestream.pipe(res);

                logger.log("down", `[id: ${down_user.id}, User Email: ${down_user.email}, File Path: ${output}]`);
                fs.unlinkSync(output);

                return res;
            }
        } catch (err) {
            logger.error(err);
        }
        return getFailedResponse(res);
    });
});

export default router;
