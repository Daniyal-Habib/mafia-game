import SwiftUI

struct HistoryView: View {
    @Environment(GameHistoryStore.self) private var historyStore
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab: HistoryTab = .history
    @State private var showResetConfirm = false

    enum HistoryTab: String, CaseIterable {
        case history = "History"
        case leaderboard = "Leaderboard"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Tab picker
                    Picker("Tab", selection: $selectedTab) {
                        ForEach(HistoryTab.allCases, id: \.self) { tab in
                            Text(tab.rawValue).tag(tab)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                    .background(Color.black)

                    if historyStore.games.isEmpty {
                        emptyState
                    } else {
                        switch selectedTab {
                        case .history:
                            historyTab
                        case .leaderboard:
                            leaderboardTab
                        }
                    }
                }
            }
            .navigationTitle("Game History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.orange)
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showResetConfirm = true
                    } label: {
                        Label("Reset Stats", systemImage: "trash")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            .confirmationDialog("Reset all game history and stats?", isPresented: $showResetConfirm, titleVisibility: .visible) {
                Button("Reset Everything", role: .destructive) {
                    historyStore.clearHistory()
                }
            } message: {
                Text("This will permanently delete all game records and stats. This cannot be undone.")
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.3))
            Text("No games played yet")
                .font(.headline)
                .foregroundColor(.gray)
            Text("Play some games to see stats and the leaderboard here!")
                .font(.subheadline)
                .foregroundColor(.gray.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - History Tab

    private var historyTab: some View {
        List {
            // Summary Section
            Section {
                HStack(spacing: 20) {
                    StatView(title: "Games", value: "\(historyStore.totalGamesPlayed)")
                    StatView(title: "Mafia Wins", value: "\(historyStore.mafiaWins)")
                    StatView(title: "Crew Wins", value: "\(historyStore.crewWins)")
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .padding(.vertical)
            }

            // Achievements Section
            Section(header: Text("Achievements").foregroundColor(.gray)) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(badges) { badge in
                            BadgeView(badge: badge)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }

            // Game List
            Section(header: Text("Recent Games").foregroundColor(.gray)) {
                ForEach(historyStore.games) { game in
                    GameHistoryRow(game: game)
                }
            }
        }
        .scrollContentBackground(.hidden)
    }

    // MARK: - Leaderboard Tab

    private var leaderboardTab: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Overall Win Stats
                overallWinStatsCard

                // Player Leaderboard
                playerLeaderboardSection

                // Win Rate Chart (visual bar chart)
                winRateChartSection
            }
            .padding()
            .padding(.bottom, 30)
        }
    }

    private var overallWinStatsCard: some View {
        VStack(spacing: 16) {
            Text("OVERALL STATS")
                .font(.caption)
                .foregroundColor(.gray)
                .tracking(4)

            HStack(spacing: 0) {
                // Mafia side
                leaderboardStatBlock(
                    value: "\(historyStore.mafiaWins)",
                    label: "Mafia Wins",
                    icon: "moon.fill",
                    color: .red
                )

                Divider()
                    .background(Color.white.opacity(0.15))
                    .frame(maxHeight: 60)

                // Crew side
                leaderboardStatBlock(
                    value: "\(historyStore.crewWins)",
                    label: "Crew Wins",
                    icon: "person.2.fill",
                    color: .blue
                )

                Divider()
                    .background(Color.white.opacity(0.15))
                    .frame(maxHeight: 60)

                // Jester / Other
                let jesterWins = historyStore.totalGamesPlayed - historyStore.mafiaWins - historyStore.crewWins
                leaderboardStatBlock(
                    value: "\(max(0, jesterWins))",
                    label: "Other",
                    icon: "theatermasks.fill",
                    color: .purple
                )
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )

            // Win-rate visual bar
            let total = max(historyStore.totalGamesPlayed, 1)
            let mafiaFrac = CGFloat(historyStore.mafiaWins) / CGFloat(total)
            let crewFrac = CGFloat(historyStore.crewWins) / CGFloat(total)

            GeometryReader { geo in
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.red)
                        .frame(width: geo.size.width * mafiaFrac)

                    Rectangle()
                        .fill(Color.blue)
                        .frame(width: geo.size.width * crewFrac)

                    Rectangle()
                        .fill(Color.purple)
                        .frame(maxWidth: .infinity)
                }
                .clipShape(Capsule())
            }
            .frame(height: 10)
            .padding(.horizontal, 4)
        }
    }

    private func leaderboardStatBlock(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title2)
            Text(value)
                .font(.title)
                .fontWeight(.black)
                .foregroundColor(.white)
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }

    private var playerLeaderboardSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("PLAYER LEADERBOARD")
                .font(.caption)
                .foregroundColor(.gray)
                .tracking(4)

            let sorted = playerStore.players.sorted { $0.gamesWon > $1.gamesWon }

            if sorted.isEmpty {
                Text("Player win stats will appear here as games are recorded.")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { index, player in
                    leaderboardRow(rank: index + 1, player: player)
                }
            }
        }
    }

    private func leaderboardRow(rank: Int, player: Player) -> some View {
        HStack(spacing: 14) {
            // Rank badge
            ZStack {
                Circle()
                    .fill(rankColor(for: rank).opacity(0.2))
                    .frame(width: 34, height: 34)
                Text("\(rank)")
                    .font(.headline)
                    .fontWeight(.black)
                    .foregroundColor(rankColor(for: rank))
            }

            // Player photo
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 44, height: 44)
                    .clipShape(Circle())
            } else {
                Circle()
                    .fill(Color.orange.opacity(0.2))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(String(player.name.prefix(1)).uppercased())
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                    )
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(player.name)
                    .font(.headline)
                    .foregroundColor(.white)
                Text("\(player.gamesWon) wins · \(player.gamesPlayed) played")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            // Win rate
            VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "%.0f%%", player.winRate))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(player.winRate >= 50 ? .green : .red)
                Text("win rate")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(rank == 1 ? Color.yellow.opacity(0.07) : Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(rank == 1 ? Color.yellow.opacity(0.25) : Color.white.opacity(0.07), lineWidth: 1)
                )
        )
    }

    private func rankColor(for rank: Int) -> Color {
        switch rank {
        case 1: return .yellow
        case 2: return Color(white: 0.75)
        case 3: return Color(red: 0.8, green: 0.5, blue: 0.2)
        default: return .gray
        }
    }

    private var winRateChartSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("WIN RATE PER PLAYER")
                .font(.caption)
                .foregroundColor(.gray)
                .tracking(4)

            ForEach(playerStore.players.filter { $0.gamesPlayed > 0 }) { player in
                HStack(spacing: 12) {
                    Text(player.name)
                        .font(.caption)
                        .foregroundColor(.white)
                        .frame(width: 80, alignment: .leading)
                        .lineLimit(1)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.white.opacity(0.1))

                            RoundedRectangle(cornerRadius: 4)
                                .fill(
                                    LinearGradient(
                                        colors: [.orange, .red],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geo.size.width * CGFloat(player.winRate / 100))
                        }
                    }
                    .frame(height: 12)

                    Text(String(format: "%.0f%%", player.winRate))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(width: 38, alignment: .trailing)
                }
            }

            if playerStore.players.filter({ $0.gamesPlayed > 0 }).isEmpty {
                Text("No player stats yet. Win rates will be tracked after games.")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
        )
    }

    // MARK: - Badges

    struct Badge: Identifiable {
        let id = UUID()
        let name: String
        let icon: String
        let color: Color
    }

    var badges: [Badge] {
        var b: [Badge] = []
        if historyStore.mafiaWins > 0 {
            b.append(Badge(name: "First Blood", icon: "drop.fill", color: .red))
        }
        if historyStore.crewWins >= 3 {
            b.append(Badge(name: "Guardian", icon: "shield.fill", color: .blue))
        }
        if historyStore.totalGamesPlayed >= 1 {
            b.append(Badge(name: "Newbie", icon: "figure.walk", color: .green))
        }
        if historyStore.totalGamesPlayed >= 5 {
            b.append(Badge(name: "Veteran", icon: "star.fill", color: .yellow))
        }
        if historyStore.totalGamesPlayed >= 10 {
            b.append(Badge(name: "Champion", icon: "crown.fill", color: .orange))
        }
        if b.isEmpty {
            b.append(Badge(name: "Play to Unlock", icon: "lock.fill", color: .gray))
        }
        return b
    }
}

struct BadgeView: View {
    let badge: HistoryView.Badge

    var body: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(badge.color.opacity(0.2))
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: badge.icon)
                        .font(.title)
                        .foregroundColor(badge.color)
                )
                .overlay(
                    Circle()
                        .stroke(badge.color.opacity(0.5), lineWidth: 1)
                )

            Text(badge.name)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
    }
}

struct StatView: View {
    let title: String
    let value: String

    var body: some View {
        VStack {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }
}

struct GameHistoryRow: View {
    let game: GameRecord

    var iconName: String {
        if game.winner.contains("Mafia") { return "moon.fill" }
        if game.winner.contains("Crew") || game.winner.contains("Town") { return "person.2.fill" }
        return "theatermasks.fill"
    }

    var color: Color {
        if game.winner.contains("Mafia") { return .red }
        if game.winner.contains("Crew") || game.winner.contains("Town") { return .blue }
        return .purple
    }

    var body: some View {
        HStack {
            Image(systemName: iconName)
                .foregroundColor(color)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(game.winner + " Won")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("\(game.playerCount) Players • \(timeString)")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            Text(dateString)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .listRowBackground(Color.gray.opacity(0.1))
    }

    var timeString: String {
        let minutes = Int(game.duration) / 60
        return "\(minutes) min"
    }

    var dateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: game.date)
    }
}

#Preview {
    let store = GameHistoryStore()
    let playerStore = PlayerStore()
    if store.games.isEmpty {
        store.addGame(winner: "Mafia", playerCount: 5, duration: 600)
        store.addGame(winner: "Crew", playerCount: 6, duration: 720)
    }
    return HistoryView()
        .environment(store)
        .environment(playerStore)
}
