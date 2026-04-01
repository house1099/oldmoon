/**
 * 輔助：印出待套用 migration 的 name 與 SQL（stdout 為 JSON lines）
 * 用法：node scripts/apply-migrations-mcp-helper.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migDir = path.join(root, "supabase", "migrations");

const cloudNames = new Set([
  "users_status_default_pending",
  "streak_reward_settings_and_inventory_slots",
  "user_rewards_item_ref_prize_items",
  "add_prize_item_image_and_user_reward_shop_item_ref",
  "shop_item_player_policies",
  "coin_transactions_source_shop_resell",
  "rls_lockdown_sensitive_tables",
  "market_listings",
  "matchmaker_age_mode",
  "20260401600000_fishing_logs",
  "20260401700000_fishing_rewards",
]);

function tail(stem) {
  const m = stem.match(/^[0-9]{14}_(.+)$/);
  return m ? m[1] : null;
}

const files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const need = [];
for (const f of files) {
  const stem = f.replace(/\.sql$/, "");
  if (cloudNames.has(stem)) continue;
  const t = tail(stem);
  if (t && cloudNames.has(t)) continue;
  need.push(stem);
}

const outPath = path.join(root, "scripts", "_mcp_migrations.jsonl");
const lines = [];
for (const stem of need) {
  let sql = fs.readFileSync(path.join(migDir, `${stem}.sql`), "utf8");
  sql = sql.replace(/EXECUTE PROCEDURE/g, "EXECUTE FUNCTION");
  lines.push(JSON.stringify({ name: stem, query: sql }));
}
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.error("Wrote", lines.length, "migrations to", outPath);
