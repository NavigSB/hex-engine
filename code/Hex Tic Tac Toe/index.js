window.addEventListener("load", init);

let game, aiPlayer;

async function init() {
    HexGrid.setClasses({
        hexClass: "hex",
        hexHoverClass: "hex-hover",
        unitClass: "unit",
        unitHoverClass: "unit-hover",
        arrowClass: "arrow"
    });
    HexGrid.changeGridDim(3, 3);
    HexGrid.create();

    game = new HexTicTacToe();
    aiPlayer = new ArtificialPlayer(game, 2, 500000, 1.41);
    while(true) {
        let hex = await HexGrid.selectAnyHex();
        game.playMove(coordsToId(hex.x, hex.y, hex.z), true);
        HexGrid.addUnit(hex, "X.png");
        if(game.gameOver()) {
            break;
        }
        let move = await aiPlayer.selectMove();
        game.playMove(move, true);
        let moveCoords = idToCoords(move);
        hex = HexGrid.getHexFromCube(moveCoords[0], moveCoords[1], moveCoords[2]);
        HexGrid.addUnit(hex, "O.png");
        if(game.gameOver()) {
            break;
        }
    }
    console.log("Player " + game.winner() + " wins!");
}

function coordsToId(x, y, z) {
    let colStartZ = (x <= 1 ? 0 : -1);
    let height = z - colStartZ;
    return x + 3 * height;
}

function idToCoords(id) {
    let x = id % 3;
    let height = (id - x) / 3;
    let colStartZ = (x <= 1 ? 0 : -1);
    let z = height + colStartZ;
    let colStartY = (x === 1 ? -colStartZ - 1 : -colStartZ);
    colStartY = (x === 2 ? -colStartY : colStartY);
    let y = colStartY - height;
    return [x, y, z];
}