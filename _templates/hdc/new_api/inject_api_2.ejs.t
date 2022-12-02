---
to: src/routes/api/v1/index.ts
inject: true
skip_if: router.use("/<%=name%>", <%=name%>);
after : "inject point2"
---
router.use("/<%=name%>", <%=name%>);