#!/usr/bin/env node
/*
  Usage: node scripts/set-admin.js <clerkUserId>
  This script sets `is_admin = true` for the given user id in the database using Prisma.
*/
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/set-admin.js <clerkUserId>');
    process.exit(1);
  }

  try {
    const result = await prisma.user.updateMany({ where: { id }, data: { is_admin: true } });
    if (result.count === 0) {
      // No existing row — create a minimal user record with is_admin true
      await prisma.user.create({ data: { id, is_admin: true } });
      console.log(`No existing user found — created user ${id} and set is_admin=true`);
    } else {
      console.log(`Successfully set is_admin=true for existing user ${id}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error setting admin flag:', err);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

main();
