import { Signdata } from "../entity/Signdata";
import moment from "moment";
const isLive = process.env.NODE_ENV == "live";

const getMoment = (date: Date | string, format?: string) => {
    return format ? moment(date, format) : moment(date);
};

export const getTEPOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `<!DOCTYPE html>
  <html>
      <head>
          <meta charset="utf-8" />
          <title>공문서</title>
          <style>
              @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
              * {
                  margin: 0;
                  padding: 0;
                  font-family: inherit;
                  font-size: inherit;
                  color: inherit;
                  font-weight: inherit;
                  text-decoration: inherit;
                  line-height: 160%;
                  font-style: inherit;
              }

              html {
                  font-family: 'Noto Sans KR', sans-serif;
                  font-weight: 300;
                  font-size: 16px;
                  color: black;
                  text-decoration: none;
                  font-style: normal;
              }
  
              body {
                  width: 100%;
                  height: auto;
                  overflow: scroll;
                  position: relative;
                  margin: 0;
                  box-sizing: border-box;
                  padding: 0;
              }
              .form_wrapper {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  position: relative;
                  
              }
              .ecopower_form {
                  width: 90%;
                  height: auto;
                  box-sizing: border-box;
                  margin: 50px 5% 50px 5%;
              }
              .ecopower_form#doc_header {
                  margin-top: 40px;
              }
              .ecopower_form#doc_body {
                  margin: 0 5% 0 5%;
              }
              .ecopower_form#doc_footer {
                  height: auto;
                  position: absolute;
                  top: 1138px;
                  margin: 0;
              }
              #doc_header_sign {
                  width: 100%;
                  position: absolute;
                  font-size: 16px;
                  display: flex;
                  justify-content: center;
                  height: 200px;
                  align-items: center;
                  left: 0;
                  top: 0;
              }
              .ecopower_form .company_title {
                  width: 100%;
                  font-size: 45px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-weight: 500;
                  margin-bottom: 30px;
                  letter-spacing: 0.1em;
                  margin-top: 100px;
              }
              .ecopower_form .ecopower_info {
                  margin-bottom: 10px;
                  border-bottom: 1px solid #c10000;
                  padding: 0 8px 4px 8px;
                  font-size: 22px;
                  font-weight: 300;
              }
              .ecopower_form .ecopower_contents {
                  display: block;
                  width: 100%;
                  height: auto;
                  margin: 0 auto;
                  padding: 20px;
                  box-sizing: border-box;
                  font-size: 21px;
                  font-weight: 300;
              }
              .ecopower_form > .ecopower_contents > .contents_num {
                  letter-spacing: 0.001em;
              }
              #doc_footer_sign {
                  width: 100%;
                  position: absolute;
                  font-size: 16px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100%;
              }
              .ecopower_sign {
                  padding: 20px 40px 80px 20px;
                  box-sizing: border-box;
                  font-size: 25px;
                  display: flex;
                  justify-content: flex-end;
              }
              .ecopower_sign .ecopower_writer {
                  width: fit-content;
                  font-size: 30px;
                  letter-spacing: 0.1em;
                  font-weight: 500;
              }
              .ecopower_bottom {
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: space-between;
                  padding-top: 30px;
                  border-top: 7px solid #a0a0a0;
                  font-size: 18px;
              }
              .sign_regist_layout.ecopower_form_key {
                  position: absolute;
                  width: 240px;
                  left: 60px;
                  bottom: 135px;
                  height: 240px;
                  background-size: cover;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  z-index: 100;
              }
              .user_sign.ecopower_form_key {
                  position: absolute;
                  width: 96px;
                  right: -25px;
                  bottom: 150px;
              }
              .sign_layout.ecopower_form_key {
                  position: absolute;
                  z-index: 100;
                  width: 240px;
                  right: 360px;
                  bottom: 135px;
                  filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                      contrast(138%);
                  height: 240px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
              }
              .sign_regist_title {
                  position: absolute;
                  text-align: center;
                  color: #4644ff;
                  width: 180px;
                  top: 60px;
                  font-size: 1.2em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .sign_regist_date {
                  position: absolute;
                  text-align: center;
                  color: #4644ff;
                  width: 180px;
                  font-size: 1.2em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .sign_regist_comp {
                  position: absolute;
                  text-align: center;
                  color: #4644ff;
                  width: 180px;
                  bottom: 60px;
                  font-size: 1em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .sign_title {
                  position: absolute;
                  text-align: center;
                  color: #ff0000;
                  width: 180px;
                  top: 60px;
                  font-size: 1.2em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .sign_date {
                  position: absolute;
                  text-align: center;
                  color: #ff0000;
                  width: 180px;
                  font-size: 1.2em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .sign_comp {
                  position: absolute;
                  text-align: center;
                  color: #ff0000;
                  width: 180px;
                  bottom: 60px;
                  font-size: 1em;
                  font-family: "Nanum Myeongjo", serif;
              }
              .SignHeadDiv {
                  display: table;
                  border-collapse: collapse;
                  width: fit-content;
                  max-width: 425px;
                  height: fit-content;
                  float: right;
                  position: absolute;
                  right: 20px;
                  top: 20px;
              }
              .SignHeadDiv2 {
                  display: table;
                  border-collapse: collapse;
                  width: fit-content;
                  max-width: 825px;
                  height: fit-content;
                  float: right;
                  position: absolute;
                  right: 20px;
                  top: 20px;
              }
              .SignText {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
                  width: 25px;
                  min-width: 25px;
                  height: 120px;
                  float: left;
                  border: 1px solid #000000;
                  margin-left: -1px;
                  margin-top: -1px;
                  word-break: break-all;
                  word-wrap: break-word;
              }
              .SignHead {
                  display: flex;
                  flex-direction: column;
                  border-collapse: collapse;
                  width: 100px;
                  min-width: 64px;
                  height: 120px;
                  float: left;
                  border: 1px solid #000000;
                  margin-top: -1px;
                  margin-left: -1px;
                  text-align: center;
                  font-size: 0.9em;
              }
              .SignHead .name {
                  width: 100%;
                  flex: 1;
                  border-bottom: 1px solid #000000;
              }
              .SignHead .pdfdate {
                  width: 100%;
                  line-height: 1.2em;
                  padding: 0 1em;
                  font-size: 0.8em;
                  border-top: 1px solid #000000;
                  white-space: pre-wrap;
              }
              .SignHead .date {
                  height: 40px;
                  padding: 0 20%;
                  font-size: 0.9em;
                  border-top: 1px solid #000000;
                  white-space: pre-wrap;
              }
              .SignHead .imgdiv {
                  width: 100%;
                  flex: 3;
                  display: flex;
                  justify-content: center;
                  align-items: center;
              }
              .ecopower_form .ecopower_info > div > div:first-of-type {
                  margin-right: 10px;
                  white-space: pre;
              }
              .ecopower_form .ecopower_info > div #title_input {
                  display: block;
                  flex: 1 1;
                  font-weight: 500;
              }
              .ecopower_form .ecopower_info > div {
                  display: flex;
                  height: auto;
              }
              .ecopower_num > #send_date_input {
                  min-width: 200px;
                  margin: 0 10px;
              }
              .form_wrapper > .ecopower_form {
                  width: 80%;
                  margin: 0 10%;
              }
              pre, code {
                  font-size: 1em;
                  line-height: 2em;
              }
              .sign_regist_bg {
                width: 190px;
                height: 190px;
              }
              .sign_bg {
                width: 190px;
                height: 190px;
              }
              .ecopower_info .docu_box .docu_title{
                display : flex;
                align-items:baseline;
                font-weight: 500;
              }
              .pre-tag {
                white-space: pre-wrap;
            }
          </style>
        <body>
            <div style="" class="form_wrapper" id="top_style">
            <div class="form_container ecopower_form" id="doc_header">
                <div id="doc_header_sign">
                ${
                    sign_line.length > 0 && sign_line != undefined
                        ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                          sign_line
                              .map((raw: any, idx: number) => {
                                  return `
                            <div class="SignHead">
                                <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                <div class="imgdiv">${raw.username}</div>
                                <div class="date">${
                                    raw.state == "1"
                                        ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                        : raw.state == "3" || raw.state == "6"
                                        ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                        : ""
                                }</div>
                            </div>
                        `;
                              })
                              .join("") +
                          `</div>`
                        : ``
                }
                </div>
                <div class="company_title">통영에코파워</div>
                <div class="ecopower_info">
                    <div class="reception_box">
                        <div class="reception_title">수 신 :</div>
                        <p class="reference" id="recv_input">${data.doc_sender}</p>
                    </div>
                    <div class="sent_box">
                        <div class="title">참 조 :</div>
                        <p class="reference" id="cc_input">${out_referer.map((raw: any) => {
                            if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                            else return `${raw.company} ${raw.position} ${raw.username}`;
                        })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>
                    </div>
                    <div class="docu_box">
                        <div class="docu_title">제 목 :</div>
                        <p class="docu" id="title_input" contenteditable="true">${data.title}</p>
                    </div>
                </div>
                <!-- ecopower_info -->
            </div>
            ${isLive ? decodeURIComponent(data.html) : data.html}
            <div class="ecopower_form" id="doc_footer">
              <div id="doc_footer_sign">
                ${
                    data.sign_state == 3
                        ? `
                <div class="sign_layout ecopower_form_key">
                    <p>
                        <img
                            class="sign_bg"
                            src="http://localhost:3002/filedownload/sign_layout_1.png"
                        />
                    </p>
                    <p id="sign_title" class="sign_title">발 송</p>
                    <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                        .locale("en")
                        .format("YYYY.MM.DD.")}</p>
                    <p id="sign_comp" class="sign_comp">${
                        sign_company == "(주)신한종합건축사사무소"
                            ? "SHINHAN"
                            : "(주)와이앤제이이앤씨"
                            ? "와이앤제이이앤씨"
                            : sign_company
                    }</p>
                </div>
                <img
                    src="${data.issue_signature_img}"
                    class="user_sign ecopower_form_key"
                    style=""
                />
                `
                        : data.sign_state == 6 && sign_register != ""
                        ? `
                <div class="sign_regist_layout ecopower_form_key">
                    <p>
                        <img
                            class="sign_regist_bg"
                            src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                        />
                    </p>
                    <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                    <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                        .locale("en")
                        .format("YYYY.MM.DD.")}</p>
                    <p id="sign_regist_comp" class="sign_regist_comp">${
                        sign_register == "(주)신한종합건축사사무소"
                            ? "SHINHAN"
                            : "(주)와이앤제이이앤씨"
                            ? "와이앤제이이앤씨"
                            : sign_register
                    }</p>
                </div>

                <div class="sign_layout ecopower_form_key">
                    <p>
                        <img
                            class="sign_bg"
                            src="http://localhost:3002/filedownload/sign_layout_1.png"
                        />
                    </p>
                    <p id="sign_title" class="sign_title">발 송</p>
                    <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                        .locale("en")
                        .format("YYYY.MM.DD.")}</p>
                    <p id="sign_comp" class="sign_comp">${
                        sign_company == "(주)신한종합건축사사무소"
                            ? "SHINHAN"
                            : "(주)와이앤제이이앤씨"
                            ? "와이앤제이이앤씨"
                            : sign_company
                    }</p>
                </div>
                <img
                    src="${data.issue_signature_img}"
                    class="user_sign ecopower_form_key"
                    style=""
                />
                `
                        : data.sign_state == 2 || data.issue_signature_img
                        ? `
                <img
                    src="${data.issue_signature_img}"
                    class="user_sign ecopower_form_key"
                    style=""
                />
                `
                        : ""
                }
              </div>  
              <div class="ecopower_sign">    
                <div class="ecopower_writer">      
                  <p>통영에코파워㈜</p>      
                  <p>대표이사 이흥복</p>    
                </div>  
              </div>  
              <div class="ecopower_bottom">    
                <div class="ecopower_manager">      
                  <p style="display:  inline-block; margin-right: 10px;" class="title">담당 :&nbsp;&nbsp;&nbsp;&nbsp;${
                      data.doc_sender
                  }</p> <p  style="display:  inline-block;" class="contents" id="sender_input"></p> (T. <p style="display: inline-block;" id="tel_input">${
        data.doc_tel
    }</p> F. <p  style="display:  inline-block;" id="fax_input">${
        data.doc_fax
    }</p> E. <p  style="display:  inline-block;" id="email_input">${data.doc_email}</p> )        </p>    
                </div>    
                <div class="ecopower_num">        
                <p style="display:  inline-block;" id="doc_id_input">통영에코 제 2022-137호</p>           <p style="display:  inline-block;" id="send_date_input">(${
                    data.doc_date
                })</p>           <p style="display:  inline-block; margin-right: 10px;" id="address_input">53006 경상남도 통영시 광도면 춘원1로 77</p>        
                </div>  
              </div>  
            </div>
            </div>
        </body>
      </head>
  </html>
  `;
};

export const getHENCCompOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8" />
    
            <title>공문서</title>
            <style>
                @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
                * {
                    margin: 0;
                    padding: 0;
                    font-family: inherit;
                    font-size: inherit;
                    color: inherit;
                    font-weight: inherit;
                    text-decoration: inherit;
                    line-height: 160%;
                    font-style: inherit;
                }

                html {
                    font-family: "Noto Sans KR", sans-serif;
                    font-style: normal;
                    font-size: 16px;
                    font-weight: 300;
                    color: #000;
                    text-decoration: none;
                }
    
                body {
                    width: 100%;
                    height: auto;
                    overflow: scroll;
                    position: relative;
                    margin: 0;
                    box-sizing: border-box;
                    padding: 0;
                }
    
                .form_wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
    
                .select,
                input {
                    box-sizing: border-box;
                }
    
                button {
                    border: none;
                    background: none;
                    cursor: pointer;
                    outline: none;
                }
    
                .form_wrapper > .hanwha_ec_form2 {
                    width: 91%;
                    margin: 0 5.5%;
                }
    
                .form_wrapper > .hanwha_ec_form2#doc_body {
                    min-height: none !important;
                }
    
                .form_wrapper > .hanwha_ec_form2#doc_header {
                    margin-top: 50px;
                }
    
                .form_wrapper > .hanwha_ec_form2#doc_footer {
                    top: 1240px;
                }
    
                .hanwha_line > p {
                    height: 10px;
                }
    
                .hidden {
                    position: fixed;
                    left: -10000px;
                }
    
                .hanwha_ec_form2 {
                    box-sizing: border-box;
                    width: 94%;
                    margin: 50px;
                }
    
                .hanwha_ec_form2 input {
                    border: none;
                    outline: none;
                }
    
                .hanwha_ec_form2 .title {
                    margin-right: 5px;
                }
    
                .hanwha_ec_form2 .title::after {
                    content: " : ";
                    display: inline-block;
                    color: #000;
                }
    
                .hanwha_ec_form2 .logo {
                    float: left;
                    text-align: center;
                    font-weight: bold;
                    font-size: 30px;
                }
    
                .hanwha_ec_form2 .logo > p {
                    height: 70px;
                    width: 160px;
                }
    
                .hanwha_ec_form2 .logo2 {
                    float: right;
                    font-size: 28px;
                    font-weight: 600;
                    margin-top: 10px;
                    letter-spacing: 4px;
                }
    
                .hanwha_ec_form2 .contact {
                    display: flex;
                    margin: 0 auto;
                    width: 100%;
                    flex-wrap: wrap;
                    font-size: 18px;
                    margin-top: 20px;
                }
    
                .hanwha_ec_form2 .contact .hanwha_address {
                    width: 100%;
                }
    
                .hanwha_ec_form2 .contact > div {
                    display: flex;
                    margin: 5px 0;
                    margin-right: 5%;
                    height: 20px;
                }
    
                .hanwha_ec_form2 .contact > div .contact_title {
                    margin-right: 10px;
                }
    
                .hanwha_ec_form2 .hanwha_line {
                    margin-top: 40px;
                }
    
                .hanwha_ec_form2 .hanwha_line img {
                    display: block;
                    width: 100%;
                }
    
                .hanwha_ec_form2 .form_info {
                    margin-bottom: 5px;
                    padding: 0 4px;
                    padding-top: 0;
                    border-bottom: 2px solid #ccc;
                    box-sizing: border-box;
                    font-size: 18px;
                }
                .hanwha_ec_form2 .form_info .title {
                    white-space: break-spaces;
                    margin-right: 30px;
                }
    
                .hanwha_ec_form2 .form_info > div > div {
                    flex: 1;
                    display: flex;
                }
    
                .hanwha_ec_form2 .form_info > div {
                    display: flex;
                    margin: 20px 0;
                }
    
                .hanwha_ec_form2 .form_info > div.num {
                    float: left;
                }
    
                .hanwha_ec_form2 .form_info > div.date {
                    float: right;
                }
    
                .hanwha_ec_form2 .form_info > div p.title {
                    text-align: justify;
                }
    
                .hanwha_ec_form2 .form_info > div > input {
                    display: block;
                    flex: 1;
                }
    
                .hanwha_ec_form2 .form_info > div.reception,
                .hanwha_ec_form2 .form_info > div.reference,
                .hanwha_ec_form2 .form_info > div.docu_title {
                    clear: both;
                }
    
                .hanwha_ec_form2 .form_info > div.reception .reference_select_inner,
                .hanwha_ec_form2 .form_info > div.reference .reference_select_inner {
                    flex: 1;
                    display: flex;
                }
    
                .hanwha_ec_form2 .form_info > div.reception .select,
                .hanwha_ec_form2 .form_info > div.reference .select {
                    display: block;
                    border: none;
                    outline: none;
                    -webkit-appearance: none;
                }
    
                .hanwha_ec_form2 .form_contents {
                    display: block;
                    width: 100%;
                    padding: 0 5%;
                    box-sizing: border-box;
                    font-size: 16px;
                }
    
                .hanwha_ec_form2 .form_contents::after {
                    display: block;
                    content: "";
                    clear: both;
                }
    
                .hanwha_ec_form2 .form_contents > p,
                .hanwha_ec_form2 .form_contents > div {
                    margin: 20px 0;
                }
    
                .hanwha_ec_form2 .form_contents .docu_attachment {
                    margin: 40px 0;
                    display: flex;
                }
    
                .hanwha_ec_form2 .form_contents .docu_attachment .attachment_title {
                    margin-right: 10px;
                }
    
                .hanwha_ec_form2 .form_contents .docu_attachment .attachment_contents p {
                    margin-bottom: 5px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending {
                    float: right;
                    display: inline-block;
                    font-weight: bold;
                    margin: 0 20px 0 0;
                    letter-spacing: 0.2em;
                    font-size: 20px;
                }
                .hanwha_ec_form2 .form_contents .document_sending > p {
                    height: 50px;
                    width: 100%;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending .place_spacing_1 {
                    letter-spacing: 8.5px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending .place_spacing_2 {
                    letter-spacing: 12px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending .place_spacing_3 {
                    letter-spacing: 8.5px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending .place_spacing_4 {
                    letter-spacing: 4px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending #stamp_input1 {
                    text-align: justify;
                    text-align-last: justify;
                    padding-right: 18px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending #stamp_input2 {
                    text-align: justify;
                    text-align-last: justify;
                    padding-right: 18px;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending #stamp_input3 {
                    letter-spacing: 18px;
                    text-align: justify;
                    text-align-last: justify;
                }
    
                .hanwha_ec_form2 .form_contents .document_sending #stamp_input3_1 {
                    letter-spacing: 24px;
                    text-align: justify;
                    text-align-last: justify;
                }
    
                .hanwha_ec_form2 .form_contents > p {
                    white-space: pre-wrap;
                }
    
                .hanwha_ec_form2#doc_header {
                    margin: 60px 3% 0px 3%;
                    padding: 0;
                }
    
                .hanwha_ec_form2#doc_footer {
                    margin: 80px 3% 60px 3%;
                }
    
                .hanwha_ec_form2#doc_body {
                    margin: 20px 3% 0 3%;
                    min-height: 600px;
                }
    
                #doc_header_sign {
                    width: 100%;
                    position: absolute;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    height: 200px;
                    align-items: center;
                    left: 0;
                    top: 0;
                }
    
                .SignHeadDiv2 {
                    display: table;
                    border-collapse: collapse;
                    width: fit-content;
                    max-width: 825px;
                    height: fit-content;
                    float: right;
                    position: absolute;
                    right: 20px;
                    top: 20px;
                }
    
                .SignText {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    width: 25px;
                    min-width: 25px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-left: -1px;
                    margin-top: -1px;
                    word-break: break-all;
                    word-wrap: break-word;
                }
                .SignHead {
                    display: flex;
                    flex-direction: column;
                    border-collapse: collapse;
                    width: 100px;
                    min-width: 64px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-top: -1px;
                    margin-left: -1px;
                    text-align: center;
                    font-size: 0.9em;
                }
                .SignHead .name {
                    width: 100%;
                    flex: 1;
                    border-bottom: 1px solid #000000;
                }
                .SignHead .date { 
                    height: 40px;
                    padding: 0 20%;
                    font-size: 0.9em;
                    border-top: 1px solid #000000;
                    white-space: pre-wrap;
                }
                .SignHead .imgdiv {
                    width: 100%;
                    flex: 3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
    
                .hanwha_ec_form2 .contact .hanwha_address {
                    width: 100%;
                }
                
                #doc_footer_sign {
                    width: 100%;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                }
                .sign_layout.hanwha_ec_form2_key {
                    position: absolute;
                    z-index: 100;
                    width: 240px;
                    right: 500px;
                    bottom: 60px;
                    filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                        contrast(138%);
                    height: 240px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sign_regist_layout.hanwha_ec_form2_key {
                    position: absolute;
                    width: 240px;
                    left: 120px;
                    bottom: 60px;
                    height: 240px;
                    background-size: cover;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                }
                .user_sign.hanwha_ec_form2_key {
                    position: absolute;
                    width: 104px;
                    right: 80px;
                    bottom: 40px;
                }
                .sign_regist_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_regist_title {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_date {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_comp {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_title {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_date {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_comp {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .pre-tag {
                    white-space: pre-wrap;
                }
            </style>
            <body>
                <div style="" class="form_wrapper" id="">
                    <div class="form_container hanwha_ec_form2" id="doc_header">
                        <div id="doc_header_sign">
                        ${
                            sign_line.length > 0 && sign_line != undefined
                                ? `<div class="SignHeadDiv2"><div class="SignText">결재</div>` +
                                  sign_line
                                      .map((raw: any, idx: number) => {
                                          return `
                                    <div class="SignHead">
                                        <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                        <div class="imgdiv">${raw.username}</div>
                                        <div class="date">${
                                            raw.state == "1"
                                                ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : raw.state == "3" || raw.state == "6"
                                                ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : ""
                                        }</div>
                                    </div>
                                `;
                                      })
                                      .join("") +
                                  `</div>`
                                : ``
                        }
                        </div>
                        <div class="logo">
                            <img src="http://localhost:3002/filedownload/hanwhaE&C_logo4.png" alt="" />
                        </div>
                        <div class="logo2" id="sign_logo2">통영 천연가스 발전 사업</div>
                        <div class="contact">
                            <div class="hanwha_address">
                                <p id="address_input">04541 서울시 중구 청계천로 86 한화빌딩 7</p>
                                <p id="website_input">www.hwenc.co.kr</p>
                            </div>
                            <div class="hanwha_manager">
                                <div class="contact_title"><p id="team_input">통영 TFT</p></div>
                                <div class="manager_name"><p id="sender_input">${data.doc_sender}</p></div>
                            </div>
                            <div class="hanwha_tel">
                                <div class="contact_title">TEL</div>
                                <div class="tel"><p id="tel_input">${data.doc_tel}</p></div>
                            </div>
                            <div class="hanwha_fax">
                                <div class="contact_title">FAX</div>
                                <div class="fax"><p id="fax_input">${data.doc_fax}</p></div>
                            </div>
                            <div class="hanwha_email">
                                <div class="contact_title">Email</div>
                                <div class="email_info"><p id="email_input">${data.doc_email}</p></div>
                            </div>
                        </div>
                        <!-- contact -->
                        <div class="hanwha_line">
                            <img src="http://localhost:3002/filedownload/hanwha_line.png" alt="" />
                        </div>
                        <div class="form_info">
                            <div class="num">
                                <p class="title">문서번호</p>
                                <div class="document-num"><p id="doc_id_input">${data.document_code}</p></div>
                            </div>
                            <div class="date"><p id="date_input">2022.06.09.</p></div>
                            <div class="reception">
                                <p class="title">수&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;신</p>
                                <div><p id="recv_input">${data.doc_recv}</p></div>
                            </div>
                            <div class="reference">
                                <p class="title">참&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;조</p>
                                <div class="reference_select_inner">
                                    <p class="reference" id="cc_input">${out_referer.map((raw: any) => {
                                        if (raw.position.indexOf("대표이사") != -1)
                                            return `${raw.company} ${raw.position}`;
                                        else return `${raw.company} ${raw.position} ${raw.username}`;
                                    })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>
                                </div>
                            </div>
                            <div class="docu_title">
                                <p class="title">제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</p>
                                <p
                                    style="font-weight: bold"
                                    id="title_input"
                                    contenteditable="true"
                                >${data.title}</p>
                            </div>
                        </div>
                        <!-- form_info -->
                    </div>
                    ${isLive ? decodeURIComponent(data.html) : data.html}
                    <div class="form_container hanwha_ec_form2" id="doc_footer">
                        <div id="doc_footer_sign">
                            ${
                                data.sign_state == 3
                                    ? `
                            <div class="sign_layout hanwha_ec_form2_key">
                                <p>
                                    <img
                                        class="sign_bg"
                                        src="http://localhost:3002/filedownload/sign_layout_1.png"
                                    />
                                </p>
                                <p id="sign_title" class="sign_title">발 송</p>
                                <p id="sign_date" class="sign_date">${getMoment(data.registed_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_comp" class="sign_comp">${
                                    sign_company == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_company
                                }</p>
                            </div>
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign hanwha_ec_form2_key"
                                style=""
                            />
                            `
                                    : data.sign_state == 6 && sign_register != ""
                                    ? `
                            <div class="sign_regist_layout hanwha_ec_form2_key">
                                <p>
                                    <img
                                        class="sign_bg"
                                        src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                    />
                                </p>
                                <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                                <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_regist_comp" class="sign_regist_comp">${
                                    sign_register == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_register
                                }</p>
                            </div>

                            <div class="sign_layout hanwha_ec_form2_key">
                                <p>
                                    <img
                                        class="sign_bg"
                                        src="http://localhost:3002/filedownload/sign_layout_1.png"
                                    />
                                </p>
                                <p id="sign_title" class="sign_title">발 송</p>
                                <p id="sign_date" class="sign_date">${getMoment(data.registed_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_comp" class="sign_comp">${
                                    sign_company == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_company
                                }</p>
                            </div>
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign hanwha_ec_form2_key"
                                style=""
                            />
                            `
                                    : data.sign_state == 2 || data.issue_signature_img
                                    ? `
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign hanwha_ec_form2_key"
                                style=""
                            />
                            `
                                    : ""
                            }
                        </div>
                        <div class="form_contents" style="width: 100%">
                            <div class="document_sending">
                                <p id="stamp_input1">주 식 회 사 한 화 건 설</p>
                                <p id="stamp_input2">경기도 시흥시 대은로 81</p>
                                <p id="stamp_input3">대표이사 김승모</p>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
        </head>
    </html>
        `;
};

export const getSHINHANCompOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8" />
    
            <title>공문서</title>
            <style>
                @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
                * {
                    margin: 0;
                    padding: 0;
                    font-family: inherit;
                    font-size: inherit;
                    color: inherit;
                    font-weight: inherit;
                    text-decoration: inherit;
                    line-height: 160%;
                    font-style: inherit;
                }

                html {
                    font-family: 'Noto Sans KR', sans-serif;
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 300;
                    text-decoration: none;
                    color: #000;
                }
    
                body {
                    width: 100%;
                    height: auto;
                    overflow: scroll;
                    position: relative;
                    margin: 0;
                    box-sizing: border-box;
                    padding: 0;
                }
    
                .form_wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
    
                .select,
                input {
                    box-sizing: border-box;
                }
                
                button {
                    border: none;
                    background: none;
                    cursor: pointer;
                    outline: none;
                }
                
                .hidden {
                    position: fixed;
                    left: -10000px;
                }
                
                .form_wrapper > .shinhan_head_form {
                    width: 88%;
                    margin: 0 6%;
                }
                
                .form_wrapper > .shinhan_head_form#doc_body {
                    min-height: none !important;
                }
                
                .form_wrapper > .shinhan_head_form#doc_header {
                    margin-top: 25px;
                }
                
                .form_wrapper > .shinhan_head_form#doc_footer {
                    top: 1260px;
                }
                
                .shinhan_head_form {
                    box-sizing: border-box;
                    width: 94%;
                    margin: 50px;
                }
                
                .shinhan_head_form::after {
                    content: "";
                    display: block;
                    clear: both;
                }
                
                .shinhan_head_form .shinhan_head_top {
                    vertical-align: bottom;
                    display: flex;
                    height: 90px;
                    align-items: flex-end;
                }
                
                .shinhan_head_form .shinhan_head_top .title {
                    display: flex;
                    justify-content: flex-start;
                    margin-left: -10px;
                    width: 24%;
                }
                
                .shinhan_head_form .shinhan_head_top .title > img {
                    width: 100%;
                    border: none;
                }
                
                .shinhan_head_form .select {
                    display: block;
                    border: none;
                    outline: none;
                    -webkit-appearance: none;
                }
                
                .shinhan_head_form > .title {
                    float: left;
                    margin-bottom: 10px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap {
                    display: flex;
                    flex-wrap: wrap;
                    box-sizing: border-box;
                    width: 90%;
                    font-size: 14px;
                    vertical-align: bottom;
                    align-items: flex-end;
                    padding-top: 10px;
                    padding-bottom: 10px;
                    margin-left: 40px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap .shinhan_head_address {
                    width: 100%;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap .shinhan_head_website {
                    margin: 0 16px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap .shinhan_head_tel {
                    margin-right: 6px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap #tel_input {
                    margin-right: 6px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap #fax_input {
                    margin-right: 6px;
                }
                
                .shinhan_head_form .shinhan_head_top_wrap .shinhan_head_manager {
                    margin-right: 15px;
                    float: right;
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info {
                    clear: both;
                    padding: 10px 10px;
                    border-top: 8px solid #ccc;
                    border-bottom: 8px solid #ccc;
                    font-size: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    position: relative;
                }
                
                .shinhan_head_form .shinhan_head_info > div {
                }
                
                .shinhan_head_form .shinhan_head_info input {
                    width: 75%;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info1 {
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info1 .info_title {
                    margin-right: 10px;
                }
                .shinhan_head_form .shinhan_head_info .shinhan_head_info2 {
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info2 .info_title {
                    margin-right: 10px;
                }
                .shinhan_head_form .shinhan_head_info .shinhan_head_info3 {
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info3 .info_title {
                    margin-right: 10px;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info4 {
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info4 .info_title {
                    margin-right: 10px;
                }
                .shinhan_head_form .shinhan_head_info .shinhan_head_info5 {
                    display: flex;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info5 .info_title {
                    margin-right: 10px;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info_num {
                    float: left;
                }
                
                .shinhan_head_form .shinhan_head_info .shinhan_head_info_date {
                    position: absolute;
                    right: 4px;
                    top: 10px;
                }
                
                .shinhan_head_form .shinhan_head_contents {
                    min-height: 700px;
                    font-size: 21px;
                }
                
                .shinhan_head_form .shinhan_head_contents > p {
                    margin-bottom: 20px;
                    width: 100%;
                }
                
                .shinhan_head_form .down {
                    text-align: center;
                    letter-spacing: 15px;
                }
                
                .shinhan_head_form .down_contents {
                    margin: 0 auto;
                    width: 100%;
                }
                
                .shinhan_head_form .down_contents p {
                    margin-bottom: 20px;
                }
                
                .shinhan_head_form .shinhan_head_table .shinhan_tr {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .shinhan_head_form .shinhan_head_table .shinhan_tr_content input {
                    height: 90px;
                }
                .shinhan_head_form .shinhan_head_table {
                    margin: 50px;
                }
                .shinhan_head_form .shinhan_head_table .shinhan_tr > * {
                    border: 1px solid #000;
                    padding: 10px;
                    box-sizing: border-box;
                    text-align: center;
                }
                
                .shinhan_head_form .shinhan_head_table .shinhan_tr .company_title,
                .shinhan_head_form .shinhan_head_table .shinhan_tr .company_address,
                .shinhan_head_form .shinhan_head_table .shinhan_tr .company_ceo,
                .shinhan_head_form .shinhan_head_table .shinhan_tr .company_date,
                .shinhan_head_form .shinhan_head_table .shinhan_tr .company_remark {
                    border-bottom: none;
                }
                
                .shinhan_head_form .shinhan_head_contents_plus {
                    margin-top: 20px;
                }
                
                .shinhan_head_form .shinhan_head_sending {
                    font-weight: 300;
                    display: flex;
                    flex-direction: column;
                    margin-right: 30px;
                    font-size: 22px;
                    width: fit-content;
                }
                
                .shinhan_head_form .shinhan_head_sending > p {
                    width: 100%;
                    height: 50px;
                }
                
                .shinhan_head_form .shinhan_head_sending .p_company {
                    text-align: justify;
                    text-align-last: justify;
                    display: inline-block;
                    line-height: 1.8em;
                    letter-spacing: 2px;
                }
                
                .shinhan_head_form .shinhan_head_sending .p_user {
                    text-align: justify;
                    text-align-last: justify;
                    display: inline-block;
                    line-height: 1.8em;
                    margin-left: 7px;
                    letter-spacing: 14px;
                }
                
                .shinhan_head_form#doc_header {
                    margin: 60px 3% 0px 3%;
                }
                
                .shinhan_head_form#doc_footer {
                    margin: 100px 3% 60px 3%;
                    min-height: 180px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                
                .shinhan_head_form#doc_body {
                    margin: 0 3% 0 3%;
                }
                #doc_header_sign {
                    width: 100%;
                    position: absolute;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    height: 200px;
                    align-items: center;
                    left: 0;
                    top: 0;
                }
                .SignText {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    width: 25px;
                    min-width: 25px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-left: -1px;
                    margin-top: -1px;
                    word-break: break-all;
                    word-wrap: break-word;
                }
                .SignHead {
                    display: flex;
                    flex-direction: column;
                    border-collapse: collapse;
                    width: 100px;
                    min-width: 64px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-top: -1px;
                    margin-left: -1px;
                    text-align: center;
                    font-size: 0.9em;
                }
                .SignHead .name {
                    width: 100%;
                    flex: 1;
                    border-bottom: 1px solid #000000;
                }
                .SignHead .date { 
                    height: 40px;
                    padding: 0 20%;
                    font-size: 0.9em;
                    border-top: 1px solid #000000;
                    white-space: pre-wrap;
                }
                .SignHead .imgdiv {
                    width: 100%;
                    flex: 3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .sign_layout.shinhan_ec_form2_key {
                    position: absolute;
                    z-index: 100;
                    width: 240px;
                    right: 500px;
                    bottom: 60px;
                    filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                        contrast(138%);
                    height: 240px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sign_regist_layout.shinhan_ec_form2_key {
                    position: absolute;
                    width: 240px;
                    left: 170px;
                    bottom: 60px;
                    height: 240px;
                    background-size: cover;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                }
                .user_sign.shinhan_ec_form2_key {
                    position: absolute;
                    width: 104px;
                    right: 120px;
                    bottom: 120px;
                }
                .sign_regist_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_regist_title {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_date {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_comp {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_title {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_date {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_comp {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .SignHeadDiv2 {
                    display: table;
                    border-collapse: collapse;
                    width: fit-content;
                    max-width: 825px;
                    height: fit-content;
                    float: right;
                    position: absolute;
                    right: 20px;
                    top: 20px;
                }
                .pre-tag {
                    white-space: pre-wrap;
                }
            </style>
            <body>
                <div style="" class="form_wrapper" id="top_style">
                  <div class="form_container shinhan_head_form " id="doc_header">
                    <div id="doc_header_sign">
                    ${
                        sign_line.length > 0 && sign_line != undefined
                            ? `<div class="SignHeadDiv2"><div class="SignText">결재</div>` +
                              sign_line
                                  .map((raw: any, idx: number) => {
                                      return `
                                <div class="SignHead">
                                    <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                    <div class="imgdiv">${raw.username}</div>
                                    <div class="date">${
                                        raw.state == "1"
                                            ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : raw.state == "3" || raw.state == "6"
                                            ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : ""
                                    }</div>
                                </div>
                            `;
                                  })
                                  .join("") +
                              `</div>`
                            : ``
                    }
                    </div>      
                    <div class="shinhan_head_top">        
                      <div class="title">
                        <img src="http://localhost:3002/filedownload/shinhan_logo.png" alt="" class="logo">
                      </div>
                      <!-- title -->        
                      <div class="shinhan_head_top_wrap">          
                        <p class="shinhan_head_address" id="address_input" >138-160  서울특별시 송파구 중대로 168 신한빌딩</p>          
                        <p class="shinhan_head_tel">직통 <p  id="tel_input">${
                            data.doc_tel
                        } </p>  <p  id="fax_input">/FAX.${
        data.doc_fax
    }</p></p>         <p> <a class="shinhan_head_website" href="http://www.shinhana.com" target="_blank" >www.shinhana.com</a>   </p>       <p class="shinhan_head_manager">담당자: </p><p  id="sender_input">${
        data.doc_sender
    }</p>        
                      </div>
                      <!-- shinhan_head_top -->      
                    </div>      
                    <div class="shinhan_head_info">        
                      <div class="shinhan_head_info1">          
                        <div class="info_title" >문서 </div>         <p  type="text" id="doc_id_input">${
                            data.document_code
                        }</p>        
                        </div>        
                        <div class="shinhan_head_info_date">          <p  type="text" id="date_input">${
                            data.doc_date
                        }</p>        
                        </div>        
                        <div class="shinhan_head_info3">          
                          <div class="info_title">수신 </div>          <p  class="select shinhan_head_info_reference" id="recv_input">${
                              data.doc_recv
                          }</p>        
                        </div>        
                        <div class="shinhan_head_info4">          
                          <div class="info_title">참조 </div>          <p  class="select shinhan_head_info_reference" id="cc_input">${out_referer.map(
                              (raw: any) => {
                                  if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                  else return `${raw.company} ${raw.position} ${raw.username}`;
                              }
                          )}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>        
                        </div>        
                        <div class="shinhan_head_info5">          
                          <div class="info_title">제목 </div>          <p  type="text" id="title_input" contenteditable="true">${
                              data.title
                          }</p>        
                        </div>        
                      </div>      
                    </div>
                    <!-- shinhan_head_info -->
                    ${isLive ? decodeURIComponent(data.html) : data.html}
                  <div class="form_container shinhan_head_form" id="doc_footer">
                    <div id="doc_footer_sign">
                        ${
                            data.sign_state == 3
                                ? `
                        <div class="sign_layout shinhan_ec_form2_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="http://localhost:3002/filedownload/signature_img_sample.png"
                            class="user_sign shinhan_ec_form2_key"
                            style=""
                        />
                        `
                                : data.sign_state == 6 && sign_register != ""
                                ? `
                        <div class="sign_regist_layout shinhan_ec_form2_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                />
                            </p>
                            <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                            <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_regist_comp" class="sign_regist_comp">${
                                sign_register == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_register
                            }</p>
                        </div>
        
                        <div class="sign_layout shinhan_ec_form2_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign shinhan_ec_form2_key"
                            style=""
                        />
                        `
                                : data.sign_state == 2 || data.issue_signature_img
                                ? `
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign shinhan_ec_form2_key"
                            style=""
                        />
                        `
                                : ""
                        }
                    </div>      
                    <div class="shinhan_head_sending">        <p class="p_company">( 주 ) 신 한 종 합 건 축 사 사 무 소</p>        <p class="p_user">대표이사 김상훈 (인)</p>      </div>    </div>
                </div>
            </body>
        </head>
    </html>
    `;
};

export const getSHINHANSiteOffcialDocument = (
    data: Signdata,
    sub_field: string,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />

        <title>공문서</title>
        <style>
            @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
            * {
                margin: 0;
                padding: 0;
                font-family: inherit;
                font-size: inherit;
                color: inherit;
                font-weight: inherit;
                text-decoration: inherit;
                line-height: 160%;
                font-style: inherit;
            }

            html {
                font-family: 'Noto Sans KR', sans-serif;
                font-size: 18px;
                color: black;
                text-decoration: none;
                font-style: normal;
                font-weight: 300;
            }

            body {
                width: 100%;
                height: auto;
                overflow: scroll;
                position: relative;
                margin: 0;
                box-sizing: border-box;
                padding: 0;
            }

            .form_wrapper {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
            }
            .select,
            input {
              box-sizing: border-box;
            }

            button {
              border: none;
              background: none;
              cursor: pointer;
              outline: none;
            }

            .hidden {
              position: fixed;
              left: -10000px;
            }

            .form_wrapper > .shinhan_design_form {
              width: 86%;
              margin: 0 7%;
            }

            .form_wrapper > .shinhan_design_form#doc_body {
              min-height: none !important;
              margin-top: 20px;
            }

            .form_wrapper > .shinhan_design_form#doc_header{
              margin-top: 120px;
            }

            .form_wrapper > .shinhan_design_form#doc_footer{
              top: 1260px;
            }

            .shinhan_design_form .SignHead .date {
              font-size: 0.83em;
            }
            .shinhan_design_form {
              box-sizing: border-box;
              width:90%;
              margin:50px;
            }

            .shinhan_design_form::after {
              content: "";
              display: block;
              clear: both;
            }

            .shinhan_design_form .shinhan_head_top {
              vertical-align: bottom;
              display: flex;
              height: 90px;
              align-items: flex-end;
            }

            .shinhan_design_form .shinhan_head_top .title{
              display : flex;
              justify-content: flex-start;
              margin-left: -10px;
              width : 46%;
            }

            .shinhan_design_form .shinhan_head_top .title>img{
              width : 100%;
            }

            .shinhan_design_form .select {
              display: block;
              border: none;
              outline: none;
              -webkit-appearance: none;
            }

            .shinhan_design_form>.title {
            float: left;
            margin-bottom: 10px;
            }

            .shinhan_design_form .shinhan_head_top_wrap {
              display: flex;
              flex-wrap: wrap;
              box-sizing: border-box;
              width: 90%;
              font-size: 14px;
              vertical-align: bottom;
              align-items: flex-end;
              padding-top: 10px;
              padding-bottom: 10px;
              margin-left: 40px;
            }

            .shinhan_design_form .shinhan_head_top_wrap .shinhan_head_address {
              width: 100%;
            }

            .shinhan_design_form .shinhan_head_top_wrap .shinhan_head_website{
              margin : 0 10px;
            }

            .shinhan_design_form .shinhan_head_top_wrap .shinhan_head_tel{
              margin-right: 4px;
            }

            .shinhan_design_form .shinhan_head_top_wrap #tel_input{
              margin-right: 4px;
            }

            .shinhan_design_form .shinhan_head_top_wrap #fax_input{
              margin-right : 4px;
            }

            .shinhan_design_form .shinhan_head_top_wrap .shinhan_head_manager{
              margin-right: 10px;
              float: right;
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info {
              clear: both;
              padding: 10px 10px;
              border-top: 8px solid #ccc;
              border-bottom: 8px solid #ccc;
              font-size: 18px;
              display: flex;
              flex-direction: column;
              gap: 25px;
              position: relative;
            }

            .shinhan_design_form .shinhan_head_info input{
              width: 75%;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info1 {
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info1 .info_title {
              margin-right: 15px;
            }
            .shinhan_design_form .shinhan_head_info .shinhan_head_info2 {
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info2 .info_title {
              margin-right: 15px;
            }
            .shinhan_design_form .shinhan_head_info .shinhan_head_info3 {
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info3 .info_title {
              margin-right: 15px;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info4 {
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info4 .info_title {
              margin-right: 15px;
            }
            .shinhan_design_form .shinhan_head_info .shinhan_head_info5 {
              display: flex;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info5 .info_title {
              margin-right: 15px;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info_num {
              float: left;
            }

            .shinhan_design_form .shinhan_head_info .shinhan_head_info_date {
              position : absolute;
              right: 4px;
              top: 10px;
            }

            .shinhan_design_form .shinhan_head_contents{
              min-height: 560px;
              font-size : 21px;
            }

            .shinhan_design_form .shinhan_head_contents>p {
              margin-bottom: 20px;
              width: 100%;
            }

            .shinhan_design_form .down {
              text-align: center;
              letter-spacing: 15px;
            }

            .shinhan_design_form .down_contents {
              margin: 0 auto;
              width: 100%;
            }

            .shinhan_design_form .down_contents p {
              margin-bottom: 20px;
            }

            .shinhan_design_form .shinhan_head_table .shinhan_tr {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .shinhan_design_form .shinhan_head_table .shinhan_tr_content input{
              height : 90px;
            }
            .shinhan_design_form .shinhan_head_table{
              margin: 50px;
            }
            .shinhan_design_form .shinhan_head_table .shinhan_tr>* {
              border: 1px solid #000;
              padding: 10px;
              box-sizing: border-box;
              text-align: center;
            }

            .shinhan_design_form .shinhan_head_table .shinhan_tr .company_title,
            .shinhan_design_form .shinhan_head_table .shinhan_tr .company_address,
            .shinhan_design_form .shinhan_head_table .shinhan_tr .company_ceo,
            .shinhan_design_form .shinhan_head_table .shinhan_tr .company_date,
            .shinhan_design_form .shinhan_head_table .shinhan_tr .company_remark {
              border-bottom: none;
            }

            .shinhan_design_form .shinhan_head_contents_plus {
              margin-top: 20px;
            }

            .shinhan_design_form .shinhan_design_sending {
              float: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              margin-top: 40px;
              margin-right: 30px;
              font-size: 20px;
              padding-bottom: 60px;
            }

            .shinhan_design_form .shinhan_design_sending .shinhan_design_spacing{
              text-align: justify;
              text-align-last: justify;
              text-justify: inter-word;
              width: 100%;
              letter-spacing: 12px;
            }

            .shinhan_design_form .shinhan_design_sending p {
              text-align: justify;
              text-align-last:justify;
              text-justify: inter-word;
              display: inline-block;
              width: 100%;
              line-height: 1.8em;
              letter-spacing: 4px;
            }

            .shinhan_design_form#doc_header{
              margin: 60px 5% 0px 5%;
            }

            .shinhan_design_form#doc_footer{
              margin: 100px 5% 50px 5%;
              min-height: 180px;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            .sign_regist_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_regist_title {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_date {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_comp {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_title {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_date {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_comp {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }

            .shinhan_design_form#doc_body{
              margin: 0 5% 0 5%;
            }

            .sign_layout.shinhan_ec_form_key {
                    position: absolute;
                    z-index: 100;
                    width: 240px;
                    right: 500px;
                    bottom: 100px;
                    filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                        contrast(138%);
                    height: 240px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sign_regist_layout.shinhan_ec_form_key {
                    position: absolute;
                    width: 240px;
                    left: 120px;
                    bottom: 100px;
                    height: 240px;
                    background-size: cover;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                }
                .user_sign.shinhan_ec_form_key {
                    position: absolute;
                    width: 104px;
                    right: 90px;
                    bottom: 100px;
                }

                .SignHeadDiv {
                    display: table;
                    border-collapse: collapse;
                    width: fit-content;
                    max-width: 825px;
                    height: fit-content;
                    float: right;
                    position: absolute;
                    right: 20px;
                    top: 20px;
                }

                .SignText {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    width: 25px;
                    min-width: 25px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-left: -1px;
                    margin-top: -1px;
                    word-break: break-all;
                    word-wrap: break-word;
                }
                .SignHead {
                    display: flex;
                    flex-direction: column;
                    border-collapse: collapse;
                    width: 100px;
                    min-width: 64px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-top: -1px;
                    margin-left: -1px;
                    text-align: center;
                    font-size: 0.9em;
                }
                .SignHead .name {
                    width: 100%;
                    flex: 1;
                    border-bottom: 1px solid #000000;
                }
                .SignHead .date {
                    height: 40px;
                    padding: 0 20%;
                    font-size: 0.9em;
                    border-top: 1px solid #000000;
                    white-space: pre-wrap;
                }
                .SignHead .imgdiv {
                    width: 100%;
                    flex: 3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                pre {
                    margin: 0;
                }
        </style>
        <body>
            <div style="" class="form_wrapper" id="top_style">
              <div class="form_container shinhan_design_form " id="doc_header">
                <div id="doc_header_sign">
                ${
                    sign_line.length > 0 && sign_line != undefined
                        ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                          sign_line
                              .map((raw: any, idx: number) => {
                                  return `
                            <div class="SignHead">
                                <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                <div class="imgdiv">${raw.username}</div>
                                <div class="date">${
                                    raw.state == "1"
                                        ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                        : raw.state == "3" || raw.state == "6"
                                        ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                        : ""
                                }</div>
                            </div>
                        `;
                              })
                              .join("") +
                          `</div>`
                        : ``
                }
                </div>       
                <div class="shinhan_head_top">         
                  <div class="title"><img src="http://localhost:3002/filedownload/shinhan_logo.png" alt="" class="logo"></div>
                  <!-- title -->         
                  <div class="shinhan_head_top_wrap">           
                    <p class="shinhan_head_address" id="address_input" >경남 통영시 광도면 춘원1로 107 통영천연가스발전소 건설공사 건설사업관리단 사무실</p>           
                    <p class="shinhan_head_tel">직통 <p  id="tel_input">${data.doc_tel} </p>
                    <p> / FAX.</p><p  id="fax_input">${data.doc_fax}</p></p>           
                    <p id="email_input">${data.doc_email}</p>           
                    <p class="shinhan_head_manager">담당자: </p><p  id="sender_input">${data.doc_sender}</p>         
                  </div>
                    <!-- shinhan_head_top -->       
                  </div>       
                  <div class="shinhan_head_info">         
                    <div class="shinhan_head_info1">           
                      <div class="info_title" >문서 </div>           
                      <p  type="text" id="doc_id_input">: ${data.document_code}</p>         
                    </div>         <div class="shinhan_head_info_date">           
                      <p  type="text" id="date_input">${data.doc_date}</p>         
                    </div>         <div class="shinhan_head_info3">           
                    <div class="info_title">수신 </div>           
                      <p  class="select shinhan_head_info_reference" id="recv_input">: ${data.doc_recv}</p>         
                    </div>         
                    <div class="shinhan_head_info4">           
                      <div class="info_title">참조 </div>           
                      <p  class="select shinhan_head_info_reference" id="cc_input">: ${out_referer.map((raw: any) => {
                          if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                          else return `${raw.company} ${raw.position} ${raw.username}`;
                      })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>         
                    </div>         
                    <div class="shinhan_head_info5">           
                    <div class="info_title">제목 </div>           
                      <p  type="text" id="title_input" contenteditable="true">:  ${data.title}</p>         
                    </div>         
                  </div>       
                </div>
                <!-- shinhan_head_info -->
                ${isLive ? decodeURIComponent(data.html) : data.html}
                <div class="form_container shinhan_design_form" id="doc_footer">
                    <div id="doc_footer_sign">
                        ${
                            data.sign_state == 3
                                ? `
                        <div class="sign_layout shinhan_ec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="http://localhost:3002/filedownload/signature_img_sample.png"
                            class="user_sign shinhan_ec_form_key"
                            style=""
                        />
                        `
                                : data.sign_state == 6 && sign_register != ""
                                ? `
                        <div class="sign_regist_layout shinhan_ec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                />
                            </p>
                            <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                            <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_regist_comp" class="sign_regist_comp">${
                                sign_register == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_register
                            }</p>
                        </div>
        
                        <div class="sign_layout shinhan_ec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="http://localhost:3002/filedownload/signature_img_sample.png"
                            class="user_sign shinhan_ec_form_key"
                            style=""
                        />
                        `
                                : data.sign_state == 2 || data.issue_signature_img
                                ? `
                        <img
                            src="http://localhost:3002/filedownload/file-1626833420612.png"
                            class="user_sign shinhan_ec_form_key"
                            style=""
                        />
                        `
                                : ""
                        }
                    </div>
                    <div class="shinhan_design_sending">
                        <p class="shinhan_design_spacing">㈜신한종합건축사사무소</p>
                        <p>통영천연가스발전건설사업관리단</p>         
                        <p id="stamp_input3_1">책임건설사업관리기술인 ${sub_field}</p>      
                    </div>
                    </div>     
                </div>  
            </div>
        </body>
    </head>
</html>
    `;
};

export const getHTCCompOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8" />
    
            <title>공문서</title>
            <style>
            @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
                * {
                    margin: 0;
                    padding: 0;
                    font-family: inherit;
                    font-size: inherit;
                    color: inherit;
                    font-weight: inherit;
                    text-decoration: inherit;
                    line-height: 160%;
                    font-style: inherit;
                }

                html {
                    font-family: 'Noto Sans KR', sans-serif;
                    font-size: 14px;
                    color: black;
                    font-weight: 300;
                    text-decoration: none;
                    font-style: normal;
                }
    
                body {
                    width: 100%;
                    height: auto;
                    overflow: scroll;
                    position: relative;
                    margin: 0;
                    box-sizing: border-box;
                    padding: 0;
                }
    
                .form_wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                .form_wrapper > .htc_form {
                    width: 88%;
                    margin: 0 6%;
                }
    
                .form_wrapper > .htc_form#doc_body {
                    min-height: none !important;
                }
    
                .form_wrapper > .htc_form#doc_header {
                    margin-top: 50px;
                }
    
                .form_wrapper > .htc_form#doc_footer {
                    top: 1210px;
                }
    
                .htc_form {
                    box-sizing: border-box;
                    width: 90%;
                    margin: 50px;
                }
    
                .htc_form .company_title {
                    margin-bottom: 50px;
                }
    
                .htc_form .company_title img {
                    display: block;
                    width: 60%;
                    margin: 0 auto;
                    height: auto;
                }
    
                .htc_form .htc_info {
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                    border-bottom: 3px solid #000;
                    justify-content: space-evenly;
                    font-size: 1.4em;
                }
    
                .htc_form .htc_info .br {
                    font-size: 16px;
                    width: 200px;
                    letter-spacing: 10px;
                }
    
                .htc_form .htc_info > div {
                    display: flex;
                }
    
                .htc_form .htc_info > div .title {
                    font-size: 1.1em;
                    min-width: 130px;
                    letter-spacing: 10px;
                }
    
                .htc_form .htc_info > div .title2 {
                    font-size: 1.1em;
                    min-width: 130px;
                    letter-spacing: 26px;
                }
    
                .htc_form .htc_info > div .colon {
                    margin-right: 10px;
                }
                .htc_form .htc_info div {
                    display: flex;
                    min-height: 50px;
                }
                .htc_form .htc_info .li_reference .title {
                    font-size: 1.1em;
                    width: 130px;
                    letter-spacing: 12px;
                }
    
                .htc_form .down {
                    margin-top: 30px;
                    text-align: center;
                }
    
                .htc_form .htc_contents {
                    width: 100%;
                }
    
                .htc_form .table {
                    width: 100%;
                    justify-content: center;
                    align-items: center;
                    /* align-content: center; */
                    text-align: center;
                }
    
                .htc_form .table::after {
                    content: "";
                    display: block;
                    clear: both;
                }
    
                .htc_form .table .td {
                    display: inline-block;
                    border: 1px solid #000;
                }
    
                .htc_form .table .td.td1 {
                    float: left;
                    width: 39.8%;
                    height: 31px;
                    border-right: none;
                }
    
                .htc_form .table .td.td2 {
                    float: right;
                    width: calc(20.1%);
                    height: 60px;
                    border-bottom: none;
                }
    
                .htc_form .table .td.td3 {
                    float: right;
                    width: calc(20%);
                    height: 60px;
                    border-right: none;
                    border-bottom: none;
                }
    
                .htc_form .table .td.td4 {
                    float: right;
                    width: calc(20.1%);
                    height: 60px;
                    border-bottom: none;
                    border-right: none;
                }
    
                .htc_form .table .td.td5 {
                    clear: both;
                    float: left;
                    width: 20%;
                    height: 30px;
                    margin-top: -30px;
                }
    
                .htc_form .table .td.td6 {
                    float: left;
                    left: 100px;
                    width: calc(20%);
                    height: 30px;
                    margin-top: -30px;
                    border-right: none;
                }
    
                .htc_form .table .td.td7 {
                    clear: both;
                    float: left;
                    width: 20%;
                    height: 60px;
                    border-top: none;
                }
    
                .htc_form .table .td.td8 {
                    float: left;
                    width: calc(20%);
                    height: 61px;
                    border-left: none;
                    margin-top: -1px;
                }
    
                .htc_form .table .td.td9 {
                    float: left;
                    width: calc(20%);
                    height: 61px;
                    border-left: none;
                    margin-top: -1px;
                }
    
                .htc_form .table .td.td10 {
                    float: left;
                    width: calc(20%);
                    height: 61px;
                    border-left: none;
                    margin-top: -1px;
                }
    
                .htc_form .table .td.td11 {
                    float: left;
                    width: calc(20%);
                    height: 61px;
                    border-left: none;
                    margin-top: -1px;
                }
    
                .htc_form .add_document {
                    display: flex;
                    margin-top: 40px;
                }
    
                .htc_form .add_document .add_document_title {
                    margin-right: 10px;
                }
    
                .htc_form .add_document .add_document_contents {
                    flex: 1;
                    top: 20px;
                }
    
                .htc_form .htc_bottom .bottom_img {
                    border-bottom: 10px solid #000;
                }
    
                .htc_form .htc_bottom .bottom_img img {
                    display: block;
                    width: 350px;
                    margin: 0 auto;
                    margin-bottom: 15px;
                }
                .htc_form .htc_bottom .htc_bottom_text {
                    font-size: 30px;
                    margin: 20px 0 10px 0;
                    padding-bottom: 15px;
                    text-align: center;
                    border-bottom: 10px solid #000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
    
                .htc_form .htc_bottom .htc_bottom_text img {
                    width: 65%;
                    height: auto;
                }
    
                .htc_form .htc_bottom .htc_bottom_info .htc_bottom_title {
                    display: flex;
                    justify-content: center;
                    justify-items: center;
                }
    
                .htc_form .htc_bottom .htc_bottom_info .htc_bottom_title input {
                    min-width: 180px;
                }
    
                .htc_form .htc_bottom .htc_bottom_info .htc_bottom_manager {
                    display: flex;
                    justify-content: space-between;
                }
    
                .htc_form .htc_bottom .htc_bottom_info > div {
                    display: flex;
                    font-size: 20px;
                }
    
                .htc_form .htc_bottom .htc_bottom_info .htc_copy {
                    font-size: 18px;
                }
    
                .htc_form .htc_bottom .htc_bottom_info > div > div {
                    margin: 0 5 0 5px;
                }
                .htc_form > div > p {
                    width: 100%;
                    white-space: pre-wrap;
                }
                .htc_form#doc_header {
                    margin: 100px 5% 0 5%;
                }
    
                .htc_form#doc_body {
                    margin: 0 5% 0 5%;
                    min-height: 310px;
                    font-size: 16px;
                }
    
                .htc_form#doc_body div p {
                    height: 30px;
                }
    
                .htc_form#doc_footer {
                    margin: 400px 5% 50px 5%;
                }
    
                .sign_layout.humantec_form_key {
                    position: absolute;
                    z-index: 100;
                    width: 240px;
                    right: 40px;
                    bottom: 300px;
                    filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                        contrast(138%);
                    height: 240px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sign_regist_layout.humantec_form_key {
                    position: absolute;
                    width: 240px;
                    right: 260px;
                    bottom: 300px;
                    height: 240px;
                    background-size: cover;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                }

                .user_sign.humantec_form_key {
                    position: absolute;
                    width: 96px;
                    right: 15%;
                    bottom: 210px;
                }

                #doc_header_sign {
                    width: 100%;
                    position: absolute;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    height: 200px;
                    align-items: center;
                    left: 0;
                    top: 0;
                }
                .SignText {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    width: 25px;
                    min-width: 25px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-left: -1px;
                    margin-top: -1px;
                    word-break: break-all;
                    word-wrap: break-word;
                }
                .SignHead {
                    display: flex;
                    flex-direction: column;
                    border-collapse: collapse;
                    width: 100px;
                    min-width: 64px;
                    height: 120px;
                    float: left;
                    border: 1px solid #000000;
                    margin-top: -1px;
                    margin-left: -1px;
                    text-align: center;
                    font-size: 0.9em;
                }
                .SignHead .name {
                    width: 100%;
                    flex: 1;
                    border-bottom: 1px solid #000000;
                }
                .SignHead .date {
                    height: 40px;
                    padding: 0 20%;
                    font-size: 0.9em;
                    border-top: 1px solid #000000;
                    white-space: pre-wrap;
                }
                .SignHead .imgdiv {
                    width: 100%;
                    flex: 3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .SignHeadDiv {
                    display: table;
                    border-collapse: collapse;
                    width: fit-content;
                    max-width: 825px;
                    height: fit-content;
                    float: right;
                    position: absolute;
                    right: 20px;
                    top: 20px;
                }
                #doc_footer_sign {
                    width: 100%;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                }
                .sign_title {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_date {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_comp {
                    position: absolute;
                    text-align: center;
                    color: #ff0000;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_bg {
                    width: 190px;
                    height: 190px;
                }
                .sign_regist_title {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    top: 60px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_date {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    font-size: 1.2em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_regist_comp {
                    position: absolute;
                    text-align: center;
                    color: #4644ff;
                    width: 180px;
                    bottom: 65px;
                    font-size: 1em;
                    font-family: "Nanum Myeongjo", serif;
                }
                .sign_bg {
                    width: 190px;
                    height: 190px;
                }
                .pre-tag {
                    white-space: pre-wrap;
                }
            </style>
            <body>
                <div style="" class="form_wrapper" id="">
                    <div
                        class="form_container htc_form"
                        id="doc_header"
                        style="
                            background-image: url(assets/images/hdc/humantceng_sm.png);
                            background-size: 20%;
                            background-position: center center;
                            background-repeat: no-repeat;
                        "
                    >
                        <div id="doc_header_sign">
                        ${
                            sign_line.length > 0 && sign_line != undefined
                                ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                                  sign_line
                                      .map((raw: any, idx: number) => {
                                          return `
                                    <div class="SignHead">
                                        <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                        <div class="imgdiv">${raw.username}</div>
                                        <div class="date">${
                                            raw.state == "1"
                                                ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : raw.state == "3" || raw.state == "6"
                                                ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : ""
                                        }</div>
                                    </div>
                                `;
                                      })
                                      .join("") +
                                  `</div>`
                                : ``
                        }
                        </div>
                        <div class="company_title">
                            <img src="http://localhost:3002/filedownload/humantec_top.png" alt="" />
                        </div>
                        <div class="htc_info">
                            <div class="li_reception">
                                <div class="title">수 신 자</div>
                                <div class="colon">: </div>
                                <div><p class="reception" id="recv_input">${data.doc_recv}</p></div>
                            </div>
                            <div class="li_reference">
                                <div class="title2">참 조</div>
                                <div class="colon">: </div>
                                <div><p class="reference" id="cc_input">${out_referer.map((raw: any) => {
                                    if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                    else return `${raw.company} ${raw.position} ${raw.username}`;
                                })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p></div>
                            </div>
                            <div class="li_title">
                                <div class="title2">제 목</div>
                                <div class="colon">: </div>
                                <p
                                    class="htc_title"
                                    type="text"
                                    id="title_input"
                                    contenteditable="true"
                                >${data.title}</p>
                            </div>
                        </div>
                        <!-- htc_info -->
                    </div>
                    ${isLive ? decodeURIComponent(data.html) : data.html}
                    <div class="form_container htc_form" id="doc_footer">
                        <div id="doc_footer_sign">
                        ${
                            data.sign_state == 3
                                ? `
                        <div class="sign_layout humantec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign humantec_form_key"
                            style=""
                        />
                        `
                                : data.sign_state == 6 && sign_register != ""
                                ? `
                        <div class="sign_regist_layout humantec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                />
                            </p>
                            <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                            <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_regist_comp" class="sign_regist_comp">${
                                sign_register == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_register
                            }</p>
                        </div>

                        <div class="sign_layout humantec_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign humantec_form_key"
                            style=""
                        />
                        `
                                : data.sign_state == 2 || data.issue_signature_img
                                ? `
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign humantec_form_key"
                                style=""
                            />
                        `
                                : ""
                        }
                            
                        </div>
                        <div class="htc_bottom">
                            <div class="htc_bottom_text">
                                <img src="http://localhost:3002/filedownload/humantec_bottom.png" alt="" />
                            </div>
                            <div class="htc_bottom_info">
                                <div class="htc_bottom_manager">
                                    <div class="htc_bottom_title">
                                        담당자
                                        <p type="text" id="sender_input">${data.doc_sender}</p>
                                    </div>
                                </div>
                                <div class="htc_bottom_docu_num">
                                    <div class="htc_bottom_title">문서 번호</div>
                                    <p type="text" id="doc_id_input">${data.document_code}</p>
                                    <div class="htc_docu_date_box"><p id="date_input">${data.doc_date}</p></div>
                                </div>
                                <div class="htc_bottom_address">
                                    <p class="htc_address_box" id="address_input">
                                        (05836) 서울 송파구 법원로 127, 문정대명벨리온 708호 /
                                    </p>
                                    <p class="htc_website_box" id="website_input">
                                        www.humanteceng.co.kr
                                    </p>
                                </div>
                                <div class="htc_bottom_contact">
                                    <div class="htc_bottom_title">전화</div>
                                    <p class="htc_contact_tel_box" id="tel_input">${data.doc_tel}</p>
                                    <div class="htc_bottom_title"> / 전송055-643-9128</div>
                                    <p class="htc_contact_email_box" id="fax_input">${data.doc_fax}</p>
                                    <div class="htc_bottom_title"> / 이메일</div>
                                    <p class="htc_contact_open_box" id="email_input">
                                    ${data.doc_email}
                                    </p>
                                    <p class="htc_contact_open_box" id="open_input"> / 비공개</p>
                                </div>
                            </div>
                        </div>
                        <div class="htc_copy" style="text-align: right">
                            HUMAN &amp; TECHNOLOGIES ENGINEERING &amp; ARCHITECTS Co.,Ltd
                        </div>
                    </div>
                </div>
            </body>
        </head>
    </html>
    `;
};

export const getHENCSiteOffcialDocument = (
    data: Signdata,
    sub_field: string,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />

        <title>공문서</title>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
            * {
                margin: 0;
                padding: 0;
                font-family: inherit;
                font-size: inherit;
                color: inherit;
                font-weight: inherit;
                text-decoration: inherit;
                line-height: 160%;
                font-style: inherit;
            }

            html {
                font-family: 'Noto Sans KR', sans-serif;
                font-size: 16px;
                color: #000;
                font-weight: 300;
                text-decoration: none;
                font-style: normal;
            }

            body {
                width: 100%;
                height: auto;
                overflow: scroll;
                position: relative;
                margin: 0;
                box-sizing: border-box;
                padding: 0;
            }

            .form_wrapper {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
            }

            .form_wrapper > .hanwha_ec_form2 {
                width: 91%;
                margin: 0 5.5%;
            }

            .form_wrapper > .hanwha_ec_form2#doc_body {
                min-height: none !important;
            }

            .form_wrapper > .hanwha_ec_form2#doc_header {
                margin-top: 50px;
            }

            .form_wrapper > .hanwha_ec_form2#doc_footer {
                top: 1240px;
            }

            .hanwha_line > p {
                height: 10px;
            }

            .hidden {
                position: fixed;
                left: -10000px;
            }

            .hanwha_ec_form2 {
                box-sizing: border-box;
                width: 94%;
                margin: 50px;
            }

            .hanwha_ec_form2 input {
                border: none;
                outline: none;
            }

            .hanwha_ec_form2 .title {
                margin-right: 5px;
            }

            .hanwha_ec_form2 .title::after {
                content: " : ";
                display: inline-block;
                color: #000;
            }

            .hanwha_ec_form2 .logo {
                float: left;
                text-align: center;
                font-weight: bold;
                font-size: 30px;                
            }

            .hanwha_ec_form2 .logo > p {
                height: 70px;
                width: 160px;
            }


            .hanwha_ec_form2 .contact {
                display: flex;
                margin: 0 auto;
                width: 100%;
                flex-wrap: wrap;
                font-size: 18px;
                margin-top: 20px;
            }

            .hanwha_ec_form2 .contact .hanwha_address {
                width: 100%;
            }

            .hanwha_ec_form2 .contact > div {
                display: flex;
                margin: 5px 0;
                margin-right: 5%;
                height: 20px;
            }

            .hanwha_ec_form2 .contact > div .contact_title {
                margin-right: 10px;
            }

            .hanwha_ec_form2 .hanwha_line {
                margin-top: 35px;
            }

            .hanwha_ec_form2 .hanwha_line img {
                display: block;
                width: 100%;
            }

            .hanwha_ec_form2 .form_info {
                margin-bottom: 5px;
                padding: 0 4px;
                padding-top: 0;
                border-bottom: 2px solid #ccc;
                box-sizing: border-box;
                font-size: 18px;
            }
            .hanwha_ec_form2 .form_info .title {
                white-space: break-spaces;
                margin-right: 30px;
            }

            .hanwha_ec_form2 .form_info > div > div {
                flex: 1;
                display: flex;
            }

            .hanwha_ec_form2 .form_info > div {
                display: flex;
                margin: 20px 0;
            }

            .hanwha_ec_form2 .form_info > div.num {
                float: left;
            }

            .hanwha_ec_form2 .form_info > div.date {
                float: right;
            }

            .hanwha_ec_form2 .form_info > div p.title {
                text-align: justify;
            }

            .hanwha_ec_form2 .form_info > div > input {
                display: block;
                flex: 1;
            }

            .hanwha_ec_form2 .form_info > div.reception,
            .hanwha_ec_form2 .form_info > div.reference,
            .hanwha_ec_form2 .form_info > div.docu_title {
                clear: both;
            }

            .hanwha_ec_form2 .form_info > div.reception .reference_select_inner,
            .hanwha_ec_form2 .form_info > div.reference .reference_select_inner {
                flex: 1;
                display: flex;
            }

            .hanwha_ec_form2 .form_info > div.reception .select,
            .hanwha_ec_form2 .form_info > div.reference .select {
                display: block;
                border: none;
                outline: none;
                -webkit-appearance: none;
            }

            .hanwha_ec_form2 .form_contents {
                display: block;
                width: 100%;
                padding: 0 4%;
                box-sizing: border-box;
                font-size: 18px;
            }

            .hanwha_ec_form2 .form_contents::after {
                display: block;
                content: "";
                clear: both;
            }

            .hanwha_ec_form2 .form_contents > p,
            .hanwha_ec_form2 .form_contents > div {
                margin: 20px 0;
            }

            .hanwha_ec_form2 .form_contents .docu_attachment {
                margin: 40px 0;
                display: flex;
            }

            .hanwha_ec_form2 .form_contents .docu_attachment .attachment_title {
                margin-right: 5px;
            }

            .hanwha_ec_form2 .form_contents .docu_attachment .attachment_contents p {
                margin-bottom: 5px;
            }

            .hanwha_ec_form2 .form_contents .document_sending {
                float: right;
                display: inline-block;
                font-weight: bold;
                margin: 0 20px 0 0;
                letter-spacing: 0.3em;
                font-size: 20px;
            }
            .hanwha_ec_form2 .form_contents .document_sending > p {
                height: 50px;
                width: 100%;
            }

            .hanwha_ec_form2 .form_contents .document_sending .place_spacing_1 {
                letter-spacing: 8.5px;
            }

            .hanwha_ec_form2 .form_contents .document_sending .place_spacing_2 {
                letter-spacing: 12px;
            }

            .hanwha_ec_form2 .form_contents .document_sending .place_spacing_3 {
                letter-spacing: 8.5px;
            }

            .hanwha_ec_form2 .form_contents .document_sending .place_spacing_4 {
                letter-spacing: 4px;
            }

            .hanwha_ec_form2 .form_contents .document_sending #stamp_input1 {
                text-align: justify;
                text-align-last: justify;
                padding-right: 18px;
            }

            .hanwha_ec_form2 .form_contents .document_sending #stamp_input2 {
                text-align: justify;
                text-align-last: justify;
                padding-right: 18px;
            }

            .hanwha_ec_form2 .form_contents .document_sending #stamp_input3 {
                letter-spacing: 18px;
                text-align: justify;
                text-align-last: justify;
            }

            .hanwha_ec_form2 .form_contents .document_sending #stamp_input3_1 {
                letter-spacing: 24px;
                text-align: justify;
                text-align-last: justify;
            }

            .hanwha_ec_form2 .form_contents > p {
                white-space: pre-wrap;
            }

            .hanwha_ec_form2#doc_header {
                margin: 50px 3% 0px 3%;
                padding: 0;
            }

            .hanwha_ec_form2#doc_footer {
                margin: 80px 3% 60px 3%;
            }

            .hanwha_ec_form2#doc_body {
                margin: 20px 3% 0 3%;
                min-height: 600px;
            }

            #doc_header_sign {
                width: 100%;
                position: absolute;
                font-size: 16px;
                display: flex;
                justify-content: center;
                height: 200px;
                align-items: center;
                left: 0;
                top: 0;
            }
            .SignText {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                width: 25px;
                min-width: 25px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-left: -1px;
                margin-top: -1px;
                word-break: break-all;
                word-wrap: break-word;
            }
            .SignHead {
                display: flex;
                flex-direction: column;
                border-collapse: collapse;
                width: 100px;
                min-width: 64px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-top: -1px;
                margin-left: -1px;
                text-align: center;
                font-size: 0.9em;
            }
            .SignHead .name {
                width: 100%;
                flex: 1;
                border-bottom: 1px solid #000000;
            }
            .SignHead .date {
                height: 40px;
                padding: 0 20%;
                font-size: 0.9em;
                border-top: 1px solid #000000;
                white-space: pre-wrap;
            }
            .SignHead .imgdiv {
                width: 100%;
                flex: 3;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .SignHeadDiv {
                display: table;
                border-collapse: collapse;
                width: fit-content;
                max-width: 825px;
                height: fit-content;
                float: right;
                position: absolute;
                right: 20px;
                top: 20px;
            }
            #doc_footer_sign {
                width: 100%;
                font-size: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }
            .sign_title {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                top: 60px;
                font-size: 1.2em;
                font-family: 'Nanum Myeongjo', serif;   
            }
            .sign_date {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                font-size: 1.2em;
                font-family: 'Nanum Myeongjo', serif;
            }
            .sign_comp {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                bottom: 65px;
                font-size: 1em;
                font-family: 'Nanum Myeongjo', serif;
            }
            .sign_regist_bg {
                width: 190px;
                height: 190px;
            }
            .sign_regist_title {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                top: 60px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_regist_date {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_regist_comp {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                bottom: 65px;
                font-size: 1em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_bg {
                width: 190px;
                height: 190px;
            }

            .sign_layout.hanwha_ec_form2_key {
                position: absolute;
                z-index: 100;
                width: 240px;
                right: 500px;
                bottom: 50px;
                filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                    contrast(138%);
                height: 240px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .sign_regist_layout.hanwha_ec_form2_key {
                position: absolute;
                width: 240px;
                left: 100px;
                bottom: 50px;
                height: 240px;
                background-size: cover;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
            }
            .user_sign.hanwha_ec_form2_key {
                position: absolute;
                width: 104px;
                right: 100px;
                bottom: 50px;
            }

            .SignHeadDiv {
                display: table;
                border-collapse: collapse;
                width: fit-content;
                max-width: 825px;
                height: fit-content;
                float: right;
                position: absolute;
                right: 20px;
                top: 20px;
            }

            .pre-tag {
                white-space: pre-wrap;
            }

            .hanwha_ec_form2 .logo2 {
                float: right;
                font-size: 28px;
                font-weight: 600;
                margin-top: 10px;
                letter-spacing: 4px;
            }
        </style>
        <body>
            <div style="" class="form_wrapper" id="">
                <div class="form_container hanwha_ec_form2" id="doc_header">
                    <div id="doc_header_sign">
                        ${
                            sign_line.length > 0 && sign_line != undefined
                                ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                                  sign_line
                                      .map((raw: any, idx: number) => {
                                          return `
                                    <div class="SignHead">
                                        <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                        <div class="imgdiv">${raw.username}</div>
                                        <div class="date">${
                                            raw.state == "1"
                                                ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : raw.state == "3" || raw.state == "6"
                                                ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                                : ""
                                        }</div>
                                    </div>
                                `;
                                      })
                                      .join("") +
                                  `</div>`
                                : ``
                        }
                    </div>
                    <div class="logo">
                        <img src="http://localhost:3002/filedownload/hanwhaE&C_logo4.png" alt="" />
                    </div>
                    <div class="logo2">통영 천연가스 발전 사업</div>
                    <div class="contact">
                        <div class="hanwha_address">
                            <p id="address_input">53006 경상남도 통영시 광도면 황리 1608번지</p>
                            <p id="website_input">www.hwenc.co.kr</p>
                        </div>
                        <div class="hanwha_manager">
                            <div class="manager_name"><p id="sender_input">${data.doc_sender}</p></div>
                        </div>
                        <div class="hanwha_tel">
                            <div class="contact_title">TEL</div>
                            <div class="tel"><p id="tel_input">${data.doc_tel}</p></div>
                        </div>
                        <div class="hanwha_fax">
                            <div class="contact_title">FAX</div>
                            <div class="fax"><p id="fax_input">${data.doc_fax}</p></div>
                        </div>
                        <div class="hanwha_email">
                            <div class="contact_title">Email</div>
                            <div class="email_info">
                                <p id="email_input">${data.doc_email}</p>
                            </div>
                        </div>
                    </div>
                    <!-- contact -->
                    <div class="hanwha_line">
                        <img src="http://localhost:3002/filedownload/hanwha_line.png" alt="" />
                    </div>
                    <div class="form_info">
                        <div class="num">
                            <p class="title">문서번호</p>
                            <div class="document-num">
                            <p id="doc_id_input">${data.document_code}</p>
                            </div>
                        </div>
                        <div class="date"><p id="date_input">${data.doc_date}</p></div>
                        <div class="reception">
                            <p class="title">수&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;신</p>
                            <div><p id="recv_input">${data.doc_recv}</p></div>
                        </div>
                        <div class="reference">
                            <p class="title">참&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;조</p>
                            <div class="reference_select_inner">
                                <p class="reference" id="cc_input">
                                ${out_referer.map((raw: any) => {
                                    if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                    else return `${raw.company} ${raw.position} ${raw.username}`;
                                })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}
                                </p>
                            </div>
                        </div>
                        <div class="docu_title">
                            <p class="title">제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</p>
                            <p style="font-weight: bold" id="title_input" contenteditable="true">${data.title}</p>
                        </div>
                    </div>
                    <!-- form_info -->
                </div>
                ${isLive ? decodeURIComponent(data.html) : data.html}
                <div class="form_container hanwha_ec_form2" id="doc_footer">
                    <div id="doc_footer_sign">
                    ${
                        data.sign_state == 3
                            ? `
                    <div class="sign_layout hanwha_ec_form2_key">
                        <p>
                            <img
                                class="sign_bg"
                                src="http://localhost:3002/filedownload/sign_layout_1.png"
                            />
                        </p>
                        <p id="sign_title" class="sign_title">발 송</p>
                        <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                            .locale("en")
                            .format("YYYY.MM.DD.")}</p>
                        <p id="sign_comp" class="sign_comp">${
                            sign_company == "(주)신한종합건축사사무소"
                                ? "SHINHAN"
                                : "(주)와이앤제이이앤씨"
                                ? "와이앤제이이앤씨"
                                : sign_company
                        }</p>
                    </div>
                    <img
                            src="${data.issue_signature_img}"
                            class="user_sign hanwha_ec_form2_key"
                            style=""
                        />
                    `
                            : data.sign_state == 6 && sign_register != ""
                            ? `
                    <div class="sign_regist_layout hanwha_ec_form2_key">
                        <p>
                            <img
                                class="sign_bg"
                                src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                            />
                        </p>
                        <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                        <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                            .locale("en")
                            .format("YYYY.MM.DD.")}</p>
                        <p id="sign_regist_comp" class="sign_regist_comp">${
                            sign_register == "(주)신한종합건축사사무소"
                                ? "SHINHAN"
                                : "(주)와이앤제이이앤씨"
                                ? "와이앤제이이앤씨"
                                : sign_register
                        }</p>
                    </div>

                    <div class="sign_layout hanwha_ec_form2_key">
                        <p>
                            <img
                                class="sign_bg"
                                src="http://localhost:3002/filedownload/sign_layout_1.png"
                            />
                        </p>
                        <p id="sign_title" class="sign_title">발 송</p>
                        <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                            .locale("en")
                            .format("YYYY.MM.DD.")}</p>
                        <p id="sign_comp" class="sign_comp">${
                            sign_company == "(주)신한종합건축사사무소"
                                ? "SHINHAN"
                                : "(주)와이앤제이이앤씨"
                                ? "와이앤제이이앤씨"
                                : sign_company
                        }</p>
                    </div>
                    <img
                        src="${data.issue_signature_img}"
                        class="user_sign hanwha_ec_form2_key"
                        style=""
                    />
                    `
                            : data.sign_state == 2 || data.issue_signature_img
                            ? `
                    <img
                        src="${data.issue_signature_img}"
                        class="user_sign hanwha_ec_form2_key"
                        style=""
                    />
                    `
                            : ""
                    }
                        
                    </div>
                    <div class="form_contents" style="width: 100%">
                        <div class="document_sending">
                            <p id="stamp_input1">주 식 회 사 한 화 건 설</p>
                            <p id="stamp_input2">통영천연가스 발전사업 건설공사</p>
                            <p id="stamp_input3_1">현장대리인 ${sub_field}</p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
    </head>
</html>    
    `;
};

export const getHTCSiteOffcialDocument = (
    data: Signdata,
    sub_field: string,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
<html lang="kr">
    <head>
        <meta charset="utf-8" />
        <title>공문서</title>
        <style type="text/css">
            @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
            * {
                margin: 0;
                padding: 0;
                font-family: inherit;
                font-size: inherit;
                color: inherit;
                font-weight: inherit;
                text-decoration: inherit;
                line-height: 160%;
                font-style: inherit;
            }

            html {
                font-family: 'Noto Sans KR', sans-serif;
                font-size: 14px;
                color: black;
                text-decoration: none;
                font-style: normal;
                font-weight: 300;
            }

            body {
                width: 100%;
                height: auto;
                overflow: scroll;
                position: relative;
                margin: 0;
                box-sizing: border-box;
                padding: 0;
            }
            .form_wrapper {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
            }

            .form_wrapper > .humantec_form {
                width: 88%;
                margin: 0 6%;
            }

            .form_wrapper > .humantec_form#doc_body {
                min-height: none !important;
            }

            .form_wrapper > .humantec_form#doc_header {
                margin-top: 48px;
            }

            .form_wrapper > .humantec_form#doc_footer {
                top: 1230px;
            }

            .humantec_form {
                box-sizing: border-box;
                width: 90%;
                margin: 50px;
            }

            .humantec_form .company_title {
                margin-bottom: 50px;
            }

            .humantec_form .company_title img {
                display: block;
                width: 60%;
                margin: 0 auto;
                height: auto;
            }

            .humantec_form .htc_info {
                padding-bottom: 10px;
                margin-bottom: 10px;
                border-bottom: 3px solid #000;
                font-size: 1.4em;
            }

            .humantec_form .htc_info .br {
                width: 50px;
            }

            .humantec_form .htc_info > div {
                display: flex;
            }

            .humantec_form .htc_info > div .title {
                font-size: 1.1em;
                min-width: 100px;
                letter-spacing: 26px;
            }

            .humantec_form .htc_info > div .colon {
                margin-right: 10px;
            }

            .humantec_form .down {
                margin-top: 30px;
                text-align: center;
            }
            .humantec_form .htc_bottom .htc_bottom {
                font-size: 20px;
            }

            .humantec_form .htc_bottom .htc_bottom_text {
                font-size: 35px;
                margin: 10px 0 10px 0;
                text-align: center;
                border-bottom: 10px solid #000;
            }

            .humantec_form .hdc_contents p {
                height: 30px;
                background-color: aqua;
            }

            .humantec_form .htc_bottom .htc_bottom_text > p {
                height: 50px;
            }
            .humantec_form .htc_bottom .htc_bottom_info .htc_bottom_text {
                display: flex;
                justify-content: space-between;
            }

            .humantec_form .htc_bottom .htc_bottom_info .htc_bottom_manager {
                display: flex;
                justify-content: space-between;
            }
            .humantec_form .htc_bottom .htc_bottom_info .htc_bottom_manager > div {
                display: flex;
                justify-content: space-between;
            }

            .humantec_form .htc_bottom .htc_bottom_info > div {
                display: flex;
                font-size: 20px;
            }

            .humantec_form .htc_bottom .htc_bottom_info > div > div {
                margin: 0 5 0 5px;
            }
            .humantec_form .htc_copy {
                letter-spacing: 0.2rem;
                font-size: 14px;
            }

            .humantec_form#doc_header {
                margin: 100px 5% 0 5%;
            }

            .humantec_form#doc_body {
                margin: 0 5% 0 5%;
                min-height: 460px;
                font-size: 16px;
            }

            .humantec_form#doc_footer {
                margin: 300px 5% 50px 5%;
            }

            #doc_header_sign {
                width: 100%;
                position: absolute;
                font-size: 16px;
                display: flex;
                justify-content: center;
                height: 200px;
                align-items: center;
                left: 0;
                top: 0;
            }
            .SignText {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                width: 25px;
                min-width: 25px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-left: -1px;
                margin-top: -1px;
                word-break: break-all;
                word-wrap: break-word;
            }
            .SignHead {
                display: flex;
                flex-direction: column;
                border-collapse: collapse;
                width: 100px;
                min-width: 64px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-top: -1px;
                margin-left: -1px;
                text-align: center;
                font-size: 0.9em;
            }
            .SignHead .name {
                width: 100%;
                flex: 1;
                border-bottom: 1px solid #000000;
            }
            .SignHead .date {
                height: 40px;
                padding: 0 20%;
                font-size: 0.9em;
                border-top: 1px solid #000000;
                white-space: pre-wrap;
            }
            .SignHead .imgdiv {
                width: 100%;
                flex: 3;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .SignHeadDiv {
                display: table;
                border-collapse: collapse;
                width: fit-content;
                max-width: 825px;
                height: fit-content;
                float: right;
                position: absolute;
                right: 20px;
                top: 20px;
            }
            #doc_footer_sign {
                width: 100%;
                font-size: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }
            .sign_title {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                top: 60px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_date {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_comp {
                position: absolute;
                text-align: center;
                color: #ff0000;
                width: 180px;
                bottom: 65px;
                font-size: 1em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_regist_bg {
                width: 190px;
                height: 190px;
            }
            .sign_regist_title {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                top: 60px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_regist_date {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                font-size: 1.2em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_regist_comp {
                position: absolute;
                text-align: center;
                color: #4644ff;
                width: 180px;
                bottom: 65px;
                font-size: 1em;
                font-family: "Nanum Myeongjo", serif;
            }
            .sign_bg {
                width: 190px;
                height: 190px;
            }

            .sign_layout.humantec_form_key {
                position: absolute;
                z-index: 100;
                width: 240px;
                right: 80px;
                bottom: 350px;
                filter: invert(23%) sepia(73%) saturate(6341%) hue-rotate(357deg) brightness(109%)
                    contrast(138%);
                height: 240px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .sign_regist_layout.humantec_form_key {
                position: absolute;
                width: 240px;
                right: 300px;
                bottom: 350px;
                height: 240px;
                background-size: cover;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
            }
            .user_sign.humantec_form_key {
                position: absolute;
                width: 96px;
                right: 15%;
                bottom: 210px;
            }

            .SignHeadDiv {
                display: table;
                border-collapse: collapse;
                width: fit-content;
                max-width: 825px;
                height: fit-content;
                float: right;
                position: absolute;
                right: 20px;
                top: 20px;
            }

            .SignText {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                width: 25px;
                min-width: 25px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-left: -1px;
                margin-top: -1px;
                word-break: break-all;
                word-wrap: break-word;
            }
            .SignHead {
                display: flex;
                flex-direction: column;
                border-collapse: collapse;
                width: 100px;
                min-width: 64px;
                height: 120px;
                float: left;
                border: 1px solid #000000;
                margin-top: -1px;
                margin-left: -1px;
                text-align: center;
                font-size: 0.9em;
            }
            .SignHead .name {
                width: 100%;
                flex: 1;
                border-bottom: 1px solid #000000;
            }
            .SignHead .date {
                height: 40px;
                padding: 0 20%;
                font-size: 0.9em;
                border-top: 1px solid #000000;
                white-space: pre-wrap;
            }
            .SignHead .imgdiv {
                width: 100%;
                flex: 3;
                display: flex;
                justify-content: center;
                align-items: center;
            }
        </style>
        <body>
            <div style="" class="form_wrapper" id="">
                <div class="form_container humantec_form" id="doc_header">
                    <div id="doc_header_sign">
                    ${
                        sign_line.length > 0
                            ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                              sign_line
                                  .map((raw: any, idx: number) => {
                                      return `
                                <div class="SignHead">
                                    <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                    <div class="imgdiv">${raw.username}</div>
                                    <div class="date">${
                                        raw.state == "1"
                                            ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : raw.state == "3" || raw.state == "6"
                                            ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : ""
                                    }</div>
                                </div>
                            `;
                                  })
                                  .join("") +
                              `</div>`
                            : ``
                    }
                    </div>
                    <div class="company_title">
                        <img src="http://localhost:3002/filedownload/humantec_top.png" alt="" />
                    </div>
                    <div class="htc_info">
                        <div class="li_reception">
                            <div class="title">수신</div>
                            <div class="colon">:&nbsp;${data.doc_recv}</div>
                            <p id="recv_input"></p>
                        </div>
                        <div class="li_reference">
                            <div class="title">참조</div>
                            <div class="colon">:</div>
                            <p class="reference" id="cc_input">${out_referer.map((raw: any) => {
                                if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                else return `${raw.company} ${raw.position} ${raw.username}`;
                            })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>
                        </div>
                        <div class="li_title" style="font-weight: bold">
                            <div class="title">제목</div>
                            <div class="colon">:&nbsp;${data.title}</div>
                            <p
                                class="htc_title"
                                type="text"
                                id="title_input"
                                contenteditable="true"
                            ></p>
                        </div>
                    </div>
                    <!-- htc_info -->
                </div>
                ${isLive ? decodeURIComponent(data.html) : data.html}
                <div class="form_container humantec_form" id="doc_footer">
                    <div id="doc_footer_sign">
                        ${
                            data.sign_state == 3
                                ? `<div class="sign_layout humantec_form_key">
                                <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                                </p>
                                <p id="sign_title" class="sign_title">발 송</p>
                                <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_comp" class="sign_comp">${
                                    sign_company == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_company
                                }</p>
                            </div>
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign humantec_form_key"
                                style=""
                            />
                            `
                                : data.sign_state == 6 && sign_register != ""
                                ? ` 
                            <div class="sign_regist_layout humantec_form_key">
                                <p>
                                    <img
                                        class="sign_bg"
                                        src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                    />
                                </p>
                                <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                                <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_regist_comp" class="sign_regist_comp">${
                                    sign_register == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_register
                                }</p>
                            </div>
                            <div class="sign_layout humantec_form_key">
                                <p>
                                    <img
                                        class="sign_bg"
                                        src="http://localhost:3002/filedownload/sign_layout_1.png"
                                    />
                                    </p>
                                    <p id="sign_title" class="sign_title">발 송</p>
                                    <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                        .locale("en")
                                        .format("YYYY.MM.DD.")}</p>
                                    <p id="sign_comp" class="sign_comp">${
                                        sign_company == "(주)신한종합건축사사무소"
                                            ? "SHINHAN"
                                            : "(주)와이앤제이이앤씨"
                                            ? "와이앤제이이앤씨"
                                            : sign_company
                                    }</p>
                            </div>
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign humantec_form_key"
                                style=""
                            />
                        `
                                : data.sign_state == 2 || data.issue_signature_img
                                ? `
                            <img
                                src="${data.issue_signature_img}"
                                class="user_sign humantec_form_key"
                                style=""
                            />
                            `
                                : ""
                        }
                    </div>
                    <div class="htc_bottom">
                        <div class="htc_bottom_text">
                            통영 LNG탱크터미널 건설공사 건설사업관리단장
                        </div>
                        <div class="htc_bottom_info">
                            <div class="htc_bottom_manager">
                                <div class="htc_bottom_title">
                                    담당자 :
                                    <p id="sender_input">${data.doc_sender}</p>
                                </div>
                                <div class="htc_bottom_title">
                                    책임건설사업관리기술인 :
                                    <p id="stamp_input3_1">${sub_field}</p>
                                </div>
                            </div>
                            <div class="htc_bottom_docu_num">
                                <div class="htc_bottom_title">문서 번호 :</div>
                                <p type="text" id="doc_id_input">${data.document_code}</p>
                                <div class="htc_docu_date_box"><p id="date_input">(${data.doc_date})</p></div>
                            </div>
                            <div class="htc_bottom_address">
                                <p class="htc_address_box" id="address_input">
                                    우(53006) 경남 통영시 광도면 춘원1로 107 /
                                </p>
                                <p class="htc_website_box" id="website_input">
                                    www.humanteceng.co.kr
                                </p>
                            </div>
                            <div class="htc_bottom_contact">
                                <div class="htc_bottom_title">전화</div>
                                <p class="htc_contact_tel_box" id="tel_input">${data.doc_tel}</p>
                                <p class="htc_contact_email_box" id="email_input">
                                    ${data.doc_email}
                                </p>
                                <p class="htc_contact_open_box" id="open_input">/ 비공개</p>
                            </div>
                        </div>
                    </div>
                    <div class="htc_copy" style="text-align: right">
                        HUMAN &amp; TECHNOLOGIES ENGINEERING &amp; ARCHITECTS Co.,Ltd
                    </div>
                </div>
            </div>
        </body>
    </head>
</html>

        `;
};

export const getYNJCompOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
<html lang="ko">
    <meta charset="utf-8" />
    <title>본사</title>
    <style type="text/css">
        @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        * {
            margin: 0;
            padding: 0;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            font-weight: inherit;
            line-height: 160%;
            font-style: inherit;
        }

        html {
            font-family: 'Noto Sans KR', sans-serif;
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            text-decoration: none;
            color: #000;
        }

        body {
            width: 100%;
            height: auto;
            overflow: scroll;
            position: relative;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .form_wrapper {
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            text-decoration: none;
            color: #000;
        }

        .form_layout {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        }

        .ynj_head_form {
            box-sizing: border-box;
            margin: 60px 6% 0px 6%;
            width: 88%;
        }

        /* top sign 스타일 시작 */
        #doc_header_sign {
            width: 100%;
            position: absolute;
            font-size: 16px;
            display: flex;
            justify-content: center;
            height: 200px;
            align-items: center;
            left: 0;
            top: 0;
        }
        .SignHeadDiv {
            display: table;
            border-collapse: collapse;
            width: fit-content;
            max-width: 825px;
            height: fit-content;
            float: right;
            position: absolute;
            right: 20px;
            top: 20px;
        }
        .SignText {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            width: 25px;
            min-width: 25px;
            height: 120px;
            float: left;
            border: 1px solid #000000;
            margin-left: -1px;
            margin-top: -1px;
            word-break: break-all;
            word-wrap: break-word;
        }
        .SignHead {
            display: flex;
            flex-direction: column;
            border-collapse: collapse;
            width: 100px;
            min-width: 64px;
            height: 120px;
            float: left;
            border: 1px solid #000000;
            margin-top: -1px;
            margin-left: -1px;
            text-align: center;
            font-size: 0.9em;
        }
        .SignHead .name {
            width: 100%;
            flex: 1;
            border-bottom: 1px solid #000000;
        }
        .SignHead .date {
            height: 40px;
            padding: 0 10%;
            font-size: 0.9em;
            border-top: 1px solid #000000;
            white-space: pre-wrap;
        }
        .SignHead .imgdiv {
            width: 100%;
            flex: 3;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* top_title 스타일 시작 */
        .ynj_head_form_top {
            width: 100%;
        }

        .ynj_head_form .ynj_head_form_top .top_div_title {
            letter-spacing: 15px;
            font-size: 30px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 10px;
        }

        .ynj_head_form .ynj_head_form_top .middle_div {
            display: flex;
            justify-content: space-between;
        }

        .ynj_head_form .ynj_head_form_top .last_div {
            display: flex;
            justify-content: space-between;
        }

        .info_text_div {
            display: flex;
            width: 33%;
        }

        .info_title_text_email {
            letter-spacing: 3px;
        }

        .info_title_text_user {
            letter-spacing: 5px;
        }

        .info_title_text_margin {
            margin-right: 15px;
        }

        .info_title {
            white-space: nowrap;
            width: 75px;
            flex-shrink: 0;
            flex-grow: 0;
            display: flex;
            justify-content: space-between;
        }
        
        .info_title + p::before {
            content: ":";
            margin: 0 5px;
        }

        /* top info 스타일 시작 */
        .ynj_head_form_info {
            clear: both;
            padding: 25px 0 5px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-size: 20px;
            display: flex;
            flex-direction: column;
            gap: 45px;
            position: relative;
        }

        .ynj_info_div {
            display: flex;
        }

        /* content 스타일 시작 */
        .ynj_form_container {
            margin: 0 6%;
            width: 88%;
            box-sizing: border-box;
        }

        .ynj_form_container .ynj_contents {
            display: block;
            min-height: 600px;
            font-size: 18px;
        }

        .ynj_form_container .ynj_contents > p {
            width: 100%;
        }

        .tag {
            white-space: pre-line;
        }

        .top_div {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* footer 스타일 시작 */
        .ynj_form_footer {
            margin: 60px 6% 40px 6%;
            width: 88%;
            min-height: 100px;
            display: flex;
            align-items: center;
            padding-top: 190px
        }

        .ynj_form_sending {
            width: 100%;
            font-weight: 700;
            display: block;
            font-size: 36px;
            text-align: center;
        }

        /* footer sign 스타일 시작 */

        #doc_footer_sign {
            width: 100%;
            position: absolute;
            font-size: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .sign_layout.ynj_form_key {
            position: absolute;
            z-index: 100;
            width: 240px;
            right: 400px;
            bottom: -10px;
            height: 240px;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .sign_regist_layout.ynj_form_key {
            position: absolute;
            z-index: 100;
            width: 240px;
            left: 170px;
            bottom: -10px;
            height: 240px;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .user_sign.ynj_form_key {
            position: absolute;
            width: 104px;
            right: 260px;
            bottom: -50px;
        }

        .sign_regist_bg {
            width: 190px;
            height: 190px;
        }

        .sign_regist_title {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            top: 60px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_regist_date {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_regist_comp {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            bottom: 65px;
            font-size: 1em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_bg {
            width: 190px;
            height: 190px;
        }

        .sign_title {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            top: 60px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_date {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_comp {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            bottom: 65px;
            font-size: 1em;
            font-family: "Nanum Myeongjo", serif;
        }
    </style>

    <body>
        <div style="" class="form_wrapper" id="">
            <div class="form_layout" id="top_style">
                <div class="ynj_head_form" id="doc_header">
                    <div id="doc_header_sign">
                    ${
                        sign_line.length > 0
                            ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                              sign_line
                                  .map((raw: any, idx: number) => {
                                      return `
                                <div class="SignHead">
                                    <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                    <div class="imgdiv">${raw.username}</div>
                                    <div class="date">${
                                        raw.state == "1"
                                            ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : raw.state == "3" || raw.state == "6"
                                            ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : ""
                                    }</div>
                                </div>
                            `;
                                  })
                                  .join("") +
                              `</div>`
                            : ``
                    }
                    </div>
                    <div class="ynj_head_form_top">
                        <div class="top_div_title">㈜와이앤제이이앤씨</div>
                        <div class="middle_div">
                            <div>(우)47877 부산광역시 동래구 충렬대로 238번길31 태웅빌딩52호</div>
                            <div class="info_text_div">
                                <p class="info_title_text_email">E-MAIL&nbsp;:&nbsp;&nbsp;</p>
                                <p id="email_input">${data.doc_email}</p>
                            </div>
                        </div>
                        <div class="last_div">
                            <div class="info_text_div">
                                <p class="info_title_text_margin">전화&nbsp;&nbsp;:</p>
                                <p>051-926-8832</p>
                            </div>
                            <div class="info_text_div">
                                <p class="info_title_text_margin">전송&nbsp;&nbsp;:</p>
                                <p>051-926-8835</p>
                            </div>
                            <div class="info_text_div">
                                <p class="info_title_text_user">담당자&nbsp;&nbsp;:&nbsp;</p>
                                <p id="sender_input">${data.doc_sender}</p>
                            </div>
                        </div>
                    </div>
                    <div class="ynj_head_form_info">
                        <div class="top_div">
                            <div class="ynj_info_div">
                                <p class="info_title">문서번호</p>
                                <p id="doc_id_input">${data.document_code}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">시행일자</p>
                                <p id="date_input">${data.doc_date}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">
                                    수신
                                </p>
                                <p id="recv_input">${data.doc_recv}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">
                                    참조
                                </p>
                                <p id="cc_input">${out_referer.map((raw: any) => {
                                    if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                    else return `${raw.company} ${raw.position} ${raw.username}`;
                                })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>
                            </div>
                        </div>
                        <div class="ynj_info_div">
                            <p class="info_title">제목&nbsp;&nbsp;</p>
                            <p id="title_input">${data.title}</p>
                        </div>
                    </div>
                </div>
                ${isLive ? decodeURIComponent(data.html) : data.html}
                <div class="ynj_form_footer" id="doc_footer">
                    <div id="doc_footer_sign">
                    ${
                        data.sign_state == 3
                            ? `<div class="sign_layout ynj_form_key">
                            <p>
                            <img
                                class="sign_bg"
                                src="http://localhost:3002/filedownload/sign_layout_1.png"
                            />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                        `
                            : data.sign_state == 6 && sign_register != ""
                            ? ` 
                        <div class="sign_regist_layout ynj_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                />
                            </p>
                            <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                            <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_regist_comp" class="sign_regist_comp">${
                                sign_register == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_register
                            }</p>
                        </div>
                        <div class="sign_layout ynj_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                                </p>
                                <p id="sign_title" class="sign_title">발 송</p>
                                <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_comp" class="sign_comp">${
                                    sign_company == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_company
                                }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                    `
                            : data.sign_state == 2 || data.issue_signature_img
                            ? `
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                        `
                            : ""
                    }
                    </div>
                    <div class="ynj_form_sending">
                        <p>(주)와이앤제이이앤씨&nbsp;&nbsp;&nbsp;대표&nbsp;&nbsp;강민규</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>
    `;
};

export const getYNJSiteOffcialDocument = (
    data: Signdata,
    sign_company: string,
    sign_register: string,
    sign_line?: any[],
    out_referer?: any[]
) => {
    return `
    <!DOCTYPE html>
<html lang="ko">
    <meta charset="utf-8" />
    <title>현장</title>
    <style type="text/css">
        @import url("https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap");
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        * {
            margin: 0;
            padding: 0;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            font-weight: inherit;
            line-height: 160%;
            font-style: inherit;
        }

        html {
            font-family: 'Noto Sans KR', sans-serif;
            font-style: normal;
            font-weight: 400;
            text-decoration: none;
            color: #000;
        }

        body {
            width: 100%;
            height: auto;
            overflow: scroll;
            position: relative;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .form_wrapper {
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            text-decoration: none;
            color: #000;
        }

        .form_layout {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        }

        .ynj_head_form {
            box-sizing: border-box;
            margin: 60px 6% 0px 6%;
            width: 88%;
        }

        /* top sign 스타일 시작 */
        #doc_header_sign {
            width: 100%;
            position: absolute;
            font-size: 16px;
            display: flex;
            justify-content: center;
            height: 200px;
            align-items: center;
            left: 0;
            top: 0;
        }
        .SignHeadDiv {
            display: table;
            border-collapse: collapse;
            width: fit-content;
            max-width: 825px;
            height: fit-content;
            float: right;
            position: absolute;
            right: 20px;
            top: 20px;
        }
        .SignText {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            width: 25px;
            min-width: 25px;
            height: 120px;
            float: left;
            border: 1px solid #000000;
            margin-left: -1px;
            margin-top: -1px;
            word-break: break-all;
            word-wrap: break-word;
        }
        .SignHead {
            display: flex;
            flex-direction: column;
            border-collapse: collapse;
            width: 100px;
            min-width: 64px;
            height: 120px;
            float: left;
            border: 1px solid #000000;
            margin-top: -1px;
            margin-left: -1px;
            text-align: center;
            font-size: 0.9em;
        }
        .SignHead .name {
            width: 100%;
            flex: 1;
            border-bottom: 1px solid #000000;
        }
        .SignHead .date {
            height: 40px;
            padding: 0 10%;
            font-size: 0.9em;
            border-top: 1px solid #000000;
            white-space: pre-wrap;
        }
        .SignHead .imgdiv {
            width: 100%;
            flex: 3;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* top_title 스타일 시작 */
        .ynj_head_form_top {
            width: 100%;
        }

        .ynj_head_form .ynj_head_form_top .top_div_title {
            letter-spacing: 15px;
            font-size: 30px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 10px;
        }

        .ynj_head_form .ynj_head_form_top .middle_div {
            display: flex;
            justify-content: space-between;
        }

        .ynj_head_form .ynj_head_form_top .last_div {
            display: flex;
            justify-content: space-between;
        }

        .info_text_div {
            display: flex;
            width: 33%;
        }

        .info_title_text_email {
            letter-spacing: 3px;
            white-space:nowrap;
        }

        .info_title_text_user {
            letter-spacing: 5px;
            white-space:nowrap;
        }

        .info_title_text_margin {
            white-space:nowrap;
            margin-right: 5px;
        }

        .info_title {
            white-space: nowrap;
            width: 75px;
            flex-shrink: 0;
            flex-grow: 0;
            display: flex;
            justify-content: space-between;
        }
        
        .info_title + p::before {
            content: ":";
            margin: 0 5px;
        }

        /* top info 스타일 시작 */
        .ynj_head_form_info {
            clear: both;
            padding: 25px 0 5px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-size: 20px;
            display: flex;
            flex-direction: column;
            gap: 45px;
            position: relative;
        }

        .ynj_info_div {
            display: flex;
        }

        /* content 스타일 시작 */
        .ynj_form_container {
            margin: 0 6%;
            width: 88%;
            box-sizing: border-box;
        }

        .ynj_form_container .ynj_contents {
            display: block;
            min-height: 600px;
            font-size: 18px;
        }

        .ynj_form_container .ynj_contents > p {
            width: 100%;
        }

        .tag {
            white-space: pre-line;
        }

        .top_div {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* footer 스타일 시작 */
        .ynj_form_footer {
            margin: 60px 6% 40px 6%;
            width: 88%;
            min-height: 100px;
            display: flex;
            align-items: center;
            padding-top: 190px
        }

        .ynj_form_sending {
            width: 100%;
            font-weight: 700;
            display: block;
            font-size: 30px;
            text-align: center;
        }

        /* footer sign 스타일 시작 */

        #doc_footer_sign {
            width: 100%;
            position: absolute;
            font-size: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .sign_layout.ynj_form_key {
            position: absolute;
            z-index: 100;
            width: 240px;
            right: 350px;
            bottom: -10px;
            height: 240px;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .sign_regist_layout.ynj_form_key {
            position: absolute;
            z-index: 100;
            width: 240px;
            left: 170px;
            bottom: -10px;
            height: 240px;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .user_sign.ynj_form_key {
            position: absolute;
            width: 104px;
            right: 195px;
            bottom: -50px;
        }

        .sign_regist_bg {
            width: 190px;
            height: 190px;
        }

        .sign_regist_title {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            top: 60px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_regist_date {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_regist_comp {
            position: absolute;
            text-align: center;
            color: #4644ff;
            width: 180px;
            bottom: 65px;
            font-size: 1em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_bg {
            width: 190px;
            height: 190px;
        }

        .sign_title {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            top: 60px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_date {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            font-size: 1.2em;
            font-family: "Nanum Myeongjo", serif;
        }

        .sign_comp {
            position: absolute;
            text-align: center;
            color: #ff0000;
            width: 180px;
            bottom: 65px;
            font-size: 1em;
            font-family: "Nanum Myeongjo", serif;
        }
        
    </style>
    <body>
        <div style="" class="form_wrapper" id="">
            <div class="form_layout" id="top_style">
                <div class="ynj_head_form" id="doc_header">
                    <div id="doc_header_sign">
                    ${
                        sign_line.length > 0
                            ? `<div class="SignHeadDiv"><div class="SignText">결재</div>` +
                              sign_line
                                  .map((raw: any, idx: number) => {
                                      return `
                                <div class="SignHead">
                                    <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                    <div class="imgdiv">${raw.username}</div>
                                    <div class="date">${
                                        raw.state == "1"
                                            ? getMoment(raw.created_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : raw.state == "3" || raw.state == "6"
                                            ? getMoment(raw.approval_at).locale("en").format("YY.MM.DD / HH:mm")
                                            : ""
                                    }</div>
                                </div>
                            `;
                                  })
                                  .join("") +
                              `</div>`
                            : ``
                    }
                    </div>
                    <div class="ynj_head_form_top">
                        <div class="top_div_title">와이앤제이이앤씨</div>
                        <div class="middle_div">
                            <div>(우)47877 부산광역시 동래구 충렬대로 238번길31 태웅빌딩52호</div>
                            <div class="info_text_div">
                                <p class="info_title_text_email">E-MAIL&nbsp;:&nbsp;&nbsp;</p>
                                <p id="email_input">${data.doc_email}</p>
                            </div>
                        </div>
                        <div class="last_div">
                            <div class="info_text_div">
                                <p class="info_title_text_margin">전화&nbsp;&nbsp;:</p>
                                <p>051-926-8832</p>
                            </div>
                            <div class="info_text_div">
                                <p class="info_title_text_margin">전송&nbsp;&nbsp;:</p>
                                <p>051-926-8835</p>
                            </div>
                            <div class="info_text_div">
                                <p class="info_title_text_user">담당자&nbsp;&nbsp;:&nbsp;</p>
                                <p id="sender_input">${data.doc_sender}</p>
                            </div>
                        </div>
                    </div>
                    <div class="ynj_head_form_info">
                        <div class="top_div">
                            <div class="ynj_info_div">
                                <p class="info_title">문서번호</p>
                                <p id="doc_id_input">${data.document_code}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">시행일자</p>
                                <p id="date_input">${data.doc_date}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">
                                    수신
                                </p>
                                <p id="recv_input">${data.doc_recv}</p>
                            </div>
                            <div class="ynj_info_div">
                                <p class="info_title">
                                    참조
                                </p>
                                <p id="cc_input">${out_referer.map((raw: any) => {
                                    if (raw.position.indexOf("대표이사") != -1) return `${raw.company} ${raw.position}`;
                                    else return `${raw.company} ${raw.position} ${raw.username}`;
                                })}${data.doc_cc ? `\n ${data.doc_cc}` : ""}</p>
                            </div>
                        </div>
                        <div class="ynj_info_div">
                            <p class="info_title">제목&nbsp;&nbsp;</p>
                            <p id="title_input">${data.title}</p>
                        </div>
                    </div>
                </div>
                ${isLive ? decodeURIComponent(data.html) : data.html}
                <div class="ynj_form_footer" id="doc_footer">
                    <div id="doc_footer_sign">
                    ${
                        data.sign_state == 3
                            ? `<div class="sign_layout ynj_form_key">
                            <p>
                            <img
                                class="sign_bg"
                                src="http://localhost:3002/filedownload/sign_layout_1.png"
                            />
                            </p>
                            <p id="sign_title" class="sign_title">발 송</p>
                            <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_comp" class="sign_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                        `
                            : data.sign_state == 6 && sign_register != ""
                            ? ` 
                        <div class="sign_regist_layout ynj_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_regist_layout_1.png"
                                />
                            </p>
                            <p id="sign_regist_title" class="sign_regist_title">접 수</p>
                            <p id="sign_regist_date" class="sign_regist_date">${getMoment(data.registed_at)
                                .locale("en")
                                .format("YYYY.MM.DD.")}</p>
                            <p id="sign_regist_comp" class="sign_regist_comp">${
                                sign_company == "(주)신한종합건축사사무소"
                                    ? "SHINHAN"
                                    : "(주)와이앤제이이앤씨"
                                    ? "와이앤제이이앤씨"
                                    : sign_company
                            }</p>
                        </div>
                        <div class="sign_layout ynj_form_key">
                            <p>
                                <img
                                    class="sign_bg"
                                    src="http://localhost:3002/filedownload/sign_layout_1.png"
                                />
                                </p>
                                <p id="sign_title" class="sign_title">발 송</p>
                                <p id="sign_date" class="sign_date">${getMoment(data.sended_at)
                                    .locale("en")
                                    .format("YYYY.MM.DD.")}</p>
                                <p id="sign_comp" class="sign_comp">${
                                    sign_company == "(주)신한종합건축사사무소"
                                        ? "SHINHAN"
                                        : "(주)와이앤제이이앤씨"
                                        ? "와이앤제이이앤씨"
                                        : sign_company
                                }</p>
                        </div>
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                    `
                            : data.sign_state == 2 || data.issue_signature_img
                            ? `
                        <img
                            src="${data.issue_signature_img}"
                            class="user_sign ynj_form_key"
                            style=""
                        />
                        `
                            : ""
                    }
                    </div>
                    <div class="ynj_form_sending">
                        <p>154kV 통영천연가스발전소 송전선로 건설공사 책임감리원</p>
                    </div>
                </div>
            </div>
        </div>    
    </body>
</html>
    `;
};
