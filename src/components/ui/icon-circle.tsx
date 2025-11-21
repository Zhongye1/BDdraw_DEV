import React from 'react'

type IconCircleProps = React.SVGProps<SVGSVGElement>

const IconCircle: React.FC<IconCircleProps> = (props) => {
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
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

export default IconCircle
