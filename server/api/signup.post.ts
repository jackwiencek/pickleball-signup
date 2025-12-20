import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    // Basic validation
    if (!body.name || !body.email || !body.experience || !body.location) {
        throw createError({
            statusCode: 400,
            message: 'Name, email, experience, and location are required'
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

    // Validate slot selection
    const selectedSlots = body.selected_slots || []
    const noAvailability = body.no_availability === 1

    if (!noAvailability && selectedSlots.length === 0) {
        throw createError({
            statusCode: 400,
            message: 'Please select at least one time slot or indicate no availability'
        })
    }

    try {
        // If slots are selected, verify they are all available
        if (selectedSlots.length > 0) {
            const placeholders = selectedSlots.map(() => '?').join(',')
            const slotsCheck = await db.execute({
                sql: `SELECT id, status FROM time_slots WHERE id IN (${placeholders})`,
                args: selectedSlots
            })

            // Check if all slots exist
            if (slotsCheck.rows.length !== selectedSlots.length) {
                throw createError({
                    statusCode: 400,
                    message: 'One or more selected slots no longer exist'
                })
            }

            // Check if all slots are available
            const unavailable = slotsCheck.rows.filter((s) => (s as unknown as { status: string }).status !== 'available')
            if (unavailable.length > 0) {
                throw createError({
                    statusCode: 400,
                    message: 'One or more selected slots are no longer available'
                })
            }
        }

        // Insert the signup
        const result = await db.execute({
            sql: `INSERT INTO signups (name, email, phone, experience, location, selected_slots, no_availability, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                body.name,
                body.email,
                body.phone || null,
                body.experience || null,
                body.location,
                selectedSlots.length > 0 ? JSON.stringify(selectedSlots) : null,
                noAvailability ? 1 : 0,
                body.message || null
            ]
        })

        // Get the new signup ID
        const signupId = result.lastInsertRowid

        // Mark selected slots as pending
        if (selectedSlots.length > 0 && signupId) {
            const placeholders = selectedSlots.map(() => '?').join(',')
            await db.execute({
                sql: `UPDATE time_slots SET status = 'pending', booked_by = ? WHERE id IN (${placeholders})`,
                args: [signupId, ...selectedSlots]
            })
        }

        return { success: true }
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) throw error
        console.error('Database error:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to save signup'
        })
    }
})
