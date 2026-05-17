const alertContainer =
document.getElementById(
"alertContainer"
);

const fuelEntries =
JSON.parse(
localStorage.getItem(
"fuelEntries"
)
) || [];

if(fuelEntries.length === 0){

alertContainer.innerHTML = `

<article class="panel section-card">

<h3>
No Alerts Found
</h3>

<p>
AI monitoring active.
No abnormal fuel activity detected.
</p>

</article>

`;

}

fuelEntries.forEach(entry=>{

let type =
"Normal";

let color =
"#00ff88";

let message =
"Fuel usage stable.";

if(entry.fuel > 120){

type = "HIGH RISK";

color = "#ff1744";

message = `
Possible fuel theft detected.
Immediate operational review required.
`;
}

else if(entry.fuel > 80){

type = "MEDIUM RISK";

color = "#ff9100";

message = `
Fuel consumption above expected threshold.
`;
}

alertContainer.innerHTML += `

<article class="panel section-card"
style="
border-left:6px solid ${color};
">

<h3>
${entry.vehicle}
</h3>

<p>
Driver :
${entry.driver}
</p>

<p>
Fuel :
${entry.fuel} L
</p>

<p>
Mileage :
${entry.efficiency} km/L
</p>

<br>

<strong style="color:${color}">
${type}
</strong>

<p>
${message}
</p>

<button
class="btn btn-primary"
onclick="sendWhatsappAlert(
'${entry.vehicle}',
'${message}'
)">

Send WhatsApp Alert

</button>

</article>

`;

});

/* =========================================
   WHATSAPP MESSAGE
========================================= */

function sendWhatsappAlert(
vehicle,
message
){

const text = `

🚨 BDPH AI ALERT

Vehicle :
${vehicle}

${message}

Powered By BDPH AI Fuel System

`;

const whatsappUrl =

`https://wa.me/?text=${encodeURIComponent(text)}`;

window.open(
whatsappUrl,
"_blank"
);

}
