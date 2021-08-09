(() => {
  "use strict";
  const { set } = Object.getOwnPropertyDescriptor(window.WebSocket.prototype, "onmessage");
  delete window.WebSocket.prototype.onmessage;

  Object.defineProperty(
    window.WebSocket.prototype,
    "onmessage",
    {
      set: function(...data) {
        this.addEventListener("message", e => {
          handleMove(e.data);
        });
        return set.apply(this, data);
      }
    }
  );
})();


function handleMove(json) {
  if(String(json).charAt(0) === "["){
    let obj = JSON.parse(json);
  
    if (typeof obj[0] !== "undefined" && obj[0].hasOwnProperty("data") 
    && obj[0].data.hasOwnProperty("game") && obj[0].data.game.hasOwnProperty("status")) {
      let uciMoveList = toUCI(obj[0].data.game.moves);
      
      let msg = { type: "new_input", text: uciMoveList}
      window.postMessage(msg, "*");
    }
  }
  
}

function toUCI(moves){
  let uciMoves = "";

  let moveMap = {"a": "a1","i": "a2","q": "a3","y": "a4","G": "a5",
  "O": "a6","W": "a7","4": "a8","b": "b1","j": "b2","r": "b3","z": "b4",
  "H": "b5","P": "b6","X": "b7","5": "b8","c": "c1","k": "c2","s": "c3",
  "A": "c4","I": "c5","Q": "c6","Y": "c7","6": "c8","d": "d1","l": "d2",
  "t": "d3","B": "d4","J": "d5","R": "d6","Z": "d7","7": "d8","e": "e1",
  "m": "e2","u": "e3","C": "e4","K": "e5","S": "e6","0": "e7","8": "e8",
  "f": "f1","n": "f2","v": "f3","D": "f4","L": "f5","T": "f6","1": "f7",
  "9": "f8","g": "g1","o": "g2","w": "g3","E": "g4","M": "g5","U": "g6",
  "2": "g7","!": "g8","h": "h1","p": "h2","x": "h3","F": "h4","N": "h5",
  "V": "h6","3": "h7","?": "h8"};

  //iterate through movelist and turn moves into UCI notation
  for (let i = 0; i < moves.length; i+=2){
    let from = moveMap[moves[i]];
    let to = "";
    if (moveMap.hasOwnProperty(moves[i+1])){
      to = moveMap[moves[i+1]];
    } else {
      //second square is a promotion
      to = findPromotingSquare(from, moves[i+1]);
    }

    uciMoves += from + to + " "
  }

  return uciMoves;
}

function findPromotingSquare(previous, current) {
  let result = "";
  switch (current) {
    case "}":
      result = String.fromCharCode(previous.charCodeAt(0)+1) + "q";
      break;
    case "]":
      result = String.fromCharCode(previous.charCodeAt(0)+1) + "r";
      break;
    case ")":
      result = String.fromCharCode(previous.charCodeAt(0)+1) + "n";
      break;  
    case "$":
      result = String.fromCharCode(previous.charCodeAt(0)+1) + "b";
      break;
    case "{":
      result = String.fromCharCode(previous.charCodeAt(0)-1) + "q";
      break;
    case "[":
      result = String.fromCharCode(previous.charCodeAt(0)-1) + "r";
      break;
    case "(":
      result = String.fromCharCode(previous.charCodeAt(0)-1) + "n";
      break;  
    case "@":
      result = String.fromCharCode(previous.charCodeAt(0)-1) + "b";
      break;
    case "~":
      result = previous.slice(0,1) + "q";
      break;
    case "_":
      result = previous.slice(0,1) + "r";
      break;
    case "^":
      result = previous.slice(0,1) + "n";
      break;  
    case "#":
      result = previous.slice(0,1) + "b";
      break;
    default:
      result = "";
  }

  //check if white or black is promoting
  if (previous[1] == "7") {
    result = result.slice(0,1) + "8" + result.slice(1);
  } else {
    result = result.slice(0,1) + "1" + result.slice(1);
  }

  return result;
}