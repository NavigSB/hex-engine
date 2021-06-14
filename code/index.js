window.addEventListener("load", init);

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
    HexGrid.addUnit(HexGrid.getHexFromTile(1, 1), "SLTest.png", {});
    HexGrid.addUnit(HexGrid.getHexFromTile(1, 1), "SLTest.png", {});
    let hex = HexGrid.getHexFromTile(0, 0);
    hex.addBackgroundImage("roadTile.png");
    HexGrid.moveUnitInRange(2);
}