import ExcelJS, { BorderStyle, Border, Fill } from "exceljs";

export class TmReviewExcel {
    merge_list = [
        "A1:B1", // CONTRACT NO
        "A2:B2", // PO NO
        "A3:B3", // Item Name
        "A4:B4", // Vendor Name
        "F1:I1", // title
        "F2:I4", // review comments
        "Q1:R1", // tr no
        "Q2:R2", // Date
    ];

    merge_column_list: string[] = []; // ["B:D", "O:Q", "X:Z", "AD:AF"];

    cols_width_list: { width: number }[] = [
        { width: 7 * 0.93 },
        { width: 7 * 2.2 },
        { width: 7 * 0.36 },
        { width: 7 * 3 },
        { width: 7 * 8 },
        { width: 7 * 1 },
    ];

    cols_width_list_review: { width: number }[] = [
        { width: 7 * 0.8 },
        { width: 7 * 1.6 },
        { width: 7 * 10 },
        { width: 7 * 1.8 },
        { width: 7 * 10 },
        { width: 7 * 1.8 },
        { width: 7 * 1.8 },
    ];

    cols_height_review = 7 * 5;

    cell_center_list = [
        2,
        6,
        7,
        8,
        10,
        12,
        13, //1회차
        14,
        15,
        17,
        19,
        20,
        21, //2회차
        22,
        24,
        26,
        27,
        28,
        29, //3회차
        30,
        31,
        33,
        35,
        36,
        37, //4회차
        38,
        39,
        41,
        43,
        44,
        45, //5회차
        46,
        47,
        49,
        51,
        53,
        54, //6회차
        55, //6회차 까지 갈 시 최종결과
    ];

    cell_styles: {
        cell: string;
        row?: number;
        rowCount?: number;
        horizontal?: "center" | "left" | "right";
        vertical?: "top" | "middle" | "bottom" | "distributed" | "justify";
        font?: {
            name?: string;
            size?: number;
            family?: number;
            scheme?: "minor" | "major" | "none";
            charset?: number;
            bold?: boolean;
            italic?: boolean;
            underline?: boolean | "none" | "single" | "double" | "singleAccounting" | "doubleAccounting";
            vertAlign?: "superscript" | "subscript";
            strike?: boolean;
            outline?: boolean;
        };
        border?: { top?: Border; right?: Border; left?: Border; bottom?: Border };
        fill?: Fill;
    }[] = [
        //header prev
        { cell: "C1", horizontal: "center" },
        { cell: "C2", horizontal: "center" },
        { cell: "C3", horizontal: "center" },
        { cell: "C4", horizontal: "center" },
        { cell: "D3", font: { bold: true } },
        { cell: "F1", horizontal: "center", font: { size: 12, bold: true } },
        { cell: "F2", horizontal: "center", vertical: "middle", font: { size: 20, bold: true } },
        { cell: "P1", horizontal: "center" },
        { cell: "P2", horizontal: "center" },
        //
        // header
        {
            cell: "A5",
            row: 5,
            rowCount: 31,
            horizontal: "center",
            vertical: "middle",
            font: { bold: true, size: 11 },
            border: {
                top: { style: "medium", color: { argb: "000" } },
                left: { style: "thin", color: { argb: "000" } },
                right: { style: "thin", color: { argb: "000" } },
                bottom: { style: "thin", color: { argb: "000" } },
            },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "B6DDE8" } },
        },
        //
    ];
}
