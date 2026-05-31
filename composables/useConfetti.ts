const PALETTES: Record<1 | 2 | 3, string[]> = {
  1: ['#FFD700', '#FFC107', '#FFECB3', '#FFF9C4', '#FFB300', '#FFCA28', '#ffffff'],
  2: ['#E8E8E8', '#C0C0C0', '#B0BEC5', '#ECEFF1', '#CFD8DC', '#ffffff', '#90A4AE'],
  3: ['#CD7F32', '#A0522D', '#D2691E', '#FFCC80', '#FF8F00', '#E65100', '#FFE0B2'],
}

export function useConfetti() {
  function launch(rank: 1 | 2 | 3) {
    if (typeof document === 'undefined') return

    const canvas = document.createElement('canvas')
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
    document.body.appendChild(canvas)

    const ctx = canvas.getContext('2d')!
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = PALETTES[rank]
    const count = rank === 1 ? 220 : rank === 2 ? 180 : 140

    type Particle = {
      x: number; y: number
      w: number; h: number
      color: string
      vx: number; vy: number
      rot: number; vrot: number
    }

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * -0.5 - 20,
      w: 7 + Math.random() * 7,
      h: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      vx: (Math.random() - 0.5) * 4,
      vy: 2.5 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.18,
    }))

    let raf: number

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = 0

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.07
        p.rot += p.vrot

        if (p.y < canvas.height + 30) alive++

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.y > canvas.height * 0.8
          ? Math.max(0, 1 - (p.y - canvas.height * 0.8) / (canvas.height * 0.2))
          : 1
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (alive > 0) {
        raf = requestAnimationFrame(tick)
      } else {
        cleanup()
      }
    }

    const cleanup = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.remove()
    }

    raf = requestAnimationFrame(tick)
    setTimeout(cleanup, 7000)
  }

  return { launch }
}
