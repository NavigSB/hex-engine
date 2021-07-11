window.addEventListener("load", test);

const SVG_NS = "http://www.w3.org/2000/svg";

const COLOR_MODIFIER = 1.5;
const VIEWS = ["loading-view", "init-view", "screen-container"];

const FACTION_ICONS = {"republic": "venator.png",
                      "cis": "dreadnought.png",
                      "rebellion": "",
                      "empire": ""};

let playerCount;
let players = [];
let boardSize;

function init() {
    id("submit-btn").addEventListener("click", function() {
        let playerFaction = document.getElementById("faction-select").value;
        let aiFaction;
        switch(playerFaction) {
            case "republic": aiFaction = "cis"; break;
            case "cis": aiFaction = "republic"; break;
            case "rebellion": aiFaction = "empire"; break;
            case "empire": aiFaction = "rebellion"; break;
        }
        //First player is always the human
        players = [
            {
                faction: playerFaction,
                icon: FACTION_ICONS[playerFaction]
            },
            {
                faction: aiFaction,
                icon: FACTION_ICONS[aiFaction]
            }
        ];
    });
}

function test() {
    init();
    players = [
        {
            faction: "republic",
            icon: FACTION_ICONS["republic"]
        },
        {
            faction: "cis",
            icon: FACTION_ICONS["cis"]
        }
    ];
    switchViews("loading-view");
    let map = new SpaceMap(SpaceMap.CLONE_WARS);
    boardSize = map.boardWidth;
    buildGrid();
    map.generate();
    displaySpaceMap(map.map);
    let testGame = new HexStarWars(map);
    for(let i = 0; i < players.length; i++) {
        let hex = map.navigableTiles[Math.floor(Math.random() * map.navigableTiles.length)];
        addFleetToTile(hex[0], hex[1], players[i]);
    }
    switchViews("screen-container");
    HexGrid.update();
}

function buildGrid() {
    HexGrid.setClasses({
        hexClass: "hex",
        hexHoverClass: "hex-hover",
        unitClass: "unit",
        unitHoverClass: "unit-hover",
        arrowClass: "arrow"
    });
    HexGrid.changeGridDim(boardSize, boardSize);
    HexGrid.create();
    HexGrid.setStackingMode(HexGrid.STACKING.SINGLE_ROW, 2);
}

function displaySpaceMap(spaceMap) {
    for(let i = 0; i < spaceMap.length; i++) {
        for(let j = 0; j < spaceMap[i].length; j++) {
            let hex = HexGrid.getHexFromTile(i, j)
            if(spaceMap[i][j] === 0) {
                hex.path.classList.add("hex-space");
            }else{
                hex.path.classList.add("hex-planet");
            }
        }
    }
}

//Returns whether or not it was successful
function addFleetToTile(x, y, player) {
    let hex = HexGrid.getHexFromTile(x, y);
    if(hex.getUnits().length < 2) {
        HexGrid.addUnit(hex, player.icon, {
            faction: player.faction
        });
        return true;
    }
    return false;
}

function removeFleetFromTile(x, y, player) {
    let hex = HexGrid.getHexFromTile(x, y);
    let fleets = hex.getUnits();
    for(let i = 0; i < fleets.length; i++) {
        if(fleets[i].attributes.faction === player.faction) {
            HexGrid.removeUnit(fleets[i]);
        }
    }
}

function switchViews(view) {
    for(let i = 0; i < VIEWS.length; i++) {
        if(VIEWS[i] === view) {
            id(VIEWS[i]).classList.remove("hidden");
        }else{
            id(VIEWS[i]).classList.add("hidden");
        }
    }
}

function id(elId) {
    return document.getElementById(elId);
}