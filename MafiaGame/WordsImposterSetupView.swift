import SwiftUI

/// Setup screen for the Words Imposter game.
/// Players select who is playing, then the game auto-picks a word+hint.
struct WordsImposterSetupView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(WordStore.self) private var wordStore

    @State private var selectedPlayerIDs: Set<UUID> = []
    @State private var session: WordsGameSession? = nil
    @State private var showReveal = false
    @State private var showWordsManager = false
    @State private var errorMessage: String? = nil

    var selectedPlayers: [Player] {
        playerStore.players.filter { selectedPlayerIDs.contains($0.id) }
    }

    var isValid: Bool {
        selectedPlayers.count >= 3 && !wordStore.wordEntries.isEmpty
    }

    var validationMessage: String {
        if wordStore.wordEntries.isEmpty {
            return "Add words first in Words Library"
        }
        if selectedPlayers.count < 3 {
            return "Need at least 3 players"
        }
        return "\(selectedPlayers.count) players · ready!"
    }

    let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Words library notice
                    wordsLibraryBanner

                    Divider()
                        .background(Color.gray.opacity(0.3))
                        .padding(.horizontal)

                    // Player selection
                    playerSelectionSection

                    Spacer(minLength: 100)
                }
                .padding(.top)
            }

            // Bottom bar
            VStack {
                Spacer()
                bottomBar
            }
        }
        .navigationTitle("Words Imposter")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .sheet(isPresented: $showWordsManager) {
            WordsManagementView()
                .environment(wordStore)
                .environment(playerStore)
        }
        .navigationDestination(isPresented: $showReveal) {
            if let s = session {
                WordRevealView(session: s)
            }
        }
        .alert("No Words Available", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: - Words Library Banner

    private var wordsLibraryBanner: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Words Library", systemImage: "text.book.closed.fill")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Button {
                    showWordsManager = true
                } label: {
                    Text(wordStore.wordEntries.isEmpty ? "Add Words" : "Manage")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(Color.orange.opacity(0.15)))
                }
            }
            .padding(.horizontal)

            if wordStore.wordEntries.isEmpty {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.yellow)
                    Text("You need to add words before starting. Players each add secret words with a hint for the imposter.")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.yellow.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.yellow.opacity(0.2), lineWidth: 1)
                        )
                )
                .padding(.horizontal)
            } else {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("\(wordStore.wordEntries.count) words available in the library. A random word will be selected for the game.")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.green.opacity(0.07))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.green.opacity(0.2), lineWidth: 1)
                        )
                )
                .padding(.horizontal)
            }

            // How to play blurb
            VStack(alignment: .leading, spacing: 6) {
                Text("How it works")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white.opacity(0.7))

                Text("• Each player passes the device and swipes up to see their word\n• One player (the Imposter) only sees a hint\n• After discussion, vote out the Imposter!")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.04))
            )
            .padding(.horizontal)
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

                Text("\(selectedPlayers.count) selected")
                    .font(.caption)
                    .foregroundColor(.gray)

                Button(action: {
                    if selectedPlayerIDs.count == playerStore.players.count {
                        selectedPlayerIDs.removeAll()
                    } else {
                        selectedPlayerIDs = Set(playerStore.players.map { $0.id })
                    }
                    HapticManager.shared.playTap()
                }) {
                    Text(selectedPlayerIDs.count == playerStore.players.count ? "Deselect All" : "Select All")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            .padding(.horizontal)

            if playerStore.players.isEmpty {
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
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(playerStore.players) { player in
                        PlayerSelectCard(
                            player: player,
                            isSelected: selectedPlayerIDs.contains(player.id),
                            playerStore: playerStore
                        ) {
                            if selectedPlayerIDs.contains(player.id) {
                                selectedPlayerIDs.remove(player.id)
                            } else {
                                selectedPlayerIDs.insert(player.id)
                            }
                            HapticManager.shared.playTap()
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(.ultraThinMaterial)
                .frame(height: 1)

            HStack {
                HStack(spacing: 8) {
                    Image(systemName: isValid ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                        .foregroundColor(isValid ? .green : .orange)
                    Text(validationMessage)
                        .font(.subheadline)
                        .foregroundColor(.white)
                }

                Spacer()

                Button(action: startGame) {
                    Text("START")
                }
                .buttonStyle(GameButtonStyle())
                .frame(width: 160)
                .opacity(isValid ? 1.0 : 0.5)
                .disabled(!isValid)
            }
            .padding()
            .background(Color.black.opacity(0.9))
        }
    }

    // MARK: - Start Game

    private func startGame() {
        HapticManager.shared.playSuccess()

        // Pick a word — we don't know the imposter yet (session picks them)
        // We'll pick a word generically first, then session assigns imposter
        // After session is created, we check if a better word exists for that imposter
        // For simplicity: pick word first, session picks imposter from players
        guard let wordEntry = wordStore.allWords.randomElement() else {
            errorMessage = "No words available. Please add words to the library first."
            return
        }

        let newSession = WordsGameSession()
        newSession.setupGame(players: selectedPlayers, wordEntry: wordEntry)

        // Re-pick word to be safe against imposter having added it
        if let imposterID = newSession.imposterID, let imposter = playerStore.players.first(where: { $0.id == imposterID }),
           let betterWord = wordStore.pickWord(imposterName: imposter.name) {
            newSession.selectedWord = betterWord
        }

        session = newSession
        showReveal = true
    }
}

#Preview {
    NavigationStack {
        WordsImposterSetupView()
            .environment(PlayerStore())
            .environment(WordStore())
    }
}
