export default {
    getDcl: `
        SELECT 
            p.project_name AS project_name,
            pt.project_name AS projtypename,
            c.cate_name AS cate,
            c.cate_no AS cate_no,
            c.pcate_no AS pcate_no,
            dc.name AS dcl,
            dc.id AS discipline_id,
            d.docu_no,
            d.docu_code AS docu_code,
            d.project_no,
            d.docu_subject,
            d.wv_rate,
            d.plan_rate,
            d.actual_rate,
            d.area_id,
            es.forecast_dt,
            es.plan_dt,
            es.actual_dt,
            CONCAT(TRIM(es.stage_code), '_Plan') as planKey,
            CONCAT(TRIM(es.stage_code), '_Forecast') as foreKey,
            CONCAT(TRIM(es.stage_code), '_Actual') as actKey,
            d.is_vp
        FROM edms_document d
            INNER JOIN edms_project_type pt
                ON pt.project_no = d.project_no
            INNER JOIN edms_projects p
                ON p.project_no = pt.p_project_no
            INNER JOIN edms_category c
                ON c.cate_no = d.cate_no
            INNER JOIN edms_discipline dc
                ON dc.id = c.discipline_id
            INNER JOIN edms_stage es
                ON es.docu_no = d.docu_no
        WHERE d.is_use = 1
        ORDER BY dcl ASC, cate ASC, d.docu_code ASC;
    `,
    getDclReal: `
        SELECT 
            p.project_name AS project_name,
            pt.project_name AS projtypename,
            c.cate_name AS cate,
            c.cate_no AS cate_no,
            c.pcate_no AS pcate_no,
            dc.name AS dcl,
            dc.id AS discipline_id,
            d.docu_no,
            d.docu_code AS docu_code,
            d.project_no,
            d.docu_subject,
            d.wv_rate,
            d.plan_rate,
            d.actual_rate,
            d.area_id,
            es.forecast_dt,
            es.plan_dt,
            es.actual_dt,
            CONCAT(TRIM(es.stage_code), '_Plan') as planKey,
            CONCAT(TRIM(es.stage_code), '_Forecast') as foreKey,
            CONCAT(TRIM(es.stage_code), '_Actual') as actKey,
            d.is_vp
        FROM edms_document d WITH(NOLOCK)
            INNER JOIN edms_project_type pt WITH(NOLOCK)
                ON pt.project_no = d.project_no
            INNER JOIN edms_projects p WITH(NOLOCK)
                ON p.project_no = pt.p_project_no
            INNER JOIN edms_category c WITH(NOLOCK)
                ON c.cate_no = d.cate_no
            INNER JOIN edms_discipline dc WITH(NOLOCK)
                ON dc.id = c.discipline_id
            INNER JOIN edms_stage es WITH(NOLOCK)
                ON es.docu_no = d.docu_no
        WHERE d.is_use = 1
        ORDER BY dcl ASC, cate ASC, d.docu_code ASC;
    `,
    getDclFiles: `
        SELECT 
            ef.* 
        FROM edms_files ef 
        JOIN (
            SELECT MAX(file_no) AS file_no 
            FROM edms_files 
            WHERE is_use = 1 AND wp_idx != 0
            GROUP BY docu_no
        ) eff
        ON ef.file_no = eff.file_no;
    `,
    getDclFilesReal: `
        SELECT 
            ef.* 
        FROM edms_files ef WITH(NOLOCK)
        JOIN (
            SELECT MAX(file_no) AS file_no 
            FROM edms_files WITH(NOLOCK)
            WHERE is_use = 1 AND wp_idx != 0
            GROUP BY docu_no
        ) eff
        ON ef.file_no = eff.file_no;
    `,
    getDclFilesExt: `
        SELECT 
            ef.file_ext,
            eff.is_vp
        FROM edms_files ef 
        JOIN (
            SELECT 
                MAX(ef.file_no) AS file_no,
                MAX(ed.is_vp) AS is_vp
            FROM edms_files ef
            INNER JOIN edms_document ed
            ON ed.docu_no = ef.docu_no
            WHERE ef.is_use = 1 AND ef.wp_idx != 0 AND ef.project_no = @project_no
            GROUP BY ef.docu_no
        ) eff
        ON ef.file_no = eff.file_no
		GROUP BY ef.file_ext, eff.is_vp;
    `,
    getDclFilesExtReal: `
        SELECT 
            ef.file_ext,
            eff.is_vp
        FROM edms_files ef WITH(NOLOCK)
        JOIN (
            SELECT 
                MAX(ef.file_no) AS file_no,
                MAX(ed.is_vp) AS is_vp
            FROM edms_files ef WITH(NOLOCK)
            INNER JOIN edms_document ed WITH(NOLOCK)
            ON ed.docu_no = ef.docu_no
            WHERE ef.is_use = 1 AND ef.wp_idx != 0 AND ef.project_no = @project_no
            GROUP BY ef.docu_no
        ) eff
        ON ef.file_no = eff.file_no
		GROUP BY ef.file_ext, eff.is_vp;
    `,
    getOtherFiles: `
        SELECT
            eof.*,
            wp.wp_code,
            wp.subject
            FROM edms_other_files eof 
        INNER JOIN work_proc wp
            ON wp.wp_idx = eof.wp_idx
        ORDER BY eof.create_tm DESC;
    `,
    getOtherFilesReal: `
        SELECT
            eof.*,
            wp.wp_code,
            wp.subject
            FROM edms_other_files eof WITH(NOLOCK)
        INNER JOIN work_proc wp WITH(NOLOCK)
            ON wp.wp_idx = eof.wp_idx
        ORDER BY eof.create_tm DESC;
    `,
    getOtherFilesExt: `
        SELECT 
            DISTINCT file_ext 
        FROM edms_other_files
        WHERE LENGTH(file_ext) > 2 AND LENGTH(file_ext) < 6;
    `,
    getOtherFilesExtReal: `
        SELECT 
            DISTINCT file_ext 
        FROM edms_other_files WITH(NOLOCK)
        WHERE LEN(file_ext) > 2 AND LEN(file_ext) < 6;
    `,
    getPlantFiles: `
        SELECT 
            epf.id AS 'plant_id',
            epf.project_no,
            epf.transmittal,
            epf.equipment,
            epf.mdl,
            epf.customer_transmittal,
            epf.contract_due_date,
            epf.issue_date,
            epf.file_name,
            epf.title,
            epf.rev,
            epf.document_issue,
            epf.for_contractual_review,
            epf.for_contractual_approval,
            epf.status_issued,
            epf.documentum_folder_link,
            epf.customer_return_xml,
            epf.review_result,
            wp.wp_code,
            wp.subject,
            wp.wp_idx,
            eof.root_path,
            epf.file_no
        FROM edms_plant_files epf
        LEFT JOIN work_proc wp
            ON wp.wp_idx = epf.wp_idx
        LEFT JOIN edms_other_files eof
        ON eof.file_no = epf.file_no
        ORDER BY epf.transmittal DESC;
    `,
    getPlantFilesReal: `
        SELECT 
            epf.id AS 'plant_id',
            epf.project_no,
            epf.transmittal,
            epf.equipment,
            epf.mdl,
            epf.customer_transmittal,
            epf.contract_due_date,
            epf.issue_date,
            epf.file_name,
            epf.title,
            epf.rev,
            epf.document_issue,
            epf.for_contractual_review,
            epf.for_contractual_approval,
            epf.status_issued,
            epf.documentum_folder_link,
            epf.customer_return_xml,
            epf.review_result,
            wp.wp_code,
            wp.subject,
            wp.wp_idx,
            eof.root_path,
            epf.file_no
        FROM edms_plant_files epf WITH(NOLOCK)
        LEFT JOIN work_proc wp WITH(NOLOCK)
            ON wp.wp_idx = epf.wp_idx
        LEFT JOIN edms_other_files eof WITH(NOLOCK)
            ON eof.file_no = epf.file_no
        ORDER BY epf.transmittal DESC;
    `,
};
