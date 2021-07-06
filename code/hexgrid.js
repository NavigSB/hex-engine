
var HexGrid = (function() {

	"use strict";

	let API = {};

	const X_START = 0;
	const Y_START = 0;

	const SVG_NS = "http://www.w3.org/2000/svg";

	API.STACKING = {
		PYRAMID: 0,
		SINGLE_ROW: 1
	};
	let stackingMode = API.STACKING.PYRAMID;
	let maxStackSize = 3;
	let overlapPerc = 20;
	let unitSize;

	let w = 10;
	let h = 10;

	let defElements = [];

	let currentPath = "";

	let tooltip;

	let classJSON = {};

	let sideLength;
	let hexes = [];
	let units = [];
	let obstructions = [];
	let arrows = [];

	API.create = function() {
		buildScreen();
		window.addEventListener("resize", () => {updateScreen(); updateScreen();});
	}

	API.setStackingMode = function(mode, maximumStackSize, overlapPercent) {
		stackingMode = mode;
		maxStackSize = maximumStackSize || maxStackSize;
		overlapPerc = overlapPercent || overlapPerc;
	}

	API.getHexLine = function(hex1, hex2, getBothHexesOnBoundary = false) {
		if(getBothHexesOnBoundary) {
			return getAllHexesInLine(hex1, hex2);
		}else{
			return getHexesInLine(hex1, hex2);
		}
	}

	API.moveUnit = async function() {
		let unit = await API.selectAnyUnit();
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
		let rangedHexes = [];
		for(let i = 0; i < hexes.length; i++) {
			let dist = hexDist(startingHex, hexes[i]);
			if((dist <= range && dist > 0) || (dist === 0 && includeCenter)) {
				rangedHexes.push(hexes[i]);
			}
		}
		let selected = await selectHex(rangedHexes);
		return selected;
	}

	API.selectAnyUnit = async function() {
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

	API.addObstruction = function(hex, imageSrc, attributesJSON) {
		let newObs = new Obstruction(hex, imageSrc, attributesJSON);
		hex.obstructions.push(newObs);
		obstructions.push(newObs);
		return newObs;
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

	API.addDef = function(defElement) {
		defElements.push(defElement);
	}

	API.getHexes = function() {
		return hexes;
	}

	API.getHexFromCube = function(cubeX, cubeY, cubeZ) {
		return getHexFromCoords(cubeX, cubeY, cubeZ);
	}

	//More expensive than other functions... Don't do constantly
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
			this.path = document.createElementNS(SVG_NS, "path");
			this.path.id = this.x + "_" + this.y + "_" + this.z;
			this.attributes = {};
			let thisHex = this;
			this.path.addEventListener("mousemove", function(){
				if(Object.keys(thisHex.attributes).length > 0) {
					id("hex-tooltip").innerHTML = thisHex.getAttrStr();
					id("hex-tooltip").classList.remove("hidden");
				}else{
					id("hex-tooltip").classList.add("hidden");
				}
			});
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

		setAttributes(json) {
			this.attributes = json;
		}

		addBackgroundImage(src) {
			this.backgroundImage = document.createElementNS(SVG_NS, "image");
			this.backgroundImage.classList.add("clipped");
			this.backgroundImage.setAttribute("href", src);
			updateScreen();
		}

		getAttrStr() {
			let attrStr = "";
			for(let attribute in this.attributes) {
				attrStr += attribute + ": " + this.attributes[attribute] + "<br>";
			}
			return attrStr.substring(0, attrStr.length - 4);
		}

		display() {
			if(this.path.classList.length === 0 && classJSON.hexClass) {
				this.path.classList.add(classJSON.hexClass);
			}
			this.path.setAttribute("d", getHexagonPath(this.x, this.y, this.z, sideLength));
			id("screen").appendChild(this.path);
			this.displayBackgroundImage();
			for(let i = 0; i < this.obstructions.length; i++) {
				this.obstructions[i].display();
			}
			this.displayUnits();
		}

		displayBackgroundImage() {
			if(this.backgroundImage) {
				let pathBoundingBox = this.path.getBBox();
				this.backgroundImage.setAttribute("x", pathBoundingBox.x);
				this.backgroundImage.setAttribute("y", pathBoundingBox.y);
				this.backgroundImage.setAttribute("width", pathBoundingBox.width);
				this.backgroundImage.setAttribute("height", pathBoundingBox.height);
				let wrap = document.createElement("div");
				wrap.appendChild(this.backgroundImage.cloneNode(true));
				let content = wrap.innerHTML;
				id("screen").innerHTML = content + id("screen").innerHTML;
				this.path = id("screen").getElementById(this.x + "_" + this.y + "_" + this.z);
			}
		}

		displayUnits() {
			let overlapWidth = (overlapPerc / 100) * unitSize;
			let startOverlapX = -(overlapWidth * (this.units.length - 1) + unitSize) / 2;
			let startRowX = -(this.units.length * unitSize) / 2;
			let middleY = -unitSize / 2;
			let shownUnitIndex;
			for(let i = 0; i < this.units.length; i++) {
				let unitPos;
				switch(stackingMode) {
					case API.STACKING.PYRAMID:
						unitPos = startOverlapX + i * overlapWidth, middleY;
						break;
					case API.STACKING.SINGLE_ROW:
						unitPos = startRowX + i * unitSize;
						break;
				}
				if(stackingMode !== API.STACKING.PYRAMID || this.shownUnit !== this.units[i]) {
					this.units[i].display(unitPos, middleY);
				}else{
					shownUnitIndex = i;
				}
			}
			if(stackingMode === API.STACKING.PYRAMID && shownUnitIndex !== undefined) {
				this.shownUnit.display(startOverlapX + shownUnitIndex * overlapWidth, middleY);
			}
		}

	}

	class Unit {

		constructor(hex, imageSrc, attributesJSON) {
			this.hex = hex;
			this.attributes = attributesJSON || {};
			this.img = document.createElementNS(SVG_NS, "image");
			this.img.setAttribute("href", imageSrc);
			this.auxiliaries = [];
			let thisUnit = this;
			if(classJSON.unitClass) {
				this.img.classList.add(classJSON.unitClass);
			}
			this.img.addEventListener("mouseenter", function(){
				thisUnit.hex.shownUnit = thisUnit;
				if(Object.keys(thisUnit.attributes).length > 0) {
					id("hex-tooltip").innerHTML = thisUnit.getAttrStr();
					id("hex-tooltip").classList.remove("hidden");
				}else{
					id("hex-tooltip").classList.add("hidden");
				}
				updateScreen();
			});
			this.display();
		}

		getAttrStr() {
			let attrStr = "";
			for(let attribute in this.attributes) {
				if(attribute === "showUnit") {
					attrStr += this.getTooltipImageHTML();
				}else{
					attrStr += attribute + ": " + this.attributes[attribute];
				}
				attrStr += "<br>";
			}
			return attrStr.substring(0, attrStr.length - 4);
		}

		getTooltipImageHTML() {
			let unitHolder = document.createElementNS(SVG_NS, "svg");
			let unitImg = this.img;
			unitImg.removeAttribute("x");
			unitImg.removeAttribute("y");
			unitImg.setAttribute("width", sideLength);
			unitHolder.setAttribute("width", sideLength);
			unitImg.removeAttribute("height", sideLength);
			unitHolder.setAttribute("height", sideLength);
			unitHolder.appendChild(unitImg);
			return unitHolder.outerHTML;
		}

		//All values are in floating point percentages!
		addAuxiliary(element, x, y, width, height) {
			this.auxiliaries.push({
				element: element,
				x: x,
				y: y,
				width: width,
				height: height
			});
			updateScreen();
		}

		display(relX, relY) {
			this.img.setAttribute("width", unitSize);
			this.img.setAttribute("height", unitSize);
			let pos = getHexCenterFromCoord(this.hex.x, this.hex.y, this.hex.z);
			relX = relX || 0;
			relY = relY || 0;
			this.img.setAttribute("x", pos[0] + relX);
			this.img.setAttribute("y", pos[1] + relY);
			id("screen").appendChild(this.img);
			let bBox = this.img.getBBox();
			for(let i = 0; i < this.auxiliaries.length; i++) {
				this.auxiliaries[i].element.setAttribute("x", bBox.x + this.auxiliaries[i].x * bBox.width);
				this.auxiliaries[i].element.setAttribute("y", bBox.y + this.auxiliaries[i].y * bBox.height);
				if(this.auxiliaries[i].element.tagName === "text") {
					this.auxiliaries[i].element.setAttribute("textLength", this.auxiliaries[i].width * bBox.width);
				}else{
					this.auxiliaries[i].element.setAttribute("width", this.auxiliaries[i].width * bBox.width);
					this.auxiliaries[i].element.setAttribute("height", this.auxiliaries[i].height * bBox.height);
				}
				id("screen").appendChild(this.auxiliaries[i].element);
			}
		}

	}

	class Obstruction {

		constructor(hex, imageSrc, attributesJSON) {
			this.hex = hex;
			this.img = document.createElementNS(SVG_NS, "image");
			this.img.setAttribute("href", imageSrc);
			if(classJSON.obstructionClass) {
				this.img.classList.add(classJSON.obstructionClass);
			}
			this.display();
		}

		display(relX, relY) {
			this.img.setAttribute("width", sideLength);
			this.img.setAttribute("height", sideLength);
			let pos = getHexCenterFromCoord(this.hex.x, this.hex.y, this.hex.z);
			if(!relX) {
				relX = 0;
			}
			if(!relY) {
				relY = 0;
			}
			this.img.setAttribute("x", pos[0] - sideLength / 2);
			this.img.setAttribute("y", pos[1] - sideLength / 2);
			id("screen").appendChild(this.img);
		}
	}

	class Arrow {

		constructor(startCubeX, startCubeY, startCubeZ, endCubeX, endCubeY, endCubeZ, classStr, headSize, baseWidth) {
			this.startX = startCubeX;
			this.startY = startCubeY;
			this.startZ = startCubeZ;
			this.endX = endCubeX;
			this.endY = endCubeY;
			this.endZ = endCubeZ;
			this.classStr = classStr;
			this.headSize = headSize;
			this.baseWidth = baseWidth;
			if(!this.classStr) {
				this.classStr = "";
			}
			if(!this.headSize) {
				this.headSize = 20;
			}
			if(!this.baseWidth) {
				this.baseWidth = 5;
			}
		}

		display() {
			let startPos = getHexCenterFromCoord(this.startX, this.startY, this.startZ);
			let endPos = getHexCenterFromCoord(this.endX, this.endY, this.endZ);
			drawArrow(startPos[0], startPos[1], endPos[0], endPos[1], this.baseWidth, this.headSize, this.classStr);
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
		if(tooltip) {
			id("screen").parentElement.removeChild(tooltip);
		}
		tooltip = document.createElement("div");
		tooltip.id = "hex-tooltip";
		tooltip.classList.add("hidden");
		id("screen").parentElement.addEventListener("mousemove", setTooltipToMouse);
		id("screen").parentElement.appendChild(tooltip);
		addHexClipPath();
		updateScreen();
		updateScreen();
	}

	function updateScreen() {
		if(hexes.length > 0) {
			let width = id("screen").clientWidth;
			if(!width) {
				width = window.innerWidth;
			}
			sideLength = (2 * width) / (3 * w + 1);
			let hexHeight = sideLength * Math.sqrt(3);
			let totalHeight = hexHeight * h + hexHeight;
			unitSize = (3 * sideLength / 2) / (maxStackSize);
			id("screen").setAttribute("height", totalHeight);
			id("screen").innerHTML = "";

			drawDefs();
			for(let i = 0; i < hexes.length; i++) {
				hexes[i].display();
			}
			for(let i = 0; i < arrows.length; i++) {
				arrows[i].display();
			}
		}
	}

	function drawDefs() {
		let defs = document.createElement("defs");
		for(let i = 0; i < defElements.length; i++) {
			defs.appendChild(defElements[i]);
		}
		id("screen").appendChild(defs);
	}

	function addHexClipPath() {
		let clipPath = document.createElementNS(SVG_NS, "clipPath");
		clipPath.setAttribute("id", "hex-clip");
		clipPath.setAttribute("clipPathUnits", "objectBoundingBox");
		//Bounding box hex coords
		openPath(0, 0);
		moveTo(0.25, 0);
		lineTo(0.75, 0);
		lineTo(1, 0.5);
		lineTo(0.75, 1);
		lineTo(0.25, 1);
		lineTo(0, 0.5);
		let hexPath = closePath();
		clipPath.appendChild(hexPath);
		defElements.push(clipPath);
	}

	function setTooltipToMouse(event) {
		id("hex-tooltip").style.left = event.pageX + "px";
		id("hex-tooltip").style.top = event.pageY + "px";
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
		return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
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
		let initX = X_START + sideLength;
		let initY = Y_START + sideLength;

		let diagonalXLength = sideLength / 2;
		let hexHeight = sideLength * Math.sqrt(3);

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
		return Math.sqrt(totalSquare);
	}

	function getHexagonPath(cubeX, cubeY, cubeZ, sideLen) {
		let center = getHexCenterFromCoord(cubeX, cubeY, cubeZ);
		return createHexagon(center[0], center[1], sideLen).getAttribute("d");
	}

	function createHexagon(x, y, sideLen) {
		openPath(x, y);
		moveTo(-sideLen / 2, -sideLen * Math.sqrt(3) / 2, true);
		lineTo(sideLen, 0, true);
		lineTo(sideLen / 2, sideLen * Math.sqrt(3) / 2, true);
		lineTo(-sideLen / 2, sideLen * Math.sqrt(3) / 2, true);
		lineTo(-sideLen, 0, true);
		lineTo(-sideLen / 2, -sideLen * Math.sqrt(3) / 2, true);
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
		let totalDist = Math.sqrt(xDist * xDist + yDist * yDist);
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
		lineTo(headStartX - xDisplacement(headSize/Math.sqrt(3)), headStartY + yDisplacement(headSize/Math.sqrt(3)));
		lineTo(headStartX + xDisplacement(headSize/Math.sqrt(3)), headStartY - yDisplacement(headSize/Math.sqrt(3)));
		let head = closePath();

		if(!classStr) {
			classStr = classJSON.arrowClass;
		}
		base.classList.add(classStr);
		head.classList.add(classStr);
		id("screen").appendChild(base);
		id("screen").appendChild(head);
	}

	function openPath(startX, startY, relative) {
		currentPath = "";
		moveTo(startX, startY, relative);
	}

	function moveTo(x, y, relative) {
		addToPath("M", relative, [x, y]);
	}

	function lineTo(x, y, relative) {
		addToPath("L", relative, [x, y]);
	}

	function closePath() {
		addToPath("Z", false, []);
		return endPath();
	}

	function endPath() {
		let newPath = document.createElementNS(SVG_NS, "path");
		newPath.setAttribute("d", currentPath);
		return newPath;
	}

	function createSVGCircle(x, y, r) {
		let circle = document.createElementNS(SVG_NS, "circle");
		circle.setAttribute("cx", x);
		circle.setAttribute("cy", y);
		circle.setAttribute("r", r);
		id("screen").appendChild(circle);
	}

	function addToPath(action, relative, params) {
		if (relative) {
			action = action.toLowerCase();
		} else {
			action = action.toUpperCase();
		}

		currentPath += action;
		for (let i = 0; i < params.length; i++) {
			currentPath += params[i] + " ";
		}
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