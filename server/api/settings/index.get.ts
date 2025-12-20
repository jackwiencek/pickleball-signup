import { db } from '../../utils/db'

export default defineEventHandler(async () => {
    try {
        const result = await db.execute('SELECT * FROM settings')
        return result.rows
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch settings'
        })
    }
})
