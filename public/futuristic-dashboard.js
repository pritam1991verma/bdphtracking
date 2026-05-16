/* =========================================
LIVE CLOCK
========================================= */

function updateClock(){

const now = new Date();

const time =
now.toLocaleTimeString();

document.title =
"BDPH AI • " + time;

}

setInterval(updateClock,1000);

/* =========================================
LIVE MINI CARDS
========================================= */

function animateStats(){

const cards =
document.querySelectorAll(".miniCard h3");

cards.forEach((card,index)=>{

let value =
Number(card.innerHTML);

const random =
Math.floor(Math.random()*3);

if(index === 0){

value =
248 + random;

}

if(index === 1){

value =
241 + random;

}

if(index === 2){

value =
7 + Math.floor(Math.random()*2);

}

card.innerHTML = value;

});

}

setInterval(
animateStats,
3000
);

/* =========================================
ALERT COUNTERS
========================================= */

function animateAlerts(){

const alerts =
document.querySelectorAll(
".alertCard h1"
);

alerts.forEach((alert,index)=>{

let base = 0;

if(index === 0){

base = 28;

}

if(index === 1){

base = 13;

}

if(index === 2){

base = 9;

}

alert.innerHTML =
base +
Math.floor(Math.random()*3);

});

}

setInterval(
animateAlerts,
4000
);

/* =========================================
BARS ANIMATION
========================================= */

function animateBars(){

const bars =
document.querySelectorAll(".bar");

bars.forEach((bar)=>{

const random =
Math.floor(
40 + Math.random()*60
);

bar.style.height =
random + "%";

});

}

setInterval(
animateBars,
2500
);

/* =========================================
PROGRESS BARS
========================================= */

function animateInventory(){

const progressBars =
document.querySelectorAll(
".progress div"
);

progressBars.forEach((bar)=>{

const random =
Math.floor(
40 + Math.random()*55
);

bar.style.width =
random + "%";

});

}

setInterval(
animateInventory,
3500
);

/* =========================================
LIVE TYRE AI
========================================= */

function animateTyres(){

const tyres =
document.querySelectorAll(
".tyre"
);

tyres.forEach((tyre)=>{

const random =
Math.floor(
70 + Math.random()*30
);

tyre.innerHTML =
random + "%";

});

}

setInterval(
animateTyres,
3000
);

/* =========================================
AI ALERT ENGINE
========================================= */

const aiMessages = [

"AI detected abnormal fuel pattern",

"GPS latency stabilized successfully",

"Vehicle JH05AB1234 entered restricted zone",

"Harsh braking detected near highway corridor",

"Tyre pressure optimized by AI engine",

"Predictive maintenance scheduled automatically",

"Fuel theft probability increased by 12%",

"Route optimization saved 18% fuel"

];

function showAIAlert(){

const existing =
document.getElementById(
"aiAlert"
);

if(existing){

existing.remove();

}

const alert =
document.createElement("div");

alert.id = "aiAlert";

alert.innerHTML =
aiMessages[
Math.floor(
Math.random()*aiMessages.length
)
];

alert.style.position = "fixed";
alert.style.top = "110px";
alert.style.right = "25px";
alert.style.padding = "16px 22px";
alert.style.background =
"rgba(0,255,255,0.12)";
alert.style.color = "#00e5ff";
alert.style.border =
"1px solid rgba(0,255,255,0.2)";
alert.style.borderRadius = "18px";
alert.style.zIndex = "999999";
alert.style.backdropFilter =
"blur(14px)";
alert.style.boxShadow =
"0 0 30px rgba(0,255,255,0.2)";
alert.style.fontWeight = "bold";
alert.style.animation =
"fadeIn 0.5s";

document.body.appendChild(alert);

setTimeout(()=>{

alert.remove();

},4000);

}

setInterval(
showAIAlert,
5000
);

/* =========================================
DOT MOVEMENT
========================================= */

function animateDots(){

const dots =
document.querySelectorAll(".dot");

dots.forEach((dot)=>{

const top =
Math.floor(
10 + Math.random()*80
);

const left =
Math.floor(
10 + Math.random()*80
);

dot.style.top =
top + "%";

dot.style.left =
left + "%";

});

}

setInterval(
animateDots,
4000
);

/* =========================================
BACKGROUND PARTICLES
========================================= */

for(let i=0;i<35;i++){

const particle =
document.createElement("div");

particle.style.position =
"fixed";

particle.style.width =
"3px";

particle.style.height =
"3px";

particle.style.borderRadius =
"50%";

particle.style.background =
"rgba(0,255,255,0.4)";

particle.style.left =
Math.random()*100 + "vw";

particle.style.top =
Math.random()*100 + "vh";

particle.style.zIndex =
"0";

particle.style.animation =
`float ${
4 + Math.random()*8
}s infinite`;

document.body.appendChild(
particle
);

}

/* =========================================
FLOAT STYLE
========================================= */

const style =
document.createElement("style");

style.innerHTML = `

@keyframes float{

0%{
transform:
translateY(0px);
opacity:0.2;
}

50%{
transform:
translateY(-25px);
opacity:1;
}

100%{
transform:
translateY(0px);
opacity:0.2;
}

}

@keyframes fadeIn{

from{
opacity:0;
transform:
translateY(-10px);
}

to{
opacity:1;
transform:
translateY(0px);
}

}

`;

document.head.appendChild(
style
);

/* =========================================
WELCOME ALERT
========================================= */

setTimeout(()=>{

showAIAlert();

},1500);
