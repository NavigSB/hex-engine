const MAP_PERC_SPACE = 30;
const MAP_PERC_NO_PLANETS = 25;
const MIN_PLANETS = 10;

const COMMON_PLANETS = [
  {
    name: "Coruscant",
    image: "planets/coruscant.png",
  },
  {
    name: "Dagobah",
    image: "planets/dagobah.png",
  },
  {
    name: "Felucia",
    image: "planets/felucia.png",
  },
  {
    name: "Kamino",
    image: "planets/kamino.png",
  },
  {
    name: "Kashyyyk",
    image: "planets/kashyyyk.png",
  },
  {
    name: "Tatooine",
    image: "planets/tatooine.png",
  },
  {
    name: "Mustafar",
    image: "planets/mustafar.png",
  },
  {
    name: "Mygeeto",
    image: "planets/mygeeto.png",
  },
  {
    name: "Naboo",
    image: "planets/naboo.png",
  },
  {
    name: "Polis Massa",
    image: "planets/polis-massa.png",
  },
  {
    name: "Utapau",
    image: "planets/utapau.png",
  },
  {
    name: "Yavin 4",
    image: "planets/yavin-4.png",
  },
];
const CW_PLANETS = [
  {
    name: "Geonosis",
    image: "planets/geonosis.png",
  },
];
const GCW_PLANETS = [
  {
    name: "Endor",
    image: "planets/endor.png",
  },
  {
    name: "Hoth",
    image: "planets/hoth.png",
  },
];

class SpaceMap {
  //Map types are: SpaceMap.CLONE_WARS and SpaceMap.GALACTIC_CIVIL_WAR - See bottom of script
  constructor(mapType) {
    if (mapType === SpaceMap.CLONE_WARS) {
      this.possiblePlanets = COMMON_PLANETS.concat(CW_PLANETS);
    } else {
      this.possiblePlanets = COMMON_PLANETS.concat(GCW_PLANETS);
    }
    this.minTiles = Math.floor(
      10000 *
        (MIN_PLANETS / (100 - MAP_PERC_NO_PLANETS) / (100 - MAP_PERC_SPACE))
    );
    this.maxTiles = Math.round(
      10000 *
        (this.possiblePlanets.length /
          (100 - MAP_PERC_NO_PLANETS) /
          (100 - MAP_PERC_SPACE))
    );
    this.boardWidth = Math.floor(Math.sqrt(this.maxTiles));
  }

  generate() {
    do {
      this.map = this.createMap(this.boardWidth, this.boardWidth);
      this.navigableTiles = [];
      for (let i = 0; i < this.map.length; i++) {
        for (let j = 0; j < this.map[i].length; j++) {
          if (this.map[i][j].navigable) {
            this.navigableTiles.push([i, j]);
          }
        }
      }
    } while (
      this.navigableTiles.length < this.minTiles ||
      this.navigableTiles.length > this.maxTiles
    );
  }

  createMap(w, h) {
    const STEP_SIZE = 1 / 5;

    let map = [];
    let total = 0;

    noise.seed(Math.random());
    for (let i = 0; i < w; i++) {
      map.push([]);
      for (let j = 0; j < h; j++) {
        map[i][j] = Math.abs(noise.perlin2(i * STEP_SIZE, j * STEP_SIZE));
        total += map[i][j];
      }
    }

    let avg = total / (w * h);
    let navigableTiles = [];
    for (let i = 0; i < map.length; i++) {
      for (let j = 0; j < map[i].length; j++) {
        if (map[i][j] > avg * ((MAP_PERC_SPACE / 100) * 2)) {
          //Land
          map[i][j] = 1;
          navigableTiles.push(i + "_" + j);
        } else {
          //Ocean
          map[i][j] = 0;
        }
      }
    }

    map = this.fixIsolations(map, navigableTiles);

    let planetCount =
      (navigableTiles.length * (100 - MAP_PERC_NO_PLANETS)) / 100;
    let totalRegions = shuffle(
      JSON.parse(JSON.stringify(this.possiblePlanets))
    );
    totalRegions.splice(planetCount);
    let sectorCount = navigableTiles.length - totalRegions.length;
    for (let i = 0; i < sectorCount; i++) {
      totalRegions.push({
        name: "Sector " + (i + 1),
      });
    }
    totalRegions = shuffle(totalRegions);

    for (let i = 0; i < map.length; i++) {
      for (let j = 0; j < map[i].length; j++) {
        let neighbors = HexGrid.getHexFromTile(i, j).getNeighbors();
        neighbors = neighbors.map((hex) => [hex.tileX, hex.tileY]);
        neighbors.filter((neighbor) => {
          let x = neighbor[0];
          let y = neighbor[1];
          return map[x][y] === 1 || map[x][y].neighbors;
        });
        if (map[i][j] === 0) {
          map[i][j] = {
            navigable: false,
          };
        } else {
          map[i][j] = {
            navigable: true,
            controlledBy: null,
            sector: totalRegions.splice(0, 1)[0],
            neighbors,
            fleets: [],
          };
        }
        map[i][j].neighbors = neighbors;
      }
    }

    if (this.possiblePlanets.map((json) => json.name).includes("Geonosis")) {
      for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < map[i].length; j++) {
          if (map[i][j].navigable) {
            if (map[i][j].sector.name === "Coruscant") {
              map[i][j].controlledBy = "The Republic";
              map[i][j].capital = "The Republic";
            }
            if (map[i][j].sector.name === "Geonosis") {
              map[i][j].controlledBy = "The Confederacy";
              map[i][j].capital = "The Confederacy";
            }
          }
        }
      }
    } else {
      for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < map[i].length; j++) {
          if (map[i][j].navigable) {
            if (map[i][j].sector.name === "Hoth") {
              map[i][j].controlledBy = "The Rebel Alliance";
              map[i][j].capital = "The Rebel Alliance";
            }
            if (map[i][j].sector.name === "Coruscant") {
              map[i][j].controlledBy = "The Empire";
              map[i][j].capital = "The Empire";
            }
          }
        }
      }
    }

    return map;
  }

  fixIsolations(map, navigableTiles) {
    let startingTile, tileCoords;
    do {
      startingTile =
        HexGrid.getHexes()[
          Math.floor(Math.random() * HexGrid.getHexes().length)
        ];
      tileCoords = HexGrid.getTileCoords(
        startingTile.x,
        startingTile.y,
        startingTile.z
      );
    } while (map[tileCoords[0]][tileCoords[1]] === 0);
    let landmass = this.floodGetLandmass(startingTile, map);
    while (landmass.length < navigableTiles.length) {
      let isolatedCubeId;
      let landTileCount = -1;
      do {
        landTileCount++;
        let x = navigableTiles[landTileCount].split("_")[0];
        let y = navigableTiles[landTileCount].split("_")[1];
        let isolatedHex = HexGrid.getHexFromTile(x, y);
        isolatedCubeId = isolatedHex.path.id;
      } while (
        landTileCount < navigableTiles.length - 1 &&
        landmass.includes(isolatedCubeId)
      );
      let islandCoords = isolatedCubeId.split("_");
      let isolatedHex = HexGrid.getHexFromCube(
        parseInt(islandCoords[0]),
        islandCoords[1],
        islandCoords[2]
      );
      let hexesInBetween = HexGrid.getHexLine(startingTile, isolatedHex, true);
      for (let i = 0; i < hexesInBetween.length; i++) {
        let tileCoords = HexGrid.getTileCoords(
          hexesInBetween[i].x,
          hexesInBetween[i].y,
          hexesInBetween[i].z
        );
        if (map[tileCoords[0]][tileCoords[1]] === 0) {
          navigableTiles.push(tileCoords[0] + "_" + tileCoords[1]);
        }
        map[tileCoords[0]][tileCoords[1]] = 1;
      }
      landmass = this.floodGetLandmass(startingTile, map);
    }

    return map;
  }

  floodGetLandmass(startingTile, currentmap) {
    return this.floodGetRegion(startingTile, currentmap, Infinity);
  }

  floodGetRegion(startingTile, currentmap, maxTiles) {
    let borders = [startingTile];
    let newBorders = [];
    let region = [startingTile];
    while (region.length < maxTiles && borders.length > 0) {
      for (let i = 0; i < borders.length; i++) {
        let borderTile = borders.splice(i, 1)[0];
        let neighbors = borderTile.getNeighbors();
        for (let j = 0; j < neighbors.length; j++) {
          let tileCoords = HexGrid.getTileCoords(
            neighbors[j].x,
            neighbors[j].y,
            neighbors[j].z
          );
          let isLand = currentmap[tileCoords[0]][tileCoords[1]] === 1;
          //The current tile is land and the region does not already include the current tile
          if (
            isLand &&
            region.filter((t) => t.path.id === neighbors[j].path.id).length ===
              0
          ) {
            region.push(neighbors[j]);
            newBorders.push(neighbors[j]);
          }
        }
      }
      borders = newBorders;
    }
    for (let i = 0; i < region.length; i++) {
      region[i] = region[i].path.id;
    }
    return region.slice(0, maxTiles);
  }
}

SpaceMap.CLONE_WARS = 0;
SpaceMap.GALACTIC_CIVIL_WAR = 1;

//Curtesy of: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
