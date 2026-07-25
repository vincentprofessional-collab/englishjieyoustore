import { existsSync, chmodSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.seed.local");
const rl = createInterface({ input, output });

async function main() {
  if (existsSync(envPath)) {
    const overwrite = await rl.question(
      ".env.seed.local already exists. Overwrite it? Type YES to continue: ",
    );

    if (overwrite !== "YES") {
      console.log("Cancelled. Existing .env.seed.local was not changed.");
      return;
    }
  }

  const key = await rl.question("Paste Supabase service role / secret key: ");
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    throw new Error("Key cannot be empty.");
  }

  if (!trimmedKey.startsWith("sb_secret_") && !trimmedKey.startsWith("eyJ")) {
    console.log(
      "Warning: this does not look like a Supabase secret/service-role key. Saving anyway.",
    );
  }

  writeFileSync(envPath, `SUPABASE_SERVICE_ROLE_KEY=${trimmedKey}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(envPath, 0o600);

  console.log(".env.seed.local saved with 0600 permissions.");
  console.log("Next: npm run seed:listening");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });
