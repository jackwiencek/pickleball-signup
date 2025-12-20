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

    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Slot ID is required'
        })
    }

    try {
        // Only allow deleting available slots
        const existing = await db.execute({
            sql: 'SELECT status FROM time_slots WHERE id = ?',
            args: [id]
        })

        if (existing.rows.length === 0) {
            throw createError({
                statusCode: 404,
                message: 'Slot not found'
            })
        }

        if (existing.rows[0].status !== 'available') {
            throw createError({
                statusCode: 400,
                message: 'Cannot delete a slot that is pending or confirmed'
            })
        }

        await db.execute({
            sql: 'DELETE FROM time_slots WHERE id = ?',
            args: [id]
        })

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to delete slot'
        })
    }
})
