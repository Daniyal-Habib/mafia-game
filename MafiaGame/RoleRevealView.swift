import SwiftUI

struct RoleRevealView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss
    
    let gameSession: GameSession
    @State private var dragOffset: CGFloat = 0
    @State private var hasRevealed: Bool = false
    @State private var showPassDevice: Bool = false
    @State private var showGameplay: Bool = false
    
    // Transition state
    @State private var isTransitioning: Bool = false
    @State private var currentCardOffset: CGFloat = 0
    @State private var nextCardOffset: CGFloat = 0
    
    // Haptic tracking
    @State private var lastHapticDragPosition: CGFloat = 0
    @State private var lastDragDirection: Int = 0
    
    private let revealThreshold: CGFloat = 80
    private let hapticStepSize: CGFloat = 20
    
    var body: some View {
        GeometryReader { geometry in
            let maxDragDistance = geometry.size.height * 0.35

            
            ZStack {
                // Background
                Color.black.ignoresSafeArea()
                
                // Current player's complete card (with hidden role underneath)
                if !isTransitioning {
                    playerRevealCard(
                        playerIndex: gameSession.currentPlayerIndex,
                        geometry: geometry,
                        maxDrag: maxDragDistance,
                        isInteractive: true
                    )
                    .offset(x: currentCardOffset)
                } else {
                    // During transition: show outgoing card sliding left
                    playerRevealCard(
                        playerIndex: gameSession.currentPlayerIndex,
                        geometry: geometry,
                        maxDrag: maxDragDistance,
                        isInteractive: false
                    )
                    .offset(x: currentCardOffset)
                    
                    // And incoming card sliding in from right (role hidden)
                    if gameSession.currentPlayerIndex + 1 < gameSession.players.count {
                        incomingPlayerCard(
                            playerIndex: gameSession.currentPlayerIndex + 1,
                            geometry: geometry
                        )
                        .offset(x: nextCardOffset)
                    }
                }
            }
        }
        .ignoresSafeArea()
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                HStack(spacing: 12) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Circle().fill(.black.opacity(0.5)))
                    }
                    
                    if showPassDevice {
                        Button(action: {
                            withAnimation {
                                showPassDevice = false
                                hasRevealed = false
                            }
                        }) {
                            Image(systemName: "arrow.uturn.left")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Circle().fill(.black.opacity(0.5)))
                        }
                    }
                }
            }
        }
        .navigationDestination(isPresented: $showGameplay) {
            GameplayView(gameSession: gameSession)
        }
    }
    
    // MARK: - Complete Player Card with Role Hidden Underneath
    
    @ViewBuilder
    private func playerRevealCard(playerIndex: Int, geometry: GeometryProxy, maxDrag: CGFloat, isInteractive: Bool) -> some View {
        let player = gameSession.players[playerIndex]
        let role = gameSession.getRole(for: player)
        
        ZStack {
            // BOTTOM: Role layer (only visible when card is dragged up)
            roleLayer(role: role, geometry: geometry)
            
            // TOP: Player card (slides up on swipe)
            playerCardContent(player: player, playerIndex: playerIndex, geometry: geometry, maxDrag: maxDrag)
                .offset(y: isInteractive ? -dragOffset : 0)
                .gesture(
                    isInteractive && !showPassDevice ? makeDragGesture(maxDrag: maxDrag) : nil
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: currentCardOffset != 0 ? 30 : 0))
    }
    
    // MARK: - Incoming Player Card (No Role Visible)
    
    @ViewBuilder
    private func incomingPlayerCard(playerIndex: Int, geometry: GeometryProxy) -> some View {
        let player = gameSession.players[playerIndex]
        
        ZStack {
            // Solid black background (no role showing)
            Color.black
            
            // Player card on top
            playerCardContent(player: player, playerIndex: playerIndex, geometry: geometry, maxDrag: 0)
        }
        .clipShape(RoundedRectangle(cornerRadius: 30))
    }
    
    // MARK: - Role Layer
    
    @ViewBuilder
    private func roleLayer(role: Role?, geometry: GeometryProxy) -> some View {
        if let role = role {
            ZStack {
                Color.black
                
                VStack {
                    Spacer()
                    
                    VStack(spacing: 24) {
                        Image(systemName: role.icon)
                            .font(.system(size: 60))
                            .foregroundColor(.white)   // Always white — hides role from peepers
                        
                        Text(role.rawValue.uppercased())
                            .font(.system(size: 36, weight: .black))
                            .foregroundColor(.white)   // Always white — hides role from peepers
                            .tracking(4)
                    }
                    .padding(.bottom, geometry.size.height * 0.15)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
    }
    
    // MARK: - Player Card Content
    
    @ViewBuilder
    private func playerCardContent(player: Player, playerIndex: Int, geometry: GeometryProxy, maxDrag: CGFloat) -> some View {
        ZStack {
            // Player image or gradient
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
            } else {
                LinearGradient(
                    colors: [Color(red: 0.8, green: 0.2, blue: 0.1), Color.orange, Color(red: 0.8, green: 0.2, blue: 0.1).opacity(0.8)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                Text(String(player.name.prefix(1)).uppercased())
                    .font(.system(size: 250, weight: .black))
                    .foregroundColor(.white.opacity(0.15))
            }
            
            // Gradient overlay
            VStack {
                Spacer()
                LinearGradient(
                    colors: [.clear, .black.opacity(0.6), .black.opacity(0.95)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 400)
            }
            
            // Content overlay
            VStack {
                // Progress indicator
                HStack(spacing: 4) {
                    ForEach(0..<gameSession.players.count, id: \.self) { index in
                        Capsule()
                            .fill(index <= playerIndex ? Color.white : Color.white.opacity(0.3))
                            .frame(height: 4)
                    }
                }
                .padding(.horizontal, 60)
                .padding(.top, 70)
                
                Spacer()
                
                // Player name
                Text(player.name)
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.5), radius: 10)
                
                // Bottom content
                if showPassDevice && playerIndex == gameSession.currentPlayerIndex {
                    passDeviceContent(geometry: geometry)
                } else if !showPassDevice {
                    swipePromptContent(maxDrag: maxDrag)
                } else {
                    // Incoming card - just show padding
                    Spacer().frame(height: 150)
                }
            }
        }
        .frame(width: geometry.size.width, height: geometry.size.height)
        .clipShape(RoundedRectangle(cornerRadius: dragOffset > 0 ? 30 : 0))
    }
    
    // MARK: - Drag Gesture
    
    private func makeDragGesture(maxDrag: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let dragAmount = -value.translation.height
                if dragAmount > 0 {
                    let newOffset = min(dragAmount, maxDrag)
                    
                    let direction = newOffset > dragOffset ? 1 : (newOffset < dragOffset ? -1 : 0)
                    let movementSinceLastHaptic = abs(newOffset - lastHapticDragPosition)
                    
                    if direction != 0 && direction != lastDragDirection {
                        HapticManager.shared.playScrub()
                        lastHapticDragPosition = newOffset
                        lastDragDirection = direction
                    } else if movementSinceLastHaptic >= hapticStepSize {
                        HapticManager.shared.playScrub()
                        lastHapticDragPosition = newOffset
                    }
                    
                    dragOffset = newOffset
                }
            }
            .onEnded { _ in
                lastHapticDragPosition = 0
                lastDragDirection = 0
                
                if dragOffset > revealThreshold {
                    hasRevealed = true
                    showPassDevice = true
                    HapticManager.shared.playSuccess()
                }
                
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    dragOffset = 0
                }
            }
    }
    
    // MARK: - Swipe Prompt
    
    private func swipePromptContent(maxDrag: CGFloat) -> some View {
        VStack(spacing: 16) {
            Text("Swipe up to reveal\nyour role")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
            
            Image(systemName: "chevron.up")
                .font(.system(size: 30, weight: .bold))
                .foregroundColor(.white)
                .offset(y: -dragOffset * 0.05)
        }
        .padding(.top, 20)
        .padding(.bottom, 80)
        .opacity(maxDrag > 0 ? 1.0 - (dragOffset / maxDrag) : 1.0)
    }
    
    // MARK: - Pass Device Content
    
    private func passDeviceContent(geometry: GeometryProxy) -> some View {
        VStack(spacing: 20) {
            Text("Pass the device to the\nnext player")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
            
            Button(action: { continueToNext(geometry: geometry) }) {
                Text("CONTINUE")
            }
            .buttonStyle(GameButtonStyle())
            .frame(width: 200) // Constraint width specifically for this layout
            
            Image(systemName: "chevron.up")
                .font(.title)
                .foregroundColor(.white.opacity(0.6))
                .padding(.top, 10)
        }
        .padding(.top, 20)
        .padding(.bottom, 80)
    }
    
    // MARK: - Continue to Next
    
    private func continueToNext(geometry: GeometryProxy) {
        HapticManager.shared.playTap()
        
        if gameSession.isLastPlayer {
            showGameplay = true
        } else {
            let screenWidth = geometry.size.width
            
            // Start transition
            isTransitioning = true
            nextCardOffset = screenWidth // Start next card off-screen right
            
            // Animate both cards
            withAnimation(.easeInOut(duration: 0.35)) {
                currentCardOffset = -screenWidth // Current slides left
                nextCardOffset = 0 // Next slides in
            }
            
            // After animation, update state
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                gameSession.moveToNextPlayer()
                hasRevealed = false
                showPassDevice = false
                isTransitioning = false
                currentCardOffset = 0
                nextCardOffset = 0
                dragOffset = 0
            }
        }
    }
}

#Preview {
    let session = GameSession()
    let store = PlayerStore()
    
    store.addPlayer(name: "Haris", image: nil)
    store.addPlayer(name: "Bob", image: nil)
    
    session.setupGame(selectedPlayers: store.players, roleCounts: [.mafia: 1, .crewmate: 1])
    
    return NavigationStack {
        RoleRevealView(gameSession: session)
            .environment(store)
    }
}
