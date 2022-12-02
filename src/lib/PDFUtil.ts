import { getConnection, getRepository } from "typeorm";
import axios from "axios";
import JSPDF from "jspdf";
import fs from "fs";
import path from "path";
import { edmsUploadDir } from "../constant";

export default {
    ImageData2PDF: (
        pdfName: string,
        imgData: string | Buffer,
        imageSize: { width: number; height: number },
        specificPath?: string
    ): { path: string } => {
        var imgWidth = 210;
        var pageHeight = imgWidth * 1.414;

        var imgHeight = (imageSize.height * imgWidth) / imageSize.width;
        var heightLeft = imgHeight;
        const pdf = new JSPDF("p", "mm", "a4", true);
        const widthSpace = 0;
        var position = 0;
        pdf.addImage(
            imgData,
            "PNG",
            widthSpace,
            position,
            imgWidth - widthSpace * 2,
            imgHeight - widthSpace * 2,
            "",
            "FAST"
        );
        heightLeft -= pageHeight;
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(
                imgData,
                "PNG",
                widthSpace,
                position,
                imgWidth - widthSpace * 2,
                imgHeight - widthSpace * 2,
                "",
                "FAST"
            );
            heightLeft -= pageHeight;
        }
        let uploadDir = edmsUploadDir;
        if (specificPath) uploadDir = specificPath;
        let _path = path.resolve(globalThis.HOME_PATH, uploadDir, pdfName);
        fs.writeFileSync(_path, Buffer.from(pdf.output("arraybuffer")));

        return { path: _path };
    },
};
