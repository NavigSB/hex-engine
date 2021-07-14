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
        "";
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
        let noFriendliesInHex = true;
        for (let k = 0; k < currentPlayer.fleets.length; k++) {
          let otherFleet = currentPlayer.fleets[k];
          if (
            neighbors[j][0] === otherFleet[0] &&
            neighbors[j][1] === otherFleet[1]
          ) {
            noFriendliesInHex = false;
          }
        }
        if (
          noFriendliesInHex &&
          this.state.spaceMap.map[neighbors[j][0]][neighbors[j][1]].navigable
        ) {
          possibilities.push([i, neighbors[j][0], neighbors[j][1]]);
        }
      }
      moves = moves.concat(possibilities);
    }
		if(currentPlayer.fleets.length === 0) {
			for (let i = 0; i < this.state.spaceMap.map.length; i++) {
				for (let j = 0; j < this.state.spaceMap.map[i].length; j++) {
					if(this.state.spaceMap.map[i][j].controlledBy === this.state.playerTurn) {
						moves.push(["build", i, j]);
					}
				}
			}
		}
    return moves;
  }

  playMove(move, verbose, battleIsWon) {
		if(move[0] === "build") {
			this.state.players[this.state.playerTurn].fleets.push([move[1], move[2]]);
		}else{
			let fleetIndex = move[0];
			let moveX = move[1];
			let moveY = move[2];
			let tileInQuestion = this.state.spaceMap.map[moveX][moveY];
			let enemyFleets = this.state.players[this.state.lastPlayerTurn].fleets;
			let isEnemyFleet = false;
			for (let i = 0; i < enemyFleets.length; i++) {
				if (enemyFleets[i][0] === moveX && enemyFleets[i][1] === moveY) {
					isEnemyFleet = true;
				}
			}

			let victory = true,
				halfVictory = true;
			if (battleIsWon === undefined) {
				if (
					!isEnemyFleet &&
					tileInQuestion.controlledBy === this.state.lastPlayerTurn &&
					!tileInQuestion.sector.name.includes("Sector")
				) {
					victory = this.simulateBattle(true, true);
				} else if (isEnemyFleet) {
					if (tileInQuestion.sector.name.includes("Sector")) {
						victory = this.simulateBattle(false, true);
					} else {
						halfVictory = this.simulateBattle(false, true);
						victory = halfVictory && this.simulateBattle(true, true);
					}
				}
			} else {
				victory = battleIsWon;
			}

			if (victory) {
				this.state.spaceMap.map[moveX][moveY].controlledBy =
					this.state.playerTurn;
				this.state.players[this.state.playerTurn].fleets[fleetIndex] = [
					moveX,
					moveY,
				];
			} else {
				this.state.players[this.state.playerTurn].fleets.splice(fleetIndex, 1);
			}
			if (victory || halfVictory) {
				let enemyFleets = this.state.players[this.state.lastPlayerTurn].fleets;
				for (let i = 0; i < enemyFleets.length; i++) {
					if (enemyFleets[i][0] === moveX && enemyFleets[i][1] === moveY) {
						this.state.players[this.state.lastPlayerTurn].fleets.splice(i, 1);
						i--;
					}
				}
			}
		}

    let map = this.state.spaceMap.map;
    let currentWinner = true,
    lastWinner = true;
    for (let i = 0; i < map.length; i++) {
      for (let j = 0; j < map[i].length; j++) {
        if (map[i][j].controlledBy === this.state.playerTurn) {
          lastWinner = false;
        }
        if (map[i][j].controlledBy === this.state.lastPlayerTurn) {
          currentWinner = false;
        }
      }
    }
    if (currentWinner) {
      this.state.winner = this.state.playerTurn;
      this.state.gameOver = true;
    }
    if (lastWinner) {
      this.state.winner = this.state.lastPlayerTurn;
      this.state.gameOver = true;
    }

    this.state.turn++;
    let currentPlayer = this.state.playerTurn;
    this.state.playerTurn = this.state.lastPlayerTurn;
    this.state.lastPlayerTurn = currentPlayer;
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
