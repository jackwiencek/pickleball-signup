import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    // Basic validation
    if (!body.name || !body.email || !body.experience) {
        throw createError({
            statusCode: 400,
            message: 'Name, email, and experience are required'
        })
    }

    if (body.experience) {
        const exp = parseFloat(body.experience)
        if (isNaN(exp) || exp < 1.0 || exp > 8.0) {
            throw createError({
                statusCode: 400,
                message: 'Experience must be between 1.0 and 8.0'
            })
        }
    }

    try {
        await db.execute({
            sql: `INSERT INTO signups (name, email, phone, experience, availability, message) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
                body.name,
                body.email,
                body.phone || null,
                body.experience || null,
                body.availability || null,
                body.message || null
            ]
        })

        return { success: true }
    } catch (error) {
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to save signup'
        })
    }
})