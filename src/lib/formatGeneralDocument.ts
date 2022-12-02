import { GeneralDocData } from "../entity/GeneralDocData";
import moment from "moment";
const isLive = process.env.NODE_ENV == "live";

const paperclipsvg =
    '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="paperclip" class="svg-inline--fa fa-paperclip fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M43.246 466.142c-58.43-60.289-57.341-157.511 1.386-217.581L254.392 34c44.316-45.332 116.351-45.336 160.671 0 43.89 44.894 43.943 117.329 0 162.276L232.214 383.128c-29.855 30.537-78.633 30.111-107.982-.998-28.275-29.97-27.368-77.473 1.452-106.953l143.743-146.835c6.182-6.314 16.312-6.422 22.626-.241l22.861 22.379c6.315 6.182 6.422 16.312.241 22.626L171.427 319.927c-4.932 5.045-5.236 13.428-.648 18.292 4.372 4.634 11.245 4.711 15.688.165l182.849-186.851c19.613-20.062 19.613-52.725-.011-72.798-19.189-19.627-49.957-19.637-69.154 0L90.39 293.295c-34.763 35.56-35.299 93.12-1.191 128.313 34.01 35.093 88.985 35.137 123.058.286l172.06-175.999c6.177-6.319 16.307-6.433 22.626-.256l22.877 22.364c6.319 6.177 6.434 16.307.256 22.626l-172.06 175.998c-59.576 60.938-155.943 60.216-214.77-.485z"></path></svg>';

const getMoment = (date: Date | string, format?: string) => {
    return format ? moment(date, format) : moment(date);
};

export const getGeneralDocument = async (
    creater: string,
    code: string,
    data: GeneralDocData,
    sign_line: any[],
    sender_list: any[],
    referer_list: any[],
    attach_list: any[]
) => {
    let sendedAt = moment(data.sended_at).isValid() ? moment(data.sended_at).format("YYYY-MM-DD HH:mm") : "";
    return `
  <!DOCTYPE html>
  <html lang="kr">
      <head>
          <meta charset="utf-8" />
          <title>일반문서</title>
          <style type="text/css">
              body {
                  margin: 0;
                  padding: 0;
                  font: 12pt "Tahoma";
              }
  
              .form_wrapper {
                  width: 96%;
                  height: 96%;
                  flex: 1;
                  border-radius: 5px;
                  background-color: #fff;
                  padding: 40px 40px 0px 40px;
                  margin-bottom: 20px;
                  display: flex;
                  justify-content: flex-start;
                  align-items: center;
                  flex-direction: column;
                  gap: 5px;
                  overflow: auto;
              }
  
              .pdfrow {
                  display: flex;
                  min-height: 120px;
                  height: auto;
                  margin-bottom: 20px;
                  position: relative;
                  justify-content: flex-end;
              }
  
              * {
                  box-sizing: border-box;
                  -moz-box-sizing: border-box;
              }
  
              .general_form {
                  display: flex;
                  flex-direction: column;
                  padding: 50px;
                  width: 100%;
                  min-height: 1400px;
                  background: white;
                  font-size: 20px;
              }
  
              .general_form .row {
                  display: flex;
                  justify-content: space-between;
                  height: auto;
                  min-height: 1.2cm;
                  margin-bottom: 0.25cm;
              }
  
              .general_form .row .title_box {
                  height: auto;
              }
  
              .general_form .auto_height_row {
                  min-height: 1.2cm;
              }
  
              .general_form .auto_height_row .input_box {
                  display: flex;
                  flex-wrap: wrap;
                  height: auto;
                  padding: 0.1cm 0.25cm;
                  box-sizing: border-box;
                  line-height: 160%;
              }
  
              .general_form .attachments_row {
                  height: auto;
              }
  
              .general_form .attachments_row .input_box {
                  display: block;
              }
  
              .general_form .attachments_row .input_box .attachments_list {
                  display: flex;
                  width: fit-content;
                  align-items: center;
                  margin: 0.15cm 0;
                  border-bottom: 1px solid #000;
              }
  
              .general_form .attachments_row .input_box .attachments_list svg {
                  display: block;
                  width: 14px;
                  margin-right: 0.1cm;
              }
  
              .general_form .inner_list {
                  /* 수신자, 참조자 list class */
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: fit-content;
                  padding: 4px 10px;
                  border: 1px solid #666;
                  border-radius: 20px;
                  margin: 8px;
              }
  
              .general_form .title_box {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  width: 20%;
                  background: #4490ff;
                  color: white;
                  border-radius: 5px;
              }
  
              .general_form .input_box {
                  display: flex;
                  align-items: center;
                  border: 1px solid #aaa;
                  width: 79%;
                  height: auto;
                  padding: 0 0.25cm;
              }
  
              .general_form .second_row .input_box {
                  width: 28.5%;
              }
  
              .general_form .contents_row {
                  flex: 1;
              }
  
              .general_form .last_row {
                  margin-bottom: 0;
  
              }
  
              .form_wrapper .general_form .contents_row .input_box .k-editor {
                  font-size: 1em;
              }
              .radiodiv {
                  flex: 1;
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: flex-start;
                  align-items: center;
                  border: 1px solid #aaaaaa;
                  padding: 0 10px;
                  margin-left: 14px;
              }
              .radio {
                  width: 20px;
                  height: 20px;
                  margin: 0 10px;
              }
              .radiotext {
                  width: 25%;
                  height: 70%;
                  margin: 6px 0;
                  display: flex;
                  justify-content: flex-start;
                  align-items: center;
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
            }
            .SignHead .imgdiv {
                width: 100%;
                flex: 3;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .SignText{
                display : flex;
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
                word-wrap: break-word;;
            }

          </style>
          <body>
                <div class="form_wrapper">
                    <div id="print_pdf" class="general_form">
                        <div class="pdfrow">
                            <div class="SignHeadNormalDiv">
                            ${
                                sign_line != undefined && sign_line.length > 0
                                    ? `<div class="SignHeadDiv2"> <div class="SignText">결재</div>` +
                                      sign_line
                                          .map(
                                              (raw: any, idx: number) =>
                                                  `
                                            <div class="SignHead">
                                                <div class="name">${raw.state == "1" ? "담당" : "결재"}</div>
                                                <div class="imgdiv">${raw.username}</div>
                                                <div class="date">
                                                ${
                                                    raw.state == "1"
                                                        ? getMoment(raw.created_at)
                                                              .locale("en")
                                                              .format("YY.MM.DD / HH:mm")
                                                        : raw.state == "3" || raw.state == "6"
                                                        ? getMoment(raw.approval_at)
                                                              .locale("en")
                                                              .format("YY.MM.DD / HH:mm")
                                                        : ""
                                                }
                                                </div>
                                            </div>
                                        `
                                          )
                                          .join("\n") +
                                      `</div>`
                                    : ``
                            }
                            </div>
                        </div>
                        <div class="row fixed_height_row">
                            <div class="title_box">문서구분</div>
                            <div class="input_box" id="document-type">
                                <input class="radio" type="radio" checked />
                                ${code}
                            </div>
                        </div>
                        <div class="row fixed_height_row">
                            <div class="title_box">문서번호</div>
                            <div class="input_box" id="document-code">${data.code_no}</div>
                        </div>
                        <div class="row second_row">
                            <div class="title_box">작성자</div>
                            <div class="input_box" id="document-writer">${creater}</div>
                            <div class="title_box">작성일자</div>
                            <div class="input_box" id="document-date">${sendedAt}</div>
                        </div>
                        <div class="row fixed_height_row">
                            <div class="title_box">발신</div>
                            <div class="input_box" id="document-caller">${data.sender}</div>
                        </div>
                        <div class="row auto_height_row">
                            <div class="title_box">수신자</div>
                            <div class="input_box" id="document-receiver">${sender_list
                                .map((raw: any) => `<div class="inner_list">${raw.position} ${raw.username}</div>`)
                                .join("")}</div>
                        </div>
                        <div class="row auto_height_row">
                            <div class="title_box">참조자</div>
                            <div class="input_box" id="document-CC">${referer_list
                                .map((raw: any) => `<div class="inner_list">${raw.position} ${raw.username}</div>`)
                                .join("")}</div>
                        </div>
                        <div class="row fixed_height_row">
                            <div class="title_box">제목</div>
                            <div class="input_box" id="document-title">${data.title}</div>
                        </div>
                        <div class="row auto_height_row contents_row">
                            <div class="title_box">내용</div>
                            <div class="input_box" id="document-content">
                            ${isLive && data.content ? decodeURIComponent(data.content) : data.content}
                            </div>
                        </div>
                        <div class="row auto_height_row attachments_row">
                            <div class="title_box">첨부파일</div>
                            <div class="input_box" id="document-attachments">
                                ${attach_list
                                    .map(
                                        (raw: any) =>
                                            isLive ? `
                                        <div class="attachments_list">
                                            ${paperclipsvg}
                                            ${decodeURIComponent(raw.filename)}
                                        </div>
                                    ` : 
                                    `
                                        <div class="attachments_list">
                                            ${paperclipsvg}
                                            ${raw.filename}
                                        </div>
                                    `
                                    )
                                    .join("")}
                            </div>
                        </div>
                        <div class="row fixed_height_row last_row">
                            <div class="title_box">회신필요여부</div>
                            <div class="radiodiv">
                                ${
                                    data.reply == 0
                                        ? `
                                    <div class="radiotext">
                                        <input class="radio" type="radio" checked />
                                        Yes
                                    </div>
                                    <div class="radiotext">
                                        <input class="radio" type="radio"  />
                                        No
                                    </div>
                                    `
                                        : `
                                    <div class="radiotext">
                                    <input class="radio" type="radio"  />
                                        Yes
                                    </div>
                                    <div class="radiotext">
                                        <input class="radio" type="radio" checked />
                                        No
                                    </div>
                                `
                                }
                            </div>
                        </div>
                    </div>
                </div>
          </body>
      </head>
  </html>
  `;
};
