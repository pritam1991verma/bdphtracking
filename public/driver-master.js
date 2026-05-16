function saveDriver(){

  const driverName =
    document.getElementById('driverName').value

  const mobile =
    document.getElementById('mobile').value

  const license =
    document.getElementById('license').value

  const assignedVehicle =
    document.getElementById('assignedVehicle').value

  if(
    !driverName ||
    !mobile ||
    !license ||
    !assignedVehicle
  ){
    alert('Please fill all fields')
    return
  }

  const driver = {
    driverName,
    mobile,
    license,
    assignedVehicle
  }

  let drivers =
    JSON.parse(localStorage.getItem('drivers')) || []

  drivers.push(driver)

  localStorage.setItem(
    'drivers',
    JSON.stringify(drivers)
  )

  loadDrivers()

  document.getElementById('driverName').value=''
  document.getElementById('mobile').value=''
  document.getElementById('license').value=''
  document.getElementById('assignedVehicle').value=''
}

function loadDrivers(){

  const table =
    document.getElementById('driverData')

  table.innerHTML=''

  let drivers =
    JSON.parse(localStorage.getItem('drivers')) || []

  drivers.forEach(driver=>{

    table.innerHTML += `

      <tr>

        <td>${driver.driverName}</td>

        <td>${driver.mobile}</td>

        <td>${driver.license}</td>

        <td>${driver.assignedVehicle}</td>

      </tr>

    `
  })
}

loadDrivers()
