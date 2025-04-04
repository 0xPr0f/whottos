import { Toaster } from './components/toaster'
import Navbar from './layout/navbar'

export default function Structure({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Navbar children={children} />
      <Toaster />
    </>
  )
}
