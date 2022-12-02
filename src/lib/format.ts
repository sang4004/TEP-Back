import { Response } from "express";
import { parse } from "node-html-parser";
import { getMoment } from "@/lib/utils";
import { WorkTm, WorkProc, EdmsDocument } from "@/entity";

export interface responseFormat {
    resultCode: number;
    data: Object | null;
    success: boolean;
}

export const getSuccessResponse = (res: Response, payload: Object | null = null) => {
    return res.status(200).json({
        resultCode: 200,
        data: payload,
        success: true,
    });
};

export const getFailedResponse = (res: Response, errorMsg: string = "시스템 오류") => {
    return res.status(200).json({
        resultCode: 9999,
        errorMsg: errorMsg,
        data: null,
        success: false,
    });
};

export interface officialTmHtmlDataType {
    docu_code: string;
    docu_subject: string;
    tm_explan: string;
    issuer: string;
    recievr: string;
    sender: string;
    sender_company: string;
    sender_position: string;
    sender_Date: Date;
    received_list: string[];
    received_company: string;
    received_Date: Date;
    reference_company: string;
    reference_list: string[];
    docu_list: { docu_code: string; docu_subject: string; revision: string }[];
    stage: "IFA" | "AFC" | "As-Built";
}

export const getStringFromHtml = (html: string) => {
    // console.log(html);
    // if(html.indexOf("<a href=") != -1){
    //     let reg = new RegExp('<a href=\"(' + edmsFileDir.replace("/", "\/") + ')\">(.*?)<\/a>')
    //     let result = reg.exec(html);
    //     while(result){
    //         result = reg.exec(html);
    //     }
    // }
    const root = parse(html);
    return root.innerText;
};

export const getHENCTREmailFormat = (
    tm_code: WorkTm,
    wp: WorkProc,
    data: officialTmHtmlDataType,
    is_mail_tm_paper: boolean
) => {
    let recievedFirst = "";
    let recievedOthers = "";
    let referenceFirst = "";
    let referenceOthers = "";
    if (data.received_list.length > 0) {
        recievedFirst = `<div class="content_top_people" id="FirstReceived">${
            data.received_list[0]
        } / ${getCompanyNameOrId(data.received_company, "name")}</div>`;

        if (data.received_list.length > 1) {
            recievedOthers = data.received_list
                .map((raw, idx) => {
                    if (idx != 0)
                        return `<div class="content_people_div">
                            <div class="content_top_title"></div>
                            <div class="content_top_people" id="SecondReceived">
                                ${"&nbsp;" + raw} / ${getCompanyNameOrId(data.received_company, "name")}
                            </div>
                        </div>`;
                })
                .join("\n");
        }
    }
    if (data.reference_list.length > 0) {
        referenceFirst = `<div class="content_top_people" id="FirstReferencePeople">
        ${data.reference_list[0]} / ${getCompanyNameOrId(data.reference_company, "name")}</div>`;

        if (data.reference_list.length > 1) {
            referenceOthers = data.reference_list
                .map((raw, idx) => {
                    if (idx != 0)
                        return `<div class="content_people_div">
                            <div class="content_top_title"></div>
                            <div class="content_top_people" id="SecondReferencePeople">${
                                "&nbsp;" + raw
                            } / ${getCompanyNameOrId(data.reference_company, "name")}</div>
                        </div>`;
                })
                .join("\n");
        }
    }
    // 체크박스 For Type 정의
    let forType = wp.for_type;
    if (forType == undefined || forType == 0) {
        if (data.stage == "IFA") {
            forType = 4;
        } else if (data.stage == "AFC") {
            forType = 5;
        } else if (data.stage == "As-Built") {
            forType = 6;
        } else {
            // 이도저도 아닐경우
            forType = 1;
        }
    }
    return `<!DOCTYPE html>
    <html lang="ko">
        <head>
            <meta charset="utf-8" />
            ${
                is_mail_tm_paper
                    ? `
            <title>TR</title>
            <style>
                body{
                    width : 100%;
                    height : auto;
                    padding : 0 auto;
                    margin : 0;
                    overflow: scroll;
                }
                .layout_div {
                    display: block;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    background: white;
                }
                .henc_inner {
                    margin-bottom: 32px; 
                    width: 80%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    font-family: "Nanum Gothic", sans-serif;
                }
                .top_text {
                    margin-top: 55px;
                    color: #061580;
                    font-size: 15px;
                    font-weight: 800;
                }
                .top_title {
                    display: flex;
                    position: relative;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 38px;
                }
                .top_img {
                    display: flex;
                    position: relative;
                    justify-content: center;
                    margin-bottom: 10px;
                }
                .address_top_div {
                    display: flex;
                    flex: 1;
                    justify-content: space-between;
                    color: #061580;
                    font-size: 0.7em;
                    top: 200px;
                }
                .hr_blue_margin {
                    border-bottom: 6px solid #061580;
                    margin-bottom: 8px;
                }
                .content_people_div {
                    display: flex;
                    flex-direction: row;
                    color: #061580;
                }
                .content_top_people_div {
                    display: flex;
                    color: #061580;
                    flex-direction: column;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 3px;
                }
                .content_top_div {
                    display: flex;
                    justify-content: flex-start;
                    color: #061580;
                }
                .content_top_docu_div {
                    display: flex;
                    justify-content: space-between;
                    color: #061580;
                }
                .content_top_people {
                    display: flex;
                    flex-direction: column;
                    color: #061580;
                    margin-left : 6px;
                }
                .content_top_title {
                    width: 120px;
                    margin-right: 10px;
                    font-size: 14px;
                    margin-bottom: 3px;
                    margin-left: 3px;
                }
                .content_top_text {
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 3px;
                    margin-left : 6px;
                }
                .content_top_title_subject {
                    width: 120px;
                    font-size: 14px;
                    margin-right: 10px;
                    margin-left: 3px;
                }
                .content_top_text_subject {
                    font-weight: bold;
                    font-size: 14px;
                    margin-left : 6px;
                }
                .content_mid_div {
                    display: flex;
                    flex-direction: row;
                }
                .content_mid_div_two {
                    display: flex;
                    flex-direction: column;
                }
                .content_mid_text {
                    margin-left: 20px;
                    min-width: 140px;
                }
                .contnet_mid_note_text {
                    text-align: center;
                    font-size: 13px;
                    height: 20px;
                }
                .content_Div {
                    width: 100%;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 70px;
                }
                table {
                    width: 100%;
                    border: 1px solid #444444;
                    border-collapse: collapse;
                }
                tr {
                    height : 30px;
                }
                th, td {
                    border: 1px solid #444444;
                    text-align: center;
                    font-size: 13px;
                    font-weight: 500;
                }
                .table_text {
                    margin-top: 5px;
                    font-size: 16px;
                    font-weight: 400;
                }
                .hr_black_margin {
                    margin-bottom: 20px;
                    width: 100%;
                }
                .bottom_top_div {
                    display: flex;
                    justify-content: space-between;
                    flex-direction: column;
                }
                .bottom_mid_div {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    width : 100%;
                }
                .bottom_bot_div {
                    display: flex;
                    flex-direction: row;
                    flex : 1;
                }
                .bottom_bot_div_left{
                    justify-content: flex-start;
                }
                .bottom_bot_div_right{
                    justify-content: flex-end;
                }
                .bottom_title {
                    min-width: 100px;
                }
                .bottom_text {
                    font-size: 0.9em;
                    text-align: center;
                    border-bottom: solid 1px #000;
                    width: 100px;
                    margin-right: 15px;
                }
                .bottom_page_img {
                    display: flex;
                    position : absolute;
                    right : 2px;
                    width : auto;
                }
                .hr_width {
                    width: 100%;
                }
                .hr_note {
                    width : 100%;
                }
                .top_big_div {
                    width: 100%;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                    justify-self: center;
                }
                .bottom_big_div {
                    width: 100%;
                    height: auto;
                    margin: 0;
                    margin : 60px 0;
                }
                .bottom_page_div {
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    text-align: center;
                    font-size: 15px;
                    width : 100%;
                    position: relative;
                }
            </style>
            `
                    : ``
            }
        </head>
        <body>
            <div class="layout_div">
                <div class="henc_inner">
                    <div class="top_big_div" id="pdf_doc_header">
                        <div class="top_text">TRANSMITTAL</div>
                        <div class="top_img">
                            <img src="data:image/png;base64,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" />
                        </div>
    
                        <div class="top_title">
                            <div>통영 천연가스 발전사업</div>
                        </div>
                        <div class="address_top_div">
                            <div>P.Code)04541. 서울시 중구 청계천로 86 한화빌딩 7 층</div>
                            <div>&#x0260E; 82-729-4956 / FAX 82-2-729-6230</div>
                        </div>
    
                        <div class="hr_blue_margin"></div>
    
                        <div class="content_top_docu_div">
                            <div class="content_top_div">
                                <div class="content_top_title">Document No. :</div>
                                <div class="content_top_text" id="TmNo">${tm_code.tm_code}</div>
                            </div>
                            <div class="content_top_text" id="CreateTm">${getMoment(wp.create_tm)
                                .locale("en")
                                .format("DD-MMM-YYYY")}</div>
                        </div>
                        <div class="content_top_people_div">
                            <div class="content_people_div">
                                <div class="content_top_title">
                                    From&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
                                </div>
                                <div class="content_top_text">
                                    ${data.sender} ${data.sender_position} / 
                                    ${getCompanyNameOrId(data.sender_company, "name")}
                                </div>
                            </div>
                        </div>
                        <div class="content_top_people_div">
                            <div class="content_people_div">
                                <div class="content_top_title">TO</div>
                                ${recievedFirst}
                            </div>
                            ${recievedOthers}
                        </div>
                        <div class="content_top_people_div">
                            <div class="content_people_div">
                                <div class="content_top_title">CC</div>
                                ${referenceFirst}
                            </div>
                            ${referenceOthers}
                            
                        </div>
                        <div class="content_top_div">
                            <div class="content_top_title_subject">Subject</div>
                            <div class="content_top_text_subject" id="Subject">
                            ${wp.subject}
                            </div>
                        </div>
                        <div class="hr_blue_margin"></div>
                    </div>
    
                    <div class="content_Div" id="pdf_doc_body">
                        <div>&rtrif; &nbsp;&nbsp; Transmitted the following</div>
                        <div class="content_mid_div" id="Company">
                            <div class="content_mid_text" id="Hanwha">${
                                getCompanyNameOrId(data.received_company, "name") === "HENC" ? "◼️ " : "◻️ "
                            }HENC</div> 
                            <div class="content_mid_text" id="TEP">${
                                getCompanyNameOrId(data.received_company, "name") === "TEP" || "HTC" ? "◼️ " : "◻️ "
                            }TEP</div> 
                            <div class="content_mid_text" id="Shinhan">${
                                getCompanyNameOrId(data.received_company, "name") === "신한 A&E" ? "◼️ " : "◻️ "
                            }신한 A&E</div>
                        </div>
                        <div>&rtrif; &nbsp;&nbsp; Listed below</div>
                        <div class="content_mid_div_two" id="Check">
                            <div class="content_mid_div" id="Info">
                                <div class="content_mid_text" id="Reference">${
                                    forType == 1 ? "◼️ " : "◻️ "
                                } For Reference</div>
                                <div class="content_mid_text" id="Review">${
                                    forType == 2 ? "◼️ " : "◻️ "
                                } For Review</div>
                                <div class="content_mid_text" id="Information">${
                                    forType == 3 ? "◼️ " : "◻️ "
                                } For Information</div>
                            </div>
                            <div class="content_mid_div" id="Stage">
                                <div class="content_mid_text" id="Approval">${
                                    forType == 4 ? "◼️ " : "◻️ "
                                } For Approval</div>
                                <div class="content_mid_text" id="Construction">
                                    ${forType == 5 ? "◼️ " : "◻️ "} For Construction
                                </div>
                                <div class="content_mid_text" id="Final">${forType == 6 ? "◼️ " : "◻️ "} For Final</div>
                            </div>
                        </div>
                        <div>&rtrif; &nbsp;&nbsp; Note :</div>
                        <div id="Note">
                            <hr class="hr_note" />
                            <div class="contnet_mid_note_text">
                                1. &nbsp; 첨부의 Issue Document 에 대한 귀사의 검토 및 승인 요청
                                드립니다.
                            </div>
                            <hr class="hr_note" />
                            <div class="contnet_mid_note_text"></div>
                            <hr class="hr_black_margin" />
                        </div>
    
                        <table class="table">
                            <th>Document Number</th>
                            <th>Rev. No.</th>
                            <th>Description</th>
                            <th>Result</th>
                            ${data.docu_list
                                .map((raw, idx: number) => {
                                    return `<tr key="${idx}">
                                    <td>${raw.docu_code}</td>
                                    <td>${raw.revision}</td>
                                    <td>${raw.docu_subject}</td>
                                    <td></td>
                                </tr>`;
                                })
                                .join("")}
                        </table>
                        <div class="table_text">
                            Please return one copy of this transmittal cover with your signature
                            immediately in order to recognize your reception.
                        </div>
                    </div>
    
                    <div class="bottom_big_div" id="pdf_doc_footer">
                        <div class="bottom_top_div">
                            <div class="bottom_mid_div">
                                <div class="bottom_bot_div bottom_bot_div_left">
                                    <div class="bottom_title">Issued by</div>
                                    <div class="bottom_text" id="SenderName">${data.issuer}</div>
                                </div>
                                <div class="bottom_bot_div bottom_bot_div_right">
                                    <div class="bottom_title">Received by</div>
                                    <div class="bottom_text" id="ReceivedName">${data.recievr}</div>
                                </div>
                            </div>
                            <div class="bottom_mid_div">
                                <div class="bottom_bot_div bottom_bot_div_left">
                                    <div class="bottom_title">Date</div>
                                    <div class="bottom_text" id="SnenderDate">${getMoment(wp.create_tm)
                                        .locale("en")
                                        .format("DD-MMM-YYYY")}</div>
                                </div>
                                <div class="bottom_bot_div bottom_bot_div_right">
                                    <div class="bottom_title">Date</div>
                                    <div class="bottom_text" id="ReceivedDate">${getMoment(wp.due_date)
                                        .locale("en")
                                        .format("DD-MMM-YYYY")}</div>
                                </div>
                            </div>
                        </div>
                        <hr class="hr_width" />
                        <div class="bottom_page_div">
                            <div>Page- 1 of 1</div>
                            <div class="bottom_page_img">
                                <img src="data:image/png;base64,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" />
                            </div>
                        </div>
                    </div>    
                </div>
            </div>
        </body>
    </html>
        `;
};

// 신한꺼 처리하고 데이터 맞추고 출력까지 확인해야함
export const getShinhanTREmailFormat = (
    tm_code: WorkTm,
    wp: WorkProc,
    data: officialTmHtmlDataType,
    is_mail_tm_paper: boolean
) => {
    return `
    <!DOCTYPE html>
    <html lang="ko">
        <head>
            <meta charset="utf-8" />
            ${
                is_mail_tm_paper
                    ? `
            <title>TR</title>
            <style>
            * {
                word-break: keep-all;
                margin: 0;
                padding: 0;
                font-family: inherit;
                /* 부모의 글꼴을 상속받는다 */
                font-size: inherit;
                font-weight: inherit;
                text-decoration: inherit;
                font-style: inherit;
            }

            body{
                width : 793px;
                height : 1122px;
                margin : 0;
                background: white;
                overflow: scroll;
            }

            .edms_shinhan_head_form {
                font-family: "Nanum Gothic", sans-serif;
                font-size: 12px;
                color: #000;
                font-weight: normal;
                text-decoration: none;
                font-style: normal;
                box-sizing: border-box;
                width: 100%;
            }

            .edms_shinhan_head_form::after {
                content: "";
                display: block;
                clear: both;
            }

            .edms_shinhan_head_form .shinhan_head_top {
                vertical-align: bottom;
                display: flex;
                height: 100px;
                align-items: center;
                flex-direction: column;
            }

            .edms_shinhan_head_form .shinhan_head_top .title {
                display: flex;
                justify-content: flex-start;
                margin-left: -10px;
                width: 40%;
            }

            .edms_shinhan_head_form .shinhan_head_top .title > img {
                width: 100%;
                height: 64px;
            }

            .edms_shinhan_head_form .select {
                display: block;
                border: none;
                outline: none;
                -webkit-appearance: none;
            }

            .edms_shinhan_head_form > .title {
                float: left;
                margin-bottom: 10px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap {
                display: flex;
                flex-wrap: wrap;
                box-sizing: border-box;
                width: 96%;
                vertical-align: bottom;
                align-items: center;
                text-align: center;
                font-size: 10px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap .shinhan_head_subject {
                width: 100%;
                font-size: 19px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap .shinhan_head_website {
                margin: 0 4px;
                color: blue;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap .shinhan_head_address {
                margin-right: 2px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap #tel_input {
                margin-right: 2px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap #fax_input {
                margin-right: 6px;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap .shinhan_head_manager {
                margin-right: 2px;
                float: right;
                display: flex;
            }

            .edms_shinhan_head_form .shinhan_head_info {
                clear: both;
                padding: 10px 10px;
                border-top: 4px solid #b2b2b2;
                border-bottom: 4px solid #b2b2b2;
                font-size: 14px;
                display: flex;
                flex-direction: column;
                gap: 18px;
                position: relative;
            }

            .edms_shinhan_head_form .shinhan_head_info > div {
            }

            .edms_shinhan_head_form .shinhan_head_info input {
                width: 75%;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info1 {
                display: flex;
                justify-content: space-between;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info1 .info_title {
                margin-right: 20px;
            }
            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info2 {
                display: flex;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info2 .info_title {
                margin-right: 10px;
            }
            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info3 {
                display: flex;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info3 .info_title {
                margin-right: 20px;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info4 {
                display: flex;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info4 .info_title {
                margin-right: 20px;
            }
            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info5 {
                display: flex;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info5 .info_title {
                margin-right: 20px;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info_num {
                float: left;
            }

            .edms_shinhan_head_form .shinhan_head_info .shinhan_head_info_date {
                position: absolute;
                right: 4px;
                top: 10px;
            }

            .edms_shinhan_head_form .shinhan_head_contents {
                font-size: 21px;
            }

            .edms_shinhan_head_form .down {
                text-align: center;
                letter-spacing: 15px;
            }

            .edms_shinhan_head_form .down_contents {
                margin: 0 auto;
                width: 100%;
            }

            .edms_shinhan_head_form .down_contents p {
                margin-bottom: 20px;
            }

            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr_content input {
                height: 90px;
            }
            .edms_shinhan_head_form .shinhan_head_table {
                margin: 50px;
            }
            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr > * {
                border: 1px solid #000;
                padding: 10px;
                box-sizing: border-box;
                text-align: center;
            }

            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr .company_title,
            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr .company_address,
            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr .company_ceo,
            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr .company_date,
            .edms_shinhan_head_form .shinhan_head_table .shinhan_tr .company_remark {
                border-bottom: none;
            }

            .edms_shinhan_head_form .shinhan_head_contents_plus {
                margin-top: 20px;
            }

            .edms_shinhan_head_form .shinhan_head_sending {
                font-weight: 400;
                display: flex;
                flex-direction: column;
                margin-right: 30px;
                font-size: 22px;
                width: fit-content;
            }

            .edms_shinhan_head_form .shinhan_head_sending > p {
                width: 100%;
                height: 50px;
            }

            .edms_shinhan_head_form .shinhan_head_sending .p_company {
                text-align: justify;
                text-align-last: justify;
                display: inline-block;
                line-height: 1.8em;
                letter-spacing: 2px;
            }

            .edms_shinhan_head_form .shinhan_head_sending .p_user {
                text-align: justify;
                text-align-last: justify;
                display: inline-block;
                line-height: 1.8em;
                margin-left: 7px;
                letter-spacing: 14px;
            }

            .edms_shinhan_head_form#doc_header {
                padding: 60px 7% 0px 7%;
            }

            .edms_shinhan_head_form#doc_footer {
                margin: 100px 3% 60px 3%;
                min-height: 180px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }

            .edms_shinhan_head_form#doc_body {
                padding: 0px 7%;
            }

            .edms_shinhan_design_form {
                float: right;
                font-weight: 400;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-right: 40px;
                font-size: 22px;
                margin-bottom: 60px;
                position : fixed;
                bottom : 0;
                right : 0;
                width: 380px;
            }

            .edms_shinhan_design_form .edms_shinhan_design_sending .edms_shinhan_design_spacing {
                text-align: justify;
                text-align-last: justify;
                text-justify: inter-word;
                width: 100%;
                letter-spacing: 12px;
            }

            .edms_shinhan_design_form .edms_shinhan_design_sending .shinhan_sender_user {
                text-align: justify;
                text-align-last: justify;
                text-justify: inter-word;
                display: inline-block;
                width: 100%;
                letter-spacing: 16px;
            }

            .edms_shinhan_design_form .edms_shinhan_design_sending p {
                text-align: justify;
                text-align-last: justify;
                text-justify: inter-word;
                display: inline-block;
                width: 100%;
                line-height: 1.8em;
                letter-spacing: 2px;
            }

            .hsinhan_docu_div {
                display: flex;
                flex-direction: row;
            }

            .bottom_send_user {
                display: flex;
                flex-direction: row;
                width: 100%;
            }

            .contentsDiv {
                display: flex;
                flex-direction: row;
                padding: 15px 0px;
                width: 100%;
                font-size: 14px;
            }

            .contentsDiv > p {
                margin-left: 10px;
                word-break: break-all;
            }

            .add {
                display: flex;
                flex-direction: row;
                padding-top: 50px;
                width: 100%;
                font-size: 14px;
            }

            .add > p {
                margin-left: 20px;
                word-break: break-all;
            }

            .edms_shinhan_head_form .edms_shinhan_head_top_wrap .smalldiv {
                align-items: center;
                display: flex;
                justify-content: center;
                width: 100%;
                font-size: 12px;
            }
            </style>
            `
                    : ``
            }
        </head>
<body>
    <div class="edms_shinhan_head_form " id="doc_header"><div id="doc_header_sign"></div>
    <div class="shinhan_head_top">
    <div class="title"><img src='https://ifh.cc/g/LgtrcJ.png' border='0' alt="" class="logo"></div>
    <div class="edms_shinhan_head_top_wrap">
        <p class="shinhan_head_subject">통영 천연가스 발전사업 건설사업관리단 ( 설계단계 )</p>
        <div class="smalldiv">
        <p class="shinhan_head_address">서울특별시 송파구 중대로 168 신한빌딩  <p id="tel_input">직통&nbsp;02)405-8088 </p> /&nbsp;&nbsp;FAX.&nbsp;&nbsp;02)405-8013</p>
        <a class="shinhan_head_website" href="http://www.shinhana.com" target="_blank" >www.shinhana.com</a>
        <p class="shinhan_head_manager">담당자 </p><p  id="sender_input">${data.sender} ${data.sender_position}</p>
        </div>
    </div>
    </div>
    <div class="shinhan_head_info">
    <div class="shinhan_head_info1">
        <div class="hsinhan_docu_div">
        <div class="info_title" >문서 </div>
        <p  type="text" id="doc_id_input">${tm_code.tm_code}</p>
    </div>
    <div class="shinhan_head_info_date">
        <p  type="text" id="date_input">${getMoment(wp.create_tm).format("YYYY. MM. DD.")}</p>
    </div>
        </div>
        <div class="shinhan_head_info3">
        <div class="info_title">수신 </div>
        <p  class="select shinhan_head_info_reference" id="recv_input">${data.received_list.join(
            ","
        )} / ${getCompanyNameOrId(data.received_company, "name")}
        </div>
        <div class="shinhan_head_info4">
        <div class="info_title">참조 </div>
        <p  class="select shinhan_head_info_reference" id="cc_input"> 
        ${data.reference_list.map((raw, idx) => {
            return ` ${raw} / ${getCompanyNameOrId(data.reference_company, "name")}`;
        })}</p>
        </div>
        <div class="shinhan_head_info5">
        <div class="info_title">제목 </div>
        <p  type="text" id="title_input" contenteditable="true">${wp.subject}</p>
        </div>
        </div>
    </div>  
    <div class="edms_shinhan_head_form" id="doc_body">
        <div class="shinhan_head_contents">
        <div class="contentsDiv">1.<p>‘${tm_code.tm_code}’ 관련입니다. </p> </div>
        <div class="contentsDiv">2.<p >${wp.explan}</p></div>
        <div class="add">붙임<p>‘${tm_code.tm_code}’검토서 1부 끝.</p></div>
        </div>
    </div>
    <div class="edms_shinhan_design_form">
        <div class="edms_shinhan_design_sending">
        <p class="edms_shinhan_design_spacing">㈜신한종합건축사사무소</p>
        <p>통영천연가스발전소 건설사업관리단</p>
        <div class="bottom_send_user">
        <p>책임기술자</p>
        <p class="edms_shinhan_sender_user" id="stamp_input3_1">김송률</p>
        </div> 
    </div>
    </div>
    </body>
</html>
    `;
};

//#region legacy
// 하드코딩
const TEP = ["TEP", "통영", "에코파워"];
const SHIN = ["신한", "SHIN", "A&E"];
const HTC = ["휴먼텍", "HTC"];
const HENC = ["HENC", "한화"];
export const getCompanyChar = (str?: string) => {
    if (str) {
        for (var t of TEP) {
            if (t.indexOf(str) != -1 || str.indexOf(t) != -1) {
                return 1;
            }
        }
        for (var s of SHIN) {
            if (s.indexOf(str) != -1 || str.indexOf(s) != -1) {
                return 2;
            }
        }
        for (var h of HTC) {
            if (h.indexOf(str) != -1 || str.indexOf(h) != -1) {
                return 3;
            }
        }
        for (var hw of HENC) {
            if (hw.indexOf(str) != -1 || str.indexOf(hw) != -1) {
                return 4;
            }
        }
    }
    return 0;
};
//#endregion

const getCompanyNameOrId = (name: string, type: string) => {
    if (type === "name") {
        switch (name) {
            case "통영에코파워":
                return "TEP";
            case "(주)한화건설":
                return "HENC";
            case "(주)신한종합건축사사무소":
                return "신한 A&E";
            case "(주)휴먼텍":
                return "HTC";
            default:
                return "";
        }
    } else {
        switch (name) {
            case "통영에코파워":
                return "TEP";
            case "(주)한화건설":
                return "Hanwha";
            case "(주)신한종합건축사사무소":
                return "Shinhan";
            case "(주)휴먼텍":
                return "HTC";
            default:
                return "";
        }
    }
};

export const LANGUAGE_PACK = {
    CANNOT_REQUEST_REFER: { kor: "모든 문서의 검토완료가 필요합니다." },
    DRN: { kor: "문서 회신" },
    WORK_PROC: {
        CREATE: { kor: "기안" },
        REVIEW: {
            default: { kor: "리뷰" },
            DO: { kor: "리뷰하기" },
            WAIT: { kor: "리뷰대기" },
            REQUEST_WAIT: { kor: "검토요청대기" },
            REQUEST_ING: { kor: "검토중" },
        },
        CC: {
            default: { kor: "참조" },
            REVIEW_WAIT: { kor: "참조처검토대기" },
            REVIEW_COMPLETE: { kor: "참조처검토완료" },
            CONFIRM: { kor: "참조승인" },
            CONFRIM_WAIT: { kor: "참조처승인대기" },
            CONFIRM_COMPLETE: { kor: "참조처승인완료" },
            CONFIRM_REJECT: { kor: "참조처승인반려" },
            RECEIVE: { kor: "참조수신" },
        },
        SIGNATURE: {
            default: { kor: "결재" },
            DO: { kor: "결재하기" },
            WAIT: { kor: "결재대기" },
            COMPLETE: { kor: "결재완료" },
            REJECT: { kor: "반려" },
            IN_WAIT: { kor: "내부결재대기" },
            IN_COMPLETE: { kor: "내부결재완료" },
            ERROR: { kor: "결재오류" },
        },
        REGIST_N_DEPLOY: { kor: "접수및배포" },
        SEND: {
            default: { kor: "발신" },
            DO: { kor: "발신하기" },
            COMPLETE: { kor: "발신완료" },
        },
        RECEIVE: {
            default: { kor: "수신" },
            COMPLETE: { kor: "수신완료" },
        },
        REPLY: {
            default: { kor: "회신" },
            DO: { kor: "회신하기" },
            SIGNATURE: { kor: "회신결재진행중" },
            SIGNATURE_REJECT: { kor: "회신결재반려" },
            SIGNATURE_COMPLETE: { kor: "회신결재완료" },
            SIGNATURED: { kor: "회신결재" },
            COMPLETE: { kor: "회신완료" },
        },
        COMPLETE: { kor: "최종완료" },
        REGIST: {
            default: { kor: "접수" },
            WAIT: { kor: "접수대기" },
        },
    },
    PROJECT: {
        CONTINUED: { kor: "진행 중" },
        COMPLETE: { kor: "완료" },
        WAIT: { kor: "준비 중" },
    },
    EMAIL: {
        CREATE_PROJECT: {
            default: { kor: "프로젝트 생성 안내" },
            content: { kor: "프로젝트가 생성되었습니다." },
        },
        SIGNATURE: {
            REQUEST_ALERT_TITLE: { kor: "결재 요청 안내" },
            REQUEST_ALERT_DESC: { kor: "결재 요청이 있습니다." },
            SHORT_CUT: { kor: "결재 바로가기" },
        },
        DEPLOY: {
            default: { kor: "배포" },
            REVIEW_REQUEST_DESC: { kor: "귀하에게 문서 검토 요청이 왔습니다." },
            REVIEW_SHORTCUT: { kor: "리뷰 바로가기" },
        },
        TM: {
            default: { kor: "TR" },
            RECEIVE_TM_DOCUMENT: { kor: "TM문서가 전달되었습니다." },
            CC: {
                CONFIRM_TITLE: { kor: "참조승인" },
                CONFIRM_DESC: { kor: "귀하의 문서가 참조승인 되었습니다." },
            },
            DOCUMENT_SHORTCUT: { kor: "문서 바로가기" },
            REVIEW: {
                REQUEST_TITLE: { kor: "검토 요청" },
                REQUEST_DESC: { kor: "귀하에게 TR 검토 요청이 왔습니다." },
            },
            SHORTCUT: { kor: "TR 바로가기" },
        },
    },
};
