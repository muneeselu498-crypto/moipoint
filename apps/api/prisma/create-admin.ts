// Creates a Master Admin login on a real install, where no demo data exists.
//   npm run admin:create -- "Full Name" name@example.com 9876543210
// It prints a one-time password. Change it after the first login.
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { hashPassword, pwHintFields } from '../src/util';

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {
  /* variables come from the environment */
}

async function main() {
  const [name, rawEmail, mobile] = process.argv.slice(2);
  const email = String(rawEmail ?? '').toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !/^[6-9]\d{9}$/.test(mobile ?? '')) {
    console.error('Usage: npm run admin:create -- "Full Name" name@example.com 9876543210');
    process.exitCode = 1;
    return;
  }
  const master = String(process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase();
  if (master && email !== master) {
    console.error(`Only ${master} can be the Master Admin on this server. Add other staff from inside Master Admin.`);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient();
  try {
    if (await prisma.user.findFirst({ where: { OR: [{ email }, { username: email }] } })) {
      console.error(`${email} already has a login.`);
      process.exitCode = 1;
      return;
    }
    const password = `Mp${randomBytes(12).toString('base64url')}7`;
    const id = `p${randomBytes(6).toString('hex')}`;
    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const [{ rev }] = await tx.$queryRaw<{ rev: bigint }[]>`UPDATE "SyncCounter" SET rev = rev + 1 WHERE id = 1 RETURNING rev`;
      await tx.user.create({
        data: {
          id, accountId: null, email, username: email, mobile, role: 'platform', platformRole: 'owner', status: 'active', passwordHash, rev,
          data: { id, name, email, username: email, mobile, role: 'platform', prole: 'owner', status: 'active', ...pwHintFields(password) },
        },
      });
    });
    console.log(`Master Admin created for ${email}`);
    console.log(`Password: ${password}`);
    console.log('Change it after the first login.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
