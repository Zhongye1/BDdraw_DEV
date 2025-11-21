import React from 'react'

type IconSelectProps = React.SVGProps<SVGSVGElement>

const IconSelect: React.FC<IconSelectProps> = (props) => {
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
      <path d="M3 3l7 7-7 7 14-14z" />
      <path d="M13 13l8 8" />
    </svg>
  )
}

export default IconSelect
