// WordsGameSession — mirrors iOS WordsGameSession.swift

export class WordsGameSession {
  constructor() {
    this.players = [];
    this.imposterID = null;
    this.selectedWord = null; // { word, hint, addedBy }
    this.currentPlayerIndex = 0;
    this.votedOutPlayer = null;
    this.gameEnded = false;
  }

  get currentPlayer() {
    return this.currentPlayerIndex < this.players.length ? this.players[this.currentPlayerIndex] : null;
  }

  get isLastPlayer() {
    return this.currentPlayerIndex >= this.players.length - 1;
  }

  get isCurrentPlayerImposter() {
    return this.currentPlayer?.id === this.imposterID;
  }

  get currentPlayerReveal() {
    if (!this.selectedWord) return { type: 'word', value: '???' };
    if (this.isCurrentPlayerImposter) return { type: 'hint', value: this.selectedWord.hint };
    return { type: 'word', value: this.selectedWord.word };
  }

  get imposter() {
    return this.players.find(p => p.id === this.imposterID) || null;
  }

  setupGame(players, wordEntry) {
    this.players = [...players].sort(() => Math.random() - 0.5);
    this.selectedWord = wordEntry;
    this.imposterID = this.players[Math.floor(Math.random() * this.players.length)].id;
    this.currentPlayerIndex = 0;
    this.votedOutPlayer = null;
    this.gameEnded = false;
  }

  moveToNextPlayer() {
    if (this.currentPlayerIndex < this.players.length - 1) {
      this.currentPlayerIndex++;
    }
  }

  voteOut(player) {
    this.votedOutPlayer = player;
    this.gameEnded = true;
  }

  get votedPlayerIsImposter() {
    return this.votedOutPlayer?.id === this.imposterID;
  }
}
