export default {
    getGeneralDoc: `
        SELECT 
            u.username as 'creator',
            gdc.text as 'code',
            gd.*
        FROM general_doc_data gd
        INNER JOIN users u
            ON u.id = gd.user_id
        INNER JOIN general_doc_code gdc
            ON gdc.id = gd.code_id
        WHERE gd.id > @last_id
        ORDER BY gd.id ASC
        LIMIT 0,10;
    `,
    getGeneralDocReal: `
        SELECT TOP 10
            u.username as 'creator',
            gdc.text as 'code',
            gd.*
        FROM general_doc_data gd WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = gd.user_id
        INNER JOIN general_doc_code gdc WITH(NOLOCK)
            ON gdc.id = gd.code_id
        WHERE gd.id > @last_id
        ORDER BY gd.id ASC;
    `,
    getGeneralDocSignline: `
        SELECT 
            gds.state,
            u.username,
            gds.approval_at,
            gds.created_at,
            p.name as 'position',
            gds.general_doc_id
        FROM general_doc_signline gds
        INNER JOIN users u
            ON u.id = gds.user_id
        INNER JOIN position_type p
            ON p.id = u.position
        WHERE gds.general_doc_id = @general_doc_id
        ORDER BY gds.order ASC;
    `,
    getGeneralDocSignlineReal: `
        SELECT 
            gds.state,
            u.username,
            gds.approval_at,
            gds.created_at,
            p.name as 'position',
            gds.general_doc_id
        FROM general_doc_signline gds WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = gds.user_id
        INNER JOIN position_type p WITH(NOLOCK)
            ON p.id = u.position
        WHERE gds.general_doc_id = @general_doc_id
        ORDER BY gds."order" ASC;
    `,
    getGeneralDocSender : `
        SELECT
            u.id,
            u.username,
            pt.name AS 'position'
        FROM general_doc_recv_list gdrl
        INNER JOIN users u
            ON u.id = gdrl.user_id
        INNER JOIN position_type pt
            ON pt.id = u.position
        WHERE gdrl.general_doc_id = @general_doc_id
        GROUP BY u.id, u.username, pt.name
    `,
    getGeneralDocSenderReal : `
        SELECT
            u.id,
            u.username,
            pt.name AS 'position'
        FROM general_doc_recv_list gdrl WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = gdrl.user_id
        INNER JOIN position_type pt WITH(NOLOCK)
            ON pt.id = u.position
        WHERE gdrl.general_doc_id = @general_doc_id
        GROUP BY u.id, u.username, pt.name
    `,
    getGeneralDocRefer : `
        SELECT
            u.id,
            u.username,
            pt.name AS 'position'
        FROM general_doc_referer gdrl WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = gdrl.user_id
        INNER JOIN position_type pt WITH(NOLOCK)
            ON pt.id = u.position
        WHERE gdrl.general_doc_id = @general_doc_id
        GROUP BY u.id, u.username, pt.name
    `,
    getGeneralDocReferReal : `
        SELECT
            u.id,
            u.username,
            pt.name AS 'position'
        FROM general_doc_referer gdrl
        INNER JOIN users u
            ON u.id = gdrl.user_id
        INNER JOIN position_type pt
            ON pt.id = u.position
        WHERE gdrl.general_doc_id = @general_doc_id
        GROUP BY u.id, u.username, pt.name
    `,
    getGeneralDocFiles: `
        SELECT *
        FROM general_doc_file
        WHERE general_doc_id = @general_doc_id
    `,
    getGeneralDocFilesReal: `
        SELECT *
        FROM general_doc_file WITH(NOLOCK)
        WHERE general_doc_id = @general_doc_id
    `,
};
