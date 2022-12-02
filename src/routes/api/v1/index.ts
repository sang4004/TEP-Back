import express, { Request, Response } from "express";
//inject point1
import organization from "./organization";
import auth from "./auth";
import digitalsign from "./digitalsign";
import edms from "./edms";
import digitaltwin from "./digitaltwin";
import { fileDir } from "../../../constant";
import { PdfWorker } from "@/lib/mainWorker";

const router = express.Router();
1;
//inject point2
router.use("/organization", organization);
router.use("/auth", auth);
router.use("/digitalsign", digitalsign);
router.use("/edms", edms);
router.use("/digitaltwin", digitaltwin);

router.post("/upload_editor_file", async (req: Request, res: Response) => {
    let filename;
    try {
        const file = req.files[0];
        filename = `${fileDir + file.filename}`;
    } catch (e) {
        console.log(e);
    } finally {
        return res.json({ link: filename });
    }
});

router.post("/" + globalThis.PDF_GATEWAY_CALLBACK + "/:TYPE", async (req, res, next) => {
    try {
        console.log(req.body);
        if (req.body) {
            req.body.pdfType = req.params.TYPE;
            new PdfWorker().registStreamDocs(req.body);
        }
        res.status(200).send("SUCCESS");
    } catch (e) {
        console.log("pdf gateway callback error : ", e);
    }
});

export default router;
