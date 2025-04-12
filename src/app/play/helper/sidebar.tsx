import React from 'react'

export default function WithSidebar({
  header,
  children,
}: {
  header?: React.ReactElement
  children: React.ReactElement
}) {
  return (
    <div className="bg-[#570000] flex flex-col w-full h-full overflow-hidden rounded-md">
      {header ? <div className="flex-shrink-0">{header}</div> : null}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 h-full">
        {children}
      </div>
    </div>
  )
}
