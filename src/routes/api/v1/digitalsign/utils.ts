export const getGeneralFilename = (type: boolean, id: string, code_no: string, sign_type: string) => {
    let docu_type = type == true ? "발신문서" : "수신문서";
    let docu_sign_type = parseInt(sign_type) == 1 ? "(결재포함)" : "";
    code_no = code_no.replace(/\//g, " ");
    return `${docu_type}_${id}_${code_no}${docu_sign_type}.pdf`;
};

export const getOfficialFilename = async (type: boolean, document_code: string, sign_type: string) => {
    let docu_type = type == true ? "발신문서" : "수신문서";
    let docu_sign_type = parseInt(sign_type) == 1 ? "(결재포함)" : "";

    return `${docu_type}_${document_code}${docu_sign_type}.pdf`;
};
