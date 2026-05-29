export function calcOptClass(isAnswer: boolean, isPicked: boolean, locked: boolean): string {
  if (locked) {
    if (isAnswer) return 'opt-correct'
    if (isPicked) return 'opt-wrong'
    return 'opt-dim'
  }
  return isPicked ? 'opt-picked' : ''
}
