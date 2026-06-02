import SwiftUI

struct GameRecord: Codable, Identifiable {
    var id = UUID()
    let date: Date
    let winner: String // "Mafia", "Crew", "Jester (PlayerName)"
    let playerCount: Int
    let duration: TimeInterval
}

@Observable
class GameHistoryStore {
    var games: [GameRecord] = []
    
    // Derived stats
    var totalGamesPlayed: Int { games.count }
    var mafiaWins: Int { games.filter { $0.winner.contains("Mafia") }.count }
    var crewWins: Int { games.filter { $0.winner.contains("Crew") }.count }
    // Jester wins are trickier to parse from string, could refine Model later
    
    private let historyFileName = "game_history.json"
    
    init() {
        loadHistory()
    }
    
    func addGame(winner: String, playerCount: Int, duration: TimeInterval) {
        let record = GameRecord(date: Date(), winner: winner, playerCount: playerCount, duration: duration)
        games.insert(record, at: 0) // Newest first
        saveHistory()
    }
    
    private func saveHistory() {
        do {
            let data = try JSONEncoder().encode(games)
            CloudSaveManager.shared.saveFile(name: historyFileName, data: data)
        } catch {
            // print("Failed to save history: \(error)")
        }
    }
    
    private func loadHistory() {
        if let data = CloudSaveManager.shared.loadFile(name: historyFileName) {
            do {
                games = try JSONDecoder().decode([GameRecord].self, from: data)
            } catch {
                // print("Failed to decode history: \(error)")
                games = []
            }
        } else {
            games = []
        }
    }
    
    func clearHistory() {
        games.removeAll()
        saveHistory()
    }
}
