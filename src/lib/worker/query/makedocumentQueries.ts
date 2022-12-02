export default {
    getSubFieldQuery: `
        SELECT
            o.group_id,
            u.username,
            o.company
        FROM users u 
        INNER JOIN organization o
            ON o.id = u.group_id
        WHERE u.sub_field = 1;
    `,
    getSubFieldQueryReal: `
        SELECT
            o.group_id,
            u.username,
            o.company
        FROM users u WITH(NOLOCK)
        INNER JOIN organization o WITH(NOLOCK)
            ON o.id = u.group_id
        WHERE u.sub_field = 1;
    `,

    getOutRefererQuery: `
        SELECT 
            u.username,
            o.company as 'company',
            p.name as 'position'
        FROM signreferer rf
        INNER JOIN users u
            ON u.id = rf.user_id
        INNER JOIN organization o
            ON o.id = u.group_id
        INNER JOIN position_type p
            ON u.position = p.id
        WHERE rf.sign_id = @id AND rf.is_out_refer = 1;
    `,

    getOutRefererQueryReal: `
        SELECT 
            u.username,
            o.company as 'company',
            p.name as 'position'
        FROM signreferer rf WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = rf.user_id
        INNER JOIN organization o WITH(NOLOCK)
            ON o.id = u.group_id
        INNER JOIN position_type p WITH(NOLOCK)
            ON u.position = p.id
        WHERE rf.sign_id = @id AND rf.is_out_refer = 1;
    `,

    getSignLineQuery: `
        SELECT 
            sl.id,
            sl.state,
            u.username,
            sl.approval_at,
            sl.created_at,
            u.id AS 'user_id',
            p.name as 'position'
        FROM signline sl
        INNER JOIN users u
            ON u.id = sl.user_id
        INNER JOIN position_type p
            ON p.id = u.position
        WHERE sl.sign_id = @id
        ORDER BY sl.order ASC;
    `,

    getSignLineQueryReal: `
        SELECT 
            sl.id,
            sl.state,
            u.username,
            sl.approval_at,
            sl.created_at,
            u.id AS 'user_id',
            p.name as 'position'
        FROM signline sl WITH(NOLOCK)
        INNER JOIN users u WITH(NOLOCK)
            ON u.id = sl.user_id
        INNER JOIN position_type p WITH(NOLOCK)
            ON p.id = u.position
        WHERE sl.sign_id = @id 
        ORDER BY sl."order" ASC;
    `,

    getSignIdListQuery: `
        SELECT
            id
        FROM signdata
        WHERE (id > @last_id) AND (sign_state = "3" OR sign_state = "6") AND original_sign_id = -1
        limit 0, 10;
    `,

    getSignIdListQueryReal: `
        SELECT
        TOP 10 id 
        FROM signdata
        WHERE (id > @last_id) AND (sign_state = 3 OR sign_state = 6) AND original_sign_id = -1 ;
    `,
};