import SwiftUI

/// Word/Hint reveal screen for the Words Imposter game.
/// Works just like RoleRevealView — each player swipes up to see their word
/// (or hint if they are the imposter).
struct WordRevealView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss

    let session: WordsGameSession

    @State private var dragOffset: CGFloat = 0
    @State private var hasRevealed: Bool = false
    @State private var showPassDevice: Bool = false
    @State private var showVoting: Bool = false

    @State private var isTransitioning: Bool = false
    @State private var currentCardOffset: CGFloat = 0
    @State private var nextCardOffset: CGFloat = 0

    @State private var lastHapticDragPosition: CGFloat = 0
    @State private var lastDragDirection: Int = 0

    private let revealThreshold: CGFloat = 80
    private let hapticStepSize: CGFloat = 20

    var body: some View {
        GeometryReader { geometry in
            let maxDragDistance = geometry.size.height * 0.35

            ZStack {
                Color.black.ignoresSafeArea()

                if !isTransitioning {
                    playerRevealCard(
                        playerIndex: session.currentPlayerIndex,
                        geometry: geometry,
                        maxDrag: maxDragDistance,
                        isInteractive: true
                    )
                    .offset(x: currentCardOffset)
                } else {
                    playerRevealCard(
                        playerIndex: session.currentPlayerIndex,
                        geometry: geometry,
                        maxDrag: maxDragDistance,
                        isInteractive: false
                    )
                    .offset(x: currentCardOffset)

                    if session.currentPlayerIndex + 1 < session.players.count {
                        incomingCard(playerIndex: session.currentPlayerIndex + 1, geometry: geometry)
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
        .navigationDestination(isPresented: $showVoting) {
            WordsVotingView(session: session)
        }
    }

    // MARK: - Cards

    @ViewBuilder
    private func playerRevealCard(playerIndex: Int, geometry: GeometryProxy, maxDrag: CGFloat, isInteractive: Bool) -> some View {
        let player = session.players[playerIndex]
        let isImposter = player.id == session.imposterID
        let reveal = isImposter
            ? (session.selectedWord.map { WordsGameSession.WordReveal.hint($0.hint) } ?? .word("???"))
            : (session.selectedWord.map { WordsGameSession.WordReveal.word($0.word) } ?? .word("???"))

        ZStack {
            // Bottom: reveal layer
            revealLayer(reveal: reveal, isImposter: isImposter, geometry: geometry)

            // Top: player card
            playerCardContent(player: player, playerIndex: playerIndex, geometry: geometry, maxDrag: maxDrag)
                .offset(y: isInteractive ? -dragOffset : 0)
                .gesture(
                    isInteractive && !showPassDevice ? makeDragGesture(maxDrag: maxDrag) : nil
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: currentCardOffset != 0 ? 30 : 0))
    }

    @ViewBuilder
    private func incomingCard(playerIndex: Int, geometry: GeometryProxy) -> some View {
        let player = session.players[playerIndex]
        ZStack {
            Color.black
            playerCardContent(player: player, playerIndex: playerIndex, geometry: geometry, maxDrag: 0)
        }
        .clipShape(RoundedRectangle(cornerRadius: 30))
    }

    // MARK: - Reveal Layer (white text always)

    @ViewBuilder
    private func revealLayer(reveal: WordsGameSession.WordReveal, isImposter: Bool, geometry: GeometryProxy) -> some View {
        ZStack {
            // Background gradient based on imposter status
            LinearGradient(
                colors: isImposter
                    ? [Color(red: 0.15, green: 0.02, blue: 0.02), Color(red: 0.05, green: 0.0, blue: 0.0)]
                    : [Color(red: 0.02, green: 0.08, blue: 0.15), Color(red: 0.0, green: 0.03, blue: 0.08)],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack {
                Spacer()
                VStack(spacing: 20) {
                    switch reveal {
                    case .word(let w):
                        VStack(spacing: 12) {
                            Label("Your Word", systemImage: "text.bubble.fill")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                                .tracking(2)
                                .textCase(.uppercase)

                            Text(w.uppercased())
                                .font(.system(size: 42, weight: .black))
                                .foregroundColor(.white)       // ← always white
                                .tracking(4)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        }

                    case .hint(let h):
                        VStack(spacing: 12) {
                            Label("You Are The Imposter", systemImage: "theatermasks.fill")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                                .tracking(2)
                                .textCase(.uppercase)

                            Text("Your Hint:")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.6))

                            Text(h)
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.white)       // ← always white
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        }
                    }
                }
                .padding(.bottom, geometry.size.height * 0.15)
            }
        }
        .frame(width: geometry.size.width, height: geometry.size.height)
    }

    // MARK: - Player Card Content

    @ViewBuilder
    private func playerCardContent(player: Player, playerIndex: Int, geometry: GeometryProxy, maxDrag: CGFloat) -> some View {
        ZStack {
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

            // Progress + name + actions
            VStack {
                HStack(spacing: 4) {
                    ForEach(0..<session.players.count, id: \.self) { index in
                        Capsule()
                            .fill(index <= playerIndex ? Color.white : Color.white.opacity(0.3))
                            .frame(height: 4)
                    }
                }
                .padding(.horizontal, 60)
                .padding(.top, 70)

                Spacer()

                Text(player.name)
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.5), radius: 10)

                if showPassDevice && playerIndex == session.currentPlayerIndex {
                    passDeviceContent(geometry: geometry)
                } else if !showPassDevice {
                    swipePromptContent(maxDrag: maxDrag)
                } else {
                    Spacer().frame(height: 150)
                }
            }
        }
        .frame(width: geometry.size.width, height: geometry.size.height)
        .clipShape(RoundedRectangle(cornerRadius: dragOffset > 0 ? 30 : 0))
    }

    // MARK: - Gestures

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

    // MARK: - UI Chips

    private func swipePromptContent(maxDrag: CGFloat) -> some View {
        VStack(spacing: 16) {
            Text("Swipe up to see your word")
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
            .frame(width: 200)
        }
        .padding(.top, 20)
        .padding(.bottom, 80)
    }

    private func continueToNext(geometry: GeometryProxy) {
        HapticManager.shared.playTap()

        if session.isLastPlayer {
            showVoting = true
        } else {
            let screenWidth = geometry.size.width
            isTransitioning = true
            nextCardOffset = screenWidth

            withAnimation(.easeInOut(duration: 0.35)) {
                currentCardOffset = -screenWidth
                nextCardOffset = 0
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                session.moveToNextPlayer()
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
