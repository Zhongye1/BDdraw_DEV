import React from 'react'

type IconTriangleProps = React.SVGProps<SVGSVGElement>

const IconTriangle: React.FC<IconTriangleProps> = (props) => {
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
      <path d="M12 3L21 21H3L12 3Z" />
    </svg>
  )
}

export default IconTriangle
