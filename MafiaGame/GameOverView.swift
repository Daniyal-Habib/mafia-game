import SwiftUI

struct GameOverView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(GameHistoryStore.self) private var historyStore
    @Environment(GlobalSettings.self) private var settings
    @Environment(WordStore.self) private var wordStore
    
    let gameSession: GameSession
    let winResult: WinResult
    let playerStore: PlayerStore
    
    var body: some View {
        ZStack {
            // Background
            winnerBackground
            
            ScrollView {
                VStack(spacing: 40) {
                    
                    // Winner Announcement Title
                    winnerTitle
                        .padding(.top, 60)
                    
                    // Winners Showcase (Side by Side / Grid)
                    winnersShowcase
                    
                    Divider()
                        .background(Color.white.opacity(0.3))
                        .padding(.horizontal)
                    
                    // All Players List
                    allPlayersList
                    
                    // Home button
                    Button(action: goHome) {
                        Text("BACK TO HOME")
                    }
                    .buttonStyle(GameButtonStyle())
                    .frame(width: 250)
                    .padding(.bottom, 50)
                }
            }
        }
        .ignoresSafeArea()
        .navigationBarBackButtonHidden(true)
        .onAppear {
            HapticManager.shared.playSuccess()
            updatePlayerStats()
            GamePersistenceManager.shared.clearSavedGame()
        }
    }
    
    // MARK: - Winner Title
    
    private var winnerTitle: some View {
        VStack(spacing: 8) {
            switch winResult {
            case .mafiaWins:
                Text("MAFIA WINS")
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                Text("The city has fallen")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.8))
            case .crewWins:
                Text("CREW WINS")
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                Text("Justice has been served")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.8))
            case .jesterWins(let player):
                Text("JESTER WINS")
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                Text("\(player.name) fooled everyone!")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.8))
            case .noWinYet:
                EmptyView()
            }
        }
    }
    
    // MARK: - Winners Showcase
    
    private var winnersShowcase: some View {
        let winners = getWinningPlayers()
        let count = winners.count
        
        return VStack(spacing: 16) {
            if count == 1 {
                // Single winner - large card
                winnerCard(player: winners[0], size: .large)
            } else if count == 2 {
                // Two winners side by side
                HStack(spacing: 12) {
                    ForEach(winners) { player in
                        winnerCard(player: player, size: .medium)
                    }
                }
            } else if count <= 4 {
                // 3-4 winners - 2 columns
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(winners) { player in
                        winnerCard(player: player, size: .medium)
                    }
                }
            } else {
                // 5+ winners - 3 columns
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(winners) { player in
                        winnerCard(player: player, size: .small)
                    }
                }
            }
        }
        .padding(.horizontal, 24)
    }
    
    private enum CardSize {
        case large, medium, small
        
        var width: CGFloat {
            switch self {
            case .large: return 300
            case .medium: return 150
            case .small: return 100
            }
        }
        
        var height: CGFloat {
            switch self {
            case .large: return 400
            case .medium: return 200
            case .small: return 130
            }
        }
    }
    
    private func winnerCard(player: Player, size: CardSize) -> some View {
        ZStack(alignment: .bottom) {
            // Player Photo (fills the card)
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size.width, height: size.height)
                    .clipped()
            } else {
                Rectangle()
                    .fill(winnerBackgroundColor.opacity(0.5))
                    .frame(width: size.width, height: size.height)
                    .overlay(
                        Text(String(player.name.prefix(1)).uppercased())
                            .font(.system(size: size.height * 0.3, weight: .bold))
                            .foregroundColor(.white)
                    )
            }
            
            // Name overlay at bottom
            Text(player.name)
                .font(size == .large ? .title2 : .caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
        }
        .frame(width: size.width, height: size.height)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(winnerBackgroundColor, lineWidth: 3)
        )
    }
    
    private var isJester: Bool {
        if case .jesterWins = winResult { return true }
        return false
    }
    
    private var winnerBackgroundColor: Color {
        switch winResult {
        case .mafiaWins: return .red
        case .crewWins: return .green
        case .jesterWins: return .purple
        case .noWinYet: return .white
        }
    }
    
    // MARK: - All Players List
    
    private var allPlayersList: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("ALL ROLES")
                .font(.title3) // Reduced size
                .fontWeight(.bold)
                .foregroundColor(.white.opacity(0.8))
                .padding(.horizontal)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                ForEach(gameSession.getPlayersWithRoles(), id: \.player.id) { item in
                    PlayerRevealCard(
                        player: item.player,
                        role: item.role,
                        isAlive: item.isAlive,
                        playerStore: playerStore
                    )
                }
            }
            .padding(.horizontal)
        }
    }
    
    private func getWinningPlayers() -> [Player] {
        gameSession.players.filter { player in
            guard let role = gameSession.getRole(for: player) else { return false }
            
            switch winResult {
            case .mafiaWins:
                return role.team == .mafia
            case .crewWins:
                return role.team == .crew
            case .jesterWins(let winner):
                return player.id == winner.id
            case .noWinYet:
                return false
            }
        }
    }
    
    // MARK: - Update Player Stats
    
    private func updatePlayerStats() {
        // Determine winners based on win result
        let winningTeam: Role.Team?
        var jesterWinner: Player? = nil
        var winnerString = "Unknown"
        
        switch winResult {
        case .mafiaWins:
            winningTeam = .mafia
            winnerString = "Mafia"
        case .crewWins:
            winningTeam = .crew
            winnerString = "Town"
        case .jesterWins(let player):
            winningTeam = nil
            jesterWinner = player
            winnerString = "Jester (\(player.name))"
        case .noWinYet:
            return
        }
        
        // Save to History
        historyStore.addGame(
            winner: winnerString,
            playerCount: gameSession.players.count,
            duration: 600
        )
        
        // Update each player's stats
        for player in gameSession.players {
            guard let role = gameSession.getRole(for: player) else { continue }
            
            var updatedPlayer = player
            updatedPlayer.gamesPlayed += 1
            
            // Check if this player won
            var didWin = false
            
            if let jester = jesterWinner, jester.id == player.id {
                // Jester won
                didWin = true
            } else if let winTeam = winningTeam, role.team == winTeam {
                // Player's team won
                didWin = true
            }
            
            if didWin {
                updatedPlayer.gamesWon += 1
            }
            
            playerStore.updatePlayer(updatedPlayer)
        }
    }
    
    // MARK: - Winner Background
    
    private var winnerBackground: some View {
        Group {
            switch winResult {
            case .mafiaWins:
                LinearGradient(
                    colors: [Color.red.opacity(0.8), Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .crewWins:
                LinearGradient(
                    colors: [Color.green.opacity(0.8), Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .jesterWins:
                LinearGradient(
                    colors: [Color.purple.opacity(0.8), Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .noWinYet:
                Color.black
            }
        }
    }
    
    // MARK: - Actions
    
    private func goHome() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController = UIHostingController(
                rootView: HomeView()
                    .environment(playerStore)
                    .environment(historyStore)
                    .environment(settings)
                    .environment(wordStore)
                    .preferredColorScheme(.dark)
            )
        }
    }
}

// MARK: - Player Reveal Card

struct PlayerRevealCard: View {
    let player: Player
    let role: Role
    let isAlive: Bool
    let playerStore: PlayerStore
    
    var body: some View {
        VStack(spacing: 8) {
            // Player image
            ZStack {
                if let image = playerStore.loadImage(for: player) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 60, height: 60)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(role.color.opacity(0.3))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Text(String(player.name.prefix(1)).uppercased())
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(role.color)
                        )
                }
                
                if !isAlive {
                    Circle()
                        .fill(.black.opacity(0.5))
                        .frame(width: 60, height: 60)
                }
            }
            
            Text(player.name)
                .font(.caption)
                .foregroundColor(.white)
                .lineLimit(1)
            
            // Role badge
            HStack(spacing: 4) {
                Image(systemName: role.icon)
                    .font(.caption2)
                Text(role.rawValue)
                    .font(.caption2)
                    .fontWeight(.semibold)
            }
            .foregroundColor(role.color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(role.color.opacity(0.2))
            )
        }
        .frame(width: 100)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.1))
        )
        .opacity(isAlive ? 1 : 0.6)
    }
}

#Preview {
    let session = GameSession()
    let store = PlayerStore()
    
    store.addPlayer(name: "Alice", image: nil)
    store.addPlayer(name: "Bob", image: nil)
    
    session.setupGame(selectedPlayers: store.players, roleCounts: [.mafia: 1, .crewmate: 1])
    
    return GameOverView(gameSession: session, winResult: .mafiaWins, playerStore: store)
}
