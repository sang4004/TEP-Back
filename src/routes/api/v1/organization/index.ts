/******************************************************************************
 * entity : 
    * Organization
        * 사원 관리
 * api : 
    * delete_organization
      - 타입 : DELETE
      - 파라미터 : 
      - 기능 : 
      - paylaod : {}
    * add_organization
      - 타입 : POST
      - 파라미터 : 
      - 기능 : 
      - paylaod : {}
    * update_organization
      - 타입 : PUT
      - 파라미터 : 
      - 기능 : 
      - paylaod : {}
    * get
        - 타입 : GET
        - 파라미터 : 
        - 기능 : 사원 리스트 불러오기
        - paylaod : {
            organization : string[]
        }
******************************************************************************/
import express, { Request, Response } from "express";
import { getConnection, getRepository, Not, Repository } from "typeorm";
import {
    EdmsCompany,
    EdmsGroup,
    EdmsPosition,
    EdmsUser,
    Organization,
    OrganizationType,
    Signform,
    User,
} from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";

const router = express.Router();

// inject point3

router.post("/create_organization", async (req: Request, res: Response) => {
    try {
        let newEmp = new Organization();
        newEmp.name = req.body.name;
        // newEmp.email = req.body.email;
        // newEmp.organization_role = req.body.role;
        let insertEmp = await getRepository(Organization).save(newEmp);

        return getSuccessResponse(res, {
            insert_organization: {
                ...newEmp,
                // organization_role : Organization.getRole(newEmp.organization_role)
            },
        });
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.put("/update_organization", async (req: Request, res: Response) => {
    try {
        if (req.body.data) {
            let data = JSON.parse(req.body.data);
            for (var d of data) {
                await getRepository(Organization).update(d.id, d);
            }
            return getSuccessResponse(res, {});
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_list", async (req: Request, res: Response) => {
    try {
        let emps = await getRepository(Organization).find({
            order: {
                company: "ASC",
            },
        });
        if (emps.length != 0) {
            return getSuccessResponse(res, emps);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_addressbook", async (req: Request, res: Response) => {
    try {
        let _list = await getConnection().query(`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.phone_number,
                    u.fax_number,
                    u.sub_field,
                    u.is_delete,
                    o_type.id as 'oid',
                    o_type.company,
                    o.company_tel,
                    o.name as 'part',
                    p.id as 'pid',
                    p.name as 'position'
                FROM users u
                INNER JOIN organization o
                    on o.id = u.group_id
                INNER JOIN position_type p
                    on u.position = p.id
                    and u.admin_level != '1'
                INNER JOIN organization_type o_type
                    ON o_type.id = o.group_id
                ORDER BY o_type.id ASC, o.group_order DESC, p.priority ASC, u.username ASC;
            `);
        let list = [];
        for (var i = 0; i < _list.length; i++) {
            if (_list[i].part.indexOf("관리자") != -1) continue;
            list.push(_list[i]);
        }
        let company = await getRepository(OrganizationType).find();
        let group = await getRepository(Organization).find({ order: { group_order: "DESC" } });
        return getSuccessResponse(res, { addressbook: list, group, company });
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

// edms_address
router.get("/get_edms_address", async (req: Request, res: Response) => {
    try {
        const { type } = req.query;

        let edms_address: any;
        edms_address = await getConnection().query(`
            SELECT 
                eu.user_id AS id, 
                eu.doc_user_id AS uid, 
                eu.username, 
                ec.id AS cid, 
                ec.company_name AS company, 
                eg.id AS gid, 
                eg.group_name AS part, 
                ep.id AS pid, 
                ep.position_name AS position,
                eu.email AS email
            FROM edms_user eu
            INNER JOIN edms_company ec
                ON ec.id = eu.company_id
            INNER JOIN edms_group eg
                ON eg.id = eu.group_id
            INNER JOIN edms_position ep
                ON ep.id = eu.position_id
            WHERE ${
                type === "MAIL"
                    ? `(eu.level = 4 AND eu.is_use = 0) AND eg.is_mail_group = 1`
                    : `eu.level != 4 AND eu.is_use = 1`
            }
            ORDER BY cid, gid, pid DESC;
        `);
        return getSuccessResponse(res, edms_address);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.get("/get_edms_mail_address", async (req: Request, res: Response) => {
    await getConnection().transaction(async tr => {
        try {
            let edms_mail_address = await tr.query(`
            SELECT 
                emg.user_id AS id, 
                eu.doc_user_id AS uid, 
                eu.username, 
                ec.id AS cid, 
                ec.company_name AS company, 
                emg.group_id AS gid,
                eg.group_name AS part,
                ep.id AS pid, 
                ep.position_name AS position,
                eu.email 
            FROM edms_mail_group emg
            INNER JOIN edms_user eu
                ON eu.user_id = emg.user_id
            INNER JOIN edms_company ec
                ON ec.id = eu.company_id
            INNER JOIN edms_group eg
                ON eg.id = emg.group_id
            INNER JOIN edms_position ep
                ON ep.id = eu.position_id
            WHERE emg.is_delete = 0
            ORDER BY cid, gid, pid DESC;
        `);

            return getSuccessResponse(res, edms_mail_address);
        } catch (err) {
            logger.error(req.path + " || " + err);
        }
        return getFailedResponse(res);
    });
});

router.get("/get_edms_group", async (req: Request, res: Response) => {
    try {
        const { company_id, is_mail_group } = req.query;

        let edmsGroup = await getRepository(EdmsGroup).find(
            is_mail_group
                ? { where: { is_mail_group: 1, is_delete: 0, company_id: company_id } }
                : { where: { company_id: company_id, is_delete: 0 } }
        );
        return getSuccessResponse(res, edmsGroup);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/edit_organization", async (req: Request, res: Response) => {
    try {
        if (req.body.id) {
            let edit_organization = await getRepository(Organization).findOne({ id: req.body.id });

            if (req.body.name) edit_organization.name = req.body.name;
            if (req.body.company) edit_organization.company = req.body.company;

            await getRepository(Organization).update(edit_organization.id, edit_organization);
            return getSuccessResponse(res, edit_organization);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.post("/edit_group", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let _list: any[] = req.body.list;
            let new_group: any[] = req.body.new_list;
            let _org = await getRepository(Organization).find({
                group_id: req.body.compId,
                is_delete: false,
            });
            let _otype = await getRepository(OrganizationType).findOne({ id: req.body.compId });

            for (var l of _org) {
                let updateRow;
                let filtered = _list.filter((obj: any) => obj.id == l.id);
                let isHead = 0;
                if (filtered.length > 0) {
                    isHead = filtered[0].is_head;
                    updateRow = await getConnection()
                        .createQueryBuilder()
                        .update(Organization)
                        .set({
                            group_order: _list.indexOf(filtered[0]),
                            is_head: isHead,
                            name: filtered[0].name,
                        })
                        .where("id = :id", { id: l.id })
                        .execute();
                } else
                    updateRow = await getConnection()
                        .createQueryBuilder()
                        .update(Organization)
                        .set({ is_delete: true, is_head: isHead })
                        .where("id = :id", { id: l.id })
                        .execute();
            }
            for (var g of new_group) {
                let org = new Organization();
                org.name = g.name;
                org.group_id = _otype.id;
                org.group_order = _list.indexOf(_list.filter((obj: any) => obj.id == g.id)[0]);
                org.main_user = _org[0].main_user;
                org.company = _org[0].company;
                org.company_tel = _org[0].company_tel;
                org.doc_key = _org[0].doc_key;
                org.is_head = g.is_head;
                await getRepository(Organization).save(org);
                if (_otype.id == 4) {
                    if (g.is_head == 1) {
                        let _form = await getRepository(Signform).find({ group_id: 4 });
                        let form = _form[_form.length - 1];
                        let new_form = new Signform();
                        new_form = form;
                        new_form.title = g.name;
                        new_form.org_id = org.id;
                        await getRepository(Signform).save(new_form);
                    }
                }
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/get_edms_list", async (req: Request, res: Response) => {
    try {
        let all_edms_group = await getRepository(EdmsGroup).find();
        let all_edms_company = await getRepository(EdmsCompany).find();
        let all_edms_position = await getRepository(EdmsPosition).find();

        let edms_list: any[] = [];
        all_edms_company.map(raw => {
            let filtered_group = all_edms_group.filter(fRaw => fRaw.company_id == raw.id).map(group=> {
                if(group.is_mail_group){
                    group.group_name += "(Mail User)";
                }
                return group;
            });
            let filtered_position = all_edms_position.filter(fRaw => fRaw.company_id == raw.id);

            edms_list.push({
                company: raw,
                group: filtered_group,
                position: filtered_position,
            });
        });

        return getSuccessResponse(res, edms_list);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

export default router;
