const trackingMap =
document.getElementById(
"trackingMap"
);

const vehicleStatus =
document.getElementById(
"vehicleStatus"
);

const fuelEntries =
JSON.parse(
localStorage.getItem(
"fuelEntries"
)
) || [];

const vehicles = [];

fuelEntries.forEach((entry,index)=>{

const x =
Math.random() * 85;

const y =
Math.random() * 80;

const highRisk =
entry.fuel > 120;

vehicles.push({

vehicle:
entry.vehicle,

driver:
entry.driver,

fuel:
entry.fuel,

x,
y,

highRisk

});

});

/* =========================================
   CREATE VEHICLES
========================================= */

vehicles.forEach(vehicle=>{

const dot =
document.createElement("div");

dot.className =
vehicle.highRisk
? "vehicle-dot high-risk-dot"
: "vehicle-dot";

dot.style.left =
vehicle.x + "%";

dot.style.top =
vehicle.y + "%";

const label =
document.createElement("div");

label.className =
"vehicle-label";

label.style.left =
(vehicle.x + 2) + "%";

label.style.top =
(vehicle.y + 2) + "%";

label.innerHTML = `

<strong>
${vehicle.vehicle}
</strong>

<br>

Driver :
${vehicle.driver}

`;

trackingMap.appendChild(dot);

trackingMap.appendChild(label);

/* STATUS */

vehicleStatus.innerHTML += `

<div class="list-item">

<strong>
${vehicle.vehicle}
</strong>

<p>
Driver :
${vehicle.driver}
</p>

<p>
Fuel :
${vehicle.fuel} L
</p>

<p>
Status :
${vehicle.highRisk
? "⚠ High Risk"
: "✅ Stable"}
</p>

</div>

`;

});

/* =========================================
   MOVEMENT
========================================= */

setInterval(()=>{

const dots =
document.querySelectorAll(
".vehicle-dot"
);

dots.forEach(dot=>{

dot.style.left =
(Math.random() * 85) + "%";

dot.style.top =
(Math.random() * 80) + "%";

});

},4000);
