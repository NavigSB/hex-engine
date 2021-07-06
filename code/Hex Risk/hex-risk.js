const MAP_PERC_OCEAN = 30;
const REGION_BONUSES = [2, 2, 3, 5, 5, 7];
const SUM_BONUSES = 24;

//Minimum tiles that can make up a region on any board size
const MIN_REGION_SIZE = 3;
//Max amount (0-1) that a region can vary in size
const MAX_REGION_VARIETY = 0.25;

class HexRisk {

	constructor(boardWidth, boardHeight) {
		let terrain = createTerrain(boardWidth, boardHeight);
		this.landTiles = [];
		for(let i = 0; i < terrain.length; i++) {
			for(let j = 0; j < terrain[i].length; j++) {
				if(terrain[i][j] === 1) {
					this.landTiles.push([i, j]);
				}
			}
		}
		this.regionsInfo = createRegions(terrain, this.landTiles);
		displayMap(this.regionsInfo);
	}

	getState() {
		return this.state;
	}

	setState(state) {
		this.state = state;
	}

	cloneState() {

	}

	moves() {

	}

	playMove(move, verbose) {

	}

	gameOver() {

	}

	winner() {

	}
}

function displayMap(regionsInfo) {
	let map = regionsInfo.map;
	for(let i = 0; i < map.length; i++) {
		for(let j = 0; j < map[i].length; j++) {
			let hex = HexGrid.getHexFromTile(i, j)
			if(map[i][j] === 0) {
				hex.path.classList.add("hex-ocean");
			}else{
				hex.path.classList.add("hex-land");
				hex.path.classList.add("region" + regionsInfo.stats[map[i][j]].styleId);
			}
		}
	}
}

function createRegions(terrain, landTiles) {
	const MAX_REGION_ATTEMPTS = 20;
	let terrainLeft = JSON.parse(JSON.stringify(terrain));
	let regionsMap = JSON.parse(JSON.stringify(terrain));
	regionsMap.forEach((el, i) => {
		el.forEach((el, j) => {
			regionsMap[i][j] = el === 1 ? -1 : el;
		});
	});
	let landTilesLeft = JSON.parse(JSON.stringify(landTiles));
	for(let i = REGION_BONUSES.length - 1; i >= 0; i--) {
		let tileCount = Math.round(REGION_BONUSES[i] * landTiles.length / SUM_BONUSES);
		if(tileCount >= MIN_REGION_SIZE) {
			let regionAttempts = 0;
			while(regionAttempts < MAX_REGION_ATTEMPTS){
				let startCoords = landTilesLeft[Math.floor(Math.random() * landTilesLeft.length)];
				let startingTile = HexGrid.getHexFromTile(startCoords[0], startCoords[1]);
				let regionIds = floodGetRegion(startingTile, terrainLeft, tileCount);
				if(regionIds.length >= tileCount * (1 - MAX_REGION_VARIETY)) {
					for(let j = 0; j < regionIds.length; j++) {
						let hexCoords = regionIds[j].split("_");
						hexCoords.forEach((el, i) => {hexCoords[i] = parseInt(el)});
						let tileCoords = HexGrid.getTileCoords(hexCoords[0], hexCoords[1], hexCoords[2]);
						spliceCoordFrom2DArr(landTilesLeft, tileCoords[0], tileCoords[1]);
						terrainLeft[tileCoords[0]][tileCoords[1]] = 0;
						regionsMap[tileCoords[0]][tileCoords[1]] = i + 1;
					}
					break;
				}
				regionAttempts++;
			}
		}
	}
	for(let i = 0; i < landTilesLeft.length; i++) {
		let leftoverHex = HexGrid.getHexFromTile(landTilesLeft[i][0], landTilesLeft[i][1]);
		let neighbors = leftoverHex.getNeighbors();
		let newRegion, randomNeighbor;
		for(let j = 0; j < neighbors.length; j++) {
			let neighborRegion = regionsMap[neighbors[j].tileX][neighbors[j].tileY];
			if(neighborRegion !== 0 && neighborRegion !== -1) {
				newRegion = neighborRegion;
				randomNeighbor = neighbors[j];
				break;
			}
		}
		if(randomNeighbor) {
			regionsMap[landTilesLeft[i][0]][landTilesLeft[i][1]] = newRegion;
		}else{
			landTilesLeft.push(landTilesLeft[i]);
		}
	}

	let regionsInfo = [];
	let idCounter = 1;
	for(let i = 0; i < regionsMap.length; i++) {
		for(let j = 0; j < regionsMap[i].length; j++) {
			if(regionsMap[i][j] !== 0) {
				if(!regionsInfo[regionsMap[i][j]]) {
					regionsInfo[regionsMap[i][j]] = {
						id: idCounter,
						styleId: regionsMap[i][j],
						count: 0
					};
					idCounter++;
				}
				regionsInfo[regionsMap[i][j]].count++;
				regionsMap[i][j] = regionsInfo[regionsMap[i][j]].id;
			}
		}
	}

	let stats = [];
	for(let i = 1; i <= REGION_BONUSES.length; i++) {
		if(regionsInfo[i] !== undefined) {
			regionBonus = Math.round(SUM_BONUSES * regionsInfo[i].count / landTiles.length);
			stats[regionsInfo[i].id] = {
				styleId: regionsInfo[i].styleId,
				count: regionsInfo[i].count,
				bonus: regionBonus
			};
		}
	}

	let regions = {
		stats: stats,
		map: regionsMap
	};
	return regions;
}

//Must be 2D array containing arrays with 2 values (2D coordinates)
function spliceCoordFrom2DArr(array, x, y) {
	let elementRemoved = [];
	for(let i = 0; i < array.length; i++) {
		if(array[i][0] === x && array[i][1] === y) {
			elementRemoved.push(array.splice(i, 1));
			break;
		}
	}
	return elementRemoved;
}

function createTerrain(w, h) {
	const STEP_SIZE = 1 / 5;

	let terrain = [];
	let total = 0;

	noise.seed(Math.random());
	for(let i = 0; i < w; i++) {
		terrain.push([]);
		for(let j = 0; j < h; j++) {
			terrain[i][j] = Math.abs(noise.perlin2(i * STEP_SIZE, j * STEP_SIZE));
			total += terrain[i][j];
		}
	}

	let avg = total/(w * h);
	let landTiles = [];
	for(let i = 0; i < terrain.length; i++) {
		for(let j = 0; j < terrain[i].length; j++) {
			if(terrain[i][j] > avg * (MAP_PERC_OCEAN / 100 * 2)) {
				//Land
				terrain[i][j] = 1;
				landTiles.push(i + "_" + j);
			}else{
				//Ocean
				terrain[i][j] = 0;
			}
		}
	}

	terrain = fixIslands(terrain, landTiles);

	return terrain;
}

function fixIslands(terrain, landTiles) {
	let startingTile, tileCoords;
	do {
		startingTile = HexGrid.getHexes()[Math.floor(Math.random() * HexGrid.getHexes().length)];
		tileCoords = HexGrid.getTileCoords(startingTile.x, startingTile.y, startingTile.z);
	}while(terrain[tileCoords[0]][tileCoords[1]] === 0);
	let landmass = floodGetLandmass(startingTile, terrain);
	while(landmass.length < landTiles.length) {
		let islandCubeId;
		let landTileCount = -1;
		do {
			landTileCount++;
			let x = landTiles[landTileCount].split("_")[0];
			let y = landTiles[landTileCount].split("_")[1];
			let islandHex = HexGrid.getHexFromTile(x, y);
			islandCubeId = islandHex.path.id;
		} while(landTileCount < landTiles.length - 1 && landmass.includes(islandCubeId));
		let islandCoords = islandCubeId.split("_");
		let islandHex = HexGrid.getHexFromCube(parseInt(islandCoords[0]), islandCoords[1], islandCoords[2]);
		let hexesInBetween = HexGrid.getHexLine(startingTile, islandHex, true);
		for(let i = 0; i < hexesInBetween.length; i++) {
			let tileCoords = HexGrid.getTileCoords(hexesInBetween[i].x, hexesInBetween[i].y, hexesInBetween[i].z);
			if(terrain[tileCoords[0]][tileCoords[1]] === 0) {
				landTiles.push(tileCoords[0] + "_" + tileCoords[1]);
			}
			terrain[tileCoords[0]][tileCoords[1]] = 1;
		}
		landmass = floodGetLandmass(startingTile, terrain);
	}

	return terrain;
}

function floodGetLandmass(startingTile, currentTerrain) {
	return floodGetRegion(startingTile, currentTerrain, Infinity);
}

function floodGetRegion(startingTile, currentTerrain, maxTiles) {
	let borders = [startingTile];
	let newBorders = [];
	let region = [startingTile];
	while(region.length < maxTiles && borders.length > 0) {
		// let paths = [];
		// region.forEach((t, i) => paths[i] = document.getElementById(t.path.id));
		// console.log(paths);
		for(let i = 0; i < borders.length; i++) {
			let borderTile = borders.splice(i, 1)[0];
			let neighbors = borderTile.getNeighbors();
			for(let j = 0; j < neighbors.length; j++) {
				let tileCoords = HexGrid.getTileCoords(neighbors[j].x, neighbors[j].y, neighbors[j].z);
				let isLand = currentTerrain[tileCoords[0]][tileCoords[1]] === 1;
				//The current tile is land and the region does not already include the current tile
				if(isLand && region.filter(t => t.path.id === neighbors[j].path.id).length === 0) {
					region.push(neighbors[j]);
					newBorders.push(neighbors[j]);
				}
			}
		}
		borders = newBorders;
	}
	for(let i = 0; i < region.length; i++) {
		region[i] = region[i].path.id;
	}
	//return region;
	return region.slice(0, maxTiles);
}