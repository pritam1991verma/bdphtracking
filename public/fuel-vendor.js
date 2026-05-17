function saveVendor(){

  const vendorName =
    document.getElementById('vendorName').value

  const location =
    document.getElementById('location').value

  const fuelRate =
    document.getElementById('fuelRate').value

  const contact =
    document.getElementById('contact').value

  if(
    !vendorName ||
    !location ||
    !fuelRate ||
    !contact
  ){
    alert('Please fill all fields')
    return
  }

  const vendor = {
    vendorName,
    location,
    fuelRate,
    contact
  }

  let vendors =
    JSON.parse(localStorage.getItem('fuelVendors')) || []

  vendors.push(vendor)

  localStorage.setItem(
    'fuelVendors',
    JSON.stringify(vendors)
  )

  loadVendors()

  document.getElementById('vendorName').value=''
  document.getElementById('location').value=''
  document.getElementById('fuelRate').value=''
  document.getElementById('contact').value=''
}

function loadVendors(){

  const table =
    document.getElementById('vendorTable')

  table.innerHTML=''

  let vendors =
    JSON.parse(localStorage.getItem('fuelVendors')) || []

  vendors.forEach(vendor=>{

    table.innerHTML += `

      <tr>

        <td>${vendor.vendorName}</td>

        <td>${vendor.location}</td>

        <td>₹ ${vendor.fuelRate}</td>

        <td>${vendor.contact}</td>

      </tr>

    `
  })
}

loadVendors()
