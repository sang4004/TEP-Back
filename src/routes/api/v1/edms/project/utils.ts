export const getOfficialType = (type: string, id: number) => {
    if (type == "off_type") {
        switch (id) {
            case 0:
                return "FROM";
            case 1:
                return "TO";
            case 2:
                return "CC";
            case 3:
                return "Issued";
            case 4:
                return "Received";
            default:
                return "해당없음";
        }
    } else if (type == "stage_type") {
        switch (id) {
            case 0:
                return "전체";
            case 1:
                return "IFA";
            case 2:
                return "AFC";
            case 3:
                return "Built";
            default:
                return "해당없음";
        }
    } else if (type == "off_docu_type") {
        switch (id) {
            case 0:
                return "한화공문";
            case 1:
                return "신한공문";
            default:
                return "해당없음";
        }
    }
};