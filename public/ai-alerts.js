const alertsContainer =
  document.getElementById('alertsContainer')

const fuelEntries =
  JSON.parse(localStorage.getItem('fuelEntries')) || []

let alerts = []

fuelEntries.forEach(entry=>{

  // HIGH RISK

  if(entry.fuel > 120){

    alerts.push({

      vehicle: entry.vehicle,

      message:
        'Abnormally high fuel quantity detected.',

      risk:'HIGH'
    })
  }

  // MEDIUM RISK

  else if(entry.fuel > 80){

    alerts.push({

      vehicle: entry.vehicle,

      message:
        'Fuel usage above expected range.',

      risk:'MEDIUM'
    })
  }

  // LOW RISK

  else{

    alerts.push({

      vehicle: entry.vehicle,

      message:
        'Fuel behavior normal.',

      risk:'LOW'
    })
  }

})

if(alerts.length===0){

  alertsContainer.innerHTML = `

    <div class="alert-card low">

      <h3>No Alerts Found</h3>

      <p>
        AI monitoring active. No suspicious activity detected.
      </p>

    </div>

  `
}

alerts.forEach(alert=>{

  let riskClass='low'

  if(alert.risk==='HIGH'){
    riskClass='high'
  }

  else if(alert.risk==='MEDIUM'){
    riskClass='medium'
  }

  alertsContainer.innerHTML += `

    <div class="alert-card ${riskClass}">

      <h3>
        Vehicle : ${alert.vehicle}
      </h3>

      <p>
        ${alert.message}
      </p>

      <div class="alert-risk">
        Risk Level : ${alert.risk}
      </div>

    </div>

  `
})
