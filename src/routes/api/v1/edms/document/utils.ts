import { Request, Response } from "express";
import moment, { unitOfTime } from "moment";
import fs from "fs";
import XLSX from "xlsx";
import { getDownloadFilename } from "@/lib/utils";

const columns: any = [
    "프로젝트",
    "프로젝트타입",
    "공종",
    "항목",
    "파일 타입",
    "파일 이름",
    "Stage",
    "Revision",
    "작성자",
    "Doc. No.",
    "Doc. Title",
    "IFA",
    "",
    "",
    "AFC",
    "",
    "",
    "VP문서 여부",
];
const stages = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Plan",
    "Forecast",
    "Actual",
    "Plan",
    "Forecast",
    "Actual",
    "",
];
export const CreateUploadFormExcelFile = async (data: any[], req: Request, res: Response) => {
    return await new Promise(r => {
        let data_json = [[...columns], [...stages]];

        for (var d of data) {
            let file_type = "";
            if (d.file_type == "003") {
                file_type = "일반문서";
            } else if (d.file_type == "002") {
                file_type = "PDF";
            }
            if (d.file_type == "001") {
                file_type = "도면";
            }
            data_json.push([
                d.project_name,
                d.projtypename,
                d.dcl,
                d.cate,
                file_type,
                d.file_name,
                d.stage_code,
                d.revision,
                d.create_by,
                d.docu_code,
                d.docu_subject,
                d.IFA_Plan,
                d.IFA_Forecast,
                d.IFA_Actual,
                d.AFC_Plan,
                d.AFC_Forecast,
                d.AFC_Actual,
                d.is_vp == "0" ? "N" : "Y",
            ]);
        }
        const merge_list = [];
        const maxlength = [];
        const wscols = [];
        stages.map((raw: string, idx: number) => {
            let merge = {};
            if (raw == "") {
                Object.assign(merge, { s: { r: 0, c: idx }, e: { r: 1, c: idx } });
                merge_list.push(merge);
            } else if (raw == "Plan") {
                Object.assign(merge, { s: { r: 0, c: idx }, e: { r: 0, c: idx + 2 } });
                merge_list.push(merge);
            }
            maxlength.push(10);
        });
        for (var j = 2; j < data_json.length; j++) {
            data_json[j].map((raw: string, idx: number) => {
                if (typeof raw == "number" || raw == undefined || raw == null) maxlength[idx] = 10;
                else maxlength[idx] = maxlength[idx] >= raw.length ? maxlength[idx] : raw.length;
            });
        }
        maxlength.map((raw: number, idx: number) => {
            wscols.push({ width: raw ? raw : 10, alignment: { horizontal: "center" } });
        });

        let wb = XLSX.utils.book_new();
        var newWorksheet = XLSX.utils.aoa_to_sheet(data_json);
        newWorksheet["!merges"] = merge_list;
        newWorksheet["!cols"] = wscols;
        // var newWorksheet = XLSX.utils.json_to_sheet(data_json);
        XLSX.utils.book_append_sheet(wb, newWorksheet, `sheet1`);
        const _filename = `temp${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, _filename);

        res.setHeader(
            "Content-disposition",
            "attachment; filename=" + getDownloadFilename(req, moment().format("YYYY-MM-DD") + "_문서기준서.xlsx")
        ); // 다운받아질 파일명 설정
        res.setHeader("Content-type", "application/vnd.ms-excel"); // 파일 형식 지정

        var filestream = fs.createReadStream(_filename);
        filestream.pipe(res);
        fs.unlinkSync(_filename);
        r(res);
    });
};
