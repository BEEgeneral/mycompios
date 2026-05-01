export default function RevenuePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
      <p className="text-gray-500 mt-2">Tu negocio en numeros</p>
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">MRR</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">Mensual</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">ARR</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">Anual</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Clientes</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">Activos</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Crecimiento</p>
          <p className="text-2xl font-bold text-green-600">0%</p>
          <p className="text-xs text-gray-400 mt-1">Mes pasado</p>
        </div>
      </div>
    </div>
  )
}
