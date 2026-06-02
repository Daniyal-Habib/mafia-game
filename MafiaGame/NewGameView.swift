import SwiftUI

struct NewGameView: View {
    @Environment(PlayerStore.self) private var playerStore
    @State private var gameSetup = GameSetup()
    @State private var gameSession: GameSession?
    @State private var showingRoleReveal = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Player Selection Section
                    playerSelectionSection
                    
                    Divider()
                        .background(Color.gray.opacity(0.3))
                        .padding(.horizontal)
                    
                    // Role Configuration Section
                    roleConfigurationSection
                    
                    Spacer(minLength: 100)
                }
                .padding(.top)
            }
            
            // Bottom bar with validation and start button
            VStack {
                Spacer()
                bottomBar
            }
        }
        .navigationTitle("New Game")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationDestination(isPresented: $showingRoleReveal) {
            if let session = gameSession {
                RoleRevealView(gameSession: session)
            }
        }
    }
    
    // MARK: - Player Selection
    
    private var playerSelectionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Select Players")
                    .font(.headline)
                    .foregroundColor(.white)
                
                Spacer()
                
                Text("\(gameSetup.selectedPlayerCount) selected")
                    .font(.caption)
                    .foregroundColor(.gray)
                
                Button(action: {
                    if gameSetup.selectedPlayerCount == playerStore.players.count {
                        gameSetup.deselectAllPlayers()
                    } else {
                        gameSetup.selectAllPlayers(from: playerStore.players)
                    }
                    HapticManager.shared.playTap()
                }) {
                    Text(gameSetup.selectedPlayerCount == playerStore.players.count ? "Deselect All" : "Select All")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            .padding(.horizontal)
            
            if playerStore.players.isEmpty {
                emptyPlayersView
            } else {
                playerGrid
            }
        }
    }
    
    private var emptyPlayersView: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 40))
                .foregroundColor(.gray)
            
            Text("No players added yet")
                .foregroundColor(.gray)
            
            NavigationLink(destination: PlayersView()) {
                Text("Add Players")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
    
    private var playerGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            ForEach(playerStore.players) { player in
                PlayerSelectCard(
                    player: player,
                    isSelected: gameSetup.isPlayerSelected(player.id),
                    playerStore: playerStore
                ) {
                    gameSetup.togglePlayer(player.id)
                    HapticManager.shared.playTap()
                }
            }
            
            // Add Player button
            NavigationLink(destination: AddPlayerView()) {
                VStack(spacing: 8) {
                    Circle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Image(systemName: "plus")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                        )
                        .overlay(
                            Circle()
                                .stroke(Color.orange.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [5]))
                        )
                    
                    Text("Add Player")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .lineLimit(1)
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.1))
                )
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - Role Configuration
    
    private var roleConfigurationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Configure Roles")
                    .font(.headline)
                    .foregroundColor(.white)
                
                Spacer()
                
                Text("\(gameSetup.totalRoles) roles")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(.horizontal)
            
            VStack(spacing: 12) {
                ForEach(Role.allCases) { role in
                    RoleConfigRow(
                        role: role,
                        count: gameSetup.roleCount(for: role),
                        onIncrement: {
                            gameSetup.incrementRole(role)
                            HapticManager.shared.playTap()
                        },
                        onDecrement: {
                            gameSetup.decrementRole(role)
                            HapticManager.shared.playTap()
                        }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Bottom Bar
    
    private var bottomBar: some View {
        VStack(spacing: 0) {
            // Glassmorphism effect
            Rectangle()
                .fill(.ultraThinMaterial)
                .frame(height: 1)
            
            HStack {
                // Validation message
                HStack(spacing: 8) {
                    Image(systemName: gameSetup.isValid ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                        .foregroundColor(gameSetup.isValid ? .green : .orange)
                    
                    Text(gameSetup.validationMessage)
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                // Start button
                Button(action: startGame) {
                    Text("START")
                }
                .buttonStyle(GameButtonStyle())
                .frame(width: 160) // Smaller width as requested
                .opacity(gameSetup.isValid ? 1.0 : 0.5)
                .disabled(!gameSetup.isValid)
            }
            .padding()
            .background(Color.black.opacity(0.9))
        }
    }
    
    private func startGame() {
        HapticManager.shared.playSuccess()
        
        // Get selected players
        let selectedPlayers = playerStore.players.filter { gameSetup.isPlayerSelected($0.id) }
        
        // Create game session
        let session = GameSession()
        session.setupGame(selectedPlayers: selectedPlayers, roleCounts: gameSetup.roleCounts)
        
        gameSession = session
        showingRoleReveal = true
    }
}

// MARK: - Player Select Card

struct PlayerSelectCard: View {
    let player: Player
    let isSelected: Bool
    let playerStore: PlayerStore
    let onTap: () -> Void
    
    // Gradients for "Red Gem" style
    private let redBackgroundGradient = LinearGradient(
        colors: [
            Color(red: 0.8, green: 0.1, blue: 0.1),
            Color(red: 0.5, green: 0.0, blue: 0.0)
        ],
        startPoint: .top,
        endPoint: .bottom
    )
    
    private let borderGradient = LinearGradient(
        colors: [
            Color(red: 1.0, green: 0.9, blue: 0.5), // Pale Gold
            Color(red: 0.8, green: 0.6, blue: 0.2), // Dark Gold
            Color(red: 1.0, green: 0.9, blue: 0.5)  // Pale Gold
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    private let unselectedGradient = LinearGradient(
        colors: [Color.gray.opacity(0.15), Color.black.opacity(0.3)],
        startPoint: .top,
        endPoint: .bottom
    )
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                // Player image
                if let image = playerStore.loadImage(for: player) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 60, height: 60)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(isSelected ? Color(red: 1.0, green: 0.8, blue: 0.0) : Color.clear, lineWidth: 2)
                        )
                } else {
                    Circle()
                        .fill(isSelected ? Color(red: 1.0, green: 0.8, blue: 0.0).opacity(0.2) : Color.gray.opacity(0.3))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Text(String(player.name.prefix(1)).uppercased())
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(isSelected ? .white : .orange)
                        )
                        .overlay(
                            Circle()
                                .stroke(isSelected ? Color(red: 1.0, green: 0.8, blue: 0.0) : Color.clear, lineWidth: 2)
                        )
                }
                
                Text(player.name)
                    .font(.caption)
                    .fontWeight(isSelected ? .bold : .regular)
                    .foregroundColor(isSelected ? .white : .gray)
                    .lineLimit(1)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity)
            .background(
                ZStack {
                    if isSelected {
                        CutCornerShape(cutSize: 8)
                            .fill(redBackgroundGradient.opacity(0.8))
                            .overlay(
                                CutCornerShape(cutSize: 8)
                                    .stroke(borderGradient, lineWidth: 2)
                            )
                            .shadow(color: Color.red.opacity(0.4), radius: 4, x: 0, y: 2)
                    } else {
                        CutCornerShape(cutSize: 8)
                            .fill(unselectedGradient)
                            .overlay(
                                CutCornerShape(cutSize: 8)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    }
                }
            )
            .overlay(
                // Checkmark
                Group {
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.white)
                            .background(Circle().fill(Color(red: 0.8, green: 0.6, blue: 0.2)))
                            .offset(x: 4, y: -4)
                    }
                },
                alignment: .topTrailing
            )
        }
    }
}

// MARK: - Role Config Row

struct RoleConfigRow: View {
    let role: Role
    let count: Int
    let onIncrement: () -> Void
    let onDecrement: () -> Void
    
    var body: some View {
        HStack(spacing: 16) {
            // Role icon
            Image(systemName: role.icon)
                .font(.title2)
                .foregroundColor(role.color)
                .frame(width: 40)
            
            // Role info
            VStack(alignment: .leading, spacing: 2) {
                Text(role.rawValue)
                    .font(.headline)
                    .foregroundColor(.white)
                
                Text(role.description)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Counter
            HStack(spacing: 16) {
                Button(action: onDecrement) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundColor(count > 0 ? .white : .gray.opacity(0.3))
                }
                .disabled(count == 0)
                
                Text("\(count)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(width: 30)
                
                Button(action: onIncrement) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(role.color)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.1))
        )
    }
}

#Preview {
    NavigationStack {
        NewGameView()
            .environment(PlayerStore())
    }
}
