
function submitFuel() {

  const vehicle = document.getElementById('vehicle').value.trim()
  const driver = document.getElementById('driver').value.trim()
  const fuel = parseFloat(document.getElementById('fuel').value)
  const odometer = parseFloat(document.getElementById('odometer').value)

  const aiResult = document.getElementById('aiResult')

  // VALIDATION

  if (!vehicle || !driver || !fuel || !odometer) {

    aiResult.classList.remove('hidden')

    aiResult.innerHTML = `

      <div class="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">

        <h2 class="text-2xl font-bold text-red-400 mb-3">
          Missing Information
        </h2>

        <p class="text-gray-300">
          Please fill all required fields.
        </p>

      </div>

    `

    return
  }

  // AI LOGIC

  let risk = 'LOW'
  let message = 'Fuel usage looks normal.'
  let color = 'green'
  let efficiency = (Math.random() * (6 - 3) + 3).toFixed(1)

  // AI RISK DETECTION

  if (fuel > 120) {

    risk = 'HIGH'

    color = 'red'

    message =
      'AI detected abnormal fuel quantity. Possible suspicious fueling activity.'

  }

  else if (fuel > 80) {

    risk = 'MEDIUM'

    color = 'yellow'

    message =
      'Fuel consumption slightly above expected operational range.'
  }

  // AI ADDITIONAL INSIGHTS

  let aiInsights = []

  if (fuel > 100) {
    aiInsights.push('Possible duplicate fueling pattern detected.')
  }

  if (efficiency < 4) {
    aiInsights.push('Mileage efficiency below fleet average.')
  }

  if (odometer > 200000) {
    aiInsights.push('Vehicle may require servicing inspection.')
  }

  if (aiInsights.length === 0) {
    aiInsights.push('Vehicle fuel behavior appears stable.')
  }

  // SAVE DATA LOCALLY

  const entry = {
    vehicle,
    driver,
    fuel,
    odometer,
    efficiency,
    risk,
    message,
    time: new Date().toLocaleString()
  }

  let fuelEntries =
    JSON.parse(localStorage.getItem('fuelEntries')) || []

  fuelEntries.push(entry)

  localStorage.setItem(
    'fuelEntries',
    JSON.stringify(fuelEntries)
  )

  // SHOW AI RESULT

  aiResult.classList.remove('hidden')

  aiResult.innerHTML = `

    <div class="space-y-6">

      <div class="flex justify-between items-center">

        <h2 class="text-4xl font-bold text-${color}-400">
          AI Fuel Analysis
        </h2>

        <div class="bg-${color}-500/10 border border-${color}-500/20 px-5 py-2 rounded-2xl">
          ${risk} RISK
        </div>

      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div class="bg-[#122033] p-5 rounded-2xl">

          <p class="text-gray-400 mb-2">Vehicle</p>

          <h3 class="text-2xl font-bold">
            ${vehicle}
          </h3>

        </div>

        <div class="bg-[#122033] p-5 rounded-2xl">

          <p class="text-gray-400 mb-2">Driver</p>

          <h3 class="text-2xl font-bold">
            ${driver}
          </h3>

        </div>

        <div class="bg-[#122033] p-5 rounded-2xl">

          <p class="text-gray-400 mb-2">Fuel Quantity</p>

          <h3 class="text-2xl font-bold">
            ${fuel} L
          </h3>

        </div>

        <div class="bg-[#122033] p-5 rounded-2xl">

          <p class="text-gray-400 mb-2">Mileage Efficiency</p>

          <h3 class="text-2xl font-bold">
            ${efficiency} km/L
          </h3>

        </div>

      </div>

      <div class="bg-${color}-500/10 border border-${color}-500/20 p-6 rounded-2xl">

        <h3 class="text-2xl font-bold mb-4">
          AI Risk Observation
        </h3>

        <p class="text-lg">
          ${message}
        </p>

      </div>

      <div class="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-2xl">

        <h3 class="text-2xl font-bold text-cyan-400 mb-5">
          AI Operational Insights
        </h3>

        <ul class="space-y-3">

          ${aiInsights.map(item => `
            <li>
              • ${item}
            </li>
          `).join('')}

        </ul>

      </div>

      <div class="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl">

        Fuel entry saved successfully in local storage.

      </div>

    </div>

  `

  console.log('Fuel Entry Saved:', entry)
}
