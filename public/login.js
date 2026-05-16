/* =========================================
   LOGIN FORM
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

if(
username === "admin" &&
password === "admin123"
){

loginMessage.innerHTML =
"Login Successful";

loginMessage.style.color =
"#00ff88";

setTimeout(()=>{

window.location.href =
"/track-history.html";

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
   CHANGE PASSWORD MODAL
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

/* SAVE */

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

/* VALIDATION */

if(
!oldPass ||
!newPass ||
!confirmPass
){

alert("Fill all fields");

return;

}

if(newPass !== confirmPass){

alert("Password not matched");

return;

}

/* SUCCESS */

alert(
"Password changed successfully"
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
