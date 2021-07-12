window.addEventListener("load", init);

const SVG_NS = "http://www.w3.org/2000/svg";

const VIEWS = ["loading-view", "init-view", "screen-container"];

const FACTION_ICONS = {"republic": "venator.png",
                      "cis": "dreadnought.png",
                      "rebellion": "",
                      "empire": ""};

let playerCount;
let players = [];

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
        switchViews("loading-view");
        let map;
        if(playerFaction === "republic" || playerFaction === "cis") {
            map = new SpaceMap(SpaceMap.CLONE_WARS);
        }else{
            map = new SpaceMap(SpaceMap.GALACTIC_CIVIL_WAR);
        }
        buildGrid(map.boardWidth);
        map.generate();
        displaySpaceMap(map);
        startGame(map);
    });
}

function startGame(map) {
    let game = new HexStarWars(map);
    switchViews("screen-container");
    HexGrid.update();
}

function buildGrid(boardSize) {
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
    let navigatingMap = spaceMap.map;
    for(let i = 0; i < navigatingMap.length; i++) {
        for(let j = 0; j < navigatingMap[i].length; j++) {
            let hex = HexGrid.getHexFromTile(i, j)
            if(navigatingMap[i][j].navigable) {
                hex.path.classList.add("hex-planet");
                let attr = {
                    "System": navigatingMap[i][j].sector.name
                };
                if(navigatingMap[i][j].controlledBy !== null) {
                    attr["Controlled By"] = navigatingMap[i][j].controlledBy;
                    let addRemove;
                    switch(attr["Controlled By"]) {
                        case "The Republic": addRemove = ["republic", "cis"]; break;
                        case "The Confederacy": addRemove = ["cis", "republic"]; break;
                        case "The Rebel Alliance": addRemove = ["rebellion", "empire"]; break;
                        case "The Empire": addRemove = ["empire", "rebellion"]; break;
                    }
                    hex.path.classList.add(addRemove[0]);
                    hex.path.classList.remove(addRemove[1]);
                }
                hex.setAttributes(attr);
                if(!navigatingMap[i][j].sector.name.includes("Sector")) {
                    hex.addBackgroundImage(navigatingMap[i][j].sector.image);
                }
            }else{
                hex.path.classList.add("hex-space");
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