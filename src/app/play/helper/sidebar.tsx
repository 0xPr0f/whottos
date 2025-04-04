import React from 'react'

export default function WithSidebar({
  header,
  children,
}: {
  header?: React.ReactElement
  children: React.ReactElement
}) {
  return (
    <div className="bg-[#570000] p-2 h-[800px] flex flex-col overflow-hidden rounded-md">
      {header ? <div className="flex-shrink-0">{header}</div> : null}
      <div className="flex-grow overflow-y-auto overflow-x-hidden my-4 p-4">
        {children}
      </div>
    </div>
  )
}
