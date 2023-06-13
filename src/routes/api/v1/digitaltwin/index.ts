/******************************************************************************
 * entity :
 * ImodelEntity
 * bentely Itwin.js Imodel API
 * api :
 *
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, Repository } from "typeorm";
import { ImodelEntity, ImodelDatas, EdmsFiles, EdmsDocument, EdmsStage, ImodelMarker, ImodelElements } from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { mergeMultipleModels } from "@/lib/imodelutil";
import { logger } from "@/lib/winston";
import { Point3d } from "@bentley/geometry-core";

const router = express.Router();

router.post("/merge_imodels", async (req: Request, res: Response): Promise<Response> => {
    try {
        const outFileName = await mergeMultipleModels(req);
        return getSuccessResponse(res, outFileName);
    } catch (err) {
        return getFailedResponse(res);
    }
});

router.post("/create_element_data", async (req: Request, res: Response): Promise<Response> => {
    const { imodel_name, elements, user_id, file_no, imodel_datas } = req.body;
    try {
        let exist_imd = await getRepository(ImodelEntity).find({ imodel_name });
        if (exist_imd.length > 0) {
            let els = await getRepository(ImodelElements).find({ imodel_id: exist_imd[0].id });
            return getSuccessResponse(res, { els: els, imodel: exist_imd[0] });
        }
        let file = null;
        if (file_no != -1) {
            file = await getRepository(EdmsFiles).findOne({ file_no: file_no, is_use: 1 });
        }
        let new_imd = new ImodelEntity();
        new_imd.imodel_name = imodel_name;
        new_imd.user_id = user_id;
        new_imd.file_no = file_no;
        new_imd.docu_no = file ? file.docu_no : -1;
        let imodel = await getRepository(ImodelEntity).save(new_imd);
        let els = [];
        for (var el of elements) {
            let new_imd = new ImodelElements();
            new_imd.imodel_id = imodel.id;
            new_imd.element_id = el.id;
            new_imd.class_name = el.className;
            new_imd.parent_id = el.parent ? el.parent.id : null;
            new_imd.code_scope = el.codeScope;
            new_imd.code_spec = JSON.stringify(el.codeSpec);
            new_imd.user_label = el.userLabel;

            els.push(new_imd);
        }
        let els_split = [];
        while (els.length > 0) {
            els_split.push(els.splice(0, 1000));
        }
        let insert_imd = await getRepository(ImodelElements).save(els);
        return getSuccessResponse(res, { els: els, imodel: imodel });
    } catch (err) {
        logger.error(req.path + " || " + err);
        console.log(err);
    }
    return getFailedResponse(res);
});

router.post("/create_imodel_data", async (req: Request, res: Response) => {
    const { imodel_datas, className, imodel_id, user_id } = req.body;
    try {
        let new_datas = [];
        for (var data of imodel_datas) {
            let new_imd = new ImodelDatas();
            new_imd.class = className;
            new_imd.data = typeof data == "object" ? JSON.stringify(data) : data;
            new_imd.imodel_id = imodel_id;
            new_datas.push(new_imd);
        }
        await getRepository(ImodelDatas).save(new_datas);
        return getSuccessResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
        console.log(err);
    }
    return getFailedResponse(res);
});

router.get("/get_element_data", async (req: Request, res: Response): Promise<Response> => {
    const { imodel_name } = req.query;
    try {
        if (typeof imodel_name == "string") {
            let imodel = await getRepository(ImodelEntity).findOne({ imodel_name: imodel_name });
            if (imodel) {
                let elements = await getRepository(ImodelElements).find({ imodel_id: imodel.id });
                return getSuccessResponse(res, { elements: elements });
            }
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_element_data_by_id", async (req: Request, res: Response): Promise<Response> => {
    const { imodel_id } = req.query;
    try {
        if (typeof imodel_id == "string") {
            let elements = await getRepository(ImodelElements).find({
                imodel_id: parseInt(imodel_id),
            });
            return getSuccessResponse(res, { elements: elements });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_model_data", async (req: Request, res: Response): Promise<Response> => {
    const { imodel_name, file_no } = req.query;
    try {
        if (typeof imodel_name == "string") {
            let imodel = await getRepository(ImodelEntity).findOne({ imodel_name });
            let imodelMarker = await getRepository(ImodelMarker).find({ imodel_id: imodel.id });
            let pointContainer = [];
            imodelMarker.map(raw => pointContainer.push(new Point3d(raw.x, raw.y, raw.z)));
            let info = {};
            if (typeof file_no == "string") {
                let file = await getRepository(EdmsFiles).findOne({ file_no: parseInt(file_no), is_use: 1 });
                if (file)
                    Object.assign(info, {
                        filename: file.original_file_name,
                        create_by: file.create_by,
                        stage_code: file.stage_code,
                    });
            }
            let imodel_datas = await getRepository(ImodelDatas).find({ imodel_id: imodel.id });
            return getSuccessResponse(res, {
                dataContainer: imodel,
                infoContainer: info,
                markerContainer: [...imodelMarker],
                pointContainer: [...pointContainer],
                nameContainer: null,
                imodel_datas: imodel_datas,
            });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/add_marker", async (req: Request, res: Response) => {
    try {
        const { imodel_id, point, user_id } = req.body;
        if (imodel_id && point && user_id) {
            let new_marker = new ImodelMarker();
            new_marker.imodel_id = imodel_id;
            new_marker.user_id = user_id;
            new_marker.x = point.x;
            new_marker.y = point.y;
            new_marker.z = point.z;
            let insert_marker = await getRepository(ImodelMarker).save(new_marker);
            return getSuccessResponse(res, { marker_id: insert_marker.id });
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/del_marker", async (req: Request, res: Response) => {
    try {
        const { marker_id } = req.body;
        let marker = await getRepository(ImodelMarker).findOne({ id: marker_id });
        if (marker) {
            await getRepository(ImodelMarker).remove(marker);
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/modify_marker", async (req: Request, res: Response) => {
    try {
        const { marker_id, title, text } = req.body;
        let marker = await getRepository(ImodelMarker).findOne({ id: marker_id });
        await getConnection()
            .createQueryBuilder()
            .update(ImodelMarker)
            .set({ title, text })
            .where("id = :id", { id: marker_id })
            .execute();

        let result = await getRepository(ImodelMarker).find({ imodel_id: marker.imodel_id });

        return getSuccessResponse(res, result);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

export default router;
