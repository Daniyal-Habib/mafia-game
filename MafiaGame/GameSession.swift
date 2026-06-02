import Foundation

enum EliminationType: String, Codable {
    case nightKill = "Killed at Night"
    case votedOut = "Voted Out"
}

enum WinResult: Equatable {
    case mafiaWins
    case crewWins
    case jesterWins(Player)
    case noWinYet
    
    static func == (lhs: WinResult, rhs: WinResult) -> Bool {
        switch (lhs, rhs) {
        case (.mafiaWins, .mafiaWins): return true
        case (.crewWins, .crewWins): return true
        case (.jesterWins(let p1), .jesterWins(let p2)): return p1.id == p2.id
        case (.noWinYet, .noWinYet): return true
        default: return false
        }
    }
}

struct EliminatedPlayer: Codable {
    let player: Player
    let type: EliminationType
}

@Observable
class GameSession {
    var players: [Player] = []
    var roleAssignments: [UUID: Role] = [:]
    var currentPlayerIndex: Int = 0
    
    // Elimination tracking
    var eliminatedPlayers: [EliminatedPlayer] = []
    var alivePlayers: [Player] {
        let eliminatedIds = Set(eliminatedPlayers.map { $0.player.id })
        return players.filter { !eliminatedIds.contains($0.id) }
    }
    
    var currentPlayer: Player? {
        guard currentPlayerIndex < players.count else { return nil }
        return players[currentPlayerIndex]
    }
    
    var currentRole: Role? {
        guard let player = currentPlayer else { return nil }
        return roleAssignments[player.id]
    }
    
    var isLastPlayer: Bool {
        currentPlayerIndex >= players.count - 1
    }
    
    var progress: Double {
        guard !players.isEmpty else { return 0 }
        return Double(currentPlayerIndex + 1) / Double(players.count)
    }
    
    init() {}
    
    func setupGame(selectedPlayers: [Player], roleCounts: [Role: Int]) {
        self.players = selectedPlayers.shuffled()
        self.roleAssignments = [:]
        self.currentPlayerIndex = 0
        self.eliminatedPlayers = []
        
        // Create role pool
        var rolePool: [Role] = []
        for (role, count) in roleCounts {
            for _ in 0..<count {
                rolePool.append(role)
            }
        }
        
        // Shuffle and assign
        rolePool.shuffle()
        
        for (index, player) in players.enumerated() {
            if index < rolePool.count {
                roleAssignments[player.id] = rolePool[index]
            }
        }
        
        GamePersistenceManager.shared.saveGame(session: self)
    }
    
    func moveToNextPlayer() {
        if currentPlayerIndex < players.count - 1 {
            currentPlayerIndex += 1
            GamePersistenceManager.shared.saveGame(session: self)
        }
    }
    
    func getRole(for player: Player) -> Role? {
        return roleAssignments[player.id]
    }
    
    func isPlayerAlive(_ player: Player) -> Bool {
        !eliminatedPlayers.contains { $0.player.id == player.id }
    }
    
    // MARK: - Elimination
    
    func eliminatePlayer(_ player: Player, type: EliminationType) {
        guard isPlayerAlive(player) else { return }
        eliminatedPlayers.append(EliminatedPlayer(player: player, type: type))
        GamePersistenceManager.shared.saveGame(session: self)
    }
    
    func undoElimination(_ player: Player) {
        eliminatedPlayers.removeAll { $0.player.id == player.id }
        GamePersistenceManager.shared.saveGame(session: self)
    }
    
    // MARK: - Win Condition Check
    
    func checkWinCondition() -> WinResult {
        // Check Jester win (voted out)
        if let lastElimination = eliminatedPlayers.last,
           lastElimination.type == .votedOut,
           let role = roleAssignments[lastElimination.player.id],
           role == .jester {
            return .jesterWins(lastElimination.player)
        }
        
        // Count living players by team
        var livingMafia = 0
        var livingCrew = 0
        
        for player in alivePlayers {
            if let role = roleAssignments[player.id] {
                switch role.team {
                case .mafia:
                    livingMafia += 1
                case .crew:
                    livingCrew += 1
                case .neutral:
                    break // Jester doesn't count for either side
                }
            }
        }
        
        // Check Crew win (all mafia eliminated)
        if livingMafia == 0 {
            return .crewWins
        }
        
        // Check Mafia win (mafia >= crew)
        if livingMafia >= livingCrew {
            return .mafiaWins
        }
        
        return .noWinYet
    }
    
    // MARK: - Get players by status
    
    func getPlayersWithRoles() -> [(player: Player, role: Role, isAlive: Bool)] {
        return players.compactMap { player in
            guard let role = roleAssignments[player.id] else { return nil }
            return (player: player, role: role, isAlive: isPlayerAlive(player))
        }
    }
}
