import { getRepository, getConnection } from "typeorm";
import { EdmsStageType, EdmsStage } from "@/entity";

export const getDefaultStages = async () => {
    const stages = await getRepository(EdmsStageType).find();
    let result = [];
    for (var stage of stages) {
        if (stage.stage_name == "Start" || stage.stage_name == "As-Built" || stage.stage_name == "As-Built(F)") {
            result.push(stage.stage_name);
        } else {
            result.push(stage.stage_name + " Issue");
            result.push(stage.stage_name + " Approval");
        }
    }

    return result;
};

export const GetNextStage = (now_stage: string, stages: EdmsStage[]) => {
    let _split = now_stage.split(" ");
    let stage_codes = [];
    let next_stage = "";
    let now_stage_obj: EdmsStage = null;
    if (_split.length > 1) {
        let flag = false;
        for (var i = 0; i < stages.length; i++) {
            let stage = stages[i];
            if (stage_codes.indexOf(stage.stage_code + stage.stage_type) != -1) continue;
            stage_codes.push(stage.stage_code + stage.stage_type);
            if (flag) {
                next_stage = `${stage.stage_code} ${stage.stage_type == "i" ? "Issue" : "Approval"}`;
                now_stage_obj = stage;
                break;
            } else if (
                stage.stage_code == _split[0] &&
                (stage.stage_type == _split[1] || stage.stage_type == _split[1][0].toLocaleLowerCase())
            ) {
                flag = true;
            }
        }
    } else if (_split.indexOf("Start") != -1) {
        next_stage = "IFA Issue";
    } else if (_split.indexOf("As-Built") != -1) {
        next_stage = "As-Built(F)";
        if (stages.find(raw => raw.stage_code.indexOf("As-Built(F)") != -1) == undefined) {
            let new_stage = new EdmsStage();
            Object.assign(new_stage, { ...now_stage_obj });
            new_stage.modify_tm = new Date();
            new_stage.plan_dt = new Date();
            new_stage.actual_dt = new Date();
            new_stage.stage_code = "As-Built(F)";
            new_stage.revision = 0;
            new_stage.actual_rate = 0;
            new_stage.stage_no = null;
            getRepository(EdmsStage).save(new_stage);
        }
    }
    return next_stage;
};
