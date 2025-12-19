export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    // Basic validation
    if (!body.name || !body.email) {
        throw createError({
            statusCode: 400,
            message: 'Name and email are required'
        })
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