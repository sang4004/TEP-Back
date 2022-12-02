var dclUploadWorkerInstance = null;
export class DclUploadWorker {
    dcl_upload_list: {
        id: number;
        total: number;
        count: number;
    }[] = [];

    constructor() {
        if (dclUploadWorkerInstance) return dclUploadWorkerInstance;

        dclUploadWorkerInstance = this;
    }

    setDclUpload(id: number, total?: number, count?: number) {
        let findIdx = this.dcl_upload_list.findIndex(raw=> raw.id == id);
        if(findIdx != -1){
            if(total != undefined) this.dcl_upload_list[findIdx].total = total;
            if(count != undefined) this.dcl_upload_list[findIdx].count = count;
        } else {
            this.dcl_upload_list.push({ id : id, total : total, count : count });
        }
        return true;
    }
    
    removeDclUpload(id : number){
        let findIdx = this.dcl_upload_list.findIndex(raw=> raw.id == id);
        if(findIdx != -1){
            this.dcl_upload_list.splice(findIdx, 1);
            return true;
        }
        return false;
    }
}
