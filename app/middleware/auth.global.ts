export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const session = useCookie('demo-session')

  if (to.path.startsWith('/council') && !session.value) {
    return navigateTo('/login')
  }

  if (to.path === '/login' && session.value) {
    return navigateTo('/council')
  }
})
