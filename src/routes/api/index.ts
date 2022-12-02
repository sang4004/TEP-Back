import express, { Request, Response, NextFunction } from "express";
import apiV1 from "./v1";
import { logger } from "@/lib/winston";
const router = express.Router();

router.get("/version", (_, res) => {
    return res.json({
        version: ["v1"],
    });
});

router.use("*", (req: Request, res: Response, next: NextFunction) => {
    logger.log(
        "api",
        `API ::: ${req.method} || ${req.baseUrl} UserID : ${req.app.get("user_id")}, ${req.app.get("edms_user_id")}`
    );
    next();
});
router.use("/v1", apiV1);

export default router;
