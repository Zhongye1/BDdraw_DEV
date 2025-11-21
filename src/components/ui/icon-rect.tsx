import React from 'react'

type IconRectProps = React.SVGProps<SVGSVGElement>

const IconRect: React.FC<IconRectProps> = (props) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  )
}

export default IconRect
