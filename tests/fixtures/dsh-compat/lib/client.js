window.__ModuleLoader__.load({id:"dsh-pet-hub-compat-fixture",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tests/fixtures/dsh-compat/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var css = `
/* Reproduce the public dsh-cost-meter footer contract (order:-1 and SlotOutlet).
   https://github.com/Han-1413141/dsh-cost-meter/blob/master/src/client/01-open-styles-i18n.js
   Data below is synthetic; this fixture never queries a provider or account. */
:has(>.cm-footer-stack),:has(>[data-slot="sidebar.footer.action"]>.cm-footer-stack){flex-wrap:wrap;flex:0 0 auto;height:auto;min-height:0;align-content:flex-start}
.cm-footer-stack{display:flex;flex:none;order:-1;flex-direction:column;gap:6px;width:100%;min-width:0;max-width:100%;align-items:stretch;box-sizing:border-box;padding:10px;border:1px solid #50777b;border-radius:10px;background:#002b30;color:#e4eeee;font:12px/1.6 system-ui}
.cm-footer-stack span{float:right}.cm-footer-stack.rail{order:1;font-size:10px;padding:4px;align-items:center}
`;
function Card({ wide }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `cm-footer-stack${wide ? "" : " rail"}`, "data-testid": "balance-card", children: wide ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      "\u4ECA\u65E5 ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\xA58.2046 \xB7 15.1M tokens" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      "\u4F59\u989D ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\xA515.2818" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      "\u5B9E\u9A8C\u5BA4\u989D\u5EA6 ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "173.914 Credits" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      "GETRUN\u4F59\u989D ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "33.2018 Credits" })
    ] })
  ] }) : "\xA515" });
}
function Sessions({ wide }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-testid": "session-list", style: { flex: "1 1 0", minHeight: 0, overflow: "auto" }, children: Array.from({ length: 60 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "8px 12px" }, children: wide ? `\u6D4B\u8BD5\u4F1A\u8BDD ${i + 1}` : "\xB7" }, i)) });
}
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.textContent = css;
    document.head.append(tag);
    return () => tag.remove();
  });
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "synthetic-balance", order: 0 }, Card));
  ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({ name: "sidebar.workspaces", priority: -1e3 }, Sessions));
}
return module.exports;}});
