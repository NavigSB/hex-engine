const MAP_PERC_OCEAN = 30;
const REGION_BONUSES = [2, 2, 3, 5, 5, 7];
const SUM_BONUSES = 24;

//Minimum tiles that can make up a region on any board size
const MIN_REGION_SIZE = 3;
//Max amount (0-1) that a region can vary in size
const MAX_REGION_VARIETY = 0.25;

class HexRisk {

	constructor(boardWidth, boardHeight) {
		this.terrain = createTerrain(boardWidth, boardHeight);
		displayTerrain(this.terrain);
		this.landTiles = [];
		for(let i = 0; i < this.terrain.length; i++) {
			for(let j = 0; j < this.terrain[i].length; j++) {
				if(this.terrain[i][j] === 1) {
					this.landTiles.push([i, j]);
				}
			}
		}
		this.regions = createRegions(this.terrain, this.landTiles);
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

function createRegions(terrain, landTiles) {
	const MAX_REGION_ATTEMPTS = 20;
	let terrainLeft = JSON.parse(JSON.stringify(terrain));
	let regions = JSON.parse(JSON.stringify(terrain));
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
						document.getElementById(regionIds[j]).classList.add("region" + (i + 1));
						let hexCoords = regionIds[j].split("_");
						hexCoords.forEach((el, i) => {hexCoords[i] = parseInt(el)});
						let tileCoords = HexGrid.getTileCoords(hexCoords[0], hexCoords[1], hexCoords[2]);
						spliceCoordFrom2DArr(landTilesLeft, tileCoords[0], tileCoords[1]);
						terrainLeft[tileCoords[0]][tileCoords[1]] = 0;
						regions[tileCoords[0]][tileCoords[1]] = i + 1;
					}
					break;
				}
				regionAttempts++;
			}
		}
	}
	for(let i = 0; i < landTilesLeft.length; i++) {
		let id = HexGrid.getHexFromTile(landTilesLeft[i][0], landTilesLeft[i][1]).path.id;
		document.getElementById(id).classList.add("hex-neutral");
		regions[landTilesLeft[i][0]][landTilesLeft[i][1]] = -1;
	}

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

function displayTerrain(terrain) {
	for(let i = 0; i < terrain.length; i++) {
		for(let j = 0; j < terrain[i].length; j++) {
			let newClass = "";
			switch(terrain[i][j]) {
				case -1: newClass = "hex-neutral"; break;
				case 0: newClass = "hex-ocean"; break;
				case 1: newClass = "hex-land"; break;
			}
			HexGrid.getHexFromTile(i, j).path.classList.add(newClass);
		}
	}
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