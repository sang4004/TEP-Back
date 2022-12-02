import "../../env";
import "../../global";
import { parentPort, workerData, isMainThread } from "worker_threads";
import Database from "../simpleDatabase";
import Query from "./query/countpingQueries";
import { workerNamespace } from "Worker";

const isLive = process.env.NODE_ENV == "live";
const drnQuery = Query.countPing["drnQuery" + (isLive ? "Real" : "")];
const trQuery = Query.countPing["trQuery" + (isLive ? "Real" : "")];

const database = new Database(process.env.TYPEORM_DATABASE);

async function getCountPingAll(): Promise<workerNamespace.countPingEdmsResultType> {
    try {
        const conn = await database.getConnection();

        let drn = await conn.query(drnQuery);
        let tr = await conn.query(trQuery);
        //
        return {
            drn, tr
        };
    } catch (err) {
        console.error(err);
    }
}

function Task() {
    let isTasking = false;
    return {
        runTask() {
            console.log(`======EDMS Worker Run Task Status:${isTasking ? "Running" : "Waiting"}======`);
            if (!isTasking) {
                isTasking = true;
                getCountPingAll()
                    .then(val => {
                        parentPort.postMessage(val);
                    })
                    .finally(() => {
                        isTasking = false;
                    });
            }
        },
    };
}
if (!isMainThread && parentPort) {
    let task = Task();
    task.runTask();
    setInterval(task.runTask, 1000 * 30);
}
