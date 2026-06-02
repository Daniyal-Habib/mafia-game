import SwiftUI
import Combine

struct GameplayView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(GlobalSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss
    
    let gameSession: GameSession
    
    @State private var playerToEliminate: Player?
    @State private var winResult: WinResult = .noWinYet
    @State private var showGameOver = false
    @State private var showContinueAlert = false
    @State private var showSettings = false // Now opens local gameplay menu (e.g. undo) or links to global? 
                                          // Keeping as 'Game Menu'
    @State private var showRolesOverlay = false
    @State private var lastEliminatedPlayer: Player?
    @State private var lastEliminatedWasMafia: Bool = false
    
    // Timer State
    @State private var timeRemaining: TimeInterval = 0
    @State private var isTimerRunning = false
    @State private var timerSubscription: Any? = nil // Placeholder for task
    
    // Undo State
    @State private var canUndo: Bool = false
    
    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color.black, Color(red: 0.1, green: 0.05, blue: 0.15)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 20) {
                // Header
                headerView
                
                // Stats bar
                statsBar
                
                // Player grid
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(gameSession.players) { player in
                            PlayerGameCard(
                                player: player,
                                role: gameSession.getRole(for: player),
                                isAlive: gameSession.isPlayerAlive(player),
                                playerStore: playerStore
                            ) {
                                if gameSession.isPlayerAlive(player) {
                                    playerToEliminate = player
                                }
                            }
                        }
                    }
                    .padding()
                }
                
                Spacer()
            }
            
            // Roles overlay
            if showRolesOverlay {
                rolesOverlayView
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.gray)
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showSettings = true }) {
                    Image(systemName: "gearshape.fill")
                        .font(.title2)
                        .foregroundColor(.gray)
                }
            }
        }
        .sheet(item: $playerToEliminate) { player in
            EliminationSheet(
                player: player,
                playerStore: playerStore,
                onEliminate: { type in
                    eliminatePlayer(player, type: type)
                }
            )
            .presentationDetents([.height(300)])
            .presentationDragIndicator(.visible)
        }
        .navigationDestination(isPresented: $showGameOver) {
            GameOverView(gameSession: gameSession, winResult: winResult, playerStore: playerStore)
        }
        .sheet(isPresented: $showSettings) {
            settingsSheet
        }
        .fullScreenCover(isPresented: $showEliminationAnnouncement) {
            if let data = eliminationData {
                EliminationAnnounceView(
                    player: data.player,
                    type: data.type,
                    isMafia: data.isMafia,
                    isJester: data.isJester,
                    mafiaCount: data.mafiaCount,
                    actualImposters: data.actualImposters,
                    onDismiss: {
                        showEliminationAnnouncement = false
                        checkWinAfterAnimation()
                    }
                )
            }
        }
    }
    
    // MARK: - Elimination Alert Content
    
    private var eliminationAlertTitle: String {
        guard let player = lastEliminatedPlayer else { return "Game Continues" }
        
        if settings.revealMafiaOnElimination {
            if lastEliminatedWasMafia {
                return "\(player.name) was the Mafia!"
            } else {
                return "\(player.name) was NOT the Mafia"
            }
        } else {
            return "Game Continues"
        }
    }
    
    private var eliminationAlertMessage: String {
        if settings.revealMafiaOnElimination && lastEliminatedPlayer != nil {
            return lastEliminatedWasMafia 
                ? "The town eliminated a mafia member. Continue the game."
                : "An innocent player was eliminated. Continue the game."
        } else {
            return "No winner yet. Continue eliminating players."
        }
    }
    
    // MARK: - Header
    
    private var headerView: some View {
        VStack(spacing: 12) {
            Text("GAMEPLAY")
                .font(.caption)
                .foregroundColor(.gray)
                .tracking(4)
            
            // Timer View (if enabled)
            if settings.turnTimerEnabled {
                HStack(spacing: 16) {
                    Button(action: toggleTimer) {
                        Image(systemName: isTimerRunning ? "pause.circle.fill" : "play.circle.fill")
                            .font(.title)
                            .foregroundColor(isTimerRunning ? .yellow : .green)
                    }
                    
                    Text(timeString(from: timeRemaining))
                        .font(.system(size: 32).monospacedDigit()) // Fixed width font
                        .foregroundColor(timeRemaining < 10 ? .red : .white)
                        .contentTransition(.numericText())
                    
                    Button(action: resetTimer) {
                        Image(systemName: "arrow.counterclockwise.circle.fill")
                            .font(.title)
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical, 4)
                .onAppear {
                    resetTimer()
                }
                .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                    if isTimerRunning && timeRemaining > 0 {
                        timeRemaining -= 1
                        if timeRemaining <= 5 {
                            HapticManager.shared.playTap() // Warning ticks
                        }
                        if timeRemaining == 0 {
                            isTimerRunning = false
                            HapticManager.shared.playSuccess() // Timer done
                        }
                    }
                }
            } else {
                Text("Tap a player to eliminate")
                    .font(.headline)
                    .foregroundColor(.white)
            }
            
            // Undo Button (only if actions exist)
            if !gameSession.eliminatedPlayers.isEmpty && !showGameOver {
                Button(action: undoLastElimination) {
                    Label("Undo Last Kill", systemImage: "arrow.uturn.backward")
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Capsule().stroke(Color.red.opacity(0.5), lineWidth: 1))
                }
                .padding(.top, 4)
            }
        }
        .padding(.top, 20)
    }
    
    private func timeString(from timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func toggleTimer() {
        isTimerRunning.toggle()
        HapticManager.shared.playTap()
    }
    
    private func resetTimer() {
        isTimerRunning = false
        timeRemaining = settings.turnTimerDuration
        HapticManager.shared.playTap()
    }
    
    private func undoLastElimination() {
        if let last = gameSession.eliminatedPlayers.last {
            gameSession.undoElimination(last.player)
            lastEliminatedPlayer = nil // Clear last eliminated
            HapticManager.shared.playSuccess()
        }
    }
    
    // MARK: - Stats Bar
    
    private var statsBar: some View {
        HStack(spacing: 20) {
            StatPill(
                icon: "person.fill",
                value: "\(gameSession.alivePlayers.count)",
                label: "Alive",
                color: .green
            )
            
            StatPill(
                icon: "person.fill.xmark",
                value: "\(gameSession.eliminatedPlayers.count)",
                label: "Dead",
                color: .red
            )
        }
        .padding(.horizontal)
    }
    
    // MARK: - Settings Sheet
    
    private var settingsSheet: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Reveal mafia toggle
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Reveal Role on Elimination", systemImage: "eye.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        Toggle(isOn: Bindable(settings).revealMafiaOnElimination) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Show if eliminated player was Mafia")
                                    .font(.subheadline)
                                    .foregroundColor(.white)
                                Text("When a player is eliminated, reveal if they were on the Mafia team")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .tint(.orange)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.1))
                        )
                    }
                    .padding(.horizontal)
                    
                    // Long press to reveal roles
                    VStack(alignment: .leading, spacing: 12) {
                        Label("View All Roles", systemImage: "person.3.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        LongPressRevealButton {
                            showSettings = false
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    showRolesOverlay = true
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer()
                }
                .padding(.top, 24)
            }
            .navigationTitle("Game Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        showSettings = false
                    }
                    .foregroundColor(.orange)
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    // MARK: - Roles Overlay
    
    private var rolesOverlayView: some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        showRolesOverlay = false
                    }
                }
            
            VStack(spacing: 20) {
                HStack {
                    Text("ALL ROLES")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .tracking(2)
                    
                    Spacer()
                    
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showRolesOverlay = false
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal)
                
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        ForEach(gameSession.getPlayersWithRoles(), id: \.player.id) { item in
                            RoleRevealCard(
                                player: item.player,
                                role: item.role,
                                isAlive: item.isAlive,
                                playerStore: playerStore
                            )
                        }
                    }
                    .padding()
                }
            }
            .padding(.top, 60)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
    }
    
    @State private var showEliminationAnnouncement = false
    @State private var eliminationData: (player: Player, type: EliminationType, isMafia: Bool, isJester: Bool, mafiaCount: Int, actualImposters: [Player])?

    // MARK: - Elimination Logic
    
    private func eliminatePlayer(_ player: Player, type: EliminationType) {
        // Store info about eliminated player before elimination
        lastEliminatedPlayer = player
        
        var wasMafia = false
        var wasJester = false
        
        if let role = gameSession.getRole(for: player) {
            wasMafia = role.team == .mafia
            wasJester = role == .jester
        }
        lastEliminatedWasMafia = wasMafia
        
        // Check game state BEFORE elimination for certain logic? No, we need current state.
        gameSession.eliminatePlayer(player, type: type)
        HapticManager.shared.playSuccess()
        
        // Calculate stats for animation
        let livingMafia = gameSession.alivePlayers.filter { 
            gameSession.getRole(for: $0)?.team == .mafia 
        }
        
        eliminationData = (player, type, wasMafia, wasJester, livingMafia.count, livingMafia)
        showEliminationAnnouncement = true
    }
    
    private func checkWinAfterAnimation() {
        let result = gameSession.checkWinCondition()
        if result != .noWinYet {
            winResult = result
            showGameOver = true
        }
    }
    }

// MARK: - Long Press Reveal Button

struct LongPressRevealButton: View {
    let onReveal: () -> Void
    
    @State private var isPressed = false
    @State private var progress: CGFloat = 0
    @State private var timer: Timer?
    
    private let requiredDuration: CGFloat = 1.5
    
    var body: some View {
        Button {} label: {
            HStack {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                        .frame(width: 40, height: 40)
                    
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(Color.orange, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .frame(width: 40, height: 40)
                        .rotationEffect(.degrees(-90))
                    
                    Image(systemName: "eye.fill")
                        .foregroundColor(isPressed ? .orange : .gray)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Hold to Reveal Roles")
                        .font(.subheadline)
                        .foregroundColor(.white)
                    Text("Long press for 1.5 seconds")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isPressed ? Color.orange : Color.clear, lineWidth: 2)
                    )
            )
        }
        .simultaneousGesture(
            LongPressGesture(minimumDuration: requiredDuration)
                .onEnded { _ in
                    HapticManager.shared.playSuccess()
                    onReveal()
                    resetState()
                }
        )
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isPressed {
                        isPressed = true
                        startTimer()
                    }
                }
                .onEnded { _ in
                    resetState()
                }
        )
    }
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            withAnimation(.linear(duration: 0.05)) {
                progress += 0.05 / requiredDuration
            }
            if progress >= 1.0 {
                timer?.invalidate()
            }
        }
    }
    
    private func resetState() {
        timer?.invalidate()
        timer = nil
        withAnimation(.easeOut(duration: 0.2)) {
            isPressed = false
            progress = 0
        }
    }
}

// MARK: - Role Reveal Card

struct RoleRevealCard: View {
    let player: Player
    let role: Role
    let isAlive: Bool
    let playerStore: PlayerStore
    
    var body: some View {
        VStack(spacing: 12) {
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
                        .fill(.black.opacity(0.6))
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: "xmark")
                        .font(.title2)
                        .foregroundColor(.red)
                }
            }
            
            // Player name
            Text(player.name)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(isAlive ? .white : .gray)
                .lineLimit(1)
            
            // Role
            HStack(spacing: 4) {
                Image(systemName: role.icon)
                    .font(.caption)
                Text(role.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(role.color)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.gray.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(role.color.opacity(0.3), lineWidth: 1)
                )
        )
        .opacity(isAlive ? 1 : 0.6)
    }
}

// MARK: - Player Game Card

struct PlayerGameCard: View {
    let player: Player
    let role: Role?
    let isAlive: Bool
    let playerStore: PlayerStore
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                // Player image
                ZStack {
                    if let image = playerStore.loadImage(for: player) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 70, height: 70)
                            .clipShape(Circle())
                    } else {
                        Circle()
                            .fill(isAlive ? Color.orange.opacity(0.3) : Color.gray.opacity(0.2))
                            .frame(width: 70, height: 70)
                            .overlay(
                                Text(String(player.name.prefix(1)).uppercased())
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundColor(isAlive ? .orange : .gray)
                            )
                    }
                    
                    // Dead overlay
                    if !isAlive {
                        Circle()
                            .fill(.black.opacity(0.6))
                            .frame(width: 70, height: 70)
                        
                        Image(systemName: "xmark")
                            .font(.title)
                            .foregroundColor(.red)
                    }
                }
                
                Text(player.name)
                    .font(.caption)
                    .foregroundColor(isAlive ? .white : .gray)
                    .lineLimit(1)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isAlive ? Color.gray.opacity(0.1) : Color.gray.opacity(0.05))
            )
            .opacity(isAlive ? 1 : 0.6)
        }
        .disabled(!isAlive)
    }
}

// MARK: - Stat Pill

struct StatPill: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color.gray.opacity(0.2))
        )
    }
}

// MARK: - Elimination Sheet

struct EliminationSheet: View {
    let player: Player
    let playerStore: PlayerStore
    let onEliminate: (EliminationType) -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            // Player info
            HStack(spacing: 16) {
                if let image = playerStore.loadImage(for: player) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 60, height: 60)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color.orange.opacity(0.3))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Text(String(player.name.prefix(1)).uppercased())
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                        )
                }
                
                VStack(alignment: .leading) {
                    Text("Eliminate")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(player.name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                
                Spacer()
            }
            .padding(.horizontal)
            
            // Elimination options
            VStack(spacing: 12) {
                Button(action: {
                    dismiss()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        onEliminate(.nightKill)
                    }
                }) {
                    Text("KILLED AT NIGHT")
                }
                .buttonStyle(GameButtonStyle(color: Color(red: 0.2, green: 0.2, blue: 0.3)))
                
                Button(action: {
                    dismiss()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        onEliminate(.votedOut)
                    }
                }) {
                    Text("VOTED OUT")
                }
                .buttonStyle(GameButtonStyle(color: .red))
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .padding(.top, 20)
        .background(Color.black)
    }
}

#Preview {
    let session = GameSession()
    let store = PlayerStore()
    
    store.addPlayer(name: "Alice", image: nil)
    store.addPlayer(name: "Bob", image: nil)
    store.addPlayer(name: "Charlie", image: nil)
    
    session.setupGame(selectedPlayers: store.players, roleCounts: [.mafia: 1, .crewmate: 2])
    
    return NavigationStack {
        GameplayView(gameSession: session)
            .environment(store)
    }
}

