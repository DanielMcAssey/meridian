export default defineNuxtRouteMiddleware(() => {
  const session = useSessionStore()
  if (!session.hasSession) return navigateTo('/menu')
})
