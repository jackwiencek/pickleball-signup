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

    if (!body.date || !body.start_time || !body.end_time) {
        throw createError({
            statusCode: 400,
            message: 'Date, start_time, and end_time are required'
        })
    }

    try {
        // Check if slot already exists
        const existing = await db.execute({
            sql: 'SELECT id FROM time_slots WHERE date = ? AND start_time = ?',
            args: [body.date, body.start_time]
        })

        if (existing.rows.length > 0) {
            throw createError({
                statusCode: 409,
                message: 'Slot already exists'
            })
        }

        await db.execute({
            sql: `INSERT INTO time_slots (date, start_time, end_time, status)
                  VALUES (?, ?, ?, 'available')`,
            args: [body.date, body.start_time, body.end_time]
        })

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to create slot'
        })
    }
})
