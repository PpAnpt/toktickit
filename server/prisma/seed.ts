import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

async function main() {
    const categories = [
        'Account and Access',
        'Hardware',
        'Software',
        'Network'
    ]

    console.log('Start seeding...')
    for (const name of categories) {
        const category = await prisma.category.upsert({
            where: { name: name },
            update: {},
            create: { name: name },
        })
        console.log(`Upserted category: ${category.name}`)
    }
    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
