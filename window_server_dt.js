const exec = require("child_process").exec;
const path = require("path");
const client = exec(
    "nodemon --watch 'src/**' --ext 'ts,json' --exec \"ts-node --respawn -r tsconfig-paths/register ./src/server_edms.ts\"",
    { windowsHide: true, cwd: path.join(__dirname, "./") }
);
client.stdout.pipe(process.stdout);
client.stderr.pipe(process.stderr);
