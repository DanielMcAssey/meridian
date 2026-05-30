export default defineNuxtRouteMiddleware(() => {
  const profile = useProfileStore()
  if (profile.name) return navigateTo('/menu')
})
