---
to: src/entity/index.ts
inject: true
skip_if: export * from "./<%=name.charAt(0).toUpperCase() + name.slice(1)%>";
after : "inject point1"
---
export * from "./<%=name.charAt(0).toUpperCase() + name.slice(1)%>";