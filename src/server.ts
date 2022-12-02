import "./env";
import "./global";
import app from "./app";
import app_edms from "./app_edms";
import Database from "./lib/database";
import { exec } from "child_process";

const db_list = ["hdc_db_live", "hdc_db", "hdc_db_edms"];

const { PORT } = process.env;

exec("git rev-parse --abbrev-ref HEAD", (err, stdout, stderr) => {
    if (err) {
        // handle your error
    }
    let db_idx = -1;
    if (typeof stdout === "string") {
        if (stdout.trim() === "master") db_idx = 0;
        else if (stdout.trim() === "fixes") db_idx = 1;
        else if (stdout.trim() === "edms") db_idx = 2;
    }
    const database = new Database(db_idx != -1 ? db_list[db_idx] : undefined);
    database.getConnection();
});
// database.getConnection("edms");

exec("kill -9 `lsof -t -i:" + PORT + "`", (err, out, stderr) => {
    app.listen(parseInt(PORT), "0.0.0.0", () => {
        console.log("HDC server is listening to port", PORT);
    });
});

// exec("kill -9 `lsof -t -i:"+ ITWIN_PORT +"`", (err, out, stderr)=>{
//   app_edms.listen(ITWIN_PORT, ()=>{
//     console.log('ITWIN server is listening to port', ITWIN_PORT);
//   });
// });
