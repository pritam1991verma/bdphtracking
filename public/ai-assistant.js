/* =========================================
   AI ASSISTANT
========================================= */

const aiAssistant = document.createElement("div");

aiAssistant.className =
"ai-assistant";

aiAssistant.innerHTML = `

<div class="ai-toggle"
id="aiToggle">

🤖

</div>

<div class="ai-panel"
id="aiPanel">

<div class="ai-header">

<div>

<h3>
BDPH AI Assistant
</h3>

<p>
Fleet Intelligence Engine
</p>

</div>

<div class="ai-live">

<span class="ai-dot"></span>

LIVE

</div>

</div>

<div class="ai-chat"
id="aiChat">

<div class="ai-message">

🚨 AI detected
abnormal fuel activity
in 2 vehicles.

</div>

<div class="ai-message">

📈 Mileage prediction
indicates 7% fuel increase
next week.

</div>

</div>

<div class="ai-input-area">

<input
type="text"
id="aiInput"
placeholder="Ask AI anything...">

<button
id="aiSend">

Send

</button>

<button
id="voiceBtn">

🎤

</button>

</div>

</div>

`;

document.body.appendChild(
aiAssistant
);

/* =========================================
   TOGGLE
========================================= */

const aiToggle =
document.getElementById(
"aiToggle"
);

const aiPanel =
document.getElementById(
"aiPanel"
);

aiToggle.onclick = ()=>{

aiPanel.classList.toggle(
"active"
);

};

/* =========================================
   SEND MESSAGE
========================================= */

const aiSend =
document.getElementById(
"aiSend"
);

const aiInput =
document.getElementById(
"aiInput"
);

const aiChat =
document.getElementById(
"aiChat"
);

aiSend.onclick = ()=>{

const text =
aiInput.value;

if(!text) return;

aiChat.innerHTML += `

<div class="user-message">

${text}

</div>

`;

aiInput.value = "";

setTimeout(()=>{

let response =
generateAIResponse(text);

aiChat.innerHTML += `

<div class="ai-message">

${response}

</div>

`;

speakAI(response);

aiChat.scrollTop =
aiChat.scrollHeight;

},1000);

};

/* =========================================
   AI RESPONSES
========================================= */

function generateAIResponse(text){

text = text.toLowerCase();

if(text.includes("fuel")){

return `
AI predicts
fuel efficiency drop
in 3 vehicles.
`;

}

if(text.includes("driver")){

return `
Top performing driver:
Rakesh Kumar.
`;

}

if(text.includes("risk")){

return `
2 high risk vehicles
require immediate inspection.
`;

}

if(text.includes("mileage")){

return `
Average fleet mileage:
4.8 km/L
`;

}

return `
AI analysis completed.
No critical operational issue detected.
`;

}

/* =========================================
   SPEECH
========================================= */

function speakAI(message){

const speech =
new SpeechSynthesisUtterance(
message
);

speech.rate = 1;

speech.pitch = 1;

speech.volume = 1;

window.speechSynthesis.speak(
speech
);

}

/* =========================================
   VOICE INPUT
========================================= */

const voiceBtn =
document.getElementById(
"voiceBtn"
);

if(
'webkitSpeechRecognition'
in window
){

const recognition =
new webkitSpeechRecognition();

recognition.continuous =
false;

recognition.lang =
"en-US";

voiceBtn.onclick = ()=>{

recognition.start();

};

recognition.onresult =
(event)=>{

const transcript =
event.results[0][0].transcript;

aiInput.value =
transcript;

};

}
