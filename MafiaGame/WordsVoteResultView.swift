import SwiftUI

// MARK: - WordsVoteResultView

struct WordsVoteResultView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(WordStore.self) private var wordStore
    @Environment(GameHistoryStore.self) private var historyStore
    @Environment(GlobalSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss

    let session: WordsGameSession
    let votedPlayer: Player

    @State private var navigateToImposterReveal = false
    @State private var showPhoto = false
    @State private var photoScale: CGFloat = 1.08
    @State private var nameVisible = false
    @State private var buttonsVisible = false
    @State private var phraseIndex = 0

    var wasImposter: Bool { votedPlayer.id == session.imposterID }

    private let correctPhrases = [
        "The imposter was...",
        "The imposter was...",
        "The imposter was..."
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if wasImposter {
                if !showPhoto {
                    typewriterPhase(phrases: correctPhrases)
                } else {
                    correctRevealPhase
                }
            } else {
                wrongVoteScreen
                    .navigationDestination(isPresented: $navigateToImposterReveal) {
                        if let imposter = session.imposter {
                            WordsImposterRevealView(session: session, imposter: imposter)
                                .environment(playerStore)
                                .environment(wordStore)
                                .environment(historyStore)
                                .environment(settings)
                        }
                    }
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear {
            updatePlayerStats()
            if wasImposter {
                startCorrectSequence()
            } else {
                startWrongSequence()
            }
        }
    }

    // MARK: - Shared Typewriter Phase

    private func typewriterPhase(phrases: [String]) -> some View {
        VStack {
            Spacer()
            Text(phrases[min(phraseIndex, phrases.count - 1)])
                .font(.system(size: 34, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .id(phraseIndex)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .scale(scale: 0.85)),
                    removal: .opacity
                ))
                .animation(.easeInOut(duration: 0.35), value: phraseIndex)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    // MARK: - Correct Vote: Full-Screen Reveal

    private var correctRevealPhase: some View {
        ZStack(alignment: .bottom) {
            // Full-screen photo
            if let image = playerStore.loadImage(for: votedPlayer) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .scaleEffect(photoScale)
                    .animation(.easeOut(duration: 1.0), value: photoScale)
            } else {
                Color(red: 0.0, green: 0.1, blue: 0.0).ignoresSafeArea()
                Text(String(votedPlayer.name.prefix(1)).uppercased())
                    .font(.system(size: 160, weight: .black))
                    .foregroundColor(.white.opacity(0.2))
            }

            // Top gradient only — for name readability
            LinearGradient(
                stops: [
                    .init(color: Color.black.opacity(0.80), location: 0.0),
                    .init(color: Color.clear, location: 0.45)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Green atmosphere
            Color.green.opacity(0.08).ignoresSafeArea()

            // Top: label + name
            VStack(spacing: 10) {
                Text("✅  IMPOSTER CAUGHT")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(.green)
                    .tracking(4)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -10)
                    .animation(.easeOut(duration: 0.5).delay(0.1), value: nameVisible)

                Text(votedPlayer.name)
                    .font(.system(size: 52, weight: .black))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.9), radius: 8)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -20)
                    .animation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2), value: nameVisible)
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .padding(.top, 64)
            .padding(.horizontal, 30)

            // Bottom panel: solid dark backing + word card + buttons
            bottomPanel(accentColor: .green, word: session.selectedWord)
                .opacity(buttonsVisible ? 1 : 0)
                .offset(y: buttonsVisible ? 0 : 24)
                .animation(.spring(response: 0.6, dampingFraction: 0.75).delay(0.15), value: buttonsVisible)
        }
    }

    // MARK: - Wrong Vote: Full-Screen Innocent Reveal

    private var wrongVoteScreen: some View {
        ZStack(alignment: .bottom) {
            if let image = playerStore.loadImage(for: votedPlayer) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .scaleEffect(photoScale)
                    .animation(.easeOut(duration: 0.8).delay(0.1), value: photoScale)
            } else {
                Color(red: 0.1, green: 0.0, blue: 0.0).ignoresSafeArea()
                Text(String(votedPlayer.name.prefix(1)).uppercased())
                    .font(.system(size: 130, weight: .black))
                    .foregroundColor(.white.opacity(0.2))
            }

            // Top gradient only
            LinearGradient(
                stops: [
                    .init(color: Color.black.opacity(0.80), location: 0.0),
                    .init(color: Color.clear, location: 0.45)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            Color.red.opacity(0.12).ignoresSafeArea()

            // Top: label + name
            VStack(spacing: 10) {
                Text("❌  NOT THE IMPOSTER")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(.red)
                    .tracking(4)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -10)
                    .animation(.easeOut(duration: 0.5).delay(0.1), value: nameVisible)

                Text(votedPlayer.name)
                    .font(.system(size: 52, weight: .black))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.9), radius: 8)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -20)
                    .animation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2), value: nameVisible)
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .padding(.top, 64)
            .padding(.horizontal, 30)

            // Bottom panel: solid dark backing + reveal button
            VStack(spacing: 0) {
                // Fade from clear to black
                LinearGradient(
                    colors: [Color.clear, Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 80)

                // Solid black base with button
                Color.black
                    .overlay(
                        Button {
                            HapticManager.shared.playSuccess()
                            navigateToImposterReveal = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "theatermasks.fill")
                                Text("Reveal The Real Imposter")
                                    .fontWeight(.bold)
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.red)
                                    .shadow(color: .red.opacity(0.4), radius: 10, y: 3)
                            )
                            .padding(.horizontal, 28)
                        }
                        , alignment: .top
                    )
                    .frame(height: 100)
            }
            .opacity(buttonsVisible ? 1 : 0)
            .offset(y: buttonsVisible ? 0 : 20)
            .animation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.1), value: buttonsVisible)
        }
        .ignoresSafeArea(edges: .bottom)
    }

    // MARK: - Shared Bottom Panel

    private func bottomPanel(accentColor: Color, word: WordEntry?) -> some View {
        VStack(spacing: 0) {
            // Smooth fade from photo into solid black
            LinearGradient(
                colors: [Color.clear, Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 100)

            // Solid black backing — everything sits cleanly on this
            Color.black
                .overlay(
                    VStack(spacing: 14) {
                        // Word card
                        if let word = word {
                            VStack(spacing: 5) {
                                Text("The word was:")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                                Text(word.word.uppercased())
                                    .font(.system(size: 24, weight: .black))
                                    .foregroundColor(.white)
                                Text("Hint: \"\(word.hint)\"")
                                    .font(.caption)
                                    .foregroundColor(.gray.opacity(0.75))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.08))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                            .padding(.horizontal, 28)
                        }

                        // Buttons
                        HStack(spacing: 12) {
                            Button { goHome() } label: {
                                Label("Home", systemImage: "house.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.white.opacity(0.15))
                                    )
                            }

                            Button { playAgain() } label: {
                                Label("Play Again", systemImage: "arrow.counterclockwise")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.black)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.orange)
                                            .shadow(color: .orange.opacity(0.35), radius: 8, y: 3)
                                    )
                            }
                        }
                        .padding(.horizontal, 28)
                    }
                    .padding(.top, 16)
                    , alignment: .top
                )
                .frame(height: 190)
        }
        .ignoresSafeArea(edges: .bottom)
    }

    // MARK: - Sequences

    private func startCorrectSequence() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.95) {
            withAnimation { phraseIndex = 1 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.85) {
            withAnimation { phraseIndex = 2 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.7) {
            withAnimation(.easeIn(duration: 0.3)) { showPhoto = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { photoScale = 1.0 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4)  { nameVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) { buttonsVisible = true }
        }
    }

    private func startWrongSequence() {
        photoScale = 1.0
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3)  { nameVisible = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) { buttonsVisible = true }
    }

    // MARK: - Stats & Navigation

    private func updatePlayerStats() {
        let winnerString = wasImposter ? "Words Crew" : "Words Imposter"
        historyStore.addGame(winner: winnerString, playerCount: session.players.count, duration: 300)
        for p in session.players {
            var updatedPlayer = p
            updatedPlayer.gamesPlayed += 1
            if wasImposter {
                if p.id != session.imposterID { updatedPlayer.gamesWon += 1 }
            } else {
                if p.id == session.imposterID { updatedPlayer.gamesWon += 1 }
            }
            playerStore.updatePlayer(updatedPlayer)
        }
    }

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

    private func playAgain() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController = UIHostingController(
                rootView: NavigationStack { WordsImposterSetupView() }
                    .environment(playerStore)
                    .environment(historyStore)
                    .environment(settings)
                    .environment(wordStore)
                    .preferredColorScheme(.dark)
            )
        }
    }
}

// MARK: - WordsImposterRevealView

struct WordsImposterRevealView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(WordStore.self) private var wordStore
    @Environment(GameHistoryStore.self) private var historyStore
    @Environment(GlobalSettings.self) private var settings

    let session: WordsGameSession
    let imposter: Player

    @State private var phraseIndex = 0
    @State private var showPhoto = false
    @State private var photoScale: CGFloat = 1.08
    @State private var nameVisible = false
    @State private var buttonsVisible = false

    private let phrases = [
        "The imposter was...",
        "The imposter was...",
        "The imposter was..."
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if !showPhoto {
                typewriterPhase
            } else {
                imposterRevealPhase
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear { startSequence() }
    }

    private var typewriterPhase: some View {
        VStack {
            Spacer()
            Text(phrases[min(phraseIndex, phrases.count - 1)])
                .font(.system(size: 34, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .id(phraseIndex)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .scale(scale: 0.85)),
                    removal: .opacity
                ))
                .animation(.easeInOut(duration: 0.35), value: phraseIndex)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var imposterRevealPhase: some View {
        ZStack(alignment: .bottom) {
            // Full-screen photo
            if let image = playerStore.loadImage(for: imposter) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .scaleEffect(photoScale)
                    .animation(.easeOut(duration: 1.0), value: photoScale)
            } else {
                Color(red: 0.12, green: 0.0, blue: 0.0).ignoresSafeArea()
                Text(String(imposter.name.prefix(1)).uppercased())
                    .font(.system(size: 160, weight: .black))
                    .foregroundColor(.white.opacity(0.2))
            }

            // Top gradient only
            LinearGradient(
                stops: [
                    .init(color: Color.black.opacity(0.80), location: 0.0),
                    .init(color: Color.clear, location: 0.45)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            Color.red.opacity(0.10).ignoresSafeArea()

            // Top: label + name
            VStack(spacing: 10) {
                Text("🎭  THE IMPOSTER")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(.red)
                    .tracking(4)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -10)
                    .animation(.easeOut(duration: 0.5).delay(0.1), value: nameVisible)

                Text(imposter.name)
                    .font(.system(size: 52, weight: .black))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.9), radius: 8)
                    .opacity(nameVisible ? 1 : 0)
                    .offset(y: nameVisible ? 0 : -20)
                    .animation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2), value: nameVisible)
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .padding(.top, 64)
            .padding(.horizontal, 30)

            // Bottom panel
            bottomPanel(word: session.selectedWord)
                .opacity(buttonsVisible ? 1 : 0)
                .offset(y: buttonsVisible ? 0 : 24)
                .animation(.spring(response: 0.6, dampingFraction: 0.75).delay(0.15), value: buttonsVisible)
        }
    }

    // MARK: - Bottom Panel

    private func bottomPanel(word: WordEntry?) -> some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [Color.clear, Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 100)

            Color.black
                .overlay(
                    VStack(spacing: 14) {
                        if let word = word {
                            VStack(spacing: 5) {
                                Text("The word was:")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                                Text(word.word.uppercased())
                                    .font(.system(size: 24, weight: .black))
                                    .foregroundColor(.white)
                                Text("Hint: \"\(word.hint)\"")
                                    .font(.caption)
                                    .foregroundColor(.gray.opacity(0.75))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.08))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                            .padding(.horizontal, 28)
                        }

                        HStack(spacing: 12) {
                            Button { goHome() } label: {
                                Label("Home", systemImage: "house.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.white.opacity(0.15))
                                    )
                            }

                            Button { playAgain() } label: {
                                Label("Play Again", systemImage: "arrow.counterclockwise")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.black)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.orange)
                                            .shadow(color: .orange.opacity(0.35), radius: 8, y: 3)
                                    )
                            }
                        }
                        .padding(.horizontal, 28)
                    }
                    .padding(.top, 16)
                    , alignment: .top
                )
                .frame(height: 190)
        }
        .ignoresSafeArea(edges: .bottom)
    }

    private func startSequence() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.95) {
            withAnimation { phraseIndex = 1 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.85) {
            withAnimation { phraseIndex = 2 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.7) {
            withAnimation(.easeIn(duration: 0.3)) { showPhoto = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { photoScale = 1.0 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4)  { nameVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) { buttonsVisible = true }
        }
    }

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

    private func playAgain() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController = UIHostingController(
                rootView: NavigationStack { WordsImposterSetupView() }
                    .environment(playerStore)
                    .environment(historyStore)
                    .environment(settings)
                    .environment(wordStore)
                    .preferredColorScheme(.dark)
            )
        }
    }
}

// MARK: - Preview

struct WordsVoteResultView_PreviewWrapper: View {
    @State private var session = WordsGameSession()
    @State private var store = PlayerStore()
    @State private var wordStore = WordStore()

    init() {
        store.addPlayer(name: "Daniyal", image: nil)
        store.addPlayer(name: "Hamza", image: nil)
        store.addPlayer(name: "Ali", image: nil)
        wordStore.addWord(word: "Manhattan", hint: "A famous cocktail and island in NYC", byPlayer: store.players[0].name)
        if let word = wordStore.wordEntries.first {
            session.setupGame(players: store.players, wordEntry: word)
        }
    }

    var body: some View {
        NavigationStack {
            WordsVoteResultView(session: session, votedPlayer: store.players[0])
                .environment(store)
                .environment(wordStore)
                .environment(GameHistoryStore())
                .environment(GlobalSettings())
        }
    }
}

#Preview {
    WordsVoteResultView_PreviewWrapper()
}