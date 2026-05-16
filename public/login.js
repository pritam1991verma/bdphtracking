/* =========================================
   DEFAULT LOGIN
========================================= */

if(!localStorage.getItem("bdphUser")){

localStorage.setItem(
"bdphUser",
"admin"
);

}

if(!localStorage.getItem("bdphPass")){

localStorage.setItem(
"bdphPass",
"admin123"
);

}

/* =========================================
   LOGIN
========================================= */

const loginForm =
document.getElementById("loginForm");

if(loginForm){

loginForm.addEventListener(
"submit",
function(e){

e.preventDefault();

const username =
document.getElementById("username").value;

const password =
document.getElementById("password").value;

const loginMessage =
document.getElementById("loginMessage");

const savedUser =
localStorage.getItem("bdphUser");

const savedPass =
localStorage.getItem("bdphPass");

/* CHECK */

if(
username === savedUser &&
password === savedPass
){

localStorage.setItem(
"isLoggedIn",
"true"
);

loginMessage.innerHTML =
"Login Successful";

loginMessage.style.color =
"#00ff88";

setTimeout(()=>{

window.location.href =
"./dashboard.html";

},1000);

}

/* REDIRECT */

setTimeout(()=>{

window.location.href =
"./dashboard.html";

},1000);

}
else{

loginMessage.innerHTML =
"Invalid Username or Password";

loginMessage.style.color =
"#ff1744";

}

}
);

}

/* =========================================
   PASSWORD MODAL
========================================= */

const changePasswordBtn =
document.getElementById(
"changePasswordBtn"
);

const passwordModal =
document.getElementById(
"passwordModal"
);

const closePasswordBtn =
document.getElementById(
"closePasswordBtn"
);

const savePasswordBtn =
document.getElementById(
"savePasswordBtn"
);

/* OPEN */

if(changePasswordBtn){

changePasswordBtn.onclick =
function(){

passwordModal.style.display =
"flex";

};

}

/* CLOSE */

if(closePasswordBtn){

closePasswordBtn.onclick =
function(){

passwordModal.style.display =
"none";

};

}

/* SAVE PASSWORD */

if(savePasswordBtn){

savePasswordBtn.onclick =
function(){

const oldPass =
document.getElementById(
"oldPassword"
).value;

const newPass =
document.getElementById(
"newPassword"
).value;

const confirmPass =
document.getElementById(
"confirmPassword"
).value;

const currentPass =
localStorage.getItem(
"bdphPass"
);

/* EMPTY */

if(
!oldPass ||
!newPass ||
!confirmPass
){

alert("Fill all fields");

return;

}

/* OLD PASSWORD */

if(oldPass !== currentPass){

alert("Current Password Wrong");

return;

}

/* MATCH */

if(newPass !== confirmPass){

alert("Password Not Matched");

return;

}

/* SAVE */

localStorage.setItem(
"bdphPass",
newPass
);

alert(
"Password Changed Successfully"
);

passwordModal.style.display =
"none";

/* CLEAR */

document.getElementById(
"oldPassword"
).value = "";

document.getElementById(
"newPassword"
).value = "";

document.getElementById(
"confirmPassword"
).value = "";

};

}

/* =========================================
   FORGOT PASSWORD
========================================= */

const forgotBtn =
document.querySelector(
".loginLinks a"
);

if(forgotBtn){

forgotBtn.onclick =
function(){

const currentPass =
localStorage.getItem(
"bdphPass"
);

alert(
"Current Password : " +
currentPass
);

};

}
