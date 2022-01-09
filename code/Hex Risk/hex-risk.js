const MAP_PERC_OCEAN = 30;
const REGION_BONUSES = [2, 2, 3, 5, 5, 7];

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

//Assumes no islands
function createRegions(terrain, landTiles) {
	// let regions = [];
	// let terrainLeft = JSON.parse(JSON.stringify(terrain));
	// let landTilesLeft = JSON.parse(JSON.stringify(landTiles));
	// for(let i = 0; i < 1; i++) {
	// 	let tileCount = Math.round(REGION_BONUSES[i] * landTiles.length / 24);
	// 	let randIndex = Math.floor(Math.random() * landTilesLeft.length);
	// 	console.log(tileCount);
	// 	let startingTile = HexGrid.getHexFromTile(parseInt(landTilesLeft[randIndex][0]), parseInt(landTilesLeft[randIndex][1]));
	// 	let region = floodGetRegion(startingTile, terrainLeft, tileCount);
	// 	regions.push(region);
	// 	for(let j = 0; j < region.length; j++) {
	// 		let cubeCoords = region[j].split("_");
	// 		let tileCoords = HexGrid.getTileCoords(parseInt(cubeCoords[0]), parseInt(cubeCoords[1]), parseInt(cubeCoords[2]));
	// 		let tile = HexGrid.getHexFromTile(tileCoords[0], tileCoords[1]);
	// 		tile.path.classList.add("region" + (i + 1));
	// 		landTilesLeft.splice(landTilesLeft.indexOf(tileCoords[0] + "_" + tileCoords[1]), 1);
	// 		terrainLeft[tileCoords[0]][tileCoords[1]] = -1;
	// 	}
	// 	region = fillRegion(region, terrainLeft);
	// }

	/*
	Alright, here's the algorithm. Do like before and use like 104 to generate the tileCounts, except make sure that region 1
	just has the count of whatever is left, and not 104. Also, as you might have guessed from that last sentence, loop through
	the regions backwards. It just makes sense that you leave the smallest regions to be squeezed in last. And here's the actual
	algorithm: first, round up any odd-numbered tile count to the nearest even, and store that number (I'll call it evenCount).
	Next, find all the factors of the evenCount, and store it in a nested array as pairs of values that multiply to get evenCount.
	After that, you have your rectangular configurations. For each rectangular configuration, iterate through the available tiles
	in the terrain array, and check the rectangles both of dimensions (width x height) and (height x width) for how many available tiles
	it has. If either rectangle contains enough available tiles, break and fill every available tile in that rectangle to have that region,
	and move on to the next region. Otherwise, keep going until you find it. If you cannot, and nothing works out, you must increment your
	eventCount by 2. The maximum amount of tiles you can have in one rectangle should be the amount of tiles in the region multiplied by
	some value kept as a file constant. That way, you can control how far spread a single region is allowed to be. If all this checking
	leads to no result, random tiles of the amount that would be in the region are set as neutral tiles. This is fullproof and will result
	in no territory bonuses that are unfair.
	*/
	
	let totalTiles = 0;
	let terrainLeft = JSON.parse(JSON.stringify(terrain));
	let landTilesLeft = JSON.parse(JSON.stringify(landTiles));
	for(let i = 5; i >= 0; i--) {
		let tileCount = Math.round(REGION_BONUSES[i] * landTiles.length / 24);
		if(i === 0) {
			tileCount = landTiles.length - totalTiles;
		}else{
			totalTiles += tileCount;
		}
		//Round to the nearest even
		let evenCount = Math.round(tileCount / 2) * 2;
		let factors = [];
		for(let j = 0; j < Math.sqrt(evenCount); j++) {
			if(evenCount / j === Math.round(evenCount / j)) {
				factors.push([j, evenCount / j]);
			}
		}
		for(let j = 0; j < landTilesLeft.length; j++) {
			let x = parseInt(landTilesLeft[j].split("_")[0]);
			let y = parseInt(landTilesLeft[j].split("_")[1]);
			if(terrainLeft[x][y] === 1) {
				//For each currently available tile
				//For each factor set
				let spaceFound = [];
				for(let f = 0; f < factors.length; f++) {
					for(let k = 0; k < 8; k++) {
						let width, height;
						let multX = 1;
						let multY = 1;
						if(k < 4) {
							width = factors[f][0];
							height = factors[f][1];
						}else{
							width = factors[f][1];
							height = factors[f][0];
						}
						if(Math.floor(k / 2) % 2 === 1) {
							multX = -1;
						}
						if(k % 2 === 1) {
							multY = -1;
						}

						let total = 0;
						for(let w = 0; w < width; w++) {
							for(let h = 0; h < height; h++) {
								total += terrainLeft[x + w][y + h];
							}
						}
						if(total === width * height) {
							spaceFound = [width, height];
							break;
						}
					}
					//Is this right?
					if(spaceFound.length !== 0) {
						for(let w = 0; w < width; w++) {
							for(let h = 0; h < height; h++) {
								terrainLeft[x + w][y + h] = i;
								landTilesLeft.splice(landTilesLeft.indexOf((x + w) + "_" + (y + h)), 1);
								j = landTilesLeft.length;
							}
						}
					}else if(f + 1 >= factors.length) {
						factors.push();
					}
				}
				if(spaceFound) {
					//Move on to the next region
					break;
				}
			}
		}
	}
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

function fillRegion(region, terrain) {
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

//arr variable is for recursion; don't use it.
function floodGetRegion(startingTile, currentTerrain, maxTiles, arr = []) {
	let tileCoords = HexGrid.getTileCoords(startingTile.x, startingTile.y, startingTile.z);
	if(currentTerrain[tileCoords[0]][tileCoords[1]] === 1) {
		arr.push(startingTile.path.id);
	}else{
		return arr;
	}
	let neighbors = startingTile.getNeighbors();
	for(let i = 0; i < neighbors.length; i++) {
		let neighborId = neighbors[i].path.id;
		if(!arr.includes(neighborId) && arr.length < maxTiles) {
			arr = floodGetRegion(neighbors[i], currentTerrain, maxTiles, arr);
		}
	}
	return arr;
}