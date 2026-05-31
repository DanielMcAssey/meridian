export default defineNuxtRouteMiddleware(() => {
  const profile = useProfileStore()
  if (profile.name && profile.userId) return navigateTo('/menu')
})
