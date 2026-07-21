const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('resto1234', 12);
  await p.user.update({ where: { email: 'resto@smashmelt.dz' }, data: { passwordHash: hash, role: 'RESTAURANT', managedRestaurantId: 'r1', isActive: true } });
  console.log('password reset -> resto1234');
  await p.$disconnect();
})();
