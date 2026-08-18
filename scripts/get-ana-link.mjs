import { prisma } from '../lib/prisma-sqlite.js'

const anaId = 'cms5d832q0003i4d5k7pj9l4j'
const links = await prisma.$queryRawUnsafe(
  `SELECT l.id, l."companyId", c.name FROM "MemberCompanyLink" l JOIN "ClientCompany" c ON c.id = l."companyId" WHERE l."memberId" = ?`,
  anaId
)
console.log(JSON.stringify(links, null, 2))
await prisma.$disconnect()
