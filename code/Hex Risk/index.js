window.addEventListener("load", test);

const SVG_NS = "http://www.w3.org/2000/svg";

const BOARD_SIZE = 8;
const COLOR_MODIFIER = 1.5;
const VIEWS = ["loading-view", "init-view", "player-options-view", "screen-container"];

let playerCount;
let players = [];

function init() {
    id("players-input").addEventListener("input", enforceNumInputInt);
    id("submit-btn").addEventListener("click", function() {
        playerCount = parseInt(id("players-input").value);
        let p1OptionCard = document.getElementsByClassName("options-card")[0];
        makeOptionsCardInteractive(p1OptionCard);
        for(let i = 0; i < playerCount - 1; i++) {
            let newOptionCard = p1OptionCard.cloneNode(true);
            for(let child of newOptionCard.children) {
                let playerId = i + 2;
                child.textContent = child.textContent.replace("1", playerId);
                child.id = child.id.replace("1", playerId);
            }
            makeOptionsCardInteractive(newOptionCard);
            p1OptionCard.parentNode.insertBefore(newOptionCard, id("done-btn"));
        }
        updateChosenColors();
        switchViews("player-options-view");
    });
    id("options-form").addEventListener("submit", function(event) {
        event.preventDefault();
        for(let i = 0; i < playerCount; i++) {
            players.push({});
            players[i].name = id("p" + (i + 1) + "-name").value;
            players[i].color = id("p" + (i + 1) + "-color").value;
            players[i].isAI = id("p" + (i + 1) + "-is-ai").checked;
        }
        switchViews("loading-view");
        buildGrid();
        let testGame = new HexRisk(BOARD_SIZE, BOARD_SIZE);
        for(let i = 0; i < players.length; i++) {
            let hex = testGame.landTiles[Math.floor(Math.random() * testGame.landTiles.length)];
            setHexUnits(hex[0], hex[1], 28, players[i]);
        }
        switchViews("screen-container");
        HexGrid.update();
    });
}

function test() {
    init();
    players = [
        {
            name: "Gavin",
            color: "#0059ff",
            isAI: false
        },
        {
            name: "AI",
            color: "#ff0000",
            isAI: true
        }
    ];
    switchViews("loading-view");
    buildGrid();
    let testGame = new HexRisk(BOARD_SIZE, BOARD_SIZE);
    for(let i = 0; i < players.length; i++) {
        let hex = testGame.landTiles[Math.floor(Math.random() * testGame.landTiles.length)];
        setHexUnits(hex[0], hex[1], 28, players[i]);
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
    HexGrid.changeGridDim(BOARD_SIZE, BOARD_SIZE);
    HexGrid.create();
    HexGrid.setStackingMode(HexGrid.STACKING.SINGLE_ROW, 3);
    for(let i = 0; i < players.length; i++) {
        let playerName = players[i].name;
        if(playerName.substring(playerName.length - 1) !== "s") {
            playerName += "s";
        }
        players[i].teamName = playerName + "-team";
        addTeamColor(players[i].teamName, players[i].color);
    }
}

function setHexUnits(x, y, unitCount, player) {
    let artillery = Math.floor(unitCount / 10);
    let cavalry = Math.floor((unitCount - 10 * artillery) / 5);
    let infantry = Math.floor(unitCount - 10 * artillery - 5 * cavalry);
    updateUnitCount(x, y, "infantry", infantry, player);
    updateUnitCount(x, y, "cavalry", cavalry, player);
    updateUnitCount(x, y, "artillery", artillery, player);
    HexGrid.getHexFromTile(x, y).setAttributes({
        "Owned By": player.name,
        "Unit Count": unitCount
    });
}

function addUnitToHex(x, y, type, amount, player) {
    let hex = HexGrid.getHexFromTile(x, y);
    let pic;
    switch(type) {
        case "infantry": pic = "RiskSoldier.png"; break;
        case "cavalry": pic = "RiskCavalry.png"; break;
        case "artillery": pic = "RiskCannon.png"; break;
    }
    let newUnit = HexGrid.addUnit(hex, pic);
    newUnit.img.style.filter = "url(#" + player.teamName + ")";
    setUnitCountLabel(newUnit, amount);
    return newUnit;
}

function updateUnitCount(x, y, type, count, player) {
    let currentUnits = HexGrid.getHexFromTile(x, y).getUnits();
    let unitInfo = {};
    for(let i = 0; i < currentUnits.length; i++) {
        unitInfo[currentUnits[i].attributes.class] = {
            index: i,
            count: currentUnits[i].attributes.count
        };
    }
    if(count > 0) {
        if(unitInfo[type] === undefined) {
            addUnitToHex(x, y, type, count, player);
        }else{
            setUnitCountLabel(currentUnits[unitInfo[type].index], count);
        }
    }else if(unitInfo[type] !== undefined) {
        HexGrid.getHexFromTile(x, y).removeUnit(unitInfo[type].index);
    }
}

function setUnitCountLabel(unit, count) {
    if(unit.auxiliaries.length > 0) {
        unit.auxiliaries[0].element.children[0].textContent = "x" + count;
    }else{
        let testTextContainer = document.createElementNS(SVG_NS, "svg");
        testTextContainer.setAttribute("viewBox", "0 0 150 150");
        let testText = document.createElementNS(SVG_NS, "text");
        testText.textContent = "x" + count;
        testText.setAttribute("x", 80);
        testText.setAttribute("y", 90);
        testText.style.fontSize = "30pt";
        testTextContainer.appendChild(testText);
        unit.addAuxiliary(testTextContainer, 0, 0, 1.5, 1.5);
    }
}

function addTeamColor(teamName, hexColorStr) {
    let hexArr = hexColorStr.substring(1).split("");

    //pluses turn the hex string to decimal
    let r = +("0x" + hexArr[0] + hexArr[1]) * COLOR_MODIFIER;
    let g = +("0x" + hexArr[2] + hexArr[3]) * COLOR_MODIFIER;
    let b = +("0x" + hexArr[4] + hexArr[5]) * COLOR_MODIFIER;

    let filter = document.createElementNS(SVG_NS, "filter");
    filter.id = teamName;
    filter.setAttribute("x", "0%");
    filter.setAttribute("y", "0%");
    filter.setAttribute("width", "100%");
    filter.setAttribute("height", "100%");
    let matrix = document.createElementNS(SVG_NS, "feColorMatrix");
    matrix.setAttribute("type", "matrix");
    let row1 = (r/255) + " 0 0 0 0";
    let row2 = "0 " + (g/255) + " 0 0 0";
    let row3 = "0 0 " + (b/255) + " 0 0";
    let row4 = "0 0 0 1 0";
    matrix.setAttribute("values", row1 + "\n" + row2 + "\n" + row3 + "\n" + row4);
    filter.appendChild(matrix);
    HexGrid.addDef(filter);
}

function makeOptionsCardInteractive(optionsCard) {
    let nameInput = optionsCard.querySelector("input[type=text]");
    let title = optionsCard.getElementsByClassName("option-title")[0];
    nameInput.addEventListener("input", function() {
        if(this.value === "") {
            let defaultText = this.parentElement.querySelector("label").textContent.substring(0, 8);
            title.textContent = defaultText;
        }else{
            title.textContent = this.value;
        }
    });
    let colorSelector = optionsCard.querySelector("input[type=color]");
    colorSelector.addEventListener("change", updateChosenColors);
}

function updateChosenColors() {
    let otherColorChoosers = id("player-options-view").querySelectorAll("input[type=color]");
    let valuesSoFar = {};
    for (let i = 0; i < otherColorChoosers.length; ++i) {
        let value = otherColorChoosers[i].value;
        if (value in valuesSoFar) {
            otherColorChoosers[i].setCustomValidity("That color has already been chosen for another player!");
            break;
        }
        otherColorChoosers[i].setCustomValidity("");
        valuesSoFar[value] = true;
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

function enforceNumInputInt() {
    let currVal = parseInt(this.value);
    if(currVal > parseInt(this.max)) {
        this.value = this.max;
    }else if(currVal < parseInt(this.min)) {
        this.value = this.min;
    }else{
        this.value = Math.floor(currVal);
    }
}

function sendEventTo(element, eventType) {
    let event = document.createEvent("HTMLEvents");
    event.initEvent(eventType, false, true);
    element.dispatchEvent(event);
}

function id(elId) {
    return document.getElementById(elId);
}