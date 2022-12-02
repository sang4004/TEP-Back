import * as jwt from "jsonwebtoken";
import { getRepository } from "typeorm";
import { User, EdmsUser } from "../entity";
import { Request, Response, NextFunction } from "express";
import { logger } from "./winston";

const authKey = process.env.AUTH_KEY;
const domain = process.env.DOMAIN;

if (!authKey) {
    const error = new Error("InvalidSecretKeyError");
    error.message = "Secret key for JWT is missing.";
    if (process.env.npm_lifecycle_event !== "typeorm") throw error;
}

export const generateToken = (payload: any, options?: jwt.SignOptions): Promise<string> => {
    const jwtOptions: jwt.SignOptions = {
        issuer: "moonrmo.com",
        expiresIn: "7d",
        ...options,
    };

    if (!jwtOptions.expiresIn) {
        // removes expiresIn when expiresIn is given as undefined
        delete jwtOptions.expiresIn;
    }
    return new Promise((resolve, reject) => {
        if (!authKey) return;
        jwt.sign(payload, authKey, jwtOptions, (err, token) => {
            if (err) reject(err);
            resolve(token);
        });
    });
};

export function setTokenCookie(
    res: Response,
    tokens: {
        accessToken?: string;
        refreshToken?: string;
        edmsAccessToken?: string;
        edmsRefreshToken?: string;
    }
) {
    //token domain error
    res.cookie("access_token", tokens.accessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8,
        domain: domain,
    });

    res.cookie("refresh_token", tokens.refreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        domain: domain,
    });

    res.cookie("access_token", tokens.accessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8,
    });

    res.cookie("refresh_token", tokens.refreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    //edms token
    res.cookie("edms_access_token", tokens.edmsAccessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8,
        domain: domain,
    });

    res.cookie("edms_refresh_token", tokens.edmsRefreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        domain: domain,
    });

    res.cookie("edms_access_token", tokens.edmsAccessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8,
    });

    res.cookie("edms_refresh_token", tokens.edmsRefreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
    });
}

export function removeTokenCookie(res: Response) {
    //users
    res.clearCookie("access_token", {
        domain: domain,
        path: "/",
    });

    res.clearCookie("refresh_token", {
        domain: domain,
        path: "/",
    });

    res.clearCookie("access_token", {
        path: "/",
    });

    res.clearCookie("refresh_token", {
        path: "/",
    });

    //edms user
    res.clearCookie("edms_access_token", {
        domain: domain,
        path: "/",
    });

    res.clearCookie("edms_refresh_token", {
        domain: domain,
        path: "/",
    });

    res.clearCookie("edms_access_token", {
        path: "/",
    });

    res.clearCookie("edms_refresh_token", {
        path: "/",
    });
}

export const decodeToken = <T = any>(token: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        if (!authKey) return;
        jwt.verify(token, authKey, (err, decoded) => {
            if (err) {
                logger.error("decode Token Error : " + err);
                return reject(err);
            }
            resolve(decoded as any);
        });
    });
};

type TokenData = {
    iat: number;
    exp: number;
    sub: string;
    iss: string;
};

type AccessTokenData = {
    user_id: string;
} & TokenData;

type RefreshTokenData = {
    user_id: string;
} & TokenData;

export const refresh = async (res: Response, refreshToken: string, edmsRefreshToken: string) => {
    try {
        const decoded = await decodeToken<RefreshTokenData>(refreshToken);
        const decoded_edms = await decodeToken<RefreshTokenData>(edmsRefreshToken);
        const user = await getRepository(User).findOne(decoded.user_id);
        const edms_user = await getRepository(EdmsUser).findOne(decoded_edms.user_id);

        if (!user && !edms_user) {
            const error = new Error("InvalidUserError");
            throw error;
        }

        const tokens = await user.refreshUserToken(decoded.exp, refreshToken);
        setTokenCookie(res, tokens);
        const edmsTokens = await edms_user.refreshUserToken(decoded_edms.exp, edmsRefreshToken);
        setTokenCookie(res, edmsTokens);
        return { user_id: decoded.user_id, edms_user_id: decoded_edms.user_id };
    } catch (e) {
        throw e;
    }
};

export const consumeUser = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes("/logout")) {
        // removeTokenCookie(res);
        return next(); // ignore when logging out
    }
    try {
        let accessToken: string | undefined;
        let refreshToken: string | undefined;
        let edmsAccessToken: string | undefined;
        let edmsRefreshToken: string | undefined;
        if (req.method == "POST") {
            const { access_token, refresh_token, edms_access_token, edms_refresh_token } = req.body;
            accessToken = access_token;
            refreshToken = refresh_token;
            edmsAccessToken = edms_access_token;
            edmsRefreshToken = edms_refresh_token;
        } else {
            const { access_token, refresh_token, edms_access_token, edms_refresh_token } = req.query;
            accessToken = access_token ? access_token.toString() : null;
            refreshToken = refresh_token ? refresh_token.toString() : null;
            edmsAccessToken = edms_access_token ? edms_access_token.toString() : null;
            edmsRefreshToken = edms_refresh_token ? edms_refresh_token.toString() : null;
        }
        // const refreshToken: string | undefined = req.cookies['refresh_token'];
        const { authorization } = req.headers;

        if (!accessToken && !edmsAccessToken && authorization) {
            accessToken = authorization.split(" ")[1];
        }
        if (!accessToken && !edmsAccessToken) {
            throw new Error("NoAccessToken");
        }
        let tokenData = null;
        if(accessToken){
            const accessTokenData = await decodeToken<AccessTokenData>(accessToken);
            req.app.set("user_id", accessTokenData.user_id);
            tokenData = accessTokenData;
        }
        if(edmsAccessToken){
            const edmsAccessTokenData = await decodeToken<AccessTokenData>(edmsAccessToken);
            req.app.set("edms_user_id", edmsAccessTokenData.user_id);
            tokenData = edmsAccessTokenData
        }
        if(tokenData){
            const diff = tokenData.exp * 1000 - new Date().getTime();
            if (diff < 1000 * 60 * 60 * 3 && refreshToken) {
                await refresh(res, refreshToken, edmsRefreshToken);
            }
        }
        // refresh token when life < 30mins
    } catch (e) {
        // invalid token! try token refresh...
        req.app.set("user_id", null);
        req.app.set("edms_user_id", null);
        // console.log("token err : ", e);
        // if (!refreshToken) return next();
        // try {
        //     const userId = await refresh(res, refreshToken);
        //     // set user_id if succeeds
        //     req.app.set('user_id', userId);
        // } catch (e) {}
    }

    return next();
};
