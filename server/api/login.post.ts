export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (body.password !== process.env.ADMIN_PASSWORD) {
        throw createError({
            statusCode: 401,
            message: 'Invalid password'
        })
    }

    await setUserSession(event, {
        user: { role: 'admin' }
    })

    return { success: true }
})