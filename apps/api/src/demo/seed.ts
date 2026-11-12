/**
 * Demo data: two fictional workspaces, an operator account, and enough activity to
 * make every screen meaningful.
 *
 *   Bhuwan AI Systems   India payroll pack, Bengaluru office, 12 people across 5 departments
 *   Southwing Analytics     US payroll pack, San Francisco office, 5 people
 *
 * Every person, company, address and identifier here is invented. Identity numbers
 * are the well-known test patterns, never real ones.
 *
 * Passwords: DEMO_PASSWORD when set (the e2e suite and `make demo` set it), otherwise
 * one random password generated and printed once. Refuses to run with
 * NODE_ENV=production: a demo seed has no business near real data.
 *
 *   pnpm demo:seed            seed an empty database   (node dist/cli.js demo:seed in the image)
 *   pnpm demo:seed --reset    truncate every table first
 */
import crypto from "crypto";
import { systemRepos, repos, TABLES, COLLECTIONS } from "../repositories/base.repository";
import { defaultSalaryBreakdown } from "../domain/employment";
import { db } from "../db/kysely";
import { hashPassword } from "../middleware/auth";
import { hashPw } from "../middleware/platform-auth";
import { ensureContent } from "./seed-content";
import { provisionOrgDefaults } from "../services/provisioning.service";

const DEMO_DOMAIN = "systems.com";

type PersonSpec = {
  key: string;
  firstName: string;
  lastName: string;
  dept: string;
  type: "FULL_TIME" | "PART_TIME" | "INTERN";
  designation: string;
  basic: number;
  role?: "HR" | "MANAGER" | "EMPLOYEE";
  reportsTo?: string;
  joinedDaysAgo: number;
  kyc?: Record<string, string>;
  bank?: Record<string, string>;
};

type WorkspaceSpec = {
  name: string;
  slug: string;
  country: string;
  state: string | null;
  address: string;
  office: { name: string; lat: number; lng: number; radiusMeters: number };
  departments: string[];
  admin: { firstName: string; lastName: string };
  people: PersonSpec[];
};

const WORKSPACES: WorkspaceSpec[] = [
  {
    name: "Bhuwan AI Systems",
    slug: "bhuwan-ai",
    country: "IN",
    state: "KA",
    address: "Bhuwan AI Systems, 18 Innovation Avenue, Bengaluru, Karnataka, India",
    office: { name: "Bengaluru HQ", lat: 12.9716, lng: 77.5946, radiusMeters: 300 },
    departments: ["Engineering", "Product", "People", "Sales", "Operations"],
    admin: { firstName: "Vinod", lastName: "Tripathi" },
    people: [
      { key: "lead", firstName: "Aditya", lastName: "Rathore", dept: "Engineering", type: "FULL_TIME", designation: "Engineering Manager", basic: 120000, role: "MANAGER", joinedDaysAgo: 900,
        kyc: { pan: "ABCDE1234F", aadhaar: "123456789012", uan: "100000000001" },
        bank: { account: "000123456789", ifsc: "TEST0001234", bankName: "Example Bank" } },
      { key: "hr", firstName: "Priya", lastName: "Nair", dept: "People", type: "FULL_TIME", designation: "HR Business Partner", basic: 80000, role: "HR", joinedDaysAgo: 700 },
      { key: "dev1", firstName: "Aman", lastName: "Sharma", dept: "Engineering", type: "FULL_TIME", designation: "Backend Engineer", basic: 65000, reportsTo: "lead", joinedDaysAgo: 420 },
      { key: "dev2", firstName: "Ishita", lastName: "Saxena", dept: "Engineering", type: "FULL_TIME", designation: "Frontend Engineer", basic: 62000, reportsTo: "lead", joinedDaysAgo: 300 },
      { key: "intern", firstName: "Neeraj", lastName: "Soni", dept: "Engineering", type: "INTERN", designation: "Engineering Intern", basic: 18000, reportsTo: "lead", joinedDaysAgo: 60 },
      { key: "pm", firstName: "Kavya", lastName: "Bansal", dept: "Product", type: "FULL_TIME", designation: "Product Manager", basic: 95000, joinedDaysAgo: 520 },
      { key: "sales", firstName: "Harsh", lastName: "Kapoor", dept: "Sales", type: "PART_TIME", designation: "Sales Associate", basic: 30000, reportsTo: "pm", joinedDaysAgo: 200 },
      { key: "dev3", firstName: "Ritika", lastName: "Mishra", dept: "Engineering", type: "FULL_TIME", designation: "QA Engineer", basic: 58000, reportsTo: "lead", joinedDaysAgo: 260 },
      { key: "dev4", firstName: "Siddharth", lastName: "Rao", dept: "Engineering", type: "FULL_TIME", designation: "DevOps Engineer", basic: 88000, reportsTo: "lead", joinedDaysAgo: 340 },
      { key: "ops1", firstName: "Pooja", lastName: "Kulkarni", dept: "Operations", type: "FULL_TIME", designation: "Operations Specialist", basic: 54000, joinedDaysAgo: 430 },
      { key: "ops2", firstName: "Rahul", lastName: "Chopra", dept: "Operations", type: "FULL_TIME", designation: "Operations Analyst", basic: 52000, reportsTo: "ops1", joinedDaysAgo: 220 },
      { key: "intern2", firstName: "Tanvi", lastName: "Gupta", dept: "Product", type: "INTERN", designation: "Product Intern", basic: 20000, reportsTo: "pm", joinedDaysAgo: 45 },
    ],
  },
  {
    name: "Southwing Analytics",
    slug: "bhuwan-ai-analytics",
    country: "US",
    state: null,
    address: "Southwing Analytics, 55 Market Street, San Francisco, CA, USA",
    office: { name: "San Francisco", lat: 37.7749, lng: -122.4194, radiusMeters: 250 },
    departments: ["Research", "Operations"],
    admin: { firstName: "Riya", lastName: "Pant" },
    people: [
      { key: "lead", firstName: "Arnav", lastName: "Khanna", dept: "Research", type: "FULL_TIME", designation: "Research Lead", basic: 11000, role: "MANAGER", joinedDaysAgo: 800 },
      { key: "r1", firstName: "Ananya", lastName: "Iyer", dept: "Research", type: "FULL_TIME", designation: "Research Scientist", basic: 9000, reportsTo: "lead", joinedDaysAgo: 350 },
      { key: "ops", firstName: "Vivek", lastName: "Sethi", dept: "Operations", type: "FULL_TIME", designation: "Operations Manager", basic: 8500, joinedDaysAgo: 250 },
      { key: "r2", firstName: "Sneha", lastName: "Rao", dept: "Research", type: "FULL_TIME", designation: "Data Analyst", basic: 7200, reportsTo: "lead", joinedDaysAgo: 180 },
      { key: "ops2", firstName: "Kabir", lastName: "Jain", dept: "Operations", type: "FULL_TIME", designation: "Operations Associate", basic: 5900, reportsTo: "ops", joinedDaysAgo: 120 },
    ],
  },
];

const OPERATOR = { email: `operator@bhuwan-ai.${DEMO_DOMAIN}`, name: "Bhuwan AI Operator" };

const activeUser = () => ({
  status: "ACTIVE",
  emailVerifiedAt: new Date().toISOString(),
  credentialsChangedAt: new Date(0).toISOString(),
});
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const emailFor = (slug: string, first: string, last: string) =>
  `${first}.${last}`.toLowerCase() + `@${slug}.${DEMO_DOMAIN}`;

async function seedWorkspace(spec: WorkspaceSpec, passwordHash: string) {
  const sys = systemRepos();
  const org = await sys.organizations.insert({
    name: spec.name,
    slug: spec.slug,
    address: spec.address,
    legalName: `${spec.name} Private Limited`,
    status: "ACTIVE",
    signupSource: "DEMO",
    country: spec.country,
    officialEmailDomain: `${spec.slug}.${DEMO_DOMAIN}`,
    website: `https://${spec.slug}.${DEMO_DOMAIN}`,
    signatory: { name: `${spec.admin.firstName} ${spec.admin.lastName}`, title: "Head of People" },
  });
  // The same starter packs a self-signed-up workspace receives: leave catalogue,
  // holidays for the state, departments, policies, benefits.
  await provisionOrgDefaults(org.id, { state: spec.state });
  const r = repos({ orgId: org.id });

  await r.offices.insert({ ...spec.office, address: spec.address });
  const existing = await r.departments.all();
  const dept: Record<string, any> = Object.fromEntries(existing.map((d: any) => [d.name, d]));
  for (const name of spec.departments) {
    if (!dept[name]) dept[name] = await r.departments.insert({ name, description: "" });
  }
  // A demo company this size uses a handful of departments; drop the starter-pack ones it
  // does not, so the screens read like a real 12-person company.
  for (const d of existing) if (!spec.departments.includes(d.name)) await r.departments.remove(d.id);

  const admin = await r.users.insert({
    email: emailFor(spec.slug, spec.admin.firstName, spec.admin.lastName),
    name: `${spec.admin.firstName} ${spec.admin.lastName}`,
    role: "ADMIN",
    employeeId: null,
    passwordHash,
    ...activeUser(),
  });

  const prefix = spec.slug.split("-")[0].slice(0, 3).toUpperCase();
  const byKey: Record<string, any> = {};
  let n = 1001;
  for (const p of spec.people) {
    const email = emailFor(spec.slug, p.firstName, p.lastName);
    const emp = await r.employees.insert({
      departmentId: dept[p.dept].id,
      code: `${prefix}-${n++}`,
      firstName: p.firstName,
      lastName: p.lastName,
      email,
      officialEmail: email,
      phone: "",
      employmentType: p.type,
      designation: p.designation,
      managerId: null,
      joiningDate: daysAgo(p.joinedDaysAgo),
      status: "ACTIVE",
      salary: defaultSalaryBreakdown(p.type, p.basic),
      kyc: p.kyc || {},
      bank: p.bank || { account: "", ifsc: "" },
    });
    byKey[p.key] = emp;
    await r.users.insert({
      email,
      name: `${p.firstName} ${p.lastName}`,
      role: p.role || "EMPLOYEE",
      employeeId: emp.id,
      passwordHash,
      ...activeUser(),
    });
  }
  for (const p of spec.people) {
    if (p.reportsTo) await r.employees.update(byKey[p.key].id, { reportsTo: byKey[p.reportsTo].id });
  }
  return { org, admin };
}

async function doSeed(password: string) {
  const passwordHash = hashPassword(password);
  const created: { org: any; admin: any }[] = [];
  for (const spec of WORKSPACES) created.push(await seedWorkspace(spec, passwordHash));

  // Announcements, vendors, work logs, wellbeing, assets, perks, a PIP, an appraisal cycle.
  await ensureContent(systemRepos(), { vendorPasswordHash: passwordHash });

  const sys = systemRepos();
  if (!(await sys.platformAdmins.findOne((a: any) => a.email === OPERATOR.email))) {
    await sys.platformAdmins.insert({ ...OPERATOR, role: "OPERATOR", status: "ACTIVE", passwordHash: hashPw(password) });
  }
  return created;
}

async function truncateAll() {
  const tables = [...COLLECTIONS.map((c) => `"${TABLES[c].table}"`), '"jobs"', '"org_data_keys"'].join(", ");
  await db.executeQuery({ sql: `TRUNCATE ${tables} RESTART IDENTITY CASCADE`, parameters: [] } as any);
}

/**
 * Seed demo data unless workspaces already exist. Refuses NODE_ENV=production.
 * Run through the CLI: `pnpm demo:seed` locally, `node dist/cli.js demo:seed` in the image.
 */
async function runDemoSeed({ reset = false } = {}) {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  if (reset) {
    await truncateAll();
    console.log("[demo] All tables truncated.");
  }
  if ((await systemRepos().organizations.count()) > 0) {
    console.log("[demo] The database already has workspaces. Use --reset to wipe and re-seed.");
    return;
  }
  const generated = !process.env.DEMO_PASSWORD;
  const password = process.env.DEMO_PASSWORD || `Demo-${crypto.randomBytes(6).toString("base64url")}`;
  const created = await doSeed(password);
  console.log("\n  Demo workspaces seeded.\n");
  for (const { org, admin } of created) console.log(`   ${org.name.padEnd(15)} admin: ${admin.email}`);
  console.log(`   ${"Operator".padEnd(15)} ${OPERATOR.email}  (operator console)`);
  console.log(`\n  Password for every demo account: ${password}${generated ? "  (generated; set DEMO_PASSWORD to choose one)" : ""}\n`);
}


/** Non-destructive one-time demo identity migration; keeps all row IDs and relationships. */
async function runSouthwingRename() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo migration is disabled in production.");
  const sys = systemRepos();
  const original = await sys.organizations.findOne((o: any) => o.slug === "northstar-analytics");
  const renamed = await sys.organizations.findOne((o: any) => o.slug === "bhuwan-ai-analytics");
  if (!original) {
    if (renamed) {
      console.log("[southwing] Workspace already renamed; nothing to do.");
      return;
    }
    throw new Error("Expected old Northstar Analytics workspace not found; no data changed.");
  }
  if (renamed) throw new Error("Both old and new workspace slugs exist; no data changed.");

  const r = repos({ orgId: original.id });
  const people = [
    ["Ethan", "Brooks", "Arnav", "Khanna"],
    ["Mia", "Cole", "Ananya", "Iyer"],
    ["Noah", "Patel", "Vivek", "Sethi"],
    ["Ava", "Martin", "Sneha", "Rao"],
    ["Lucas", "Green", "Kabir", "Jain"],
  ];
  const oldAdmin = "olivia.reed@northstar-analytics.systems.com";
  const newAdmin = "riya.pant@bhuwan-ai-analytics.systems.com";
  const admin = await r.users.findOne((u: any) => u.email === oldAdmin);
  if (!admin) throw new Error(`Old admin ${oldAdmin} not found; no data changed.`);
  const plan: { emp: any; user: any; email: string; first: string; last: string }[] = [];
  for (const [oldFirst, oldLast, first, last] of people) {
    const oldEmail = `${oldFirst}.${oldLast}@northstar-analytics.systems.com`.toLowerCase();
    const email = `${first}.${last}@bhuwan-ai-analytics.systems.com`.toLowerCase();
    const emp = await r.employees.findOne((e: any) => e.email === oldEmail);
    const user = await r.users.findOne((u: any) => u.email === oldEmail);
    if (!emp || !user) throw new Error(`Expected demo employee/user ${oldEmail} not found; no data changed.`);
    plan.push({ emp, user, email, first, last });
  }
  if (await r.users.findOne((u: any) => u.email === newAdmin)) throw new Error("New admin already exists; no data changed.");
  for (const p of plan) if (await r.users.findOne((u: any) => u.email === p.email)) throw new Error(`New email already exists: ${p.email}`);

  await r.users.update(admin.id, { email: newAdmin, name: "Riya Pant" });
  for (const p of plan) {
    await r.employees.update(p.emp.id, {
      firstName: p.first, lastName: p.last, email: p.email, officialEmail: p.email,
    });
    await r.users.update(p.user.id, { name: `${p.first} ${p.last}`, email: p.email });
  }
  const vendors = await r.vendors.all();
  for (const v of vendors) {
    if (typeof v.email === "string" && v.email.includes("northstar-analytics")) {
      const previousEmail = v.email;
      const updatedEmail = previousEmail.replaceAll("northstar-analytics", "bhuwan-ai-analytics");
      await r.vendors.update(v.id, { email: updatedEmail });
      const vendorLogin = await r.users.findOne(
        (u: any) => u.vendorId === v.id && u.email === previousEmail,
      );
      if (vendorLogin) {
        await r.users.update(vendorLogin.id, { email: updatedEmail });
      }
    }
  }
  await sys.organizations.update(original.id, {
    name: "Southwing Analytics", slug: "bhuwan-ai-analytics",
    legalName: "Southwing Analytics Private Limited",
    address: String(original.address || "").replaceAll("Northstar Analytics", "Southwing Analytics"),
    officialEmailDomain: "bhuwan-ai-analytics.systems.com",
    website: "https://bhuwan-ai-analytics.systems.com",
    signatory: { name: "Riya Pant", title: "Head of People" },
  });
  console.log(`[southwing] Updated workspace and ${plan.length} employee identities, preserving record IDs.`);
  console.log(`[southwing] Admin: ${newAdmin}; existing demo password unchanged.`);
}

export { doSeed, runDemoSeed, runSouthwingRename, truncateAll, WORKSPACES, OPERATOR };
