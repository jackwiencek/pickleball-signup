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
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Slot ID is required'
        })
    }

    if (!body.status) {
        throw createError({
            statusCode: 400,
            message: 'Status is required'
        })
    }

    const validStatuses = ['available', 'pending', 'confirmed']
    if (!validStatuses.includes(body.status)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid status. Must be: available, pending, or confirmed'
        })
    }

    try {
        const existing = await db.execute({
            sql: 'SELECT * FROM time_slots WHERE id = ?',
            args: [id]
        })

        if (existing.rows.length === 0) {
            throw createError({
                statusCode: 404,
                message: 'Slot not found'
            })
        }

        // Update the slot status
        await db.execute({
            sql: 'UPDATE time_slots SET status = ? WHERE id = ?',
            args: [body.status, id]
        })

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to update slot'
        })
    }
})
