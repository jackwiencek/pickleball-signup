import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
    // Verify session
    const session = await getUserSession(event)

    if (!session.user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        })
    }

    try {
        const result = await db.execute(
            'SELECT * FROM signups ORDER BY created_at DESC'
        )

        return result.rows
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch signups'
        })
    }
})