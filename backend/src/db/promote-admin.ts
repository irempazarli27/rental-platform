import { db } from ".";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run promote-admin -- <email>");
  process.exit(1);
}

async function main() {
  const updated = await db
    .updateTable("users")
    .set({ role: "admin" })
    .where("email", "=", email)
    .returning(["id", "email", "full_name"])
    .executeTakeFirst();

  if (!updated) {
    console.error(`No user found with email ${email}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Promoted ${updated.full_name} (${updated.email}) to admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
