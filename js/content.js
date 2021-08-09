let sideBar;
let recommendations;
let move1Div, move2Div, move3Div;

//move listener
chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === "update_recommendations"){
    let moveSet = request.text;
    setTimeout(updateUI(moveSet),500);
  }
});

function updateUI(moveSet){

  if(!document.getElementById("recommendations")){
    recommendations = document.createElement("div");
    recommendations.setAttribute("id","recommendations");
    recommendations.setAttribute("style", "height: 75px; width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr;");

    move1Div = document.createElement("div");
    move2Div = document.createElement("div");
    move3Div = document.createElement("div");
    move1Div.setAttribute("style", "height: 75px; color: #001f3f; padding: 10px 10px;");
    move2Div.setAttribute("style", "height: 75px; color: #0074D9; padding: 10px 10px;");
    move3Div.setAttribute("style", "height: 75px; color: #7FDBFF; padding: 10px 10px;");

    recommendations.appendChild(move1Div);
    recommendations.appendChild(move2Div);
    recommendations.appendChild(move3Div);

    sideBar = document.getElementById("board-layout-sidebar");
    sideBar.insertBefore(recommendations, sideBar.firstChild);
  }

  //update html with moves
  if(moveSet[0] === "1"){
    move1Div.innerHTML = "<p style=\"color:white;font-size:20px;line-height:3rem;\">1. " + moveSet[2] + "<br>" + moveSet[1] + "<p>";
  } else if (moveSet[0] === "2"){
    move2Div.innerHTML = "<p style=\"color:white;font-size:20px;line-height:3rem;\">2. " + moveSet[2] + "<br>" + moveSet[1] + "<p>";
  } else if (moveSet[0] === "3"){
    move3Div.innerHTML = "<p style=\"color:white;font-size:20px;line-height:3rem;\">3. " + moveSet[2] + "<br>" + moveSet[1] + "<p>";
  }
  
}

function loadIntercept(){
  let script = document.createElement('script');
  script.src = chrome.extension.getURL("js/intercept.js");
  script.addEventListener('load', function(){
  }, false);
  (document.head || document.documentElement).appendChild(script);
}

document.addEventListener('DOMContentLoaded', function () {
  document.body.setAttribute("style", "overflow: visible !important;");
  if(document.getElementsByClassName("sidebar-tabsetTop")[0] != undefined){
    document.getElementsByClassName("sidebar-tabsetTop")[0].setAttribute("style","max-height: 40% !important;");
    document.getElementsByClassName("sidebar-tabsetBottom")[0].setAttribute("style","max-height: 40% !important;");
  }
});

//relays message to stockfish
window.addEventListener('message', function(event) {
  if (event.data.type === 'new_input') {
    chrome.runtime.sendMessage(event.data);
  }
});

loadIntercept();