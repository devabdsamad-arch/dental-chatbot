// ================================================
// SYNC CLIENTS TO SUPABASE
// ------------------------------------------------
// Run after adding a new client config:
//   npm run sync-clients
// ================================================

import { createClient } from "@supabase/supabase-js";
import { getAllClientIds, getClientConfig } from "../lib/getClientConfig";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function syncClients() {
  const ids = getAllClientIds();
  console.log(`\nSyncing ${ids.length} client(s) to Supabase...\n`);

  let synced = 0;
  let failed = 0;

  for (const id of ids) {
    const config = getClientConfig(id);
    if (!config) { failed++; continue; }

    const locationParts = config.location.split(",");
    const city          = locationParts[locationParts.length - 2]?.trim() ?? "";
    const countryMap: Record<string, string> = {
      "VIC": "AU", "NSW": "AU", "QLD": "AU", "WA": "AU",
      "London": "UK", "Manchester": "UK",
      "New York": "US", "Chicago": "US",
    };
    const country = Object.entries(countryMap)
      .find(([k]) => config.location.includes(k))?.[1] ?? "AU";

    const { error } = await supabase
      .from("clients")
      .upsert({
        id,
        name:             config.name,
        location:         config.location,
        phone:            config.phone,
        contact_email:    config.contactEmail ?? null,
        city,
        country,
        active:           config.active,
        widget_installed: true,
        updated_at:       new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      console.error(`  FAILED ${config.name}: ${error.message}`);
      failed++;
    } else {
      console.log(`  OK ${config.name} (${id})`);
      synced++;
    }
  }

  console.log(`\nDone — ${synced} synced, ${failed} failed\n`);
}

syncClients();