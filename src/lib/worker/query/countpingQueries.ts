export default {
    countPing: {
        tempQuery: `
            SELECT COUNT(sd.id) AS 'count', u.id FROM users u
            JOIN ( SELECT
                        sd.id, u.id AS 'userId'
                    FROM signdata sd
                    INNER JOIN users u
                        ON u.id > 0
                    INNER JOIN organization e
                        ON e.id = sd.group_id
                    WHERE ( sd.sign_state = '0' OR sd.sign_state = '5' OR sd.sign_state = '7'  )
                        AND sd.user_id = u.id AND ( sd.original_sign_id = -1 OR sd.is_regist = 1 ) ) sd
            ON sd.userId = u.id
            GROUP BY u.id;
        `,
        tempQueryReal: `
            SELECT COUNT(sd.id) AS 'count', u.id 
            FROM users u WITH(NOLOCK)
            JOIN ( SELECT
                        sd.id, u.id AS 'userId'
                    FROM signdata sd WITH(NOLOCK)
                    INNER JOIN users u WITH(NOLOCK)
                        ON u.id > 0
                    INNER JOIN organization e WITH(NOLOCK)
                        ON e.id = sd.group_id
                    WHERE ( sd.sign_state = 0 OR sd.sign_state = 5 OR sd.sign_state = 7  )
                        AND sd.user_id = u.id AND ( sd.original_sign_id = -1 OR sd.is_regist = 1 ) ) sd
            ON sd.userId = u.id
            GROUP BY u.id;
        `,
        signCountQuery: `
            SELECT 
                COUNT(
                CASE WHEN sd.sign_state = '2' OR sd.sign_state = '3' OR sd.sign_state = '6' THEN 1 END
                ) as 'complete',
                COUNT(
                CASE WHEN ( sd.sign_state = '3' OR sd.sign_state = '6' ) AND sl.state = 1 THEN 1 END
                ) AS 'sent',
                COUNT(
                CASE WHEN sd.sign_state = '4' THEN 1 END
                ) AS 'reject',
                COUNT(
                CASE WHEN sd.is_regist = 1 THEN 1 END
                ) AS 'regist',
                COUNT(
                CASE WHEN sd.sign_state = '1' THEN 1 END
                ) as 'signing',
                sl.user_id AS 'id'
            FROM 
                signdata sd
                INNER JOIN signline sl
                    on sl.user_id > 0
            WHERE 
                sd.id = sl.sign_id
            GROUP BY sl.user_id;
        `,
        signCountQueryReal: `
            SELECT 
                COUNT(
                CASE WHEN sd.sign_state = 2 OR sd.sign_state = 3 OR sd.sign_state = 6 THEN 1 END
                ) as 'complete',
                COUNT(
                CASE WHEN ( sd.sign_state = 3 OR sd.sign_state = 6 ) AND sl.state = 1 THEN 1 END
                ) AS 'sent',
                COUNT(
                CASE WHEN sd.sign_state = 4 THEN 1 END
                ) AS 'reject',
                COUNT(
                CASE WHEN sd.is_regist = 1 THEN 1 END
                ) AS 'regist',
                COUNT(
                CASE WHEN sd.sign_state = 1 THEN 1 END
                ) as 'signing',
                sl.user_id AS 'id'
            FROM 
                signdata sd WITH(NOLOCK)
                INNER JOIN signline sl WITH(NOLOCK)
                    ON sl.user_id > 0
            WHERE 
                sd.id = sl.sign_id
            GROUP BY sl.user_id;
        `,
        signingMineCountQuery: `
            SELECT 
                COUNT(sd.id) AS 'count',
                sl.user_id AS 'id'
            FROM signdata sd
            INNER JOIN signline sl
                ON sl.state = 2
                AND sl.sign_id = sd.id
            WHERE sd.sign_state = '1'
            GROUP BY sl.user_id;
        `,
        signingMineCountQueryReal: `
            SELECT 
                COUNT(sd.id) AS 'count',
                sl.user_id AS 'id'
            FROM signdata sd WITH(NOLOCK)
            INNER JOIN signline sl WITH(NOLOCK)
                ON sl.state = 2
                AND sl.sign_id = sd.id
            WHERE sd.sign_state = 1
            GROUP BY sl.user_id;
        `,
        rejectMineCountQuery: `
            SELECT
                COUNT(sd.id) as 'count',
                sd.user_id AS 'id'
            FROM signdata sd
            WHERE sd.sign_state = '4' 
                AND sd.is_re_request = 0
            GROUP BY sd.user_id
        `,
        rejectMineCountQueryReal: `
            SELECT
                COUNT(sd.id) as 'count',
                sd.user_id AS 'id'
            FROM signdata sd WITH(NOLOCK)
            WHERE sd.sign_state = 4 
                AND sd.is_re_request = 0
            GROUP BY sd.user_id
        `,
        signCompleteSendQuery: `
            SELECT
                COUNT(id) AS 'count',
                user_id AS 'id'
            FROM signdata
            WHERE sign_state = '2' 
                AND sended_at is null
            GROUP BY user_id;
        `,
        signCompleteSendQueryReal: `
            SELECT
                COUNT(id) AS 'count',
                user_id AS 'id'
            FROM signdata WITH(NOLOCK)
            WHERE sign_state = 2 
                AND sended_at is null
            GROUP BY user_id;
        `,
        recvQuery: `
            SELECT 
                u.id, 
                COUNT(sd.id) AS 'count', 
                MIN(sd.is_read) AS 'is_read'
            FROM users u
            INNER JOIN
            (
                SELECT DISTINCT sd.id, srl.user_id, srl.is_read FROM signdata sd
                INNER JOIN sign_recv_list srl
                ON srl.visible = 1
                WHERE 
                    sd.id = srl.sign_id AND 
                    NOT(sd.is_regist = 0 AND sd.sign_state < 3)
            ) sd
            ON sd.user_id = u.id
            GROUP BY u.id;
        `,
        recvQueryReal: `
            SELECT 
                u.id, 
                COUNT(sd.id) AS 'count', 
                MIN(sd.is_read) AS 'is_read'
            FROM users u WITH(NOLOCK)
            INNER JOIN
            (
                SELECT DISTINCT sd.id, srl.user_id, srl.is_read FROM signdata sd WITH(NOLOCK)
                INNER JOIN sign_recv_list srl WITH(NOLOCK)
                ON srl.visible = 1
                WHERE 
                    sd.id = srl.sign_id AND 
                    NOT(sd.is_regist = 0 AND sd.sign_state < 3)
            ) sd
            ON sd.user_id = u.id
            GROUP BY u.id;
        `,
        groupSendQuery: `
            SELECT u.id, sd.sent AS 'count' 
            FROM users u
            INNER JOIN organization o
                ON o.id = u.group_id
            INNER JOIN
                ( SELECT 
                    COUNT(
                        CASE WHEN sd.sign_state = '3' OR sd.sign_state = '6' THEN 1 END
                    ) AS 'sent',
                    sd_u.group_id,
                    MAX(sd_u.is_tep) AS 'is_tep'
                FROM 
                    signdata sd
                    JOIN (
                        SELECT  
                            u.id,
                            (case when o.group_id = 1 then o.group_id else u.group_id end) AS group_id,
                            (case when o.group_id = 1 then 1 else 0 end) AS is_tep
                        FROM users u
                        INNER JOIN organization o
                        ON o.id = u.group_id
                    ) sd_u 
                ON sd_u.id = sd.user_id
                WHERE
                    sd.original_sign_id = -1
                GROUP BY sd_u.group_id) sd
            ON sd.group_id > 0
            WHERE 
                (sd.is_tep = 1 AND o.group_id = 1) OR 
                (sd.is_tep = 0 AND u.group_id = sd.group_id);
        `,
        groupSendQueryReal: `
            SELECT u.id, sd.sent AS 'count'
            FROM users u WITH(NOLOCK)
            INNER JOIN organization o WITH(NOLOCK)
                ON o.id = u.group_id
            INNER JOIN
                ( SELECT 
                    COUNT(
                        CASE WHEN sd.sign_state = 3 OR sd.sign_state = 6 THEN 1 END
                    ) AS 'sent',
                    sd_u.group_id,
                    MAX(sd_u.is_tep) AS 'is_tep'
                FROM 
                    signdata sd WITH(NOLOCK)
                    JOIN (
                        SELECT  
                            u.id,
                            (case when o.group_id = 1 then o.group_id else u.group_id end) AS group_id,
                            (case when o.group_id = 1 then 1 else 0 end) AS is_tep
                        FROM users u WITH(NOLOCK)
                        INNER JOIN organization o WITH(NOLOCK)
                        ON o.id = u.group_id
                    ) sd_u 
                ON sd_u.id = sd.user_id
                WHERE
                    sd.original_sign_id = -1
                GROUP BY sd_u.group_id) sd
            ON sd.group_id > 0
            WHERE 
                (sd.is_tep = 1 AND o.group_id = 1) OR 
                (sd.is_tep = 0 AND u.group_id = sd.group_id);
        `,
        groupRecvQuery: `
            SELECT COUNT(DISTINCT sd.id) AS 'count', u.id 
            FROM users u
            INNER JOIN 
                (SELECT 
                    sd.id,
                    u.group_id as 'user_group_id',
                    o.group_id as 'org_group_id',
                    sf.is_out_refer
                FROM signdata sd
                INNER JOIN sign_recv_list srl
                    ON srl.visible = 1
                INNER JOIN users u
                    ON u.id = srl.user_id
                INNER JOIN organization o
                    ON u.group_id = o.id
                LEFT JOIN signreferer sf
                    ON sf.user_id = srl.user_id
                    OR sf.sign_id = srl.sign_id
                WHERE
                    sd.id = srl.sign_id
                    AND ( sd.original_sign_id = -1 OR sd.is_regist = 1 )
                    AND sd.is_regist = 1
                GROUP BY sd.id, o.group_id, u.group_id, sf.is_out_refer
            ) sd ON sd.id > 0
            INNER JOIN organization o
            ON o.id = u.group_id
            WHERE (o.group_id = 1 AND sd.org_group_id = 1)
            OR (o.group_id != 1 AND o.id = sd.user_group_id AND sd.is_out_refer = 0)
            GROUP BY u.id;
        `,
        groupRecvQueryReal: `
            SELECT COUNT(DISTINCT sd.id) AS 'count', u.id 
            FROM users u WITH(NOLOCK)
            INNER JOIN 
                (SELECT 
                    sd.id,
                    u.group_id as 'user_group_id',
                    o.group_id as 'org_group_id',
                    sf.is_out_refer
                FROM signdata sd WITH(NOLOCK)
                INNER JOIN sign_recv_list srl WITH(NOLOCK)
                    ON srl.visible = 1
                INNER JOIN users u WITH(NOLOCK)
                    ON u.id = srl.user_id
                INNER JOIN organization o WITH(NOLOCK)
                    ON u.group_id = o.id
                LEFT JOIN signreferer sf WITH(NOLOCK)
                    ON sf.user_id = srl.user_id
                    OR sf.sign_id = srl.sign_id
                WHERE
                    sd.id = srl.sign_id
                    AND ( sd.original_sign_id = -1 OR sd.is_regist = 1 )
                    AND sd.is_regist = 1
                GROUP BY sd.id, o.group_id, u.group_id, sf.is_out_refer
            ) sd ON sd.id > 0
            INNER JOIN organization o WITH(NOLOCK)
            ON o.id = u.group_id
            WHERE (o.group_id = 1 AND sd.org_group_id = 1)
            OR (o.group_id != 1 AND o.id = sd.user_group_id AND sd.is_out_refer = 0)
            GROUP BY u.id;
        `,
        generalTempQuery: `
            SELECT
                COUNT(sd.id) AS 'count',
                sd.user_id AS 'id'
            FROM general_doc_data sd
            WHERE ( sd.state = 0 OR sd.state = 5 OR sd.state = 7  )
            GROUP BY sd.user_id
        `,
        generalTempQueryReal: `
            SELECT
            COUNT(sd.id) AS 'count',
            sd.user_id AS 'id'
            FROM general_doc_data sd WITH(NOLOCK)
            WHERE ( sd.state = 0 OR sd.state = 5 OR sd.state = 7  )
            GROUP BY sd.user_id
        `,
        generalCountQuery: `
            SELECT 
                COUNT(
                case when sd.state = 2 then 1 end
                ) as 'complete',
                COUNT(
                case when sd.state = 4 then 1 end
                ) as 'reject',
                COUNT(
                case when sd.state = 1 then 1 end
                ) as 'signing',
                sl.user_id AS 'id'
            FROM
                general_doc_data sd
                inner join general_doc_signline sl
                    on sl.user_id > 0
            WHERE 
                sd.id = sl.general_doc_id
            GROUP BY sl.user_id;
        `,
        generalCountQueryReal: `
            SELECT 
                COUNT(
                case when sd.state = 2 then 1 end
                ) as 'complete',
                COUNT(
                case when sd.state = 4 then 1 end
                ) as 'reject',
                COUNT(
                case when sd.state = 1 then 1 end
                ) as 'signing',
                sl.user_id AS 'id'
            FROM
                general_doc_data sd WITH(NOLOCK)
                inner join general_doc_signline sl WITH(NOLOCK)
                    on sl.user_id > 0
            WHERE 
                sd.id = sl.general_doc_id
            GROUP BY sl.user_id;
        `,
        generalSigningMineQuery: `
            SELECT
                COUNT(sd.id) AS 'count',
                sl.user_id AS 'id'
            FROM general_doc_data sd
            INNER JOIN general_doc_signline sl
                ON sl.state = 2
                AND sl.general_doc_id = sd.id
            WHERE sd.state = 1
            GROUP BY sl.user_id
        `,
        generalSigningMineQueryReal: `
            SELECT
                COUNT(sd.id) AS 'count',
                sl.user_id AS 'id'
            FROM general_doc_data sd WITH(NOLOCK)
            INNER JOIN general_doc_signline sl WITH(NOLOCK)
                ON sl.state = 2
                AND sl.general_doc_id = sd.id
            WHERE sd.state = 1
            GROUP BY sl.user_id
        `,
        generalRejectMineQuery: `
            SELECT
                COUNT(sd.id) AS 'count',
                sd.user_id AS 'id'
            FROM general_doc_data sd
            WHERE
                sd.state = 4
                AND sd.is_re_request = 0
            GROUP BY sd.user_id
        `,
        generalRejectMineQueryReal: `
            SELECT
                COUNT(sd.id) AS 'count',
                sd.user_id AS 'id'
            FROM general_doc_data sd WITH(NOLOCK)
            WHERE
                sd.state = 4
                AND sd.is_re_request = 0
            GROUP BY sd.user_id
        `,
        generalCompleteSendQuery: `
            SELECT
                COUNT(id) AS 'count',
                user_id AS 'id'
            FROM general_doc_data
            WHERE state = 2 and sended_at is null
            GROUP BY user_id
        `,
        generalCompleteSendQueryReal: `
            SELECT
                COUNT(id) AS 'count',
                user_id AS 'id'
            FROM general_doc_data WITH(NOLOCK)
            WHERE state = 2 and sended_at is null
            GROUP BY user_id
        `,
        generalSendQuery: `
            SELECT
            COUNT(DISTINCT id) AS 'count',
            user_id AS 'id'
            FROM general_doc_data
            WHERE ( state = 3 OR state = 6)
            GROUP BY user_id;
        `,
        generalSendQueryReal: `
            SELECT
            COUNT(DISTINCT id) AS 'count',
            user_id AS 'id'
            FROM general_doc_data WITH(NOLOCK)
            WHERE ( state = 3 OR state = 6)
            GROUP BY user_id;
        `,
        generalRecvQuery: `
        SELECT
            COUNT(DISTINCT doc.id) AS 'count',
            u.id,
            MIN(is_read) AS 'is_read'
        FROM users u 
        INNER JOIN general_doc_recv_list gdoc 
            ON gdoc.user_id = u.id
            AND gdoc.visible = 1
        INNER JOIN general_doc_data doc 
            ON doc.id = gdoc.general_doc_id
        GROUP BY u.id;
        `,
        generalRecvQueryReal: `
        SELECT
            COUNT(DISTINCT doc.id) AS 'count',
            u.id,
            MIN(is_read) AS 'is_read'
        FROM users u WITH(NOLOCK)
        INNER JOIN general_doc_recv_list gdoc WITH(NOLOCK)
            ON gdoc.user_id = u.id
            AND gdoc.visible = 1
        INNER JOIN general_doc_data doc WITH(NOLOCK)
            ON doc.id = gdoc.general_doc_id
        GROUP BY u.id;
        `,
        generalGroupRecvQuery: `
            SELECT 
                COUNT(DISTINCT gdoc.id) AS 'count', 
                u.id,
                MAX(gdoc.is_read) as 'is_read'
            FROM users u
            INNER JOIN
            (
                SELECT 
                    doc.id,
                    o.group_id AS 'org_group_id',
                    u.group_id AS 'user_group_id',
                    MIN(grl.is_read) as 'is_read'
                FROM general_doc_data doc
                INNER JOIN general_doc_recv_list grl
                    ON grl.visible = 1
                INNER JOIN users u
                    ON u.id = grl.user_id
                INNER JOIN organization o
                    ON o.id = u.group_id
                INNER JOIN general_doc_code code
                    ON code.id = doc.code_id
                WHERE 
                    doc.id = grl.general_doc_id
                GROUP BY doc.id, o.group_id, u.group_id
            ) AS gdoc
            ON gdoc.id > 0
            INNER JOIN organization o
            ON o.id = u.group_id
            WHERE (o.group_id = 1 AND gdoc.org_group_id = 1)
            OR (o.group_id != 1 AND u.group_id = gdoc.user_group_id)
            GROUP BY u.id;
        `,
        generalGroupRecvQueryReal: `
            SELECT 
                COUNT(DISTINCT gdoc.id) AS 'count', 
                u.id,
                MAX(gdoc.is_read) as 'is_read'
            FROM users u WITH(NOLOCK)
            INNER JOIN
            (
                SELECT 
                    doc.id,
                    o.group_id AS 'org_group_id',
                    u.group_id AS 'user_group_id',
                    MIN(grl.is_read) as 'is_read'
                FROM general_doc_data doc WITH(NOLOCK)
                INNER JOIN general_doc_recv_list grl WITH(NOLOCK)
                    ON grl.visible = 1
                INNER JOIN users u WITH(NOLOCK)
                    ON u.id = grl.user_id
                INNER JOIN organization o WITH(NOLOCK)
                    ON o.id = u.group_id
                INNER JOIN general_doc_code code WITH(NOLOCK)
                    ON code.id = doc.code_id
                WHERE 
                    doc.id = grl.general_doc_id
                GROUP BY doc.id, o.group_id, u.group_id
            ) AS gdoc
            ON gdoc.id > 0
            INNER JOIN organization o WITH(NOLOCK)
            ON o.id = u.group_id
            WHERE (o.group_id = 1 AND gdoc.org_group_id = 1)
            OR (o.group_id != 1 AND u.group_id = gdoc.user_group_id)
            GROUP BY u.id;
        `,
        generalGroupSendQuery: `
            SELECT COUNT(DISTINCT gdoc.id) AS 'count', u.id
            FROM users u
            INNER JOIN
            (
                SELECT 
                    doc.id, u.group_id
                FROM general_doc_data doc
                INNER JOIN general_doc_code code
                    ON code.id = doc.code_id
                INNER JOIN users u
                    ON u.id = doc.user_id
                WHERE 
                    ( doc.state = 3 OR doc.state = 6 )
                GROUP BY doc.id, u.group_id
            ) gdoc
            ON gdoc.group_id = u.group_id
            GROUP BY u.id
        `,
        generalGroupSendQueryReal: `
            SELECT COUNT(DISTINCT gdoc.id) AS 'count', u.id
            FROM users u WITH(NOLOCK)
            INNER JOIN
            (
                SELECT 
                    doc.id, u.group_id
                FROM general_doc_data doc WITH(NOLOCK)
                INNER JOIN general_doc_code code WITH(NOLOCK)
                    ON code.id = doc.code_id
                INNER JOIN users u WITH(NOLOCK)
                    ON u.id = doc.user_id
                WHERE 
                    ( doc.state = 3 OR doc.state = 6 )
                GROUP BY doc.id, u.group_id
            ) gdoc
            ON gdoc.group_id = u.group_id
            GROUP BY u.id
        `,
        tepGeneralGroupSendQuery:`
            SELECT COUNT(DISTINCT gdoc.id) AS 'count', u.id
            FROM users u 
                INNER JOIN organization o 
                                ON o.id = u.group_id 
            INNER JOIN
            (
                SELECT 
                    doc.id, u.group_id, o.group_id as 'o_group'
                FROM general_doc_data doc 
                INNER JOIN general_doc_code code 
                    ON code.id = doc.code_id
                INNER JOIN users u 
                    ON u.id = doc.user_id
                INNER JOIN organization o 
                    ON o.id = doc.group_id
                WHERE 
                    ( doc.state = 3 OR doc.state = 6 )
                GROUP BY doc.id, u.group_id, o.group_id
            ) gdoc
            ON gdoc.o_group = o.group_id
            GROUP BY u.id
        `,
        tepGeneralGroupSendQueryReal:`
            SELECT COUNT(DISTINCT gdoc.id) AS 'count', u.id
            FROM users u WITH(NOLOCK)
                INNER JOIN organization o WITH(NOLOCK)
                    ON o.id = u.group_id 
            INNER JOIN
            (
                SELECT 
                    doc.id, u.group_id, o.group_id as 'o_group'
                FROM general_doc_data doc WITH(NOLOCK)
                INNER JOIN general_doc_code code WITH(NOLOCK)
                    ON code.id = doc.code_id
                INNER JOIN users u WITH(NOLOCK)
                    ON u.id = doc.user_id
                INNER JOIN organization o WITH(NOLOCK)
                    ON o.id = doc.group_id
                WHERE 
                    ( doc.state = 3 OR doc.state = 6 )
                GROUP BY doc.id, u.group_id, o.group_id
            ) gdoc
            ON gdoc.o_group = o.group_id
            GROUP BY u.id
        `,
        drnQuery: `
            SELECT 
                COUNT(DISTINCT wa.wp_idx) AS 'count',
                u.user_id
            FROM work_proc wp
            INNER JOIN edms_user u
                ON u.user_id > 0
            INNER JOIN edms_group eg
                ON eg.id = u.group_id
            INNER JOIN work_assign wa
                ON wa.assign_to_id > 0
            INNER JOIN work_tm_code wtc
                ON wtc.company_id = eg.company_id
            WHERE wp.wp_type = 'drn'
                AND wp.wp_idx = wa.wp_idx
                AND wp.project_no = wtc.project_no
            GROUP BY u.user_id
        `,
        drnQueryReal: `
            SELECT 
                COUNT(DISTINCT wa.wp_idx) AS 'count',
                u.user_id
            FROM work_proc wp WITH(NOLOCK)
            INNER JOIN edms_user u WITH(NOLOCK)
                ON u.user_id > 0
            INNER JOIN edms_group eg WITH(NOLOCK)
                ON eg.id = u.group_id
            INNER JOIN work_assign wa WITH(NOLOCK)
                ON wa.assign_to_id > 0
            INNER JOIN work_tm_code wtc WITH(NOLOCK)
                ON wtc.company_id = eg.company_id
            WHERE wp.wp_type = 'drn'
                AND wp.wp_idx = wa.wp_idx
                AND wp.project_no = wtc.project_no
            GROUP BY u.user_id
        `,
        trQuery: `
            SELECT 
                COUNT(DISTINCT wa.wp_idx) AS 'count',
                u.user_id
            FROM work_proc wp
            INNER JOIN work_assign wa
                ON wa.wp_idx = wp.wp_idx
            INNER JOIN edms_user u
                ON u.user_id > 0
            INNER JOIN edms_group eg
                ON eg.id = u.group_id
            INNER JOIN work_tm_code wtc
                ON wtc.company_id = eg.company_id
            LEFT JOIN ( SELECT 
                            DISTINCT wp.original_tm_id
                        FROM work_proc wp
                        INNER JOIN work_assign wa
                            ON wa.assign_to_id > 0
                        WHERE wp.wp_type = 'DRN'
                            AND wp.original_tm_id != 0
                            AND wp.wp_idx = wa.wp_idx
                    ) drn ON drn.original_tm_id = wp.wp_idx
            WHERE ((wp.wp_type = 'tm'
                AND (wa.assign_to_id > 0) 
                AND wp.wp_idx = wa.wp_idx) 
                OR (wp.wp_idx = drn.original_tm_id))
                AND wp.project_no = wtc.project_no
            GROUP BY u.user_id
        `,
        trQueryReal: `
            SELECT 
                COUNT(DISTINCT wa.wp_idx) AS 'count',
                u.user_id
            FROM work_proc wp WITH(NOLOCK)
            INNER JOIN work_assign wa WITH(NOLOCK)
                ON wa.wp_idx = wp.wp_idx
            INNER JOIN edms_user u WITH(NOLOCK)
                ON u.user_id > 0
            INNER JOIN edms_group eg WITH(NOLOCK)
                ON eg.id = u.group_id
            INNER JOIN work_tm_code wtc WITH(NOLOCK)
                ON wtc.company_id = eg.company_id
            LEFT JOIN ( SELECT 
                            DISTINCT wp.original_tm_id
                        FROM work_proc wp WITH(NOLOCK)
                        INNER JOIN work_assign wa WITH(NOLOCK)
                            ON wa.assign_to_id > 0
                        WHERE wp.wp_type = 'DRN'
                            AND wp.original_tm_id != 0
                            AND wp.wp_idx = wa.wp_idx
                    ) drn ON drn.original_tm_id = wp.wp_idx
            WHERE ((wp.wp_type = 'tm'
                AND (wa.assign_to_id > 0) 
                AND wp.wp_idx = wa.wp_idx) 
                OR (wp.wp_idx = drn.original_tm_id))
                AND wp.project_no = wtc.project_no
            GROUP BY u.user_id
        `,
    },
};
