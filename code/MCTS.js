var ArtificialPlayer = (function() {

	class MCTS {

		/**
		 *
		 * @param {object} game The game object, shared by all players of the game. The class that the object
		 * is a member of must have these methods implemented: getState, setState, cloneState, moves, playMove,
		 * gameOver, and winner. Additionally, the object MUST be part of a class that is defined externally, and
		 * in a file with no other definitions, as well as the name of the file being identical to the class name,
		 * except with hyphens for spaces instead of capital letters.
		 * @param {number} playerId The id for the artificial player being defined
		 * @param {number} iterations The iterations of the Monte Carlo Tree Search algorithm to be used when
		 * the AI makes its decisions, roughly correlating with the time taken by the algorithm.
		 * @param {number} explorationVal A floating-point value that changes the behavior of the Monte Carlo
		 * Tree Search algorithm. A higher value signifies being open to more possibilities, whereas a low value
		 * creates a higher possibility of choosing the possibility that is most known to have high reward without
		 * regarding currently unknown possibilities.
		 */
		constructor(game, playerId, iterations = 500, explorationVal = 1.41) {
			this.game = game;
			this.player = playerId;
			this.iterations = iterations;
			this.exploration = explorationVal;
		}

		/**
		 * Asks the Monte Carlo Tree Search algorithm to select a move and return a representation of the move
		 * to be made, in the format of the game object's definition.
		 */
		async selectMove() {
			let resolveFn;
			//Pass game state to Worker and let it reconstruct the object
			let className = this.game.constructor.name;
			let scriptName = camelCaseToHypens(className) + ".js";
			let params = JSON.parse(JSON.stringify(this));
			this.worker = createMCTSWorker(onMCTSMessage, scriptName);
			this.worker.onmessage = function(msg) {
				resolveFn(msg.data);
			}
			this.worker.postMessage({
				params: params,
				game: this.game,
				className: className
			});
			return new Promise((resolve) => {
				resolveFn = resolve;
			});
		}

	}

	function onMCTSMessage(msg) {
		//Fyi, this basically defines the whole worker
		let game = msg.data.game;
		let params = msg.data.params;
		let gameClass = Function("return new " + msg.data.className + "()")();
		game = Object.assign(gameClass, game);

		class MCTSNode {
			constructor(moves, parent) {
				this.parent = parent;
				this.visits = 0;
				this.wins = 0;
				this.numUnexpandedMoves = moves.length;
				this.children = new Array(this.numUnexpandedMoves).fill(null); //temporary store move for debugging purposes
			}
		}

		postMessage(selectMove());

		function selectMove() {
			const originalState = game.getState();
			const possibleMoves = game.moves();
			const root = new MCTSNode(possibleMoves, null);

			for (let i = 0; i < params.iterations; i++) {
				game.setState(originalState);
				const clonedState = game.cloneState();
				game.setState(clonedState);

				let selectedNode = selectNode(root);
				//if selected node is terminal and we lost, make sure we never choose that move
				if (game.gameOver()) {
					if (game.winner() != params.player && game.winner() != -1) {
						selectedNode.parent.wins = Number.MIN_SAFE_INTEGER;
					}
				}
				let expandedNode = expandNode(selectedNode);
				playout(expandedNode);

				let reward;
				if (game.winner() == -1) {
					reward = 0;
				} else if (game.winner() == params.player) {
					reward = 1;
				} else {
					reward = -1;
				}
				backprop(expandedNode, reward);
			}

			//choose move with most wins
			let maxWins = -Infinity;
			let maxIndex = -1;
			for (let i in root.children) {
				const child = root.children[i];
				if (child == null) {
					continue;
				}
				if (child.wins > maxWins) {
					maxWins = child.wins;
					maxIndex = i;
				}
			}

			game.setState(originalState);
			return possibleMoves[maxIndex];
		}

		function selectNode(root) {

			const c = params.exploration;

			while (root.numUnexpandedMoves == 0) {
				let maxUBC = -Infinity;
				let maxIndex = -1;
				let Ni = root.visits;
				for (let i in root.children) {
					const child = root.children[i];
					const ni = child.visits;
					const wi = child.wins;
					const ubc = computeUCB(wi, ni, c, Ni);
					if (ubc > maxUBC) {
						maxUBC = ubc;
						maxIndex = i;
					}
				}
				const moves = game.moves();
				game.playMove(moves[maxIndex]);

				root = root.children[maxIndex];
				if (game.gameOver()) {
					return root;
				}
			}
			return root;
		}

		function expandNode(node) {
			if (game.gameOver()) {
				return node;
			}
			let moves = game.moves();
			const childIndex = selectRandomUnexpandedChild(node);
			game.playMove(moves[childIndex]);

			moves = game.moves();
			const newNode = new MCTSNode(moves, node);
			node.children[childIndex] = newNode;
			node.numUnexpandedMoves -= 1;

			return newNode;
		}

		function playout(node) {
			while (!game.gameOver()) {
				const moves = game.moves();
				const randomChoice = Math.floor(Math.random() * moves.length);
				game.playMove(moves[randomChoice]);
			}
			return game.winner();
		}

		function backprop(node, reward) {
			while (node != null) {
				node.visits += 1;
				node.wins += reward;
				node = node.parent;
			}
		}

		// returns index of a random unexpanded child of node
		function selectRandomUnexpandedChild(node) {
			const choice = Math.floor(Math.random() * node.numUnexpandedMoves); //expand random nth unexpanded node
			let count = -1;
			for (let i in node.children) {
				const child = node.children[i];
				if (child == null) {
					count += 1;
				}
				if (count == choice) {
					return i;
				}
			}
		}

		function computeUCB(wi, ni, c, Ni) {
			return (wi / ni) + c * Math.sqrt(Math.log(Ni) / ni);
		}
	}

	function createMCTSWorker(onmessage, gameScriptName) {
		let scriptUrl = document.location.protocol + "//" + document.location.host + "/" + gameScriptName;
		let blob = new Blob(["onmessage=", onmessage.toString(), ";importScripts('", scriptUrl, "')"], {
			type: "text/javascript"
		});
		let url = URL.createObjectURL(blob);

		return new Worker(url);
	}

	function camelCaseToHypens(str) {
		let arr = str.split(/(?<=[^A-Z](?=[A-Z]))|(?=[A-Z][^A-Z])/g);
		let hypenated = "";
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].length > 0) {
				hypenated += arr[i].toLowerCase() + "-";
			}
		}
		if (hypenated.length > 0) {
			hypenated = hypenated.substring(0, hypenated.length - 1);
		}
		return hypenated;
	}

	return MCTS;
})();