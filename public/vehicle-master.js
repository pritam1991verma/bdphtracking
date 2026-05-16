function saveVehicle(){

  const vehicleNumber =
    document.getElementById('vehicleNumber').value

  const driverName =
    document.getElementById('driverName').value

  const capacity =
    document.getElementById('capacity').value

  const mileage =
    document.getElementById('mileage').value

  if(
    !vehicleNumber ||
    !driverName ||
    !capacity ||
    !mileage
  ){
    alert('Please fill all fields')
    return
  }

  const vehicle = {
    vehicleNumber,
    driverName,
    capacity,
    mileage
  }

  let vehicles =
    JSON.parse(localStorage.getItem('vehicles')) || []

  vehicles.push(vehicle)

  localStorage.setItem(
    'vehicles',
    JSON.stringify(vehicles)
  )

  loadVehicles()

  document.getElementById('vehicleNumber').value=''
  document.getElementById('driverName').value=''
  document.getElementById('capacity').value=''
  document.getElementById('mileage').value=''
}

function loadVehicles(){

  const table =
    document.getElementById('vehicleData')

  table.innerHTML=''

  let vehicles =
    JSON.parse(localStorage.getItem('vehicles')) || []

  vehicles.forEach(vehicle=>{

    table.innerHTML += `

      <tr>

        <td>${vehicle.vehicleNumber}</td>

        <td>${vehicle.driverName}</td>

        <td>${vehicle.capacity} L</td>

        <td>${vehicle.mileage} km/L</td>

      </tr>

    `
  })
}

loadVehicles()
