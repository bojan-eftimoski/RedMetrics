export function Skeleton({ height = 24, width = '100%' }: { height?: number | string; width?: number | string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        background: 'linear-gradient(90deg, #1a2438 0%, #243047 50%, #1a2438 100%)',
        backgroundSize: '200% 100%',
        borderRadius: 6,
        animation: 'skeleton 1.4s ease-in-out infinite',
      }}
    />
  )
}

const css = `
@keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`
if (typeof document !== 'undefined' && !document.getElementById('skeleton-keyframes')) {
  const style = document.createElement('style')
  style.id = 'skeleton-keyframes'
  style.textContent = css
  document.head.appendChild(style)
}
