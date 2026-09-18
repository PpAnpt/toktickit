import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Start seeding Lab 3 data...')

    // 1. Seed Categories (Idempotent)
    const categories = [
        'Account and Access',
        'Hardware',
        'Software',
        'Network'
    ]
    for (const name of categories) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        })
    }
    console.log(`✅ Seeded ${categories.length} Categories.`)

    // 2. Seed Related Systems (Idempotent)
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
        await prisma.relatedSystem.upsert({
            where: { name },
            update: {},
            create: { name },
        })
    }
    console.log(`✅ Seeded ${relatedSystems.length} Related Systems.`)

    // 3. Seed Users across 3 Roles with Hashed Passwords (Idempotent)
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10)
    const initialPasswordHash = await bcrypt.hash('Initial123!', 10)
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10)

    const seedUsers = [
        // Requesters (4 active, 1 inactive; 1 requires first-time password change)
        { name: 'David Lee', email: 'david.lee@example.com', role: 'REQUESTER' as const, passwordHash: defaultPasswordHash, isActive: true, mustChangePassword: false },
        { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', role: 'REQUESTER' as const, passwordHash: defaultPasswordHash, isActive: true, mustChangePassword: false },
        { name: 'Michael Chang', email: 'michael.chang@example.com', role: 'REQUESTER' as const, passwordHash: defaultPasswordHash, isActive: true, mustChangePassword: false },
        { name: 'Emily Watson', email: 'emily.watson@example.com', role: 'REQUESTER' as const, passwordHash: initialPasswordHash, isActive: true, mustChangePassword: true },
        { name: 'Robert Taylor', email: 'robert.taylor@example.com', role: 'REQUESTER' as const, passwordHash: defaultPasswordHash, isActive: false, mustChangePassword: false },

        // IT Staff (3 active, 1 inactive; 1 requires first-time password change)
        { name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' as const, passwordHash: defaultPasswordHash, isActive: true, mustChangePassword: false },
        { name: 'James Gordon', email: 'james.gordon@example.com', role: 'IT_STAFF' as const, passwordHash: defaultPasswordHash, isActive: true, mustChangePassword: false },
        { name: 'Elena Rostova', email: 'elena.rostova@example.com', role: 'IT_STAFF' as const, passwordHash: initialPasswordHash, isActive: true, mustChangePassword: true },
        { name: 'Marcus Wright', email: 'marcus.wright@example.com', role: 'IT_STAFF' as const, passwordHash: defaultPasswordHash, isActive: false, mustChangePassword: false },

        // Administrator (1 active)
        { name: 'Admin System', email: 'admin@example.com', role: 'ADMINISTRATOR' as const, passwordHash: adminPasswordHash, isActive: true, mustChangePassword: false },
    ]

    for (const u of seedUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                role: u.role,
                passwordHash: u.passwordHash,
                isActive: u.isActive,
                mustChangePassword: u.mustChangePassword,
            },
            create: u,
        })
    }
    console.log(`✅ Seeded ${seedUsers.length} Users across Requester, IT Staff, and Admin roles.`)

    // 4. Seed Realistic Sample Tickets
    const david = await prisma.user.findUnique({ where: { email: 'david.lee@example.com' } })
    const jennifer = await prisma.user.findUnique({ where: { email: 'jennifer.anderson@example.com' } })
    const sarahStaff = await prisma.user.findUnique({ where: { email: 'sarah.connor@example.com' } })
    const hwCategory = await prisma.category.findFirst({ where: { name: 'Hardware' } })
    const netCategory = await prisma.category.findFirst({ where: { name: 'Network' } })
    const wifiSys = await prisma.relatedSystem.findFirst({ where: { name: 'Campus Wi-Fi' } })
    const laptopSys = await prisma.relatedSystem.findFirst({ where: { name: 'Corporate Laptop' } })

    if (david && jennifer && sarahStaff && hwCategory && netCategory && wifiSys && laptopSys) {
        // Ticket 1: In Progress, Assigned to Sarah
        await prisma.ticket.upsert({
            where: { ticketNumber: 'TKT-2026-000001' },
            update: {},
            create: {
                ticketNumber: 'TKT-2026-000001',
                summary: 'Laptop display flickering when connected to external monitor',
                description: 'The internal display flickers black intermittently whenever plugged into HDMI.',
                status: 'InProgress',
                requestedPriority: 'HIGH',
                itPriority: 'HIGH',
                requesterId: david.id,
                ownerId: sarahStaff.id,
                categoryId: hwCategory.id,
                relatedSystemId: laptopSys.id,
                comments: {
                    create: [
                        { content: 'Could you try using a different HDMI cable to isolate the port?', authorId: sarahStaff.id },
                        { content: 'Tried with a brand new cable, same flickering occurs.', authorId: david.id }
                    ]
                },
                internalNotes: {
                    create: [
                        { content: 'Known GPU driver bug with Thunderbolt dock firmware. Need to update driver.', authorId: sarahStaff.id }
                    ]
                }
            }
        })

        // Ticket 2: New, Unassigned
        await prisma.ticket.upsert({
            where: { ticketNumber: 'TKT-2026-000002' },
            update: {},
            create: {
                ticketNumber: 'TKT-2026-000002',
                summary: 'Cannot connect to 5GHz Campus Wi-Fi in Building 3',
                description: 'Signal drops repeatedly during lecture hours. 2.4GHz works with slow speed.',
                status: 'New',
                requestedPriority: 'MEDIUM',
                itPriority: 'MEDIUM',
                requesterId: jennifer.id,
                ownerId: null,
                categoryId: netCategory.id,
                relatedSystemId: wifiSys.id,
            }
        })
        console.log('✅ Seeded sample Tickets with Public Comments and Internal Notes.')
    }

    console.log('🎉 Seeding finished successfully!')
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
