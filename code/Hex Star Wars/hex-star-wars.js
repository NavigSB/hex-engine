class HexStarWars {

	constructor(spaceMap) {
		this.state = {
			spaceMap,
			playerTurn: 0,
			gameOver: false,
			winner: -1,
			moves: 0
		};
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