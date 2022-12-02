---
to: src/routes/api/v1/index.ts
inject: true
skip_if: import <%=name%> from "./<%=name%>";
after : "inject point1"
---
import <%=name%> from "./<%=name%>";