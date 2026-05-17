const fuelEntries =
  JSON.parse(localStorage.getItem('fuelEntries')) || []

const aiResults =
  document.getElementById('aiResults')

let totalMileage = 0
let highRiskCount = 0

fuelEntries.forEach(entry=>{

  totalMileage += Number(entry.efficiency || 0)

})

const avgMileage =
  fuelEntries.length > 0
  ? (totalMileage / fuelEntries.length).toFixed(2)
  : 0

document.getElementById('avgMileage')
.innerText = avgMileage + ' km/L'

document.getElementById('prediction')
.innerText =
  (avgMileage * 1.05).toFixed(2) + ' km/L'

fuelEntries.forEach(entry=>{

  let riskClass = 'normal-risk'

  let aiMessage =
    'Fuel behavior appears normal.'

  if(entry.fuel > 120){

    riskClass = 'high-risk'

    highRiskCount++

    aiMessage = `

      Possible fuel theft detected.
      Fuel quantity significantly higher than expected.

    `
  }

  else if(entry.efficiency < 4){

    riskClass = 'high-risk'

    highRiskCount++

    aiMessage = `

      Mileage efficiency dropped below AI threshold.
      Vehicle inspection recommended.

    `
  }

  aiResults.innerHTML += `

    <div class="result-card ${riskClass}">

      <h3>
        Vehicle : ${entry.vehicle}
      </h3>

      <p>
        Driver : ${entry.driver}
      </p>

      <p>
        Fuel : ${entry.fuel} L
      </p>

      <p>
        Mileage : ${entry.efficiency} km/L
      </p>

      <br>

      <strong>
        AI Observation:
      </strong>

      <p>
        ${aiMessage}
      </p>

    </div>

  `
})

document.getElementById('highRisk')
.innerText = highRiskCount
