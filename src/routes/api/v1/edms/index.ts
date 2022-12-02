import express from "express";
//inject point1
import projects from "./project";
import category from "./category";
import document from "./document";
import files from "./files";
import work from "./work";
import etc from "./etc";
import modelfile from "./modelfile";
import pdfdata from "./pdfdata";
import review from './review';
import authority from './authority';
import settings from "./settings";
import discipline from "./discipline";

const router = express.Router();

//inject point2
router.use("/project", projects);
router.use("/category", category);
router.use("/document", document);
router.use("/files", files);
router.use("/work", work);
router.use("/etc", etc);
router.use("/modelfile", modelfile);
router.use("/pdfdata", pdfdata);
router.use("/review", review);
router.use("/authority", authority);
router.use("/settings", settings);
router.use("/discipline", discipline);

export default router;