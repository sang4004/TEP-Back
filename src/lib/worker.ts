import { Worker, WorkerOptions } from "worker_threads";

const wk = `
    const wk = require('worker_threads');
    require('ts-node').register({ transpileOnly : true });
    let file = wk.workerData.__filename;
    require(file);
`;

export function workerTS(filename: string, workerOptions: WorkerOptions) {
    workerOptions.eval = true;
    if(!workerOptions.workerData){
        workerOptions.workerData = {};
    }
    workerOptions.workerData.__filename = filename;
    return new Worker(wk, workerOptions);
}
