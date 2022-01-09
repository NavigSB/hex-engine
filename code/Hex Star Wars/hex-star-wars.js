class HexStarWars {
  constructor(spaceMap = { map: [] }, firstPlayer = "") {
    let secondPlayer;
    switch (firstPlayer) {
      case "The Republic":
        secondPlayer = "The Confederacy";
        break;
      case "The Confederacy":
        secondPlayer = "The Republic";
        break;
      case "The Rebellion":
        secondPlayer = "The Empire";
        break;
      case "The Empire":
        secondPlayer = "The Rebellion";
        break;
      default:
        secondPlayer = "";
        break;
    }

    let players = {};
    players[firstPlayer] = {
      fleets: [],
    };
    players[secondPlayer] = {
      fleets: [],
    };

    for (let i = 0; i < spaceMap.map.length; i++) {
      for (let j = 0; j < spaceMap.map[i].length; j++) {
        if (spaceMap.map[i][j].capital !== undefined) {
          let player = spaceMap.map[i][j].capital;
          players[player].fleets.push([i, j]);
          spaceMap.map[i][j].fleets.push([player, 0]);
        }
      }
    }

    this.state = {
      spaceMap,
      players,
      playerTurn: firstPlayer,
      lastPlayerTurn: secondPlayer,
      gameOver: false,
      winner: -1,
      turn: 1,
    };
  }

  getState() {
    return this.state;
  }

  setState(state) {
    this.state = state;
  }

  cloneState() {
    return {
      spaceMap: cloneSpaceMap(this.state.spaceMap),
      players: JSON.parse(JSON.stringify(this.state.players)),
      playerTurn: this.state.playerTurn,
      lastPlayerTurn: this.state.lastPlayerTurn,
      gameOver: this.state.gameOver,
      winner: this.state.winner,
      turn: this.state.turn,
    };
  }

  moves() {
    let moves = [];
    let currentFaction = this.state.playerTurn;
    let currentPlayer = this.state.players[currentFaction];
    for (let i = 0; i < currentPlayer.fleets.length; i++) {
      let fleet = currentPlayer.fleets[i];
      let neighbors = this.state.spaceMap.map[fleet[0]][fleet[1]].neighbors;
      let possibilities = [];
      for (let j = 0; j < neighbors.length; j++) {
        let friendliesInHex = false,
          enemiesInHex = false;
        let neighborTile =
          this.state.spaceMap.map[neighbors[j][0]][neighbors[j][1]];
        if (neighborTile.navigable) {
          let factionsInHex = neighborTile.fleets.map((fleet) =>
            fleet.length > 0 ? fleet[0] : []
          );
          friendliesInHex = factionsInHex.includes(currentFaction);
          enemiesInHex = factionsInHex.includes(this.state.lastPlayerTurn);
        }
        if (
          !friendliesInHex &&
          this.state.spaceMap.map[neighbors[j][0]][neighbors[j][1]].navigable
        ) {
          let possibility = [i, neighbors[j][0], neighbors[j][1]];
          let tile = this.state.spaceMap.map[neighbors[j][0]][neighbors[j][1]];

          if (tile.controlledBy !== this.state.lastPlayerTurn) {
            possibility.push("enter");
          } else if (tile.sector.name.includes("Sector") && !enemiesInHex) {
            possibility.push("claim");
          } else if (tile.sector.name.includes("Sector") && enemiesInHex) {
            possibility.push("duel");
          } else if (!enemiesInHex) {
            possibility.push("invade");
          } else {
            possibility.push("conquer");
          }

          possibilities.push(possibility);
        }
      }
      moves = moves.concat(possibilities);
    }
    if (currentPlayer.fleets.length === 0) {
      for (let i = 0; i < this.state.spaceMap.map.length; i++) {
        for (let j = 0; j < this.state.spaceMap.map[i].length; j++) {
          if (
            this.state.spaceMap.map[i][j].controlledBy === this.state.playerTurn
          ) {
            moves.push(["build", i, j]);
          }
        }
      }
    }
    return moves;
  }

  playMove(move, verbose, results) {
    if (move[0] === "build") {
      this.addFleet(this.state.playerTurn, move[1], move[2]);
    } else {
      let fleetIndex = move[0];
      let moveX = move[1];
      let moveY = move[2];
      let action = move[3];
      let enemyFleets = this.state.players[this.state.lastPlayerTurn].fleets;
      let isEnemyFleet = false;
      for (let i = 0; i < enemyFleets.length; i++) {
        if (enemyFleets[i][0] === moveX && enemyFleets[i][1] === moveY) {
          isEnemyFleet = true;
        }
      }

      let victory = true,
        halfVictory = true;
      if (results === undefined) {
        switch (action) {
          case "enter":
            break;
          case "claim":
            break;
          case "duel":
            victory = this.simulateBattle(false, true);
            break;
          case "invade":
            victory = this.simulateBattle(true, true);
            break;
          case "conquer":
            halfVictory = this.simulateBattle(false, true);
            victory = halfVictory && this.simulateBattle(true, true);
            break;
        }
      } else {
        if (results.length === 2) {
          halfVictory = results[0];
          victory = results[0] && results[1];
        } else {
          victory = results[0];
        }
      }

      if (victory) {
        this.state.spaceMap.map[moveX][moveY].controlledBy =
          this.state.playerTurn;
        this.moveFleet(this.state.playerTurn, fleetIndex, moveX, moveY);
      } else {
        console.log("Removing fleet because the currentPlayer lost...");
        this.removeFleet(this.state.playerTurn, fleetIndex);
      }
      if (victory || halfVictory) {
        if (action !== "enter" && action !== "claim") {
          console.log(
            "Removing fleet because the lastPlayer lost or half lost..."
          );
        }
        this.removeFleetsFromPos(this.state.lastPlayerTurn, moveX, moveY);
      }
    }

    let map = this.state.spaceMap.map;
    let currentCount = 0,
      lastCount = 0;
    for (let i = 0; i < map.length; i++) {
      for (let j = 0; j < map[i].length; j++) {
        if (map[i][j].controlledBy === this.state.playerTurn) {
          currentCount++;
        }
        if (map[i][j].controlledBy === this.state.lastPlayerTurn) {
          lastCount++;
        }
      }
    }
    if (lastCount === 0) {
      this.state.winner = this.state.playerTurn;
      this.state.gameOver = true;
    } else if (currentCount === 0) {
      this.state.winner = this.state.lastPlayerTurn;
      this.state.gameOver = true;
    }

    this.state.turn++;
    let currentPlayer = this.state.playerTurn;
    this.state.playerTurn = this.state.lastPlayerTurn;
    this.state.lastPlayerTurn = currentPlayer;
  }

  addFleet(player, x, y) {
    this.state.players[player].fleets.push([x, y]);
    let tileFleets = this.state.spaceMap.map[x][y].fleets;
    tileFleets.push([player, tileFleets.length]);
  }

  moveFleet(player, fleetIndex, newX, newY) {
    this.removeFleet(player, fleetIndex);
    this.addFleet(player, newX, newY);
  }

  removeFleet(player, index) {
    let removed = this.state.players[player].fleets.splice(index, 1)[0];
    let tileFleets = this.state.spaceMap.map[removed[0]][removed[1]].fleets;
    for (let i = 0; i < tileFleets.length; i++) {
      if (tileFleets[i][0] === player) {
        tileFleets.splice(i, 1);
        break;
      }
    }
  }

  removeFleetsFromPos(player, x, y) {
    let tileFleets = this.state.spaceMap.map[x][y].fleets;
    for (let i = 0; i < tileFleets.length; i++) {
      if (tileFleets[i][0] === player) {
        let removed = tileFleets.splice(i, 1)[0];
        this.state.players[player].fleets.splice(removed[1], 1);
        i--;
      }
    }
  }

  //Returns whether or not the current player wins
  simulateBattle(battleIsOnLand, playerIsAttacking) {
    let playerDice, opponentDice;
    if (!battleIsOnLand) {
      playerDice = [0, 0, 0];
      opponentDice = [0, 0, 0];
    } else if (playerIsAttacking) {
      playerDice = [0, 0, 0];
      opponentDice = [0, 0];
    } else {
      playerDice = [0, 0];
      opponentDice = [0, 0, 0];
    }
    while (playerDice.length > 0 && opponentDice.length > 0) {
      for (let i = 0; i < playerDice.length; i++) {
        if (playerDice[i] === -1) {
          playerDice.splice(i, 1);
          i--;
        } else {
          playerDice[i] = rollDie();
        }
      }
      for (let i = 0; i < opponentDice.length; i++) {
        if (opponentDice[i] === -1) {
          opponentDice.splice(i, 1);
          i--;
        } else {
          opponentDice[i] = rollDie();
        }
      }
      playerDice.sort((a, b) => a - b);
      opponentDice.sort((a, b) => a - b);

      for (
        let i = 0;
        i < Math.min(playerDice.length, opponentDice.length);
        i++
      ) {
        if (
          playerDice[i] < opponentDice[i] ||
          (playerDice[i] === opponentDice[i] && playerIsAttacking)
        ) {
          playerDice[i] = -1;
        } else if (
          playerDice[i] > opponentDice[i] ||
          (playerDice[i] === opponentDice[i] && !playerIsAttacking)
        ) {
          opponentDice[i] = -1;
        }
      }
    }
    if (playerDice.length === opponentDice.length) {
      return !playerIsAttacking;
    } else {
      return playerDice.length > 0;
    }
  }

  gameOver() {
    return this.state.gameOver;
  }

  winner() {
    return this.state.winner;
  }
}

function rollDie() {
  return Math.floor(Math.random() * 6 + 1);
}

function cloneSpaceMap(spaceMap) {
  let clone = {};
  clone.map = [];
  clone.navigableTiles = [];
  for (let i = 0; i < spaceMap.map.length; i++) {
    clone.map.push([]);
    for (let j = 0; j < spaceMap.map[i].length; j++) {
      clone.map[i][j] = JSON.parse(JSON.stringify(spaceMap.map[i][j]));
      if (spaceMap.map[i][j].navigable) {
        clone.navigableTiles.push([i, j]);
      }
    }
  }
  return clone;
}

/*
This is a super helpful method that I will not use here. The moveTree format is one
big array, containing arrays that each have all the possible moves for one unit.
Like, if I have three locations (Loc1, Loc2, Loc3) and two soldiers (Bob, Jim), the
moveTree might look something like this:
[
	[
		{id: "Bob", moveTo: "Loc1"},
		{id: "Bob", moveTo: "Loc2"},
		{id: "Bob", moveTo: "Loc3"}
	],
	[
		{id: "Jim", moveTo: "Loc1"},
		{id: "Jim", moveTo: "Loc2"},
		{id: "Jim", moveTo: "Loc3"}
	]
]
Those are all the possibilities of moving. Obviously, this is a simplified example, as each
unit would probably already have a location and couldn't move to where they are, but
you get the point :)

Oh, by the way, the output is an array of arrays that each contain a possible set of
the moves to be taken. Try out the example; you'll get it.
*/
function expandMoveTree(moveTree) {
  return _recursiveExpandMoveTree(moveTree, 0, [], []);
}

function _recursiveExpandMoveTree(moveTree, layer, currentPath) {
  let overallPath = [];
  for (let i = 0; i < moveTree[layer].length; i++) {
    currentPath.push(moveTree[layer][i]);
    if (layer + 1 < moveTree.length) {
      let result = _recursiveExpandMoveTree(
        moveTree,
        layer + 1,
        currentPath,
        overallPath
      );
      overallPath = overallPath.concat(result);
    } else {
      overallPath.push(JSON.parse(JSON.stringify(currentPath)));
    }
    currentPath.splice(currentPath.length - 1, 1);
  }
  return overallPath;
}
