import React from "react";
import sudoku from "sudoku";
import { saveAs } from "file-saver";
import { io } from "socket.io-client"; // (1) NEW import

const SERVER_URL = "http://localhost:3001"; // (2) point at your server

let entryToBoard = (square, i) => {
  let row = Math.floor(i / 3);
  let col = i % 3;
  let rowOffset = Math.floor(square / 3) * 3;
  let colOffset = (square % 3) * 3;
  row += rowOffset;
  col += colOffset;
  return row * 9 + col;
};

function withSocket(Wrapped) {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        board: new Array(81).fill(""),
        originalBoard: new Array(81).fill(""),
        incorrects: new Array(81).fill(""),
        difficulty: "",
        updated: false,
      };
      this.makeSocket = this.makeSocket.bind(this);
      this.update = this.update.bind(this);
      this.sendBoard = this.sendBoard.bind(this);
      this.validate = this.validate.bind(this);
      this.saveGame = this.saveGame.bind(this);
      this.loadGame = this.loadGame.bind(this);
      window.saveGame = this.saveGame;
      window.loadGame = this.loadGame;
    }

    componentDidMount() {
      this.makeSocket();
      // (3) DELETED the visibilitychange reconnect block —
      //     socket.io-client reconnects automatically.
    }

    makeSocket() {
      const room = window.location.pathname.slice(1) || "1";
      const socket = io(SERVER_URL, { transports: ["websocket"] }); // (4)

      // (5) Replaced the single 'message' listener + intent switch
      //     with one handler per event name.

      socket.on("connect", () => {
        socket.emit("join", room); // (6)
        socket.emit("fetch board", { room });
        setTimeout(() => {
          if (!this.state.updated) this.setState({ updated: true });
        }, 3000);
      });

      socket.on("make move", (parsed) => {
        const board = this.state.board.slice();
        const incorrects = this.state.incorrects.slice();
        board[entryToBoard(parsed.square, parsed.i)] = parsed.val;
        incorrects[entryToBoard(parsed.square, parsed.i)] = 0;
        this.setState({ board, incorrects });
      });

      socket.on("fetch board", () => {
        socket.emit("send board", {
          room,
          board: this.state.board,
          difficulty: this.state.difficulty,
          originalBoard: this.state.originalBoard,
          incorrects: this.state.incorrects,
        });
      });

      socket.on("send board", (parsed) => {
        this.setState({
          board: parsed.board,
          difficulty: parsed.difficulty,
          originalBoard: parsed.originalBoard,
          incorrects: parsed.incorrects,
          updated: true,
        });
      });

      socket.on("validate board", (parsed) => {
        this.setState({ incorrects: parsed.incorrects });
      });

      this.setState({ socket });
      return socket;
    }

    componentWillUnmount() {
      if (this.state.socket) this.state.socket.disconnect(); // (7) was .close()
    }

    update(square, i, val) {
      const board = this.state.board.slice();
      board[entryToBoard(square, i)] = val;
      const incorrects = this.state.incorrects.slice();
      incorrects[entryToBoard(square, i)] = 0;
      if (
        this.state.updated &&
        this.state.socket &&
        this.state.originalBoard[entryToBoard(square, i)] === ""
      ) {
        this.state.socket.emit("make move", { square, i, val }); // (8) emit, not send(JSON.stringify)
        this.setState({ board, incorrects });
      }
    }

    sendBoard(board, difficulty) {
      if (this.state.updated && this.state.socket) {
        this.state.socket.emit("send board", {
          board,
          difficulty,
          incorrects: this.state.incorrects,
          originalBoard: board.slice(),
        });
        this.setState({ board, difficulty, originalBoard: board.slice() });
      }
    }

    validate() {
      if (this.state.updated && this.state.socket) {
        let solution = sudoku.solvepuzzle(
          this.state.originalBoard.map((i) =>
            i === "" ? null : parseInt(i - 1),
          ),
        );
        solution = solution.map((i) => (i === null ? "" : i + 1));
        const incorrects = this.state.board.map((e, i) =>
          e !== "" && parseInt(e) !== solution[i] ? 1 : 0,
        );
        this.state.socket.emit("validate board", { incorrects });
        this.setState({ incorrects });
      }
    }

    saveGame() {
      const game = JSON.stringify(this.state);
      const blob = new Blob([game], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "my.sudoku");
    }

    loadGame(text) {
      const game = JSON.parse(text);
      if (!game.difficulty) {
        const generatedPuzzle = game.originalBoard.map((i) =>
          i !== "" ? i - 1 : null,
        );
        game.difficulty = sudoku.ratepuzzle(generatedPuzzle, 20);
      }
      this.setState(game);
      this.makeSocket();
    }

    render() {
      return (
        <Wrapped
          board={this.state.board}
          originalBoard={this.state.originalBoard}
          update={this.update}
          entryToBoard={entryToBoard}
          updated={this.state.updated}
          sendBoard={this.sendBoard}
          difficulty={this.state.difficulty}
          validate={this.validate}
          incorrects={this.state.incorrects}
          saveGame={this.saveGame}
          loadGame={this.loadGame}
        />
      );
    }
  };
}

export default withSocket;
