import Foundation

@Observable
class GameSetup {
    var selectedPlayers: Set<UUID> = []
    var roleCounts: [Role: Int] = [
        .mafia: 1,
        .crewmate: 2,
        .doctor: 0,
        .investigator: 0,
        .jester: 0
    ]
    
    var totalRoles: Int {
        roleCounts.values.reduce(0, +)
    }
    
    var selectedPlayerCount: Int {
        selectedPlayers.count
    }
    
    var isValid: Bool {
        let mafiaCount = roleCounts[.mafia, default: 0]
        return selectedPlayerCount >= 3 && totalRoles == selectedPlayerCount && mafiaCount >= 1
    }
    
    var validationMessage: String {
        if selectedPlayerCount < 3 {
            return "Select at least 3 players"
        } else if totalRoles < selectedPlayerCount {
            return "Add \(selectedPlayerCount - totalRoles) more role(s)"
        } else if totalRoles > selectedPlayerCount {
            return "Remove \(totalRoles - selectedPlayerCount) role(s)"
        } else if roleCounts[.mafia, default: 0] < 1 {
            return "At least 1 Mafia required"
        }
        return "Ready to play!"
    }
    
    func togglePlayer(_ playerId: UUID) {
        if selectedPlayers.contains(playerId) {
            selectedPlayers.remove(playerId)
        } else {
            selectedPlayers.insert(playerId)
        }
        autoBalanceRoles()
    }
    
    func isPlayerSelected(_ playerId: UUID) -> Bool {
        selectedPlayers.contains(playerId)
    }
    
    func incrementRole(_ role: Role) {
        roleCounts[role, default: 0] += 1
    }
    
    func decrementRole(_ role: Role) {
        if let count = roleCounts[role], count > 0 {
            roleCounts[role] = count - 1
        }
    }
    
    func roleCount(for role: Role) -> Int {
        roleCounts[role, default: 0]
    }
    
    func selectAllPlayers(from players: [Player]) {
        selectedPlayers = Set(players.map { $0.id })
        autoBalanceRoles()
    }
    
    func deselectAllPlayers() {
        selectedPlayers.removeAll()
        autoBalanceRoles()
    }
    
    private func autoBalanceRoles() {
        let count = selectedPlayerCount
        guard count >= 3 else {
            // Reset to defaults or clears
             roleCounts = [.mafia: 0, .crewmate: 0, .doctor: 0, .investigator: 0, .jester: 0]
             return
        }
        
        var newCounts: [Role: Int] = [
            .mafia: 0,
            .crewmate: 0,
            .doctor: 0,
            .investigator: 0,
            .jester: 0
        ]
        
        // 1. Determine Mafia Count
        if count >= 10 {
            newCounts[.mafia] = 3
        } else if count >= 7 {
            newCounts[.mafia] = 2
        } else {
            newCounts[.mafia] = 1
        }
        
        // 2. Determine Special Roles
        if count >= 5 {
            newCounts[.doctor] = 1
        }
        
        if count >= 6 {
            newCounts[.investigator] = 1
        }
        
        // 3. Fill rest with Crewmates
        let assigned = newCounts.values.reduce(0, +)
        let remainder = count - assigned
        newCounts[.crewmate] = max(0, remainder)
        
        roleCounts = newCounts
    }
}
