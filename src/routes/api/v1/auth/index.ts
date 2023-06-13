/******************************************************************************
 * api : 
    * handshake
        - 타입 : POST
        - 파라미터 : 
        - 기능 : 유저가 페이지 접근시마다 해당 api를 통해 access_token을 검증
        - paylaod : {
            id : user id,
            username : user name
        }
    * login
        - 타입 : POST
        - 파라미터 : req.body.username, req.body.pw
        - 기능 : 유저가 로그인 시 username 과 pw를 통해 유저 검증
        - payload : {
            id : user id,
            username : user name
        }
    * logout
        - 타입 : POST
        - 파라미터 : 
        - 기능 : 유저가 로그아웃 시 access_token, refresh_token을 쿠키에서 삭제
        - payload : true
    * signup
        - 타입 : POST
        - 파라미터 : req.body.name, req.body.pw
        - 기능 : 유저가 회원가입 시 name 과 pw로 유저 생성
        - payload : {
            id : user id,
            username : user name
        }
 * entity : 
    
******************************************************************************/

import express, { request, Request, Response } from "express";
import { getConnection, getRepository, Tree } from "typeorm";
import {
    Organization,
    OrganizationType,
    PositionType,
    User,
    EdmsUser,
    EdmsGroup,
    EdmsCompany,
    EdmsPosition,
} from "@/entity";
import { setTokenCookie } from "@/lib/token";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";
import { fileDir } from "../../../../constant";
import { logger } from "@/lib/winston";

const router = express.Router();

router.get("/logout", async (req: Request, res: Response) => {
    return getSuccessResponse(res);
});

interface USER_RESULT {
    accessToken?: string;
    refreshToken?: string;
    edmsAccessToken?: string;
    edmsRefreshToken?: string;
    id: number;
    userid: string;
    username: string;
    profile_img: string;
    email: string;
    phone_number: string;
    admin_level: number;
    approved: any;
    group_id: number;
    groupname: string;
    company: number;
    doc_mng: any;
    edms_user_id: number;
    edms_level: number;
    edms_comapny_id: number;
    is_menu1: any;
    is_menu2: any;
}
router.post("/handshake", async (req: Request, res: Response) => {
    let result: USER_RESULT = {
        id: null,
        userid: null,
        username: null,
        profile_img: null,
        email: null,
        phone_number: null,
        admin_level: null,
        approved: null,
        group_id: null,
        company: null,
        groupname: null,
        edms_user_id: null,
        edms_level: null,
        is_menu1: null,
        is_menu2: null,
        doc_mng: null,
        edms_comapny_id: null,
    };
    try {
        await getConnection().transaction(async tr => {
            if (req.app.get("user_id") != null) {
                //id가 null 이 아닌경우
                let user = await tr.getRepository(User).findOne({ id: req.app.get("user_id") });
                let edms_user = await tr.getRepository(EdmsUser).findOne({
                    user_id: req.app.get("edms_user_id"),
                });
                let org = await tr.getRepository(Organization).findOne({ id: user.group_id });
                result = {
                    id: user.id, //id
                    userid: user.userid,
                    username: user.username,
                    profile_img: user.profile_img,
                    email: user.email,
                    phone_number: user.phone_number,
                    admin_level: user.admin_level,
                    approved: user.approved,
                    group_id: user.group_id,
                    company: org.group_id,
                    groupname: org.company + " " + org.name,
                    edms_user_id: null,
                    edms_level: null,
                    is_menu1: null,
                    is_menu2: null,
                    doc_mng: user.doc_mng,
                    edms_comapny_id: null,
                };
                // EDMS user 일 경우
                if (edms_user && edms_user.is_use) {
                    let company = await tr.getRepository(EdmsCompany).findOne({
                        id: edms_user.company_id,
                    });
                    let group = await tr.getRepository(EdmsGroup).findOne({ id: edms_user.group_id });
                    result = {
                        ...result,
                        edms_user_id: edms_user.user_id,
                        edms_level: edms_user.level,
                        username: edms_user.username,
                        userid: edms_user.userid,
                        email: edms_user.email,
                        profile_img: edms_user.profile_img,
                        approved: true,
                        group_id: group ? group.id : 0,
                        company: company.id,
                        groupname: group ? company.company_name + " " + group.group_name : company.company_name + " ",
                        is_menu1: edms_user.is_menu1,
                        is_menu2: edms_user.is_menu2,
                        id: result.id ? result.id : -1,
                    };
                }
            }
        });
    } catch (err) {
        logger.error(req.path + " || " + err); //error일 경우 콘솔 log
    } finally {
        return getSuccessResponse(res, result);
    }
});

router.post("/login", async (req: Request, res: Response) => {
    const pw = req.body.pw;
    const userid = req.body.userid;
    try {
        if (
            req.body.hasOwnProperty("userid") && //userid, pw가 있는 경우
            req.body.hasOwnProperty("pw")
        ) {
            let _user = await getConnection().query(`
                SELECT 
                    *
                FROM users
                WHERE 
                    password = '${pw}'
                    AND
                    userid = '${userid}'
                    AND
                    is_delete = 0
            `);
            let _edms_user = await getConnection().query(`
                SELECT 
                    *
                FROM edms_user
                WHERE 
                    userid = '${userid}'
                    AND
                    is_use = 1
                    ;
            `);
            let user = undefined;
            let edms_user = undefined;

            if (_user.length > 0) user = await getRepository(User).findOne({ id: _user[0].id }); //해당 name과 pw가 일치하는 user find
            if (user == undefined) return getFailedResponse(res, "잘못된 유저 정보입니다.");
            if (_edms_user.length > 0) {
                edms_user = await getRepository(EdmsUser).findOne({
                    user_id: _edms_user[0].user_id,
                });
                if (edms_user.doc_user_id) {
                    user = await getRepository(User).findOne({ id: edms_user.doc_user_id });
                }
            }

            if (user && !user.approved) return getFailedResponse(res, "관리자에게 유저인증을 요청해주세요.");
            // if (edms_user && !edms_user.approved) return getFailedResponse(res, "관리자에게 유저인증을 요청해주세요.");
            if (user == undefined && edms_user == undefined) return getFailedResponse(res, "잘못된 유저 정보입니다.");

            let result: USER_RESULT = {
                accessToken: null,
                refreshToken: null,
                edmsAccessToken: null,
                edmsRefreshToken: null,
                id: null,
                userid: null,
                username: null,
                profile_img: null,
                email: null,
                phone_number: null,
                admin_level: null,
                approved: null,
                group_id: null,
                groupname: null,
                company: null,
                doc_mng: null,
                edms_user_id: null,
                edms_level: null,
                edms_comapny_id: null,
                is_menu1: null,
                is_menu2: null,
            };

            if (user) {
                let org = await getRepository(Organization).findOne({ id: user.group_id });
                const { accessToken, refreshToken } = await user.generateUserToken();
                result = {
                    ...result,
                    accessToken,
                    refreshToken,
                    id: user.id, //id
                    userid: user.userid,
                    username: user.username,
                    profile_img: user.profile_img,
                    email: user.email,
                    phone_number: user.phone_number,
                    admin_level: user.admin_level,
                    approved: user.approved,
                    group_id: user.group_id,
                    groupname: org.company + " " + org.name,
                    company: org.group_id,
                    doc_mng: user.doc_mng,
                };
            }
            // EDMS user 일 경우
            if (edms_user && edms_user.is_use) {
                const { edmsAccessToken, edmsRefreshToken } = await edms_user.generateUserToken();
                // let company = await getRepository(EdmsCompany).findOne({
                //     id: edms_user.company_id,
                // });
                // let group = await getRepository(EdmsGroup).findOne({ id: edms_user.group_id });
                result = {
                    ...result,
                    edmsAccessToken,
                    edmsRefreshToken,
                    edms_user_id: edms_user.user_id,
                    edms_level: edms_user.level,
                    edms_comapny_id: edms_user.company_id,
                    // username: edms_user.username,
                    userid: edms_user.userid,
                    // email: edms_user.email,
                    // profile_img: edms_user.profile_img,
                    approved: true,
                    // group_id: group ? group.id : 0,
                    // company: company.id,
                    // groupname: group ? company.company_name + " " + group.group_name : company.company_name + " ",
                    is_menu1: edms_user.is_menu1,
                    is_menu2: edms_user.is_menu2,
                    // id: result.id ? result.id : -1,
                };
            }
            if (user && user.admin_level == 1) {
                Object.assign(result, { groupname: "" });
            }

            return getSuccessResponse(res, result);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res, "잘못된 유저 정보입니다.");
});

router.post("/logout", (req: Request, res: Response) => {
    return getSuccessResponse(res, true);
});

router.post("/signup", async (req: Request, res: Response) => {
    try {
        const { userid, name, pw, email, phone_number, group_id, position, company_id, type } = req.body;
        let _new_User: any;

        if (type === "document") {
            let newUser = new User(); //create user object
            newUser.userid = userid;
            newUser.username = name; //set name
            newUser.password = pw; //set pw
            newUser.email = email;
            newUser.phone_number = phone_number;
            newUser.group_id = group_id;
            newUser.position = position;

            _new_User = await getRepository(User).save(newUser); //save created user object in db
        } else {
            let newEdmsUser = new EdmsUser();
            newEdmsUser.userid = userid;
            newEdmsUser.username = name;
            newEdmsUser.password = pw;
            newEdmsUser.email = email;
            newEdmsUser.phone_number = phone_number;
            newEdmsUser.group_id = group_id;
            newEdmsUser.position_id = position;
            newEdmsUser.company_id = company_id;

            _new_User = await getRepository(EdmsUser).save(newEdmsUser); //save created user object in db
        }

        return getSuccessResponse(res, {
            id: _new_User.id,
            username: name,
            userid: userid,
        });
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, "회원가입 실패.");
});

router.get("/get_position", async (req: Request, res: Response) => {
    try {
        let position_list = await getRepository(PositionType).find({
            order: { priority: "ASC" },
            where: { is_delete: false },
        });
        return getSuccessResponse(res, position_list);
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, "직급 가져오기 실패.");
});

router.post("/edit_position", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != null) {
            let _list: any[] = req.body.list;
            let new_position: any[] = req.body.new_list;
            let _pos = await getRepository(PositionType).find({
                order: { priority: "ASC" },
                where: { is_delete: false },
            });

            for (var l of _pos) {
                let updateRow;
                let filtered = _list.filter((obj: any) => obj.id == l.id);
                if (filtered.length > 0)
                    updateRow = await getConnection()
                        .createQueryBuilder()
                        .update(PositionType)
                        .set({ priority: _list.indexOf(filtered[0]), name: filtered[0].name })
                        .where("id = :id", { id: l.id })
                        .execute();
                else
                    updateRow = await getConnection()
                        .createQueryBuilder()
                        .update(PositionType)
                        .set({ is_delete: true })
                        .where("id = :id", { id: l.id })
                        .execute();
            }
            for (var g of new_position) {
                let new_pos = new PositionType();
                new_pos.name = g.name;
                new_pos.priority = _list.indexOf(_list.filter((obj: any) => obj.id == g.id)[0]);
                await getRepository(PositionType).save(new_pos);
            }
            return getSuccessResponse(res);
        }
    } catch (err) {
        logger.error(req.path + " || " + err);
    }

    return getFailedResponse(res);
});

router.get("/duplicate", async (req: Request, res: Response) => {
    try {
        // signupType = edms or document
        const signupType = req.query.signupType.toString();
        if (typeof req.query.username == "string") {
            const username = req.query.username;
            let user = null;
            if (signupType == "edms") {
                user = await getRepository(EdmsUser).findOne({ userid: username });
            } else {
                user = await getRepository(User).findOne({ userid: username });
            }
            if (user == null) {
                return getSuccessResponse(res, true);
            } else {
                return getSuccessResponse(res, false);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, "중복된 아이디.");
});

router.post("/approve_edms_user", async (req: Request, res: Response) => {
    try {
        const { userId, type } = req.body;

        if (type === "EDMS")
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ approved: 1 })
                .where("user_id = :user_id", { user_id: userId })
                .execute();
        else
            await getConnection()
                .createQueryBuilder()
                .update(EdmsUser)
                .set({ is_use: 0, approved: 1, level: 4 })
                .where("user_id = :user_id", { user_id: userId })
                .execute();

        return getSuccessResponse(res, true);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
    return getFailedResponse(res);
});

router.post("/edms_update", async (req: Request, res: Response) => {
    try {
        const { userid, username, email, pos_id, profile_img, password, id, phone_number } = req.body;
        if (id != null && id != undefined) {
            let now_user = await getRepository(EdmsUser).findOne({
                user_id: req.app.get("edms_user_id"),
            });

            if (now_user && (now_user.level == 2 || now_user.level == 1 || now_user.user_id == parseInt(id))) {
                let update_user = await getRepository(EdmsUser).findOne({ userid: userid });

                let result_obj = {};
                if (userid) Object.assign(result_obj, { userid: `${userid}` });
                if (username) Object.assign(result_obj, { username: `${username}` });
                if (email || (email != undefined && typeof email == "string"))
                    Object.assign(result_obj, { email: `${email}` });
                if (pos_id) Object.assign(result_obj, { position_id: pos_id });
                if (profile_img) Object.assign(result_obj, { profile_img: profile_img });
                if (password) Object.assign(result_obj, { password: password });
                if (phone_number || (phone_number != undefined && typeof phone_number == "string"))
                    Object.assign(result_obj, { phone_number: `${phone_number}` });

                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(EdmsUser)
                    .set(result_obj)
                    .where("user_id = :id", { id: update_user.user_id })
                    .execute();

                return getSuccessResponse(res, update_user);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, "회원 정보 업데이트 실패.");
});

router.post("/update", async (req: Request, res: Response) => {
    try {
        const {
            id,
            doc_mng,
            userid,
            username,
            email,
            phone_number,
            group_id,
            pos_id,
            profile_img,
            signature_img,
            password,
            fax_number,
            user_sign_img,
            sub_field,
            edms_use,
            admin_level,
        } = req.body;
        if (id != null && id != undefined) {
            let now_user = await getRepository(User).findOne({
                id: id ? id : req.app.get("user_id"),
            });
            let now_group = await getRepository(Organization).findOne({ id: now_user.group_id });

            if (now_user && (now_user.admin_level == 2 || now_user.admin_level == 1 || now_user.id == parseInt(id))) {
                let update_user = await getRepository(User).findOne({ id: id });
                let result_obj = {};
                if (doc_mng != undefined) Object.assign(result_obj, { doc_mng: doc_mng });
                if (userid) Object.assign(result_obj, { userid: `${userid}` });
                if (username) Object.assign(result_obj, { username: `${username}` });
                if (email || (email != undefined && typeof email == "string"))
                    Object.assign(result_obj, { email: `${email}` });
                if (phone_number || (email != undefined && typeof email == "string"))
                    Object.assign(result_obj, { phone_number: phone_number });
                if (group_id) Object.assign(result_obj, { group_id: group_id });
                if (pos_id) Object.assign(result_obj, { position: pos_id });
                if (profile_img) Object.assign(result_obj, { profile_img: profile_img });
                if (signature_img) Object.assign(result_obj, { signature_img: signature_img });
                if (password) Object.assign(result_obj, { password: password });
                if (fax_number) Object.assign(result_obj, { fax_number: fax_number });
                if (user_sign_img) Object.assign(result_obj, { sign_img: user_sign_img });
                if (admin_level) Object.assign(result_obj, { admin_level: admin_level });
                // EDMS 사용 여부 체크
                let admin = await getRepository(User).findOne({
                    where: { id: req.app.get("user_id"), admin_level: 1 },
                });
                if (edms_use != undefined && admin != undefined) {
                    if (edms_use == false) {
                        await getConnection()
                            .createQueryBuilder()
                            .update(EdmsUser)
                            .set({ is_use: 0 })
                            .where("doc_user_id = :id", { id: update_user.id })
                            .execute();
                    } else {
                        let edmsUser = await getRepository(EdmsUser).findOne({ doc_user_id: update_user.id });
                        if (edmsUser) {
                            await getConnection()
                                .createQueryBuilder()
                                .update(EdmsUser)
                                .set({ is_use: 1 })
                                .where("doc_user_id = :id", { id: update_user.id })
                                .execute();
                        } else {
                            let newEdmsUser = new EdmsUser();
                            newEdmsUser.doc_user_id = update_user.id;
                            newEdmsUser.approved = 1;
                            newEdmsUser.is_menu1 = 1;
                            newEdmsUser.is_menu2 = 1;
                            newEdmsUser.is_use = 1;
                            newEdmsUser.level = 2;
                            newEdmsUser.userid = update_user.userid;
                            newEdmsUser.username = update_user.username;
                            newEdmsUser.email = update_user.email;
                            await getRepository(EdmsUser).save(newEdmsUser);
                        }
                    }
                }

                Object.assign(result_obj, { updated_at: new Date() });
                Object.assign(result_obj, { edit_user: req.app.get("user_id") });

                if (sub_field != undefined) {
                    let groups = await getRepository(Organization).find({
                        group_id: now_group.group_id,
                    });
                    if (sub_field) {
                        for (var g of groups) {
                            await getConnection()
                                .createQueryBuilder()
                                .update(User)
                                .set({
                                    sub_field: 0,
                                })
                                .where("group_id = :id", { id: g.id })
                                .execute();
                        }
                    }
                    Object.assign(result_obj, { sub_field: parseInt(sub_field) });
                }

                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(User)
                    .set(result_obj)
                    .where("id = :id", { id: update_user.id })
                    .execute();

                return getSuccessResponse(res, update_user);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res, "회원 정보 업데이트 실패.");
});

router.post("/approve", async (req: Request, res: Response) => {
    try {
        if (req.body.id) {
            let administrator = await getRepository(User).findOne({ id: req.app.get("user_id") });
            if (administrator && (administrator.admin_level == 2 || administrator.admin_level == 1)) {
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(User)
                    .set({
                        approved: true,
                    })
                    .where("id = :id", { id: parseInt(req.body.id) })
                    .execute();
                return getSuccessResponse(res, true);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/remove", async (req: Request, res: Response) => {
    try {
        if (req.body.id) {
            let administrator = await getRepository(User).findOne({ id: req.app.get("user_id") });
            if (administrator && administrator.admin_level == 1) {
                let user = await getRepository(User).findOne({ id: parseInt(req.body.id) });
                let is_delete = true;
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(User)
                    .set({
                        is_delete: is_delete,
                    })
                    .where("id = :id", { id: user.id })
                    .execute();
                return getSuccessResponse(res, true);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/revert", async (req: Request, res: Response) => {
    try {
        if (req.body.id) {
            let administrator = await getRepository(User).findOne({ id: req.app.get("user_id") });
            if (administrator && administrator.admin_level == 1) {
                let user = await getRepository(User).findOne({ id: parseInt(req.body.id) });
                let is_delete = false;
                let updateRow = await getConnection()
                    .createQueryBuilder()
                    .update(User)
                    .set({
                        is_delete: is_delete,
                    })
                    .where("id = :id", { id: user.id })
                    .execute();
                return getSuccessResponse(res, true);
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.get("/user_info", async (req: Request, res: Response) => {
    try {
        if (req.query.user_id && typeof req.query.user_id == "string") {
            let user = await getRepository(User).findOne({ id: parseInt(req.query.user_id) });
            let org = await getRepository(Organization).findOne({ id: user.group_id });
            let org_type = await getRepository(OrganizationType).findOne({ id: org.group_id });
            let pos = await getRepository(PositionType).findOne({ id: user.position });
            let edmsUser = await getRepository(EdmsUser).findOne({ doc_user_id: user.id });
            return getSuccessResponse(res, {
                id: user.id, //id
                userid: user.userid,
                username: user.username,
                profile_img: user.profile_img,
                signature_img: user.signature_img,
                sign_img: user.sign_img,
                email: user.email,
                phone_number: user.phone_number,
                fax_number: user.fax_number,
                admin_level: user.admin_level,
                approved: user.approved,
                group_id: user.group_id,
                company: org.group_id,
                groupname: org.company + " " + org.name,
                password: user.password,
                position: pos ? pos.name : "",
                position_id: pos ? pos.id : "",
                doc_mng: user.doc_mng,
                sub_field: user.sub_field,
                is_delete: user.is_delete,
                use_sign: user.use_sign,
                edms_use: edmsUser && edmsUser.is_use,
            });
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.get("/edms_user_info", async (req: Request, res: Response) => {
    try {
        if (req.query.user_id && typeof req.query.user_id == "string") {
            let user = await getRepository(EdmsUser).findOne({ user_id: parseInt(req.query.user_id) });
            if (user) {
                let org = await getRepository(EdmsGroup).findOne({ id: user.group_id });
                let comp = await getRepository(EdmsCompany).findOne({ id: user.company_id });
                let pos = await getRepository(EdmsPosition).findOne({ id: user.position_id });
                return getSuccessResponse(res, {
                    id: user.user_id, //id
                    userid: user.userid,
                    username: user.username,
                    profile_img: user.profile_img,
                    email: user.email,
                    phone_number: user.phone_number,
                    group_id: user.group_id,
                    company: user.company_id,
                    groupname: comp.company_name + " " + org.group_name,
                    password: user.password,
                    position: pos ? pos.position_name : "",
                    position_id: pos ? pos.id : "",
                });
            }
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.delete("/remove_sign_img", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id") != -1) {
            const id = parseInt(req.query.id.toString());
            await getConnection()
                .createQueryBuilder()
                .update(User)
                .set({
                    sign_img: null,
                })
                .where("id = :id", { id })
                .execute();
            return getSuccessResponse(res, true);
        }
        return getFailedResponse(res);
    } catch (err) {
        logger.error(req.path + " || " + err);
    }
});

router.post("/upload_sign_img", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            return getSuccessResponse(res, fileDir + req.files[0].filename);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/upload_signature_img", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            return getSuccessResponse(res, fileDir + req.files[0].filename);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/upload_profile_img", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            return getSuccessResponse(res, fileDir + req.files[0].filename);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/password_check", async (req: Request, res: Response) => {
    try {
        const user_id = req.app.get("user_id");
        const { password } = req.body;
        if (user_id && password) {
            let user = await getRepository(User).findOne({
                password: req.body.password,
                id: user_id,
            });
            return getSuccessResponse(res, { check: user ? true : false });
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

// 관리자 유저 패스워드 초기화
router.post("/reset_password", async (req: Request, res: Response) => {
    try {
        if (req.app.get("user_id")) {
            let reset_password = await getConnection()
                .createQueryBuilder()
                .update(User)
                .set({
                    password: `1234`,
                })
                .where("id = :id", { id: req.body.user_id })
                .execute();
            return getSuccessResponse(res, true);
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

router.post("/password_check_edms", async (req: Request, res: Response) => {
    try {
        const edms_user_id = req.app.get("edms_user_id");
        const { password } = req.body;
        if (edms_user_id && password) {
            let user = await getRepository(EdmsUser).findOne({
                password: req.body.password,
                user_id: edms_user_id,
            });
            return getSuccessResponse(res, { check: user ? true : false });
        }
    } catch (e) {
        logger.error(e);
    }
    return getFailedResponse(res);
});

export default router;
