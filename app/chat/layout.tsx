// Chat page uses its own dark layout (no DashboardLayout wrapper)
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
