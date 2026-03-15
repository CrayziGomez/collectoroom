#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const u = await p.user.findUnique({ where: { id: process.argv[2] } });
    console.log(JSON.stringify(u, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
