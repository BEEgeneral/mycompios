import DashboardLayout from '../components/DashboardLayout'

export default function AutonomousLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
