let tabId;
let stockfish;
//top left is a1, bottom right is h8
let board = [
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""],
            ["","","","","","","",""]];
let turn = "w";
let legalMoves = [];

const DEPTH = "15";
const LINES = "3";

init();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) { 
  tabId = sender.tab.id;

  if (request.type === "new_input") {
    let input = request.text;

    if (stockfish) {
      stockfish.postMessage("position startpos moves " + input);
      stockfish.postMessage("go depth " + DEPTH);
      stockfish.postMessage("setoption name multipv value "+ LINES);
      //gets fen from engine
      stockfish.postMessage("d");
    } 
    return true;
  }

  return;
});

//parses uci move into readable format from stockfish
function parseMove(uciOutput) {
  //returns best moves list
  //post results in a an array contained in a message to the content script
  //ex: [{"e4",+0.3},{"d4",+0.2},{"Nf6",+0.2}]
  if (uciOutput.slice(0,3) === "Fen"){
    updateBoard(uciOutput);
    if (uciOutput.indexOf(" b ") === -1){
      turn = "w";
    } else if (uciOutput.indexOf(" w ") === -1){
      turn = "b";
    }
  }

  //only send the deepest moves
  if ((uciOutput.slice(11,13) <= parseFloat(DEPTH)) && (13 <= uciOutput.slice(11,13))){
    let line, score;

    //check if there is forced mate
    if (uciOutput.indexOf("mate") !== -1){
      line = uciOutput.slice(uciOutput.indexOf("multipv ") + 8, uciOutput.indexOf("score")-1);
      if (uciOutput.indexOf("mate -") !== -1){
        score = "Mated in " + uciOutput.slice(uciOutput.indexOf("score mate") + 12,uciOutput.indexOf("nodes")-1);
      } else {
        score = "Mate in " + uciOutput.slice(uciOutput.indexOf("score mate") + 11,uciOutput.indexOf("nodes")-1);
      }
    } else {
      line = uciOutput.slice(uciOutput.indexOf("multipv ") + 8, uciOutput.indexOf("score")-1);
      score = parseFloat(uciOutput.slice(uciOutput.indexOf("score cp") + 9, uciOutput.indexOf("nodes")-1)) / 100;
      //if black's turn, score needs to be flipped
      if (score!==0){
        if (turn === "b"){
          score = String(score * -1);
        }
      }

      if (score > 0){
        score = "+" + String(score)
      }
    }

    //get recommended move here and turn it into algebraic notation
    let rawMove = uciOutput.slice(uciOutput.indexOf(" pv ")+4,uciOutput.indexOf(" pv ")+9);
    rawMove = rawMove.split(" ")[0];
    
    let move = [line, String(score), toAlgebraic(rawMove)];
    sendMessage(tabId, {type: "update_recommendations", text: move});
  }

  //for move clarification i.e. rook/knight can both move to same place
  if(uciOutput.slice(0,15) === "Legal uci moves"){
    legalMoves = uciOutput.slice(17).split(" ");
  }
}

//info depth 13 seldepth 24 multipv 3 score cp 61 nodes 113423 
//nps 872484 time 130 pv g1f3 e7e6 f1e2 b8c6 e1g1 g8e7 e4d5 e6d5 
//d3d4 d8b6 d4c5 b6c5 g1h1 b5b4 a2a3 e7f5 bmc 0.00109398

//turns uci notation into standard algebraic notation
function toAlgebraic(uciMove){
  //convert uci moves into array coords
  //rank, file
  let from = [uciMove.slice(1,2)-1,uciMove.slice(0,1).charCodeAt(0) - 97];
  let to = [uciMove.slice(3,4)-1,uciMove.slice(2,3).charCodeAt(0) - 97];
  let move = "";
  //check if pawn
  if(board[from[0]][from[1]] === "P"){
    //check if promotion
    if(uciMove.length === 5 && isNaN(parseFloat(uciMove.charAt(4)))){
      //check if it is a capture
      if(board[to[0]][to[1]] !== ""){
        move = uciMove.slice(0,1) + "x" + uciMove.slice(2,4) + "=" + uciMove.slice(4,5);
      } else {
        move = uciMove.slice(2,4) + "=" + uciMove.slice(4,5);
      }
    } else {
      //check if captures
      if(board[to[0]][to[1]] !== ""){
        move = uciMove.slice(0,1) + "x" + uciMove.slice(2,4);
      } else {
        move = uciMove.slice(2,4);
      }
    }
  } else {
    //check if castling
    if(board[from[0]][from[1]] === "K" && Math.abs(to[1]-from[1]) > 1){
      //kingside
      if(Math.abs(to[1]) === 6){
        move = "O-O";
      } else {
        //queenside
        move = "O-O-O";
      }
    } else if(areMultipleMoves(uciMove) !== null){
      if(areMultipleMoves(uciMove) === "file"){
        if(board[to[0]][to[1]] !== ""){
          move = board[from[0]][from[1]] + uciMove.slice(0,1) + "x" + uciMove.slice(2,4);
        } else {
          move = board[from[0]][from[1]] + uciMove.slice(0,1) + uciMove.slice(2,4);
        }
      } else {
        if(board[to[0]][to[1]] !== ""){
          move = board[from[0]][from[1]] + uciMove.slice(1,2) + "x" + uciMove.slice(2,4);
        } else {
          move = board[from[0]][from[1]] + uciMove.slice(1,2) + uciMove.slice(2,4);
        }
      }
    } else {
      if(board[to[0]][to[1]] !== ""){
        move = board[from[0]][from[1]] + "x" + uciMove.slice(2,4);
      } else {
        move = board[from[0]][from[1]] + uciMove.slice(2,4);
      }
    }
  }
  return move;
}

//checks if there are multiple legal moves by the type of piece from the first square
//to the second sqaure
function areMultipleMoves(uciMove){
  //loop through legalMoves to see if there are multiple squares with destination
  let legalMovesSameDest = [];
  for (let i=0;i<legalMoves.length;i++){
    if(legalMoves[i].slice(2,4) === uciMove.slice(2,4) && legalMoves[i]!==uciMove){
      legalMovesSameDest.push(legalMoves[i]);
    }
  }

  //loop through legalMovesSameDest to check for similar pieces
  let originCoords = [uciMove.slice(1,2)-1,uciMove.slice(0,1).charCodeAt(0) - 97];
  for(let i=0;i<legalMovesSameDest.length;i++){
    let first = [legalMovesSameDest[i].slice(1,2)-1,legalMovesSameDest[i].slice(0,1).charCodeAt(0) - 97];
    if(board[first[0]][first[1]] === board[originCoords[0]][originCoords[1]]){
      if(first[1]!==originCoords[1]){
        return "file";
      } else {
        return "rank";
      }
    }
  }
  return null;
}

//updates board with new fen
function updateBoard(fen){
  //cleaning fen
  let ranks = fen.split("/");  
  ranks[7] = ranks[7].slice(0, ranks[7].indexOf(" "));
  ranks[0] = ranks[0].slice(ranks[0].indexOf(" ") +1);
  //fen starts with 8th rank, this resets so first rank is first
  ranks.reverse();

  let rankCounter = 0;
  for (let rank = 0; rank < 8; rank++){
    let file = 0;
    while (file < 8){
      let piece = ranks[rank].charAt(rankCounter)
      //if the piece is a number, move that many white squares to the right
      if (!isNaN(piece) && !isNaN(parseFloat(piece))) {
        //set board with blank spaces
        for (let i = 0; i < parseFloat(piece); i++){
          board[rank][file+i] = "";
        }
        file += parseInt(piece) - 1;
      } else {
          board[rank][file] = piece.toUpperCase();
      }
      rankCounter++;
      file++;
    }
    rankCounter = 0;
  }
}

function sendMessage(tab, data) {
  if (tab && data) {
    chrome.tabs.sendMessage(tabId, data);
  }
}

function init() {
  stockfish = new Worker(chrome.extension.getURL("js/stockfish/stockfish.js"));
  stockfish.onmessage = function(event) {
      parseMove(event.data);
  };
}