const loggedIn =
localStorage.getItem(
"fuelAiLoggedIn"
);

if(loggedIn !== "true"){

window.location.href =
"/login.html";

}
