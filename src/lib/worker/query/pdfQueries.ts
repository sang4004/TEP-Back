export default {
    waitFileQuery: `
        SELECT ef.* FROM edms_files ef 
        LEFT OUTER JOIN pdf_data p
        ON ef.file_no = p.file_no
        WHERE p.file_no IS NULL
        LIMIT 10;
    `,
    waitFileQueryReal: `
        SELECT TOP 10 ef.* FROM edms_files ef 
        LEFT OUTER JOIN pdf_data p
        ON ef.file_no = p.file_no
        WHERE p.file_no IS NULL;
    `,
    waitOtherFileQuery: `
        SELECT ef.* 
        FROM edms_other_files ef
        LEFT OUTER JOIN other_pdf_data p
            ON ef.file_no = p.file_no
        WHERE p.file_no IS NULL
        LIMIT 10;
    `,
    waitOtherFileQueryReal: `
        SELECT TOP 10 ef.* 
        FROM edms_other_files ef
        LEFT OUTER JOIN other_pdf_data p
            ON ef.file_no = p.file_no
        WHERE p.file_no IS NULL
        LIMIT 10;
    `,

    convertedFileQuery: `
        SELECT * FROM pdf_data 
        WHERE sid = '' AND oid != ''
            AND create_tm < DATE_ADD(NOW(), INTERVAL 1 day)
        LIMIT 10;
    `,

    convertedFileQueryReal: `
        SELECT TOP 10 * FROM pdf_data 
        WHERE sid = '' AND oid != ''
            AND create_tm < DATEADD(day, -1, getdate())
    `,

    convertedOtherFileQuery: `
        SELECT * FROM other_pdf_data 
        WHERE sid = '' AND oid != ''
            AND create_tm < DATE_ADD(NOW(), INTERVAL 1 day)
        LIMIT 10;
    `,

    convertedOtherFileQueryReal: `
        SELECT TOP 10 * FROM other_pdf_data 
        WHERE sid = '' AND oid != ''
            AND create_tm < DATEADD(day, -1, getdate())
    `,
};
