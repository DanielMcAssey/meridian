export default defineNuxtRouteMiddleware(() => {
  const session = useSessionStore()
  if (!session.hasFinished) return navigateTo('/menu')
})
