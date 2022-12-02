import path from "path";
import express, { response } from "express";
import cors from "cors";
import routes from "./routes";
import cookieParser from "cookie-parser";
import compression from "compression";
import fs from "fs";
import mime from "mime-types";
import morgan from "morgan";

import { consumeUser } from "./lib/token";
import { logger, stream } from "@/lib/winston";
import { getDownloadFilename, getUploadModule } from "./lib/utils";
import { edmsUploadFolder, uploadFolder, edmsFileDir } from "./constant";
import CronJob from "@/lib/cronjob";
import { DclWorker, PdfWorker, DTWorker, EdmsWorker } from "@/lib/mainWorker";
import { getRepository } from "typeorm";
import { EdmsUser } from "./entity";

const { ORIGIN, LOGGING_ENV, IS_WORKER } = process.env;
(function () {
    CronJob();
    new DclWorker();
    new DTWorker();
    new EdmsWorker();
    if (IS_WORKER == "1") {
        //workers
        new PdfWorker();
        //
    }
})();
const app = express();
const uploadModule = getUploadModule(path.resolve(globalThis.HOME_PATH, "uploads/"), true);
const uploadModuleEdms = getUploadModule(path.resolve(globalThis.HOME_PATH, "uploads_edms/"), true);
//file serve
// app.use("/signin-callback", async(req,res)=>{
//     console.log(req.path);
//     res.redirect("http://localhost:5500", );
//     res.status(200);
// });
if (LOGGING_ENV == "production") app.use(morgan("combined", { stream }));

app.set("views", __dirname + "/public");
app.set("view engine", "ejs");

app.use("/filedownload/edms/docuact/:repo_path", async (req, res, next) => {
    var filename = decodeURIComponent(req.query.filename.toString());
    var repo_path = decodeURIComponent(req.params.repo_path.toString());
    const user_id = req.app.get("edms_user_id");
    // convert to pdf & move to file
    try {
        let edms_user = await getRepository(EdmsUser).findOne({ user_id: user_id });
        var file = path.resolve(globalThis.HOME_PATH, repo_path);
        if (fs.existsSync(file)) {
            // 파일이 존재하는지 체크
            if (filename == undefined) {
                filename = path.basename(file); // 파일 경로에서 파일명(확장자포함)만 추출
            }
            let mimetype = mime.lookup(file); // 파일의 타입(형식)을 가져옴

            res.setHeader("access-control-allow-origin", "*");
            res.setHeader("Content-disposition", "attachment; filename=" + getDownloadFilename(req, filename)); // 다운받아질 파일명 설정
            res.setHeader("Content-type", mimetype ? mimetype + "; charset=utf-8" : ""); // 파일 형식 지정
            res.sendFile(file);
            logger.log("down", `[id: ${edms_user.user_id}, User Email: ${edms_user.email}, File Path: ${file}]`);
        } else {
            res.send("해당 파일이 없습니다.");
            return;
        }
    } catch (e) {
        // 에러 발생시
        logger.error(e);
        res.send("파일을 다운로드하는 중에 에러가 발생하였습니다.");
        return;
    }
});

app.use("/filelink/edms/:filename", async (req, res, next) => {
    res.render("bigfile", { fileUrl: edmsFileDir + req.params.filename, fileName: req.params.filename });
});

app.use("/filedownload/edms/:filename", async (req, res, next) => {
    var file = path.resolve(globalThis.HOME_PATH, edmsUploadFolder, req.params.filename);
    try {
        if (fs.existsSync(file)) {
            // 파일이 존재하는지 체크
            var filename = path.basename(file); // 파일 경로에서 파일명(확장자포함)만 추출
            var mimetype = mime.lookup(file); // 파일의 타입(형식)을 가져옴

            res.setHeader("access-control-allow-origin", "*");
            res.setHeader("Content-disposition", "attachment; filename=" + getDownloadFilename(req, filename)); // 다운받아질 파일명 설정
            res.setHeader("Content-type", mimetype ? mimetype + "; charset=utf-8" : ""); // 파일 형식 지정
            res.sendFile(file);
        } else {
            res.send("해당 파일이 없습니다.");
            return;
        }
    } catch (e) {
        // 에러 발생시
        logger.error(e);
        res.send("파일을 다운로드하는 중에 에러가 발생하였습니다.");
        return;
    }
});

app.use("/filedownload/:filename", async (req, res, next) => {
    var file = path.resolve(globalThis.HOME_PATH, uploadFolder, req.params.filename);
    try {
        if (fs.existsSync(file)) {
            // 파일이 존재하는지 체크
            var filename = path.basename(file); // 파일 경로에서 파일명(확장자포함)만 추출
            var mimetype = mime.lookup(file); // 파일의 타입(형식)을 가져옴
            res.setHeader("access-control-allow-origin", "*");
            res.setHeader("Content-disposition", "attachment; filename=" + getDownloadFilename(req, filename)); // 다운받아질 파일명 설정
            res.setHeader("Content-type", mimetype ? mimetype + "; charset=utf-8" : ""); // 파일 형식 지정
            res.sendFile(file);
        } else {
            res.send("해당 파일이 없습니다.");
            return;
        }
    } catch (e) {
        // 에러 발생시
        logger.error(e);
        res.send("파일을 다운로드하는 중에 에러가 발생하였습니다.");
        return;
    }
});

app.use("/static", express.static(path.join(globalThis.HOME_PATH, uploadFolder)));
app.use(express.static(path.join(__dirname, "../../mms-monorepo/packages/hdc-app/build")));
app.use("/", function (req, res, next) {
    if (req.path.indexOf("api") != -1) return next();
    res.sendFile(path.resolve(__dirname, "../../mms-monorepo/packages/hdc-app/build/index.html"));
});
//

// app.use(logger("dev"));
// 파일 업로드 관리 프로세스
app.use((req, res, next) => {
    if (req.path.indexOf("edms") != -1) uploadModuleEdms.any()(req, res, next);
    else uploadModule.any()(req, res, next);
});
app.use(compression());
app.use(
    express.urlencoded({
        limit: "50mb",
        extended: true,
        parameterLimit: 50000,
    })
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(
    cors({
        origin: ORIGIN,
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

app.use(consumeUser);
app.use("", routes);

export default app;
