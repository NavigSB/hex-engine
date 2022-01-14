(function() {

    window.addEventListener("load", main);

    async function main() {
        let memoirGame = await initializeGame(13, 9);
        console.log("Done Loading!");
        displayGame(memoirGame);
    }

    async function initializeGame(w, h) {
        let imageSrcs = [];
        let srcLists = [
            MemoirHelper.terrainPaths,
            MemoirHelper.fixedObstaclePaths,
            MemoirHelper.removableObstaclePaths,
            MemoirHelper.troopPaths,
        ];
        srcLists.forEach((list) => {
            Object.values(list).forEach((src) => {
                if(src) {
                    imageSrcs.push(src);
                }
            });
        });
        await HexGrid.create({
            w,
            h,
            screenWidth: 800,
            screenHeight: 600,
            stacking: {
                mode: HexGrid.STACKING.GRID,
                maxSize: 4,
                parameters: {
                    gridWidth: 2
                },
            },
            images: imageSrcs,
        });
        let terrainArr = generateTerrain(w, h);
        let troopsArr = generateTroopPos(w, h);
        return new HexMemoir(terrainArr, troopsArr, w, h);
    }

    function generateTerrain(w, h) {
        // const DEFAULT_TILE = MemoirHelper.getTile("regular", "none");

        // let terrainArr = [];
        // for(let i = 0; i < h; i++) {
        //     terrainArr[i] = [];
        //     for(let j = 0; j < w; j++) {
        //         terrainArr[i][j] = DEFAULT_TILE;
        //     }
        // }
        
        // return terrainArr;

        return generateBeachMap();
    }

    function generateTroopPos(w, h) {
        // const DEFAULT_TILE_INFO = MemoirHelper.getTileInfo("axis", "none", 0, "none");
        
        // let tileInfos = [];
        // for(let i = 0; i < h; i++) {
        //     tileInfos[i] = [];
        //     for(let j = 0; j < w; j++) {
        //         tileInfos[i][j] = DEFAULT_TILE_INFO;
        //     }
        // }

        // return tileInfos;

        return generateBeachInfos();
    }

    function displayGame(memoirGame) {
        let w = memoirGame.width, h = memoirGame.height;
        for(let i = 0; i < h; i++) {
            for(let j = 0; j < w; j++) {
                let hex = HexGrid.getHexFromTile(j, i);

                let fixedObstacle = MemoirHelper.getTileFixedObstacle(memoirGame.terrain[i][j]);
                let hexTerrain = MemoirHelper.getTileTerrain(memoirGame.terrain[i][j]);
       
                let hexUnit = MemoirHelper.getTileTroopType(memoirGame.tileInfo[i][j]);
                let removableObstacle = MemoirHelper.getRemovableObstaclePath(memoirGame.tileInfo[i][j]);

                let backgroundImgPath = MemoirHelper.getTerrainPath(hexTerrain) || MemoirHelper.getFixedObstaclePath(fixedObstacle);
                if(backgroundImgPath) {
                    hex.addBackgroundImage(backgroundImgPath, true);
                }
                let obstacleImgPath = MemoirHelper.getRemovableObstaclePath(removableObstacle);
                if(obstacleImgPath) {
                    HexGrid.addUnit(hex, obstacleImgPath);
                }
                let troopImgPath = MemoirHelper.getTroopPath(hexUnit);
                if(troopImgPath) {
                    let team = MemoirHelper.getTileTeam(memoirGame.tileInfo[i][j]);
                    let health = MemoirHelper.getTileHealth(memoirGame.tileInfo[i][j]) + 1;
                    for(let i = 0; i < health; i++) {
                        let unit = HexGrid.addUnit(hex, troopImgPath, {team});
                        HexGrid.colorUnit(unit, team === "allies" ? "00FF00": "0000FF");
                    }
                }
                
            }
        }
        HexGrid.update();
    }

})();