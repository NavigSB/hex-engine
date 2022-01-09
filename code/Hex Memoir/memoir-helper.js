
var MemoirHelper = (() => {

    let consts = {};

    //Tile integer:
    const FIXED_OBSTACLE_MASK = 0b00011;
    const TERRAIN_MASK =        0b11100;

    //Tile info integer:
    const TEAM_MASK =               0b10000000;
    const TROOP_MASK =              0b01110000;
    const HEALTH_MASK =             0b00001100;
    const REMOVABLE_OBSTACLE_MASK = 0b00000011;

    consts.fixedObstacleTypes = [
        "none",
        "bunker",
        "bridge"
    ];
    consts.terrainTypes = [
        "regular",
        "forest",
        "hedgerow",
        "hill",
        "town",
        "river",
        "ocean",
        "beach"    
    ];

    consts.teamTypes = [
        "axis",
        "allies"
    ];
    consts.troopTypes = [
        "none",
        "infantry",
        "tanks",
        "artillery"
    ];
    consts.removableObstacleTypes = [
        "none",
        "sandbag",
        "wire"
    ];

    consts.terrainPaths = {
        "regular": undefined,
        "forest": "HexImages/ForestTile.png",
        "hedgerow": "HexImages/HedgerowTile.png",
        "hill": "HexImages/HillTile.png",
        "town": "HexImages/TownTile.png",
        "river": "HexImages/RiverTile.png",
        "ocean": "HexImages/OceanTile.png",
        "beach": "HexImages/BeachTile.png",
    }
    consts.fixedObstaclePaths = {
        "none": undefined,
        "bunker": "HexImages/BunkerTile.png",
        "bridge": "HexImages/BridgeTile.png",
    }
    consts.removableObstaclePaths = {
        "none": undefined,
        "sandbag": "UnitImages/Sandbag.png",
        "wire": "UnitImages/Wire.png",
    }
    consts.troopPaths = {
        "none": undefined,
        "infantry": "UnitImages/Infantry.svg",
        "tanks": "UnitImages/Tanks.png",
        "artillery": "UnitImages/Artillery.png",
    }

    function strArrToNumJson(strArr) {
        return strArr.reduce((prev, curr, i) => {
            let ret;
            if(typeof prev == "string") {
                ret = {};
                ret[prev] = 0;
            }else{
                ret = prev;
            }
            ret[curr] = i;
            return ret;
        });
    }
    
    consts.terrains = strArrToNumJson(consts.terrainTypes);
    consts.fixedObstacles = strArrToNumJson(consts.fixedObstacleTypes);
    consts.teams = strArrToNumJson(consts.teamTypes);
    consts.troops = strArrToNumJson(consts.troopTypes);
    consts.removableObstacles = strArrToNumJson(consts.removableObstacleTypes);

    consts.getTile = function(terrain, fixedObstacle) {
        return (consts.terrains[terrain] << 2) | consts.fixedObstacles[fixedObstacle];
    };

    consts.tileToString = function(tile) {
        return consts.getTileTerrain(tile) + ", " + 
               consts.getTileFixedObstacle(tile);
    }

    consts.getTileTerrain = function(tile) {
        return consts.terrainTypes[(tile & TERRAIN_MASK) >> 2];
    }

    /**@param newTerrain can be a string or the actual value*/
    consts.setTileTerrain = function(tile, newTerrain) {
        const INV_TERRAIN_MASK = FIXED_OBSTACLE_MASK;
        let newTerrainVal = consts.terrains[newTerrain] || newTerrain;
        return (newTerrainVal << 2) | (tile & INV_TERRAIN_MASK);
    }

    consts.getTileFixedObstacle = function(tile) {
        return consts.fixedObstacleTypes[tile & FIXED_OBSTACLE_MASK];
    }

    /**@param newFixedObstacle can be a string or the actual value*/
    consts.setTileFixedObstacle = function(tile, newFixedObstacle) {
        const INV_OBS_MASK = TERRAIN_MASK;
        let newObstacleVal = consts.fixedObstacles[newFixedObstacle] || newFixedObstacle;
        return newObstacleVal | (tile & INV_OBS_MASK);
    }

    consts.getTileInfo = function(team, troopType, health, removableObstacle) {
        return consts.teams[team] << 7 |
               consts.troops[troopType] << 5 |
               health << 2 |
               consts.removableObstacles[removableObstacle];
    }

    consts.tileInfoToString = function(tileInfo) {
        return consts.getTileTeam(tileInfo) + ", " + 
               consts.getTileTroopType(tileInfo) + ", " + 
               consts.getTileHealth(tileInfo) + ", " + 
               consts.getTileRemovableObstacle(tileInfo);
    }

    consts.getTileTeam = function(tileInfo) {
        return consts.teamTypes[(tileInfo & TEAM_MASK) >> 7];
    }

    /**@param newTileTeam can be a string or the actual value*/
    consts.setTileTeam = function(tileInfo, newTileTeam) {
        const INV_TEAM_MASK = TEAM_MASK ^ 0xFF;
        let newTileTeamVal = consts.teams[newTileTeam] || newTileTeam;
        return (newTileTeamVal << 7) | (tileInfo & INV_TEAM_MASK);
    }

    consts.getTileTroopType = function(tileInfo) {
        return consts.troopTypes[(tileInfo & TROOP_MASK) >> 5];
    }

    /**@param newTroopType can be a string or the actual value*/
    consts.setTileTroopType = function(tileInfo, newTroopType) {
        const INV_TROOP_MASK = TROOP_MASK ^ 0xFF;
        let newTileTroopVal = consts.teams[newTroopType] || newTroopType;
        return (newTileTroopVal << 5) | (tileInfo & INV_TROOP_MASK);
    }

    consts.getTileHealth = function(tileInfo) {
        return (tileInfo & HEALTH_MASK) >> 2;
    }

    consts.setTileHealth = function(tileInfo, newHealth) {
        const INV_HEALTH_MASK = HEALTH_MASK ^ 0xFF;
        return (newHealth << 2) | (tileInfo & INV_HEALTH_MASK);
    }

    consts.getTileRemovableObstacle = function(tileInfo) {
        return consts.removableObstacleTypes[tileInfo & REMOVABLE_OBSTACLE_MASK];
    }

    /**@param newRemovableObstacle can be a string or the actual value*/
    consts.setTileRemovableObstacle = function(tileInfo, newRemovableObstacle) {
        const INV_OBS_MASK = REMOVABLE_OBSTACLE_MASK ^ 0xFF;
        let newObstacleVal = consts.removableObstacles[newRemovableObstacle] || newRemovableObstacle;
        return newObstacleVal | (tileInfo & INV_OBS_MASK);
    }

    // Get tile info:

    consts.getTerrainPath = function(terrainType) {
        return consts.terrainPaths[terrainType];
    }

    consts.getFixedObstaclePath = function(fixedObstacleType) {
        return consts.fixedObstaclePaths[fixedObstacleType];
    }

    consts.getRemovableObstaclePath = function(removableObstacleType) {
        return consts.removableObstaclePaths[removableObstacleType];
    }

    consts.getTroopPath = function(troopType) {
        return consts.troopPaths[troopType];
    }

    return consts;

})();