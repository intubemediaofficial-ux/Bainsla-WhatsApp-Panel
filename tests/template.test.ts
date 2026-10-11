import { describe, expect, it } from "vitest";
import { buildTemplateComponents, countVars, fillPlaceholders, renderTemplateText } from "@/lib/wa";

const contact = { name: "Ramesh", phone: "919876543210", email: "r@x.in", customFields: { city: "Jaipur" } };
const comps = [
  { type: "HEADER", format: "TEXT", text: "Hi {{1}}" },
  { type: "BODY", text: "Hello {{1}}, your order {{2}} is ready in {{1}}" },
  { type: "BUTTONS", buttons: [{ type: "URL", url: "https://x.in/o/{{1}}" }, { type: "QUICK_REPLY", text: "OK" }] },
];

describe("templates", () => {
  it("counts unique variables", () => expect(countVars("{{1}} {{2}} {{1}}")).toBe(2));
  it("fills contact placeholders", () => expect(fillPlaceholders("{{name}} from {{field.city}} ({{phone}})", contact)).toBe("Ramesh from Jaipur (919876543210)"));
  it("defaults missing name", () => expect(fillPlaceholders("{{name}}", { phone: "1" })).toBe("Customer"));
  it("builds Meta components", () => {
    const out = buildTemplateComponents(comps, { header: "{{name}}", body: ["{{name}}", "#42"], buttons: { "0": "42" } }, contact) as { type: string; parameters: { text: string }[] }[];
    expect(out.map((c) => c.type)).toEqual(["header", "body", "button"]);
    expect(out[0].parameters[0].text).toBe("Ramesh");
    expect(out[1].parameters.map((p) => p.text)).toEqual(["Ramesh", "#42"]);
    expect(out[2].parameters[0].text).toBe("42");
  });
  it("uses '-' for empty params so Meta does not reject", () => {
    const out = buildTemplateComponents(comps, {}, contact) as { parameters: { text: string }[] }[];
    expect(out[1].parameters[0].text).toBe("-");
  });
  it("renders preview text", () => expect(renderTemplateText(comps, { body: ["Aman", "#7"] }, contact)).toBe("Hello Aman, your order #7 is ready in Aman"));
});
