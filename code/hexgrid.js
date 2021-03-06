
function setup() {
	noLoop();
}

async function loadAssets() {
	for(let i = 0; i < HexGrid.config.images.length; i++) {
		await (() => {
			return new Promise((resolve) => {
				loadImage(HexGrid.config.images[i], img => {
					HexGrid.images[HexGrid.config.images[i]] = img;
					resolve();
				}, () => {
					HexGrid.config.images.splice(i, 1);
					i--;
					resolve();
				});
			});
		})();
	}
}

function setupCanvas() {
	createCanvas(HexGrid.config.screenWidth, HexGrid.config.screenHeight);
}

var HexGrid = (function() {

	"use strict";

	let API = {};

	API.STACKING = {
		PYRAMID: 0,        //Requires no parameters
		SINGLE_ROW: 1,     //Requires 'overlap' parameter (percentage from 0-100, how much the units overlap in stack)
		GRID: 2,           //Requires 'gridWidth' parameter (integer, how wide to make the grid of units)
	};
	let unitSize;

	let w, h;

	let tooltip;

	let classJSON = {};

	let xStart = 0;
	let sideLength;
	let hexes = [];
	let units = [];
	let obstructions = [];
	let arrows = [];
	let unitColors = [];

	let currentPath = {};

	API.create = async function(config = {
		classes: {},
		screenWidth: 800,
		screenHeight: 600,
		w: 10,
		h: 10,
		stacking: {
			mode: API.STACKING.PYRAMID,
			maxSize: 3,
			parameters: {
				overlap: 20
			}
		},
		images: [],	
	}) {
		API.config = config;
		API.images = {};
		w = config.w;
		h = config.h;
		API.setClasses(config.classes);
		buildScreen();
		await loadAssets();
		setupCanvas();
		window.addEventListener("resize", updateScreen);
		updateScreen();
	}

	// API.setStackingMode = function(mode, maximumStackSize, overlapPercent) {
	// 	stackingMode = mode;
	// 	maxStackSize = maximumStackSize || maxStackSize;
	// 	overlapPerc = overlapPercent || overlapPerc;
	// }

	API.getHexLine = function(hex1, hex2, getBothHexesOnBoundary = false) {
		if(getBothHexesOnBoundary) {
			return getAllHexesInLine(hex1, hex2);
		}else{
			return getHexesInLine(hex1, hex2);
		}
	}

	API.getHexesInRange = function(startingHex, range, includeCenter) {
		let rangedHexes = [];
		for(let i = 0; i < hexes.length; i++) {
			let dist = hexDist(startingHex, hexes[i]);
			if((dist <= range && dist > 0) || (dist === 0 && includeCenter)) {
				rangedHexes.push(hexes[i]);
			}
		}
		return rangedHexes;
	}

	API.moveUnit = async function() {
		let unit = await API.selectAnyUnit();
		let tile = await API.selectAnyHex();
		unitMove(unit, tile);
		updateScreen();
	}

	API.moveUnitWithAttributes = async function(attributes) {
		let unit = await API.selectUnitByAttributes(attributes);
		let tile = await API.selectAnyHex();
		unitMove(unit, tile);
		updateScreen();
	}

	API.moveUnitInRange = async function(range) {
		let unit = await API.selectAnyUnit();
		let tile = await API.selectRangedHex(unit.hex, range);
		unitMove(unit, tile);
		updateScreen();
	}

	API.moveUnitInRangeWithAttributes = async function(attributes, range) {
		let unit = await API.selectUnitByAttributes(attributes);
		let tile = await API.selectRangedHex(unit.hex, range);
		unitMove(unit, tile);
		updateScreen();
	}

	API.selectAnyHex = async function() {
		let selected = await selectHex(hexes);
		return selected;
	}

	API.selectUnoccupiedHex = async function() {
		let openHexes = [];
		for(let i = 0; i < hexes.length; i++) {
			if(hexes[i].units.length === 0) {
				openHexes.push(hexes[i]);
			}
		}
		let selected = await selectHex(openHexes);
		return selected;
	}

	API.selectRangedHex = async function(startingHex, range, includeCenter) {
		let selected = await selectHex(API.getHexesInRange(startingHex, range, includeCenter));
		return selected;
	}

	API.customSelectHex = async function(hexes) {
		let selected = await selectHex(hexes);
		return selected;
	}

	API.selectAnyUnit = async function() {
		let selected = await selectUnit(units);
		return selected;
	}

	API.selectUnitByAttributes = async function(attributes) {
		let unitsToSelect = [];
		let attrKeys = Object.keys(attributes);
		for(let i = 0; i < units.length; i++) {
			let containsAllKeys = true;
			for(let key in attrKeys) {
				if(units[i].attributes[key] !== attributes[key]) {
					containsAllKeys = false;
					break;
				}
			}
			if(containsAllKeys) {
				unitsToSelect.push(units[i]);
			}
		}
		let selected = await selectUnit(unitsToSelect);
		return selected;
	}

	API.customSelectUnit = async function(units) {
		let selected = await selectUnit(units);
		return selected;
	}

	API.addUnit = function(hex, imageSrc, attributesJSON) {
		let newUnit = new Unit(hex, imageSrc, attributesJSON);
		hex.units.push(newUnit);
		units.push(newUnit);
		updateScreen();
		return newUnit;
	}

	API.colorUnit = function(unit, hexColorStr) {
		colorUnit(unit, hexColorStr);
	}

	API.addObstruction = function(hex, imageSrc, attributesJSON) {
		let newObs = new Obstruction(hex, imageSrc, attributesJSON);
		hex.obstructions.push(newObs);
		obstructions.push(newObs);
		return newObs;
	}

	API.removeObstruction = function(obstruction) {
		let parentHex = obstruction.hex;
		for(let i = 0; i < obstructions.length; i++) {
			if(obstructions[i] === obstruction) {
				obstructions.splice(i, 1);
				break;
			}
		}
		for(let i = 0; i < parentHex.obstructions.length; i++) {
			if(parentHex.obstructions[i] === obstruction) {
				parentHex.removeObstruction(i);
				break;
			}
		}
	}

	API.drawArrow = function(startTile, endTile) {
		let newArrow = new Arrow(startTile.x, startTile.y, startTile.z, endTile.x, endTile.y, endTile.z, classJSON.arrowClass);
		arrows.push(newArrow);
		updateScreen();
		return newArrow;
	}

	API.drawCustomArrow = function(startTile, endTile, classStr, headSize, baseWidth) {
		let newArrow = new Arrow(startTile.x, startTile.y, startTile.z, endTile.x, endTile.y, endTile.z, classStr, headSize, baseWidth);
		arrows.push(newArrow);
		updateScreen();
		return newArrow;
	}

	API.getHexes = function() {
		return hexes;
	}

	API.getHexFromCube = function(cubeX, cubeY, cubeZ) {
		return getHexFromCoords(cubeX, cubeY, cubeZ);
	}

	//More expensive than cube... Don't use exessively
	API.getHexFromTile = function(tileX, tileY) {
		let cubeCoords = tileToCubeCoords(tileX, tileY);
		return getHexFromCoords(cubeCoords[0], cubeCoords[1], cubeCoords[2]);
	}

	API.getCubeCoords = function(tileX, tileY) {
		return tileToCubeCoords(tileX, tileY);
	}

	API.getTileCoords = function(cubeX, cubeY, cubeZ) {
		return cubeToTileCoords(cubeX, cubeY, cubeZ);
	}

	API.changeGridDim = function(gridW, gridH) {
		w = gridW;
		h = gridH;
		buildScreen();
	}

	//You shouldn't use this unless you really have to
	API.update = function() {
		updateScreen();
	}

	/**
	 * Sets parameters for the objects to be present in the Hex Grid to give custom CSS control over
	 * the look of the grid.
	 * @param {Object} classObj Information about the classes to be given to objects in the Hex Grid.
	 * @param {string} classObj.hexClass The class string for the normal state of hexes in the grid.
	 * @param {string} classObj.hexHoverClass The class string for hexes that are hoverable.
	 * @param {string} classObj.unitClass The class string for the normal state of units in the grid.
	 * @param {string} classObj.unitHoverClass The class string for units that are hoverable.
	 * @param {string} classObj.obstructionClass The class string for the normal state of obstructions in the grid.
	 * @param {string} classObj.arrowClass The class string for the normal state of arrows in the grid.
	 */
	API.setClasses = function(classObj) {
		classJSON = classObj;
	}

	class Hex {

		constructor(tileX, tileY) {
			this.tileX = tileX;
			this.tileY = tileY;
			let cubeCoords = tileToCubeCoords(tileX, tileY);
			this.x = cubeCoords[0];
			this.y = cubeCoords[1];
			this.z = cubeCoords[2];
			this.units = [];
			this.obstructions = [];
			this.attributes = {};
		}

		mouseoverCallback(thisHex) {
			if(Object.keys(thisHex.attributes).length > 0) {
				id("hex-tooltip").innerHTML = thisHex.getAttrStr();
				id("hex-tooltip").classList.remove("hidden");
			}else{
				id("hex-tooltip").classList.add("hidden");
			}
		}

		getTileCoords() {
			return [this.tileX, this.tileY];
		}

		getCubeCoords() {
			return [this.x, this.y, this.z];
		}

		addUnit(unit) {
			this.units.push(unit);
			updateScreen();
		}

		addColoredUnit(unit, color) {
			colorUnit(unit, color);
			this.addUnit(unit);
		}

		getUnits() {
			return this.units;
		}

		getNeighbors() {
			const DIRS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
			let neighbors = [];
			for(let i = 0; i < DIRS.length; i++) {
				try {
					neighbors.push(getHexFromCoords(this.x + DIRS[i][0], this.y + DIRS[i][1], this.z + DIRS[i][2]));
				} catch(e) {}
			}
			return neighbors;
		}

		removeUnit(index) {
			this.units.splice(index, 1);
			updateScreen();
		}

		addObstruction(obstruction) {
			this.obstructions.push(obstruction);
			updateScreen();
		}

		removeObstruction(index) {
			this.obstructions.splice(index, 1);
			updateScreen();
		}

		setAttributes(json) {
			this.attributes = json;
		}

		addBackgroundImage(src, noUpdate) {
			if(!Object.keys(API.images).includes(src)) {
				console.error("Cannot find image src ' + " + src + " + ' in preloaded images!");
				return;
			}
			let imgClass = Object.getPrototypeOf(API.images[src]);
			this.backgroundImage = Object.assign(Object.create(imgClass), API.images[src]);

			let imgSideLength = min(this.backgroundImage.width, this.backgroundImage.height);
			let hexPath = createHexagon(imgSideLength / 2, imgSideLength / 2, imgSideLength / 2);

			let shape = createGraphics(imgSideLength, imgSideLength);
			shape.beginShape();
			for(let i = 0; i < this.path.vertices.length; i++) {
				shape.vertex(hexPath.vertices[i].x, hexPath.vertices[i].y);
			}
			shape.endShape(CLOSE);
			this.backgroundImage.mask(shape);
			shape.remove();

			if(!noUpdate) {
				updateScreen();
			}
		}

		getAttrStr() {
			let attrStr = "";
			for(let attribute in this.attributes) {
				attrStr += "<strong>" + attribute + "</strong>: <br>" + this.attributes[attribute] + "<br>";
			}
			return attrStr.substring(0, attrStr.length - 4);
		}

		display() {
			this.path = getHexagonPath(this.x, this.y, this.z, sideLength);
			displayPath(this.path);
			this.displayBackgroundImage();
			for(let i = 0; i < this.obstructions.length; i++) {
				this.obstructions[i].display();
			}
			if(this.units.length > 0) {
				this.displayUnits();
			}
		}

		displayBackgroundImage() {
			if(this.backgroundImage) {
				let centerCoords = getHexCenterFromCoord(this.x, this.y, this.z);
				image(this.backgroundImage, centerCoords[0] - sideLength, centerCoords[1] - sideLength, sideLength*2, sideLength*2);
			}
		}

		displayUnits() {
			let startRowX = -(this.units.length * unitSize) / 2;
			let middleY = -unitSize / 2;
			let parameters = API.config.stacking.parameters;

			const GRID_SPACE = 0.25;
			let overlapWidth, startOverlapX, shownUnitIndex;
			let rowWidth, currY, leftovers;
			switch(API.config.stacking.mode) {
				case API.STACKING.PYRAMID:
					overlapWidth = (parameters.overlap / 100) * unitSize;
					startOverlapX = -(overlapWidth * (this.units.length - 1) + unitSize) / 2;
					break;
				case API.STACKING.SINGLE_ROW:
					break;
				case API.STACKING.GRID:
					let gridRows = ceil(this.units.length / parameters.gridWidth);
					let gridHeight = gridRows * unitSize * (GRID_SPACE + 1);
					rowWidth = parameters.gridWidth * unitSize * (GRID_SPACE + 1) - GRID_SPACE * unitSize;
					rowWidth = unitSize * (parameters.gridWidth * GRID_SPACE + parameters.gridWidth - GRID_SPACE);
					currY = (gridHeight / 2);
					leftovers = this.units.length % parameters.gridWidth;
					break;
			}
			
			for(let i = 0; i < this.units.length; i++) {
				let unitPos;
				switch(API.config.stacking.mode) {
					case API.STACKING.PYRAMID:
						unitPos = [startOverlapX + i * overlapWidth, middleY];
						break;
					case API.STACKING.SINGLE_ROW:
						unitPos = [startRowX + i * unitSize, middleY];
						break;
					case API.STACKING.GRID:
						let unitsLeft = this.units.length - i;
						let gridWidth = parameters.gridWidth;
						let startX;
						if(i % gridWidth == 0) {
							currY -= unitSize * (GRID_SPACE + 1);
						}
						if(unitsLeft <= leftovers) {
							startX = -(leftovers * unitSize * (GRID_SPACE + 1) - GRID_SPACE) / 2;
						}else{
							startX = -rowWidth / 2;
						}
						unitPos = [startX + (i % gridWidth) * unitSize * (GRID_SPACE + 1), currY];
						break;
				}
				if(API.config.stacking.mode !== API.STACKING.PYRAMID || this.shownUnit !== this.units[i]) {
					this.units[i].display(unitPos[0], unitPos[1]);
				}else{
					shownUnitIndex = i;
				}
			}
			if(API.config.stacking.mode === API.STACKING.PYRAMID && shownUnitIndex !== undefined) {
				this.shownUnit.display(startOverlapX + shownUnitIndex * overlapWidth, middleY);
			}
		}

	}

	class Unit {

		constructor(hex, imageSrc, attributesJSON) {
			this.hex = hex;
			this.attributes = attributesJSON || {};
			this.auxiliaries = [];
			this.imageSrc = imageSrc;
			// this.img.addEventListener("mouseenter", function(){
			// 	thisUnit.hex.shownUnit = thisUnit;
			// 	if(Object.keys(thisUnit.attributes).length > 0 && thisUnit.attributes.showAttributes !== false) {
			// 		id("hex-tooltip").innerHTML = thisUnit.getAttrStr();
			// 		id("hex-tooltip").classList.remove("hidden");
			// 	}else{
			// 		id("hex-tooltip").classList.add("hidden");
			// 	}
			// 	updateScreen();
			// });
			this.display();
		}

		display(relX, relY) {
			let pos = getHexCenterFromCoord(this.hex.x, this.hex.y, this.hex.z);
			image(API.images[this.imageSrc], pos[0] + relX, pos[1] + relY, unitSize, unitSize);
		}

	}

	class Obstruction {

		constructor(hex, imageSrc, attributesJSON) {
			this.hex = hex;
			this.imageSrc = imageSrc;
			this.display();
		}

		display(relX, relY) {
			let pos = getHexCenterFromCoord(this.hex.x, this.hex.y, this.hex.z);
			image(API.images[this.imageSrc], pos[0] + (relX || 0), pos[0] + (relY || 0), sideLength, sideLength);
		}
	}

	API.Hex = Hex;
	API.Unit = Unit;
	API.Obstruction = Obstruction;

	function buildScreen() {
		hexes = [];
		for(let y = 0; y < h; y++) {
			for(let x = 0; x < w; x++) {
				hexes.push(new Hex(x, y));
			}
		}
	}

	function updateScreen() {
		if(hexes.length > 0) {
			sideLength = (1.5 * document.body.clientWidth) / (3 * w + 1);
			let hexHeight = sideLength * sqrt(3);
			let totalWidth = sideLength * (3 * floor(w / 2) + 2 * (w % 2));
			let totalHeight = hexHeight * h + hexHeight;
			xStart = (document.body.clientWidth - totalWidth) / 2;
			unitSize = (3 * sideLength / 2) / (API.config.stacking.maxSize);
			resizeCanvas(document.body.clientWidth, totalHeight);

			background(255);
			if(API.config.defaultFill) {
				fill(API.config.defaultFill);
			}
			for(let i = 0; i < hexes.length; i++) {
				hexes[i].display();
			}
			for(let i = 0; i < arrows.length; i++) {
				arrows[i].display();
			}
		}
	}

	async function selectHex(hexes) {
		hoverHexes(hexes);
		return new Promise((resolve) => {
			for(let i = 0; i < hexes.length; i++) {
				hexes[i].path.addEventListener("click", onHexClick);
			}
			function onHexClick() {
				dehoverHexes(hexes);
				for(let i = 0; i < hexes.length; i++) {
					hexes[i].path.removeEventListener("click", onHexClick);
				}
				let cubePos = this.id.split("_");
				resolve(getHexFromCoords(cubePos[0], cubePos[1], cubePos[2]));
			}
		});
	}

	async function selectUnit(units) {
		hoverUnits(units);
		return new Promise((resolve) => {
			for(let i = 0; i < units.length; i++) {
				units[i].img.addEventListener("click", onUnitClick);
			}
			function onUnitClick() {
				dehoverUnits(units);
				let thisUnit;
				for(let i = 0; i < units.length; i++) {
					units[i].img.removeEventListener("click", onUnitClick);
					if(this === units[i].img) {
						thisUnit = units[i];
					}
				}
				resolve(thisUnit);
			}
		});
	}

	function hoverHexes(hexes) {
		for(let i = 0; i < hexes.length; i++) {
			if(!hexes[i].path.classList.replace(classJSON.hexClass, classJSON.hexHoverClass)) {
				hexes[i].path.classList.add(classJSON.hexHoverClass);
			}
		}
	}

	function dehoverHexes(hexes) {
		for(let i = 0; i < hexes.length; i++) {
			if(!hexes[i].path.classList.replace(classJSON.hexHoverClass, classJSON.hexClass)) {
				hexes[i].path.classList.add(classJSON.hexClass);
			}
		}
	}

	function hoverUnits(units) {
		for(let i = 0; i < units.length; i++) {
			if(!units[i].img.classList.replace(classJSON.unitClass, classJSON.unitHoverClass)) {
				units[i].img.classList.add(classJSON.unitHoverClass);
			}
		}
	}

	function dehoverUnits(units) {
		for(let i = 0; i < units.length; i++) {
			if(!units[i].img.classList.replace(classJSON.unitHoverClass, classJSON.unitClass)) {
				units[i].img.classList.add(classJSON.unitClass);
			}
		}
	}

	function colorUnit(unit, hexColorStr) {
		// const COLOR_MODIFIER = 1.5;

		// if(!unitColors.includes("color" + hexColorStr)) {
		// 	if(hexColorStr.includes("#")) {
		// 		hexColorStr = hexColorStr.substring(1);
		// 	}
		// 	let hexArr = hexColorStr.split("");

		// 	//pluses turn the hex string to decimal
		// 	let r = +("0x" + hexArr[0] + hexArr[1]) * COLOR_MODIFIER;
		// 	let g = +("0x" + hexArr[2] + hexArr[3]) * COLOR_MODIFIER;
		// 	let b = +("0x" + hexArr[4] + hexArr[5]) * COLOR_MODIFIER;

		// 	let filter = document.createElementNS(SVG_NS, "filter");
		// 	filter.id = "color" + hexColorStr;
		// 	filter.setAttribute("x", "0%");
		// 	filter.setAttribute("y", "0%");
		// 	filter.setAttribute("width", "100%");
		// 	filter.setAttribute("height", "100%");
		// 	let matrix = document.createElementNS(SVG_NS, "feColorMatrix");
		// 	matrix.setAttribute("type", "matrix");
		// 	let row1 = (r/255) + " 0 0 0 0";
		// 	let row2 = "0 " + (g/255) + " 0 0 0";
		// 	let row3 = "0 0 " + (b/255) + " 0 0";
		// 	let row4 = "0 0 0 1 0";
		// 	matrix.setAttribute("values", row1 + "\n" + row2 + "\n" + row3 + "\n" + row4);
		// 	filter.appendChild(matrix);
		// 	API.addDef(filter);
		// 	unitColors.push("color" + hexColorStr);
		// }

		// unit.img.style.filter = "url(#color" + hexColorStr + ")";
	}

	function unitMove(unit, hex) {
		let startHex = unit.hex;
		for(let i = 0; i < startHex.units.length; i++) {
			if(startHex.units[i] === unit) {
				startHex.units.splice(i, 1);
				break;
			}
		}
		unit.hex = hex;
		hex.units.push(unit);
	}

	//When the line goes through boundaries, both hexes on either side are added
	function getAllHexesInLine(hex1, hex2) {
		return getHexLine(hex1.x, hex1.y, hex1.z, hex2.x, hex2.y, hex2.z);
	}

	//When the line goes through boundaries, only hexes on one side are returned.
	function getHexesInLine(hex1, hex2) {
		return getHexLine(hex1.x, hex1.y, hex1.z, hex2.x, hex2.y, hex2.z - 1e-6);
	}

	function getHexLine(x1, y1, z1, x2, y2, z2) {
		let samples = hexDistFromCoords(x1, y1, z1, x2, y2, z2);
		let center1 = getHexCenterFromCoord(x1, y1, z1);
		let center2 = getHexCenterFromCoord(x2, y2, z2);
		let line = [];

		for(let i = 0; i <= samples; i++) {
			let sampleX = lerp(center1[0], center2[0], i/samples);
			let sampleY = lerp(center1[1], center2[1], i/samples);
			let hexes = getHexFromPixels(sampleX, sampleY);
			for(let j = 0; j < hexes.length; j++) {
				line.push(hexes[j]);
			}
		}

		return line;
	}

	function hexDist(hex1, hex2) {
		return hexDistFromCoords(hex1.x, hex1.y, hex1.z, hex2.x, hex2.y, hex2.z);
	}

	function hexDistFromCoords(x1, y1, z1, x2, y2, z2) {
		//Uses Manhattan distance
		//Since adjacent hexes are up one and to the side one, you have to divide by two for a distance of one for adjacent hexes.
		return (abs(x1 - x2) + abs(y1 - y2) + abs(z1 - z2)) / 2;
	}

	function getHexFromCoords(cubeX, cubeY, cubeZ) {
		for(let i = 0; i < hexes.length; i++) {
			if(hexes[i].x == cubeX && hexes[i].y == cubeY && hexes[i].z == cubeZ) {
				return hexes[i];
			}
		}
		throw new Error("Given coordinates don't have an associated hex.  \
						 HexGrid:getHexFromCoords");
	}

	function getHexCenterFromCoord(x, y, z) {
		let initX = xStart + sideLength;
		let initY = sideLength;

		let diagonalXLength = sideLength / 2;
		let hexHeight = sideLength * sqrt(3);

		let isXOdd = x & 1;
		let tileY = z + (x - isXOdd) / 2;

		let endY = initY + hexHeight * tileY;
		if(x % 2 == 1) {
			endY += hexHeight / 2;
		}

		let endX = initX + x * (sideLength + diagonalXLength);

		return [endX, endY];
	}

	//Returns an array with the hexes closest to the pixel value
	//Only multiple when two are equivalent
	function getHexFromPixels(x, y) {
		let bestDist = Infinity;
		let best = [];
		for(let i = 0; i < hexes.length; i++) {
			let center = getHexCenterFromCoord(hexes[i].x, hexes[i].y, hexes[i].z);
			let distance = dist([x, y], center);
			if(distance < bestDist) {
				bestDist = distance;
				best = [hexes[i]];
			}else if(distance - bestDist <= 1e-6) {
				best.push(hexes[i]);
			}
		}
		return best;
	}

	function dist(arr1, arr2) {
		if(arr1.length != arr2.length) {
			console.error("Dimensions do not match.  HexGrid:dist");
		}
		let totalSquare = 0;
		for(let i = 0; i < arr1.length; i++) {
			totalSquare += square(arr1[i] - arr2[i]);
		}
		return sqrt(totalSquare);
	}

	function displayPath(path) {
		if(path.fillColor) {
			fill(path.fillColor);
		}
		if(path.strokeColor) {
			stroke(path.strokeColor);
		}
		beginShape();
		for(let i = 0; i < path.vertices.length; i++) {
			vertex(path.vertices[i].x, path.vertices[i].y);
		}
		if(path.close) {
			endShape(CLOSE);
		}else{
			endShape();
		}
	}

	function getHexagonPath(cubeX, cubeY, cubeZ, sideLen) {
		let center = getHexCenterFromCoord(cubeX, cubeY, cubeZ);
		return createHexagon(center[0], center[1], sideLen);
	}

	function createHexagon(x, y, sideLen) {
		openPath(x, y);
		moveTo(-sideLen / 2, -sideLen * sqrt(3) / 2, true);
		lineTo(sideLen, 0, true);
		lineTo(sideLen / 2, sideLen * sqrt(3) / 2, true);
		lineTo(-sideLen / 2, sideLen * sqrt(3) / 2, true);
		lineTo(-sideLen, 0, true);
		lineTo(-sideLen / 2, -sideLen * sqrt(3) / 2, true);
		return closePath();
	}

	function tileToCubeCoords(tileX, tileY) {
		let x = tileX;
		let xIsOdd = tileX & 1;
		let z = tileY - (tileX - xIsOdd) / 2;
		let y = -x - z;
		return [x, y, z];
	}

	function cubeToTileCoords(cubeX, cubeY, cubeZ) {
		let xIsOdd = cubeX & 1;
		let tileY = (cubeX - xIsOdd) / 2 + cubeZ;
		return [cubeX, tileY];
	}

	function drawArrow(startX, startY, endX, endY, baseWidth, headSize, classStr) {
		let xDist = endX - startX;
		let yDist = endY - startY;
		let totalDist = sqrt(xDist * xDist + yDist * yDist);
		let headStartX = endX - ((xDist * headSize) / totalDist);
		let headStartY = endY - ((yDist * headSize) / totalDist);
		let xDisplacement = function(size) {return (yDist * size) / (totalDist)};
		let yDisplacement = function(size) {return (xDist * size) / (totalDist)};

		openPath(startX, startY);
		lineTo(xDisplacement(baseWidth), -yDisplacement(baseWidth), true);
		lineTo(headStartX + xDisplacement(baseWidth), headStartY - yDisplacement(baseWidth));
		lineTo(-2*xDisplacement(baseWidth), 2*yDisplacement(baseWidth), true);
		lineTo(startX - xDisplacement(baseWidth), startY + yDisplacement(baseWidth));
		lineTo(startX, startY);
		let base = endPath();

		openPath(endX, endY);
		lineTo(headStartX - xDisplacement(headSize/sqrt(3)), headStartY + yDisplacement(headSize/sqrt(3)));
		lineTo(headStartX + xDisplacement(headSize/sqrt(3)), headStartY - yDisplacement(headSize/sqrt(3)));
		let head = closePath();

		if(!classStr) {
			classStr = classJSON.arrowClass;
		}
		base.classList.add(classStr);
		head.classList.add(classStr);
		id("screen").appendChild(base);
		id("screen").appendChild(head);
	}

	function openPath(startX, startY, relative, fillColor, strokeColor) {
		currentPath = {
			vertices: [],
			currPos: createVector(0, 0),
			fillColor,
			strokeColor,
		};
		moveTo(startX, startY, relative);
	}

	function moveTo(x, y, relative) {
		addToPath("M", relative, createVector(x, y));
	}

	function lineTo(x, y, relative) {
		addToPath("L", relative, createVector(x, y));
	}

	function closePath(noClose) {
		delete currentPath.currPos;
		currentPath.close = !noClose;
		return currentPath;
	}

	function addToPath(action, relative, params) {
		//After this if, params always equals the coordinates to go to
		if(relative && params) {
			params.x += currentPath.currPos.x;
			params.y += currentPath.currPos.y;
		}
		if(action == "L") {
			if(currentPath.vertices.length == 0) {
				currentPath.vertices.push(createVector(currentPath.currPos.x, currentPath.currPos.y));
			}
			currentPath.vertices.push(createVector(params.x, params.y));
		}
		currentPath.currPos.x = params.x;
		currentPath.currPos.y = params.y;
	}

	//Short for linear interpolation
	//Gets value a percentage of the way between two other values
	function lerp(a, b, perc) {
		return a + (b - a) * perc;
	}

	function square(val) {
		return val * val;
	}

	function id(elId) {
		return document.getElementById(elId);
	}

	return API;

})();