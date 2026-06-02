import Foundation

struct GameSaveData: Codable {
    let players: [Player]
    let roleAssignments: [UUID: Role]
    let currentPlayerIndex: Int
    let eliminatedPlayers: [EliminatedPlayer]
    let timestamp: Date
}

class GamePersistenceManager {
    static let shared = GamePersistenceManager()
    
    private let saveKey = "ongoing_game_save"
    private var fileURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("active_game.json")
    }
    
    func saveGame(session: GameSession) {
        let data = GameSaveData(
            players: session.players,
            roleAssignments: session.roleAssignments,
            currentPlayerIndex: session.currentPlayerIndex,
            eliminatedPlayers: session.eliminatedPlayers,
            timestamp: Date()
        )
        
        do {
            let encoded = try JSONEncoder().encode(data)
            try encoded.write(to: fileURL)
            // print("Game saved successfully")
        } catch {
            // print("Failed to save game: \(error)")
        }
    }
    
    func loadGame(into session: GameSession) -> Bool {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return false }
        
        do {
            let data = try Data(contentsOf: fileURL)
            let savedData = try JSONDecoder().decode(GameSaveData.self, from: data)
            
            // Restore state
            session.players = savedData.players
            session.roleAssignments = savedData.roleAssignments
            session.currentPlayerIndex = savedData.currentPlayerIndex
            session.eliminatedPlayers = savedData.eliminatedPlayers
            
            return true
        } catch {
            // print("Failed to load game: \(error)")
            return false
        }
    }
    
    func hasSavedGame() -> Bool {
        FileManager.default.fileExists(atPath: fileURL.path)
    }
    
    func clearSavedGame() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}
