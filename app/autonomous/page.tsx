import AutonomousSlider from '../components/AutonomousSlider'

export default function AutonomousPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Modo Autónomo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tu equipo IA trabaja de forma continua mientras tú descansas. 
            Selecciona la duración y deja que MyCompi ejecute tus tareas 24/7.
          </p>
        </div>

        {/* Pricing Tiers Info */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-bold text-gray-900 mb-1">Toma de Decisiones</h3>
            <p className="text-sm text-gray-600">
              MyCompi analiza situaciones y toma decisiones automáticamente
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold text-gray-900 mb-1">Ejecución Continua</h3>
            <p className="text-sm text-gray-600">
              Trabaja 24/7 sin pausas ni descansos
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-bold text-gray-900 mb-1">Feedback en Tiempo Real</h3>
            <p className="text-sm text-gray-600">
              Chatea cuando quieras para dar instrucciones
            </p>
          </div>
        </div>

        {/* Slider Component */}
        <AutonomousSlider />

        {/* Comparison Table */}
        <div className="mt-12 overflow-x-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
            Todos los planes
          </h3>
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duración</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Precio</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Por hora</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ahorro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-orange-50">
                <td className="px-4 py-3 font-medium">1 Hora</td>
                <td className="px-4 py-3 text-right">€19</td>
                <td className="px-4 py-3 text-right">€19.00</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
              </tr>
              <tr>
                <td className="px-4 py-3">2 Horas</td>
                <td className="px-4 py-3 text-right">€35</td>
                <td className="px-4 py-3 text-right">€17.50</td>
                <td className="px-4 py-3 text-right text-green-600">8%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">3 Horas</td>
                <td className="px-4 py-3 text-right">€49</td>
                <td className="px-4 py-3 text-right">€16.33</td>
                <td className="px-4 py-3 text-right text-green-600">14%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">6 Horas</td>
                <td className="px-4 py-3 text-right">€79</td>
                <td className="px-4 py-3 text-right">€13.17</td>
                <td className="px-4 py-3 text-right text-green-600">31%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">12 Horas</td>
                <td className="px-4 py-3 text-right">€149</td>
                <td className="px-4 py-3 text-right">€12.42</td>
                <td className="px-4 py-3 text-right text-green-600">35%</td>
              </tr>
              <tr className="bg-orange-50">
                <td className="px-4 py-3 font-medium">24 Horas</td>
                <td className="px-4 py-3 text-right font-medium">€249</td>
                <td className="px-4 py-3 text-right">€10.38</td>
                <td className="px-4 py-3 text-right text-green-600">45%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">48 Horas</td>
                <td className="px-4 py-3 text-right">€379</td>
                <td className="px-4 py-3 text-right">€7.90</td>
                <td className="px-4 py-3 text-right text-green-600">58%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">72 Horas (3 días)</td>
                <td className="px-4 py-3 text-right">€499</td>
                <td className="px-4 py-3 text-right">€6.93</td>
                <td className="px-4 py-3 text-right text-green-600">64%</td>
              </tr>
              <tr className="bg-gradient-to-r from-amber-100 to-orange-100">
                <td className="px-4 py-3 font-bold">7 Días</td>
                <td className="px-4 py-3 text-right font-bold">€999</td>
                <td className="px-4 py-3 text-right">€5.95</td>
                <td className="px-4 py-3 text-right text-green-600 font-bold">69%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Preguntas frecuentes</h3>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h4 className="font-semibold text-gray-900 mb-2">¿Qué pasa durante el modo autónomo?</h4>
              <p className="text-sm text-gray-600">
                MyCompi analiza tus tareas, prospectos y datos continuamente. Toma decisiones, crea tareas y ejecuta acciones de forma automática.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h4 className="font-semibold text-gray-900 mb-2">¿Puedo parar en cualquier momento?</h4>
              <p className="text-sm text-gray-600">
                Sí, puedes desactivar el modo autónomo desde tu dashboard en cualquier momento.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h4 className="font-semibold text-gray-900 mb-2">¿Qué pasa si no estoy de acuerdo con una decisión?</h4>
              <p className="text-sm text-gray-600">
                Puedes chatear con MyCompi en cualquier momento para dar feedback o revertir decisiones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
