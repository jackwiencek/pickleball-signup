export default defineNuxtRouteMiddleware(async (to) => {
    if (to.path.startsWith('/admin')) {
        const { loggedIn } = useUserSession()

        if (!loggedIn.value) {
            return navigateTo('/login')
        }
    }
})