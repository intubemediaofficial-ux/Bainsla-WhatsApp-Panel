export type FieldType = "text" | "textarea" | "number" | "select" | "tags" | "boolean" | "date" | "datetime" | "color" | "json" | "phone";
export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  table?: boolean;
  form?: boolean;
};
export type ResourceDef = {
  model: string;
  scope: "workspace" | "global";
  title: string;
  subtitle: string;
  fields: Field[];
  search?: string[];
  readOnly?: boolean;
  noCreate?: boolean;
  orderBy?: Record<string, "asc" | "desc">;
  adminOnly?: boolean;
  publicLink?: string;
};

const colorF: Field = { name: "color", label: "Color", type: "color", table: true };

export const RESOURCES: Record<string, ResourceDef> = {
  tags: { model: "tag", scope: "workspace", title: "Labels", subtitle: "Organise contacts and chats with coloured labels", fields: [{ name: "name", label: "Label", required: true, table: true }, colorF], search: ["name"] },
  segments: {
    model: "segment", scope: "workspace", title: "Segments", subtitle: "Saved audiences for broadcasts — filter by labels, stage, score and source",
    fields: [
      { name: "name", label: "Segment name", required: true, table: true },
      { name: "tags", label: "Has any of labels", type: "tags", table: true, placeholder: "vip, delhi" },
      { name: "stage", label: "Stage", table: true },
      { name: "leadScore", label: "Lead score", type: "select", options: ["", "HOT", "WARM", "COLD"], table: true },
      { name: "source", label: "Source", table: true },
    ], search: ["name"],
  },
  "custom-fields": {
    model: "customField", scope: "workspace", title: "Custom Fields", subtitle: "Extra data you store per contact — use as {{field.key}} in messages",
    fields: [{ name: "label", label: "Label", required: true, table: true }, { name: "key", label: "Key", required: true, table: true, placeholder: "city" }, { name: "type", label: "Type", type: "select", options: ["text", "number", "date"], table: true }],
  },
  stages: {
    model: "stage", scope: "workspace", title: "Stages / Pipeline", subtitle: "Lifecycle stages for contacts and deals",
    fields: [{ name: "name", label: "Stage", required: true, table: true }, colorF, { name: "sortOrder", label: "Order", type: "number", table: true }], orderBy: { sortOrder: "asc" },
  },
  "import-logs": { model: "importLog", scope: "workspace", title: "Import Logs", subtitle: "History of contact CSV imports", readOnly: true, fields: ["fileName", "total", "created", "updated", "failed", "createdAt"].map((n) => ({ name: n, label: n === "createdAt" ? "Date" : n[0].toUpperCase() + n.slice(1), table: true, type: n === "createdAt" ? "datetime" : n === "fileName" ? "text" : "number" })) },
  "quick-replies": { model: "quickReply", scope: "workspace", title: "Quick Replies", subtitle: "Canned responses — type / in the inbox to use them", fields: [{ name: "shortcut", label: "Shortcut", required: true, table: true, placeholder: "price" }, { name: "body", label: "Message", type: "textarea", required: true, table: true }], search: ["shortcut", "body"] },
  keywords: {
    model: "keywordRule", scope: "workspace", title: "Keyword Triggers", subtitle: "Auto-reply when a customer message matches a keyword",
    fields: [
      { name: "name", label: "Rule name", required: true, table: true },
      { name: "keywords", label: "Keywords", type: "tags", required: true, table: true, placeholder: "hi, hello, price" },
      { name: "matchType", label: "Match", type: "select", options: ["CONTAINS", "EXACT", "STARTS_WITH"], table: true },
      { name: "replyType", label: "Reply with", type: "select", options: ["TEXT", "TEMPLATE", "FLOW"], table: true },
      { name: "reply", label: "Reply text", type: "textarea" },
      { name: "templateId", label: "Template ID (for TEMPLATE)", help: "Copy from Message Templates" },
      { name: "flowId", label: "Bot flow ID (for FLOW)", help: "Copy from Bot Flow Builder" },
      { name: "addTag", label: "Also add label(s)" },
      { name: "active", label: "Active", type: "boolean", table: true },
      { name: "hits", label: "Hits", type: "number", table: true, form: false },
    ], search: ["name"],
  },
  automations: {
    model: "automation", scope: "workspace", title: "Automations", subtitle: "When something happens → do something (tags, stages, deals, sequences, webhooks)",
    fields: [
      { name: "name", label: "Name", required: true, table: true },
      { name: "event", label: "When", type: "select", options: ["NEW_CONTACT", "MESSAGE_RECEIVED", "CTWA_LEAD", "FORM_SUBMITTED", "ORDER_PLACED", "APPOINTMENT_BOOKED"], required: true, table: true },
      { name: "condition", label: "Only if text contains (optional)" },
      { name: "action", label: "Then", type: "select", options: ["ADD_TAG", "SET_STAGE", "SET_LEAD_SCORE", "START_SEQUENCE", "CREATE_DEAL", "WEBHOOK"], required: true, table: true },
      { name: "actionValue", label: "Value (tag / stage / HOT / sequence ID / URL)", table: true },
      { name: "active", label: "Active", type: "boolean", table: true },
      { name: "runs", label: "Runs", type: "number", table: true, form: false },
    ],
  },
  appointments: {
    model: "appointment", scope: "workspace", title: "Appointments", subtitle: "Bookings with automatic WhatsApp reminders 1 hour before", orderBy: { startsAt: "asc" },
    fields: [
      { name: "name", label: "Customer", required: true, table: true },
      { name: "phone", label: "Phone", type: "phone", required: true, table: true },
      { name: "service", label: "Service", table: true },
      { name: "startsAt", label: "Date & time", type: "datetime", required: true, table: true },
      { name: "durationMin", label: "Duration (min)", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"], table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ], search: ["name", "phone"],
  },
  tickets: {
    model: "customerTicket", scope: "workspace", title: "Tickets", subtitle: "Track customer issues raised over WhatsApp",
    fields: [
      { name: "subject", label: "Subject", required: true, table: true },
      { name: "contactName", label: "Customer", table: true },
      { name: "phone", label: "Phone", type: "phone", table: true },
      { name: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH", "URGENT"], table: true },
      { name: "status", label: "Status", type: "select", options: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ], search: ["subject", "phone", "contactName"],
  },
  leads: {
    model: "lead", scope: "workspace", title: "All Leads", subtitle: "Leads from forms, ads, links, website and manual entry",
    fields: [
      { name: "name", label: "Name", table: true },
      { name: "phone", label: "Phone", type: "phone", table: true },
      { name: "email", label: "Email", table: true },
      { name: "source", label: "Source", table: true },
      { name: "status", label: "Status", type: "select", options: ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"], table: true },
      { name: "score", label: "Score", type: "select", options: ["", "HOT", "WARM", "COLD"], table: true },
      { name: "followUpAt", label: "Follow-up", type: "datetime", table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ], search: ["name", "phone", "email"],
  },
  forms: {
    model: "form", scope: "workspace", title: "Lead Gen Forms", subtitle: "Public forms — submissions become leads + contacts and get a WhatsApp confirmation", publicLink: "/f/",
    fields: [
      { name: "name", label: "Form name", required: true, table: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "fields", label: "Extra fields (one per line)", type: "tags", table: true, placeholder: "City, Budget, Message" },
      { name: "successText", label: "WhatsApp confirmation message", type: "textarea" },
      { name: "slug", label: "Public link", table: true, form: false },
      { name: "submissions", label: "Submissions", type: "number", table: true, form: false },
      { name: "active", label: "Active", type: "boolean", table: true },
    ],
  },
  products: {
    model: "product", scope: "workspace", title: "Product Catalog", subtitle: "Products you can send and sell inside WhatsApp chats",
    fields: [
      { name: "name", label: "Product", required: true, table: true },
      { name: "sku", label: "SKU", table: true },
      { name: "price", label: "Price (₹)", type: "number", required: true, table: true },
      { name: "category", label: "Category", table: true },
      { name: "stock", label: "Stock", type: "number", table: true },
      { name: "imageUrl", label: "Image URL" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "active", label: "Active", type: "boolean", table: true },
    ], search: ["name", "sku"],
  },
  orders: {
    model: "order", scope: "workspace", title: "Order Management", subtitle: "Orders placed via chat — unpaid ones get an auto reminder after 1 hour",
    fields: [
      { name: "number", label: "Order #", table: true, form: false },
      { name: "customerName", label: "Customer", table: true },
      { name: "phone", label: "Phone", type: "phone", table: true },
      { name: "items", label: "Items (one per line)", type: "tags" },
      { name: "total", label: "Total (₹)", type: "number", table: true },
      { name: "status", label: "Status", type: "select", options: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"], table: true },
      { name: "paymentStatus", label: "Payment", type: "select", options: ["UNPAID", "PAID", "REFUNDED"], table: true },
      { name: "address", label: "Address", type: "textarea" },
    ], search: ["number", "customerName", "phone"],
  },
  "tracked-links": {
    model: "trackedLink", scope: "workspace", title: "Lead Source & QR", subtitle: "Click-tracked wa.me links & QR codes for ads, posters and bios", publicLink: "/l/",
    fields: [
      { name: "name", label: "Name", required: true, table: true },
      { name: "phone", label: "WhatsApp number", type: "phone", table: true },
      { name: "message", label: "Pre-filled message", type: "textarea" },
      { name: "targetUrl", label: "Or redirect to URL (optional)" },
      { name: "source", label: "Source label", table: true, placeholder: "instagram-bio" },
      { name: "slug", label: "Short link", table: true, form: false },
      { name: "clicks", label: "Clicks", type: "number", table: true, form: false },
    ],
  },
  deals: {
    model: "deal", scope: "workspace", title: "Pipeline Deals", subtitle: "Sales opportunities", orderBy: { createdAt: "desc" },
    fields: [
      { name: "title", label: "Deal", required: true, table: true },
      { name: "phone", label: "Customer phone", type: "phone", table: true },
      { name: "value", label: "Value (₹)", type: "number", table: true },
      { name: "stage", label: "Stage", table: true },
      { name: "status", label: "Status", type: "select", options: ["OPEN", "WON", "LOST"], table: true },
      { name: "source", label: "Source", table: true },
      { name: "ownerName", label: "Owner" },
      { name: "followUpAt", label: "Follow-up", type: "datetime", table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    search: ["title", "phone"],
  },
  "knowledge-base": {
    model: "knowledgeDoc", scope: "workspace", title: "Knowledge Base", subtitle: "Train the AI chatbot — paste FAQs, price lists, policies (or upload txt/csv/pdf)",
    fields: [{ name: "title", label: "Title", required: true, table: true }, { name: "fileName", label: "File", table: true, form: false }, { name: "content", label: "Content", type: "textarea", required: true }, { name: "createdAt", label: "Added", type: "datetime", table: true, form: false }],
    search: ["title"],
  },
  "audit-log": { model: "auditLog", scope: "workspace", title: "Audit Log", subtitle: "Who did what in your workspace", readOnly: true, fields: [{ name: "createdAt", label: "Time", type: "datetime", table: true }, { name: "userName", label: "User", table: true }, { name: "action", label: "Action", table: true }, { name: "detail", label: "Detail", table: true }], search: ["action", "detail"] },
  invoices: { model: "invoice", scope: "workspace", title: "Invoices", subtitle: "Your payment invoices", readOnly: true, fields: [{ name: "number", label: "Invoice #", table: true }, { name: "description", label: "Description", table: true }, { name: "amount", label: "Amount (₹)", type: "number", table: true }, { name: "tax", label: "GST (₹)", type: "number", table: true }, { name: "status", label: "Status", table: true }, { name: "createdAt", label: "Date", type: "datetime", table: true }] },
  transactions: { model: "walletTxn", scope: "workspace", title: "Transactions", subtitle: "Wallet credits & debits", readOnly: true, fields: [{ name: "createdAt", label: "Date", type: "datetime", table: true }, { name: "type", label: "Type", table: true }, { name: "amount", label: "Amount (₹)", type: "number", table: true }, { name: "description", label: "Description", table: true }, { name: "status", label: "Status", table: true }] },
  support: { model: "supportTicket", scope: "workspace", title: "Support", subtitle: "Raise a ticket with the platform team", fields: [{ name: "subject", label: "Subject", required: true, table: true }, { name: "message", label: "Message", type: "textarea", required: true }, { name: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH"], table: true }, { name: "status", label: "Status", table: true, form: false }, { name: "reply", label: "Admin reply", table: true, form: false }] },
  "media-library": { model: "mediaAsset", scope: "workspace", title: "Media Library", subtitle: "Images, videos & documents sent or received", noCreate: true, fields: [{ name: "name", label: "Name", table: true }, { name: "mime", label: "Type", table: true }, { name: "url", label: "URL", table: true }, { name: "createdAt", label: "Date", type: "datetime", table: true }], search: ["name"] },

  "admin-plans": {
    model: "plan", scope: "global", adminOnly: true, title: "Subscription Plans", subtitle: "Plans vendors can buy — limits are enforced per workspace", orderBy: { sortOrder: "asc" },
    fields: [
      { name: "name", label: "Plan name", required: true, table: true },
      { name: "price", label: "Price (₹)", type: "number", table: true },
      { name: "durationDays", label: "Duration (days)", type: "number", table: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "limits", label: "Limits (JSON)", type: "json", help: '{"contacts":1000,"agents":2,"numbers":1,"broadcastsPerMonth":10,"botFlows":3,"aiReplies":500}' },
      { name: "features", label: "Feature bullets", type: "tags", table: true },
      { name: "isDefault", label: "Default for new signups", type: "boolean", table: true },
      { name: "active", label: "Active", type: "boolean", table: true },
      { name: "sortOrder", label: "Order", type: "number" },
    ],
  },
  "admin-coupons": { model: "coupon", scope: "global", adminOnly: true, title: "Coupons", subtitle: "Discount codes for plan purchases", fields: [{ name: "code", label: "Code", required: true, table: true }, { name: "percentOff", label: "% off", type: "number", table: true }, { name: "amountOff", label: "₹ off", type: "number", table: true }, { name: "maxUses", label: "Max uses (0 = ∞)", type: "number", table: true }, { name: "used", label: "Used", type: "number", table: true, form: false }, { name: "expiresAt", label: "Expires", type: "date", table: true }, { name: "active", label: "Active", type: "boolean", table: true }] },
  "admin-announcements": { model: "announcement", scope: "global", adminOnly: true, title: "Announcements", subtitle: "Banners shown on every vendor dashboard", fields: [{ name: "title", label: "Title", required: true, table: true }, { name: "body", label: "Message", type: "textarea", required: true }, { name: "level", label: "Level", type: "select", options: ["info", "success", "warning"], table: true }, { name: "active", label: "Active", type: "boolean", table: true }] },
  "admin-inquiries": { model: "inquiry", scope: "global", adminOnly: true, title: "Inquiries", subtitle: "Contact-form leads from the landing page", noCreate: true, fields: [{ name: "name", label: "Name", table: true }, { name: "phone", label: "Phone", table: true }, { name: "email", label: "Email", table: true }, { name: "message", label: "Message", type: "textarea", table: true }, { name: "status", label: "Status", type: "select", options: ["NEW", "CONTACTED", "CLOSED"], table: true }] },
  "admin-support": { model: "supportTicket", scope: "global", adminOnly: true, title: "Support Tickets", subtitle: "Tickets raised by vendors", noCreate: true, fields: [{ name: "subject", label: "Subject", table: true }, { name: "userName", label: "From", table: true, form: false }, { name: "message", label: "Message", type: "textarea", table: true, form: false }, { name: "priority", label: "Priority", table: true, form: false }, { name: "status", label: "Status", type: "select", options: ["OPEN", "ANSWERED", "CLOSED"], table: true }, { name: "reply", label: "Reply", type: "textarea", table: true }] },
  "admin-audit": { model: "auditLog", scope: "global", adminOnly: true, title: "Audit Log", subtitle: "Platform-wide activity", readOnly: true, fields: [{ name: "createdAt", label: "Time", type: "datetime", table: true }, { name: "userName", label: "User", table: true }, { name: "action", label: "Action", table: true }, { name: "detail", label: "Detail", table: true }], search: ["action", "detail"] },
};
