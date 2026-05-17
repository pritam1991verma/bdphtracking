const fuelEntries =
  JSON.parse(localStorage.getItem('fuelEntries')) || []

const driverMap = {}

fuelEntries.forEach(entry=>{

  if(!driverMap[entry.driver]){

    driverMap[entry.driver] = {

      totalFuel:0,
      totalMileage:0,
      entries:0
    }
  }

  driverMap[entry.driver].totalFuel +=
    Number(entry.fuel)

  driverMap[entry.driver].totalMileage +=
    Number(entry.efficiency || 0)

  driverMap[entry.driver].entries += 1
})

const driverCards =
  document.getElementById('driverCards')

const topDriver =
  document.getElementById('topDriver')

let bestDriver = ''
let bestScore = 0

Object.keys(driverMap).forEach(driver=>{

  const data = driverMap[driver]

  const avgMileage =
    data.totalMileage / data.entries

  let score =
    (avgMileage * 20).toFixed(0)

  let level = 'medium'
  let status = 'Average'

  if(avgMileage > 5){

    level = 'high'
    status = 'Excellent Fuel Efficiency'
  }

  else if(avgMileage < 4){

    level = 'low'
    status = 'Fuel Efficiency Low'
  }

  if(score > bestScore){

    bestScore = score
    bestDriver = driver
  }

  driverCards.innerHTML += `

    <div class="driver-card ${level}">

      <h2>${driver}</h2>

      <p>
        Total Entries :
        ${data.entries}
      </p>

      <p>
        Average Mileage :
        ${avgMileage.toFixed(2)} km/L
      </p>

      <p>
        AI Score :
        ${score}/100
      </p>

      <br>

      <strong>
        ${status}
      </strong>

    </div>

  `
})

topDriver.innerHTML = `

  <h2>
    Top AI Ranked Driver
  </h2>

  <br>

  <h1>
    ${bestDriver}
  </h1>

  <p>
    AI Performance Score :
    ${bestScore}/100
  </p>

`
