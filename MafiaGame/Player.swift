import Foundation

struct Player: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var name: String
    var imageFileName: String? // Filename in Documents directory
    var gamesPlayed: Int = 0
    var gamesWon: Int = 0
    
    var winRate: Double {
        guard gamesPlayed > 0 else { return 0 }
        return Double(gamesWon) / Double(gamesPlayed) * 100
    }
}
