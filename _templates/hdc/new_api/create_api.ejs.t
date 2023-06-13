---
to: src/routes/api/v1/<%=name%>/index.ts
---
/******************************************************************************
 * entity : 
    * Entity Name
        * Entity Purpose
 * api : 
    * API_NAME
        - 타입 : POST or GET or DELETE or PUT
        - 파라미터 : API Parameter
        - 기능 : API Purpose
        - paylaod : {
        }
******************************************************************************/
import express, { Request, Response} from "express";
import { getRepository } from "typeorm";
import {} from "@/entity";
import { logger } from "@/lib/winston";
import { getFailedResponse, getSuccessResponse } from "@/lib/format";

const router = express.Router();

// inject point3

router.get("/", async(req : Request, res : Response )=>{
    try{
        return getSuccessResponse(res, {});
    } catch(err){ logger.error(err); }
     
    return getFailedResponse(res);
});

export default router;