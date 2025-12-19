import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
    // Verify admin session
    const session = await getUserSession(event)
    if (!session.user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    const body = await readBody(event)

    if (!body.slots || !Array.isArray(body.slots) || body.slots.length === 0) {
        throw createError({
            statusCode: 400,
            message: 'Slots array is required'
        })
    }

    try {
        let created = 0
        let skipped = 0

        for (const slot of body.slots) {
            if (!slot.date || !slot.start_time || !slot.end_time) {
                skipped++
                continue
            }

            // Check if slot already exists
            const existing = await db.execute({
                sql: 'SELECT id FROM time_slots WHERE date = ? AND start_time = ?',
                args: [slot.date, slot.start_time]
            })

            if (existing.rows.length > 0) {
                skipped++
                continue
            }

            await db.execute({
                sql: `INSERT INTO time_slots (date, start_time, end_time, status)
                      VALUES (?, ?, ?, 'available')`,
                args: [slot.date, slot.start_time, slot.end_time]
            })
            created++
        }

        return { success: true, created, skipped }
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to create slots'
        })
    }
})
