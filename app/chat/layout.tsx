import DashboardLayout from '../components/DashboardLayout'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
