/* =========================================
   FETCH DATA
========================================= */

const fuelEntries =
JSON.parse(
localStorage.getItem(
"fuelEntries"
)
) || [];

/* =========================================
   ELEMENTS
========================================= */

const vehicleStatus =
document.getElementById(
"vehicleStatus"
);

const liveCount =
document.getElementById(
"liveCount"
);

const movingCount =
document.getElementById(
"movingCount"
);

const riskCount =
document.getElementById(
"riskCount"
);

/* =========================================
   METRICS
========================================= */

liveCount.innerText =
fuelEntries.length || 0;

movingCount.innerText =
Math.max(
1,
Math.floor(
fuelEntries.length * 0.7
)
);

let highRisk = 0;

/* =========================================
   VEHICLE CARDS
========================================= */

fuelEntries.forEach(entry=>{

let status =
"Stable";

let riskClass =
"#00ff88";

let aiMessage =
"AI tracking normal.";

if(entry.fuel > 120){

status =
"High Risk";

riskClass =
"#ff1744";

aiMessage =
"Possible fuel theft detected.";

highRisk++;

}

else if(entry.fuel > 80){

status =
"Medium Risk";

riskClass =
"#ff9800";

aiMessage =
"Fuel above expected usage.";

}

/* CARD */

vehicleStatus.innerHTML += `

<div class="vehicle-card">

<strong>
${entry.vehicle}
</strong>

<p>
👨 Driver :
${entry.driver}
</p>

<p>
⛽ Fuel :
${entry.fuel} L
</p>

<p>
📈 Mileage :
${entry.efficiency} km/L
</p>

<p style="
color:${riskClass};
font-weight:700;
">

⚡ ${status}

</p>

<p>
🤖 ${aiMessage}
</p>

</div>

`;

});

/* =========================================
   RISK COUNT
========================================= */

riskCount.innerText =
highRisk;

/* =========================================
   LIVE DOT MOVEMENT
========================================= */

const dots =
document.querySelectorAll(
".vehicle-dot"
);

setInterval(()=>{

dots.forEach(dot=>{

const x =
Math.random() * 80;

const y =
Math.random() * 80;

dot.style.left =
x + "%";

dot.style.top =
y + "%";

});

},4000);

/* =========================================
   AI ALERT ROTATION
========================================= */

const aiAlerts =
document.getElementById(
"aiAlerts"
);

const dynamicAlerts = [

"🚨 AI predicts abnormal fuel trend in 3 vehicles",

"⚡ Possible nighttime fuel extraction detected",

"📡 Vehicle stopped outside route corridor",

"🛰 AI detected inconsistent mileage pattern",

"⛽ Fuel refill frequency increased by 12%",

"🤖 Predictive AI suggests engine inspection"

];

let alertIndex = 0;

setInterval(()=>{

const newAlert =
document.createElement("div");

newAlert.className =
"alert info";

newAlert.innerText =
dynamicAlerts[alertIndex];

aiAlerts.prepend(
newAlert
);

if(aiAlerts.children.length > 6){

aiAlerts.removeChild(
aiAlerts.lastChild
);

}

alertIndex++;

if(alertIndex >= dynamicAlerts.length){

alertIndex = 0;

}

},6000);

/* =========================================
   LIVE CLOCK
========================================= */

const heroLive =
document.querySelector(
".hero-live"
);

setInterval(()=>{

const time =
new Date().toLocaleTimeString();

heroLive.innerHTML = `

<div class="pulse"></div>

LIVE ACTIVE • ${time}

`;

},1000);
