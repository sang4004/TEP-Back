/******************************************************************************
 * entity :
 * EDMSReview
 * 리뷰관리
 * api :
 ******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, In, Repository } from "typeorm";
import { EdmsFiles, EdmsProjectType, EdmsReview, PDFData, User, EdmsUser, EdmsDocument, WorkAttach } from "@/entity";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { logger } from "@/lib/winston";

const router = express.Router();

// 리뷰 등록
router.post("/create_review", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("edms_user_id");
        if (user_id != null) {
            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });

            let file_no = req.body.file_no;
            if (file_no === 0) file_no = null;

            let newReview = new EdmsReview();
            newReview.docu_no = req.body.docu_no;
            newReview.file_no = file_no;
            newReview.content = req.body.content;
            newReview.reviewer_id = user.user_id;
            newReview.create_by = user.username;
            let data = await getRepository(EdmsReview).save(newReview);
            return getSuccessResponse(res, data);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// 리뷰 리스트
router.get("/get_review_list", async (req: Request, res: Response) => {
    try {
        const { docu_no } = req.query;
        const user_id = req.app.get("edms_user_id");
        if (user_id != null && typeof docu_no == "string") {
            let list = await getRepository(EdmsReview).find({
                docu_no: parseInt(docu_no),
            });
            return getSuccessResponse(res, list);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

// 리뷰 답변 등록
router.post("/create_review_reply", async (req: Request, res: Response) => {
    try {
        if (req.app.get("edms_user_id") != null) {
            const user_id = req.app.get("edms_user_id");
            const { reviewNo, content } = req.body;

            let user = await getRepository(EdmsUser).findOne({
                user_id: user_id,
                is_use: 1,
            });

            await getConnection()
                .createQueryBuilder()
                .update(EdmsReview)
                .set({
                    modify_by: user.username,
                    modify_tm: new Date(),
                    reply: content,
                })
                .where("review_no = :id", { id: reviewNo })
                .execute();

            return getSuccessResponse(res, {});
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

//DCl/VP 성과물의 모든 리뷰 확인
router.get("/document_all_review_list", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        const { docu_no } = req.query;
        try {
            if (typeof docu_no === "string" && docu_no) {
                let final_list: {
                    wr_idx: number;
                    revision: string;
                    original_file_name: string;
                    comapny_name: string;
                    code: string;
                    contents: string;
                    reviewDate: Date;
                    reply: string;
                    page_sheet_no: string;
                    file_data: any[];
                    repo_path: string;
                    file_no: number;
                    file_type: string;
                }[] = [];

                let _docu_no = parseInt(docu_no);
                let document = await tr.getRepository(EdmsDocument).findOne({ docu_no: _docu_no });
                let attach_list = await tr.getRepository(WorkAttach).find();

                let list = await tr.query(`
                SELECT 
                    wr.wr_idx,
            	    ef.revision,
            	    ef.original_file_name,
            	    ec.company_name,            	
            	    wr.code,
				    wr.contents,
				    wr.review_date,
				    wr.reply,
				    wr.page_sheet_no,
				    ef.repo_path,
                    wr.file_no,
                    ef.file_type
                FROM work_review wr
                JOIN (
                	SELECT 
						max(wr_idx) as wr_idx,
						contents, reply, docu_no,
						file_no 
					FROM work_review 
					WHERE docu_no = ${docu_no}
					GROUP BY contents, reply, docu_no, file_no ) reviews 
                    ON wr.wr_idx = reviews.wr_idx
                    INNER JOIN edms_user eu
                    ON eu.user_id = wr.reviewer_id
                    INNER JOIN edms_company ec
                    ON ec.id = eu.company_id
                    INNER JOIN edms_files ef
                    ON ef.file_no = wr.file_no 
                    ORDER BY revision ASC
                `);

                for (var l of list) {
                    final_list.push({
                        wr_idx: l.wr_idx,
                        revision: l.revision,
                        original_file_name: l.original_file_name,
                        comapny_name: l.company_name,
                        code: l.code,
                        contents: l.contents,
                        reviewDate: l.review_date,
                        reply: l.reply,
                        page_sheet_no: l.page_sheet_no,
                        file_data: [],
                        repo_path: l.repo_path,
                        file_no: l.file_no,
                        file_type: l.file_type,
                    });
                }

                for (var f of final_list) {
                    let attach_files = attach_list.filter(raw => raw.wr_idx == f.wr_idx);
                    if (attach_files.length > 0) {
                        for (var a of attach_files) {
                            f.file_data.push([a.file_name, a.file_path]);
                        }
                    }
                }

                return getSuccessResponse(res, { document: document, list: final_list });
            }
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

export default router;
