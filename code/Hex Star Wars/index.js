window.addEventListener("load", init);

const SVG_NS = "http://www.w3.org/2000/svg";

const VIEWS = ["loading-view", "init-view", "game-container"];

const FACTION_ICONS = {
  "The Republic": "venator.png",
  "The Confederacy": "dreadnought.png",
  "The Rebellion": "",
  "The Empire": "",
};

let playerCount;
let players = [];
let map;

function init() {
  id("submit-btn").addEventListener("click", async function () {
    let playerFaction = document.getElementById("faction-select").value;
    let aiFaction;
    switch (playerFaction) {
      case "republic":
        playerFaction = "The Republic";
        aiFaction = "The Confederacy";
        break;
      case "cis":
        playerFaction = "The Confederacy";
        aiFaction = "The Republic";
        break;
      case "rebellion":
        playerFaction = "The Rebellion";
        aiFaction = "The Empire";
        break;
      case "empire":
        playerFaction = "The Empire";
        aiFaction = "The Rebellion";
        break;
    }
    //First player is always the human
    players = [
      {
        faction: playerFaction,
        icon: FACTION_ICONS[playerFaction],
      },
      {
        faction: aiFaction,
        icon: FACTION_ICONS[aiFaction],
      },
    ];
    switchViews("loading-view");
    //Put let map; here
    if (
      playerFaction === "The Republic" ||
      playerFaction === "The Confederacy"
    ) {
      map = new SpaceMap(SpaceMap.CLONE_WARS);
    } else {
      map = new SpaceMap(SpaceMap.GALACTIC_CIVIL_WAR);
    }
    buildGrid(map.boardWidth);
    map.generate();
    await startGame(map, playerFaction);
  });
  id("submit-btn").click();
}

async function startGame(map, playerFaction) {
  let game = new HexStarWars(map, playerFaction);
  let states = [];
  switchViews("game-container");
  displayGame(game);
  HexGrid.update();
  let aiPlayer = new ArtificialPlayer(game, 2, 10, 1.41);
  while (!game.gameOver()) {
    states.push(JSON.parse(JSON.stringify(game.getState())));
    await HexGrid.selectUnitByAttributes({ faction: players[0].faction });
    let possibleHexes = game.moves().map((move) => {
      return HexGrid.getHexFromTile(move[1], move[2]);
    });
    let desiredHex = await HexGrid.customSelectHex(possibleHexes);
    let moves = game.moves();
    let chosenMove;
    for (let i = 0; i < moves.length; i++) {
      if (
        moves[i][1] === desiredHex.tileX &&
        moves[i][2] === desiredHex.tileY
      ) {
        chosenMove = moves[i];
        break;
      }
    }

    let result;
    if (chosenMove[3] !== "enter" && chosenMove[3] !== "claim") {
      result = await battleResult(chosenMove[3], true);
    }

    game.playMove(chosenMove, result);
    displayGame(game);

    id("ai-loading").classList.remove("hidden");
    let aiMove = await aiPlayer.selectMove();

    result = undefined;
    if (chosenMove[3] !== "enter" && chosenMove[3] !== "claim") {
      result = await battleResult(chosenMove[3], false);
    }

    game.playMove(aiMove, result);
    displayGame(game);
    id("ai-loading").classList.add("hidden");
  }
}

function buildGrid(boardSize) {
  HexGrid.setClasses({
    hexClass: "hex",
    hexHoverClass: "hex-hover",
    unitClass: "unit",
    unitHoverClass: "unit-hover",
    arrowClass: "arrow",
  });
  HexGrid.changeGridDim(boardSize, boardSize);
  HexGrid.create();
  HexGrid.setStackingMode(HexGrid.STACKING.SINGLE_ROW, 2);
}

function displayGame(game) {
  let navigatingMap = game.state.spaceMap.map;
  for (let i = 0; i < navigatingMap.length; i++) {
    for (let j = 0; j < navigatingMap[i].length; j++) {
      let hex = HexGrid.getHexFromTile(i, j);
      if (navigatingMap[i][j].navigable) {
        hex.path.classList.add("hex-planet");
        let attr = {
          System: navigatingMap[i][j].sector.name,
        };
        if (navigatingMap[i][j].controlledBy !== null) {
          attr["Controlled By"] = navigatingMap[i][j].controlledBy;
          let addRemove;
          switch (attr["Controlled By"]) {
            case "The Republic":
              addRemove = ["republic", "cis"];
              break;
            case "The Confederacy":
              addRemove = ["cis", "republic"];
              break;
            case "The Rebel Alliance":
              addRemove = ["rebellion", "empire"];
              break;
            case "The Empire":
              addRemove = ["empire", "rebellion"];
              break;
          }
          hex.path.classList.add(addRemove[0]);
          hex.path.classList.remove(addRemove[1]);
        }
        hex.setAttributes(attr);
        if (!navigatingMap[i][j].sector.name.includes("Sector")) {
          hex.addBackgroundImage(navigatingMap[i][j].sector.image);
        }
        clearFleetsFromTile(i, j);
      } else {
        hex.path.classList.add("hex-space");
      }
    }
  }
  let playerFleets = game.state.players[players[0].faction].fleets;
  for (let i = 0; i < playerFleets.length; i++) {
    addFleetToTile(playerFleets[i][0], playerFleets[i][1], players[0]);
  }
  let aiFleets = game.state.players[players[1].faction].fleets;
  for (let i = 0; i < aiFleets.length; i++) {
    addFleetToTile(aiFleets[i][0], aiFleets[i][1], players[1]);
  }
}

async function battleResult(actionType, playerAttacking) {
  id("second-attack-roll").classList.add("hidden");
  id("second-defend-roll").classList.add("hidden");
  id("land-battle").classList.add("hidden");
  id("space-battle").classList.add("hidden");
  switch (actionType) {
    case "duel":
      id("space-battle").classList.remove("hidden");
      break;
    case "invasion":
      id("land-battle").classList.remove("hidden");
      break;
    case "conquer":
      id("second-attack-roll").classList.remove("hidden");
      id("second-defend-roll").classList.remove("hidden");
      break;
  }
  id("battle-menu").classList.remove("hidden");
  return new Promise((resolve) => {
    function submit() {

    }
  });
}

function setFleetsOnTile(x, y, unitArray) {
  console.log("Oh hey there");
  clearFleetsFromTile(x, y);
  let hex = HexGrid.getHexFromTile(x, y);
  for (let i = 0; i < unitArray.length; i++) {
    let player;
    if (players[0].faction === unitArray[i]) {
      player = players[0];
    } else {
      player = players[1];
    }
    HexGrid.addUnit(hex, player.icon, {
      showAttributes: false,
      faction: player.faction,
    });
  }
}

//Returns whether or not it was successful
function addFleetToTile(x, y, player) {
  let hex = HexGrid.getHexFromTile(x, y);
  if (hex.getUnits().length < 2) {
    HexGrid.addUnit(hex, player.icon, {
      faction: player.faction,
    });
    return true;
  }
  return false;
}

function removeFleetFromTile(x, y, player) {
  let hex = HexGrid.getHexFromTile(x, y);
  let fleets = hex.getUnits();
  for (let i = 0; i < fleets.length; i++) {
    if (fleets[i].attributes.faction === player.faction) {
      HexGrid.removeUnit(fleets[i]);
    }
  }
}

function clearFleetsFromTile(x, y) {
  let fleets = HexGrid.getHexFromTile(x, y).getUnits();
  for (let i = 0; i < fleets.length; i++) {
    HexGrid.removeUnit(fleets[i]);
  }
}

function switchViews(view) {
  for (let i = 0; i < VIEWS.length; i++) {
    if (VIEWS[i] === view) {
      id(VIEWS[i]).classList.remove("hidden");
    } else {
      id(VIEWS[i]).classList.add("hidden");
    }
  }
}

function id(elId) {
  return document.getElementById(elId);
}
