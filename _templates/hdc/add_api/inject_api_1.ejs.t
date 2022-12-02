---
to: src/routes/api/v1/<%=api_category%>/index.ts
inject: true
skip_if: /<%=api_name%>
after : inject point3
---

router.<%=api_type.toLowerCase()%>("/<%=api_name%>", async(req : Request, res : Response )=>{
    try{
        return getSuccessResponse(res, {});
    } catch(err){ console.log(err); }
     
    return getFailedResponse(res);
});