/* =========================================
   DATA
========================================= */

const fuelEntries =
JSON.parse(
localStorage.getItem(
"fuelEntries"
)
) || [];

const drivers =
JSON.parse(
localStorage.getItem(
"drivers"
)
) || [];

/* =========================================
   METRICS
========================================= */

const commandMetrics =
document.getElementById(
"commandMetrics"
);

let totalFuel = 0;
let highRisk = 0;

fuelEntries.forEach(entry=>{

totalFuel +=
Number(entry.fuel);

if(entry.fuel > 120){
highRisk++;
}

});

commandMetrics.innerHTML = `

<article class="stat-card">
<h3>Total Fuel Used</h3>
<strong>${totalFuel} L</strong>
</article>

<article class="stat-card">
<h3>Total Fuel Entries</h3>
<strong>${fuelEntries.length}</strong>
</article>

<article class="stat-card">
<h3>High Risk Alerts</h3>
<strong>${highRisk}</strong>
</article>

<article class="stat-card">
<h3>Registered Drivers</h3>
<strong>${drivers.length}</strong>
</article>

`;

/* =========================================
   CRITICAL ALERTS
========================================= */

const criticalAlerts =
document.getElementById(
"criticalAlerts"
);

fuelEntries.forEach(entry=>{

if(entry.fuel > 120){

criticalAlerts.innerHTML += `

<div class="list-item">

<strong>
${entry.vehicle}
</strong>

<p>
Possible fuel theft detected.
Driver :
${entry.driver}
</p>

</div>

`;

}

});

/* =========================================
   TOP DRIVER
========================================= */

const topDrivers =
document.getElementById(
"topDrivers"
);

const driverScores = {};

fuelEntries.forEach(entry=>{

if(!driverScores[entry.driver]){

driverScores[entry.driver] = 0;

}

driverScores[entry.driver] +=
Number(entry.efficiency || 0);

});

Object.keys(driverScores)
.sort(
(a,b)=>
driverScores[b]-driverScores[a]
)
.slice(0,3)
.forEach(driver=>{

topDrivers.innerHTML += `

<div class="list-item">

<strong>
${driver}
</strong>

<p>
AI Efficiency Score :
${driverScores[driver].toFixed(2)}
</p>

</div>

`;

});

/* =========================================
   SUSPICIOUS TABLE
========================================= */

const suspiciousTable =
document.getElementById(
"suspiciousTable"
);

fuelEntries.forEach(entry=>{

if(entry.fuel > 80){

let risk = "MEDIUM";

if(entry.fuel > 120){
risk = "HIGH";
}

suspiciousTable.innerHTML += `

<tr>

<td>
${entry.vehicle}
</td>

<td>
${entry.driver}
</td>

<td>
${entry.fuel} L
</td>

<td>
${risk}
</td>

</tr>

`;

}

});
