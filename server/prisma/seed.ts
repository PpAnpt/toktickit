import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Start seeding...')

    // 1. Seed Categories (เดิม)
    const categories = [
        'Account and Access',
        'Hardware',
        'Software',
        'Network'
    ]
    for (const name of categories) {
        const category = await prisma.category.upsert({
            where: { name: name },
            update: {},
            create: { name: name },
        })
        console.log(`Upserted category: ${category.name}`)
    }

    // 2. Seed Related Systems (เพิ่มใหม่)
    const relatedSystems = [
        'Email',
        'Campus Wi-Fi',
        'VPN',
        'LEB2 App',
        'Grade Submission App',
        'Printer',
        'Corporate Laptop'
    ]
    for (const name of relatedSystems) {
        const system = await prisma.relatedSystem.upsert({
            where: { name: name },
            update: {},
            create: { name: name },
        })
        console.log(`Upserted related system: ${system.name}`)
    }

    // 3. Seed Requester Users (เพิ่มใหม่: Active 4 คน + Inactive 1 คน)
    const requesters = [
        { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
        { name: 'David Lee', email: 'david.lee@example.com', isActive: true },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', isActive: true },
        { name: 'Michael Brown', email: 'michael.brown@example.com', isActive: true },
        { name: 'Inactive User', email: 'inactive.user@example.com', isActive: false },
    ]
    for (const req of requesters) {
        const user = await prisma.requesterUser.upsert({
            where: { email: req.email },
            update: { name: req.name, isActive: req.isActive },
            create: { name: req.name, email: req.email, isActive: req.isActive },
        })
        console.log(`Upserted requester: ${user.name} (Active: ${user.isActive})`)
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
