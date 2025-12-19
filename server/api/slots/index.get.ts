import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const { start, end, available_only } = query

    try {
        let sql = 'SELECT * FROM time_slots'
        const args: any[] = []
        const conditions: string[] = []

        if (start) {
            conditions.push('date >= ?')
            args.push(start)
        }

        if (end) {
            conditions.push('date <= ?')
            args.push(end)
        }

        if (available_only === 'true') {
            conditions.push("status = 'available'")
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ')
        }

        sql += ' ORDER BY date, start_time'

        const result = await db.execute({ sql, args })
        return result.rows
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch slots'
        })
    }
})
