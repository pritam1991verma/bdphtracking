const vehicles = [

  {
    number:'BR01AB1234',
    driver:'Rakesh',
    fuel:'120 L',
    mileage:'3.2 km/L',
    risk:'HIGH'
  },

  {
    number:'JH09XX9912',
    driver:'Pritam',
    fuel:'90 L',
    mileage:'4.5 km/L',
    risk:'MEDIUM'
  },

  {
    number:'WB11PQ1232',
    driver:'Amit',
    fuel:'70 L',
    mileage:'5.2 km/L',
    risk:'LOW'
  }

]

const table = document.getElementById('vehicleTable')

vehicles.forEach(vehicle => {

  let riskClass = ''

  if(vehicle.risk === 'HIGH'){
    riskClass = 'risk-high'
  }

  else if(vehicle.risk === 'MEDIUM'){
    riskClass = 'risk-medium'
  }

  else{
    riskClass = 'risk-low'
  }

  table.innerHTML += `

    <tr>

      <td>${vehicle.number}</td>
      <td>${vehicle.driver}</td>
      <td>${vehicle.fuel}</td>
      <td>${vehicle.mileage}</td>

      <td class="${riskClass}">
        ${vehicle.risk}
      </td>

    </tr>

  `
})
