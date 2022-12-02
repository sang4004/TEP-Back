import path from "path";

globalThis.HOME_PATH = process.env.HOME_PATH ? process.env.HOME_PATH : path.resolve(__dirname, "../");
globalThis.PDF_HOME_PATH = process.env.PDF_HOME_PATH ? process.env.PDF_HOME_PATH : path.resolve(__dirname, "../");
globalThis.PDF_GATEWAY_CALLBACK = "pdf/gateway/callback";
globalThis.IS_LIVE = process.env.NODE_ENV == "live";
