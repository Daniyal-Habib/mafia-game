import SwiftUI

struct PlayersView: View {
    @Environment(PlayerStore.self) private var playerStore
    @State private var showingAddPlayer = false
    
    var body: some View {
        ZStack {
            // Dark background
            Color.black.ignoresSafeArea()
            
            if playerStore.players.isEmpty {
                // Empty state
                VStack(spacing: 20) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    
                    Text("No Players Yet")
                        .font(.title2)
                        .foregroundColor(.white)
                    
                    Text("Add players to start a game")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                    // Add new player button
                NavigationLink(destination: AddPlayerView()) {
                    Text("Add New Player".uppercased())
                }
                .buttonStyle(GameButtonStyle())
                .padding(.horizontal)
                .padding(.bottom)
                }
            } else {
                // Player list
                List {
                    ForEach(playerStore.players) { player in
                        NavigationLink(destination: EditPlayerView(player: player)) {
                            PlayerRow(player: player)
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparatorTint(.gray.opacity(0.3))
                    }
                    .onDelete(perform: deletePlayers)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Players")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingAddPlayer = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.orange)
                }
            }
        }
        .sheet(isPresented: $showingAddPlayer) {
            AddPlayerView()
        }
    }
    
    private func deletePlayers(at offsets: IndexSet) {
        for index in offsets {
            playerStore.deletePlayer(playerStore.players[index])
        }
        HapticManager.shared.playSuccess()
    }
}

struct PlayerRow: View {
    let player: Player
    @Environment(PlayerStore.self) private var playerStore
    
    var body: some View {
        HStack(spacing: 16) {
            // Player image
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 50, height: 50)
                    .clipShape(Circle())
            } else {
                Circle()
                    .fill(Color.orange.opacity(0.3))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Text(String(player.name.prefix(1)).uppercased())
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                    )
            }
            
            // Player info
            VStack(alignment: .leading, spacing: 4) {
                Text(player.name)
                    .font(.headline)
                    .foregroundColor(.white)
                
                HStack(spacing: 12) {
                    Label("\(player.gamesPlayed)", systemImage: "gamecontroller.fill")
                    Label("\(player.gamesWon)", systemImage: "trophy.fill")
                }
                .font(.caption)
                .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Win rate
            if player.gamesPlayed > 0 {
                Text(String(format: "%.0f%%", player.winRate))
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.green.opacity(0.2))
                    )
            }
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    NavigationStack {
        PlayersView()
            .environment(PlayerStore())
    }
}
