---
to: src/entity/index.ts
inject: true
skip_if: import {<%=name.charAt(0).toUpperCase() + name.slice(1)%>} from "./<%=name.charAt(0).toUpperCase() + name.slice(1)%>";
after : "inject point2"
---
import {<%=name.charAt(0).toUpperCase() + name.slice(1)%>} from "./<%=name.charAt(0).toUpperCase() + name.slice(1)%>";