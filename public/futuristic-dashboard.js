// SAVE AS: futuristic-dashboard.js

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

setInterval(
updateClock,
1000
);

/* =========================================
LIVE COUNTERS
========================================= */

function animateCounters(){

const vehicleCount =
document.getElementById(
"vehicleCount"
);

const gpsCount =
document.getElementById(
"gpsCount"
);

const alertCount =
document.getElementById(
"alertCount"
);

if(vehicleCount){

vehicleCount.innerHTML =
248 + Math.floor(Math.random()*5);

}

if(gpsCount){

gpsCount.innerHTML =
241 + Math.floor(Math.random()*4);

}

if(alertCount){

alertCount.innerHTML =
7 + Math.floor(Math.random()*3);

}

}

setInterval(
animateCounters,
3000
);

/* =========================================
ANIMATE BARS
========================================= */

function animateBars(){

const bars =
document.querySelectorAll(
".bar"
);

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
ANIMATE TYRES
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
3500
);

/* =========================================
ANIMATE INVENTORY
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
3000
);

/* =========================================
MOVE GPS DOTS
========================================= */

function moveDots(){

const dots =
document.querySelectorAll(
".dot"
);

dots.forEach((dot)=>{

const top =
Math.floor(
10 + Math.random()*75
);

const left =
Math.floor(
10 + Math.random()*75
);

dot.style.top =
top + "%";

dot.style.left =
left + "%";

});

}

setInterval(
moveDots,
4000
);

/* =========================================
AI ALERT ENGINE
========================================= */

const aiMessages = [

"AI detected abnormal fuel consumption",

"Tyre wear prediction updated successfully",

"GPS signal optimized for Vehicle JH05AB1234",

"Harsh braking event detected near NH-33",

"Fuel theft probability increased by 12%",

"Route optimization saved 18% fuel",

"AdBlue efficiency dropped below threshold",

"Inventory AI scheduled automatic reorder"

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
document.createElement(
"div"
);

alert.id = "aiAlert";

alert.innerHTML =
aiMessages[
Math.floor(
Math.random() *
aiMessages.length
)
];

alert.style.position =
"fixed";

alert.style.top =
"105px";

alert.style.right =
"25px";

alert.style.padding =
"18px 24px";

alert.style.background =
"rgba(0,255,255,0.12)";

alert.style.color =
"#00e5ff";

alert.style.border =
"1px solid rgba(0,255,255,0.18)";

alert.style.borderRadius =
"22px";

alert.style.zIndex =
"999999";

alert.style.fontWeight =
"bold";

alert.style.backdropFilter =
"blur(18px)";

alert.style.boxShadow =
"0 0 35px rgba(0,255,255,0.18)";

alert.style.animation =
"fadeIn 0.5s";

document.body.appendChild(
alert
);

setTimeout(()=>{

alert.remove();

},4000);

}

setInterval(
showAIAlert,
5000
);

/* =========================================
PARTICLES
========================================= */

for(let i=0;i<45;i++){

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
"rgba(0,255,255,0.35)";

particle.style.left =
Math.random()*100 + "vw";

particle.style.top =
Math.random()*100 + "vh";

particle.style.zIndex =
"0";

particle.style.pointerEvents =
"none";

particle.style.animation =
`float ${
4 + Math.random()*8
}s infinite`;

document.body.appendChild(
particle
);

}

/* =========================================
STYLE INJECTION
========================================= */

const style =
document.createElement(
"style"
);

style.innerHTML = `

@keyframes float{

0%{
transform:
translateY(0px);
opacity:0.2;
}

50%{
transform:
translateY(-30px);
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
WELCOME AI
========================================= */

window.onload = function(){

showAIAlert();

};

/* =========================================
MENU HOVER EFFECT
========================================= */

const menuItems =
document.querySelectorAll(
".menuItem"
);

menuItems.forEach((item)=>{

item.addEventListener(
"mouseenter",
function(){

this.style.transform =
"translateX(8px) scale(1.02)";

}
);

item.addEventListener(
"mouseleave",
function(){

this.style.transform =
"translateX(0px) scale(1)";

}
);

});

/* =========================================
LIVE CARD PULSE
========================================= */

function pulseCards(){

const cards =
document.querySelectorAll(
".glassCard,.alertCard"
);

cards.forEach((card,index)=>{

setTimeout(()=>{

card.style.boxShadow =
"0 0 45px rgba(0,255,255,0.12)";

setTimeout(()=>{

card.style.boxShadow =
"0 0 40px rgba(0,0,0,0.3)";

},1200);

},index*300);

});

}

setInterval(
pulseCards,
6000
);
