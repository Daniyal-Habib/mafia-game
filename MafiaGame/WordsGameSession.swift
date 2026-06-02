import Foundation
import SwiftUI

// MARK: - Words Game Session

@Observable
class WordsGameSession {
    var players: [Player] = []
    var imposterID: UUID? = nil
    var selectedWord: WordEntry? = nil   // the actual word (only normal players see this)
    var currentPlayerIndex: Int = 0

    var currentPlayer: Player? {
        guard currentPlayerIndex < players.count else { return nil }
        return players[currentPlayerIndex]
    }

    var isLastPlayer: Bool {
        currentPlayerIndex >= players.count - 1
    }

    var isCurrentPlayerImposter: Bool {
        currentPlayer?.id == imposterID
    }

    // What the current player should see
    var currentPlayerReveal: WordReveal {
        guard let word = selectedWord else {
            return .word("???")
        }
        if isCurrentPlayerImposter {
            return .hint(word.hint)
        } else {
            return .word(word.word)
        }
    }

    var imposter: Player? {
        players.first { $0.id == imposterID }
    }

    enum WordReveal {
        case word(String)   // normal player sees the word
        case hint(String)   // imposter sees only the hint
    }

    // Voting state
    var votedOutPlayer: Player? = nil
    var gameEnded: Bool = false

    init() {}

    func setupGame(players: [Player], wordEntry: WordEntry) {
        self.players = players.shuffled()
        self.selectedWord = wordEntry
        // Randomly pick the imposter
        self.imposterID = self.players.randomElement()?.id
        self.currentPlayerIndex = 0
        self.votedOutPlayer = nil
        self.gameEnded = false
    }

    func moveToNextPlayer() {
        if currentPlayerIndex < players.count - 1 {
            currentPlayerIndex += 1
        }
    }

    func voteOut(player: Player) {
        votedOutPlayer = player
        gameEnded = true
    }

    var votedPlayerIsImposter: Bool {
        votedOutPlayer?.id == imposterID
    }
}
