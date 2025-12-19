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

    if (!body.key || body.value === undefined) {
        throw createError({
            statusCode: 400,
            message: 'Key and value are required'
        })
    }

    try {
        // Upsert the setting
        await db.execute({
            sql: `INSERT INTO settings (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            args: [body.key, body.value]
        })

        return { success: true }
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to save setting'
        })
    }
})
