/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 *
 *****************************************************************************/

import "./env";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import path from "path";

const { ITWIN_PORT, NODE_ENV, ITWIN_ORIGIN } = process.env;
const app: Application = express();
const port = ITWIN_PORT;

const options: cors.CorsOptions = {
    allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "X-Access-Token",
    ],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: true,
    preflightContinue: false,
};

// Body parsing Middleware
app.use(express.json({ limit: "500mb" }));
app.use(
    express.urlencoded({
        limit: "500mb",
        extended: true,
        parameterLimit: 500000,
    })
);
app.use(
    cors({
        origin: ITWIN_ORIGIN,
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

// app.post("/*", async (req: Request, res: Response): Promise<Response> => {
//     try {
//         const outFileName = await mergeMultipleModels(req);
//         return res.status(200).send({
//             payload: {
//                 data: outFileName,
//             },
//         });
//     } catch (err) {
//         console.error(err);
//         return res.status(999).send({
//             payload: {
//                 data: "failure",
//             },
//         });
//     }
// });

app.use(express.static(path.join(__dirname, "../../digital-twin/build")));
app.use("/", function (req, res, next) {
    if (req.path.indexOf("api") != -1) return next();
    res.sendFile(path.resolve(__dirname, "../../digital-twin/build/index.html"));
});

app.use("", routes);

export default app;