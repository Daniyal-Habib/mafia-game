import SwiftUI

struct HomeView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(WordStore.self) private var wordStore
    @State private var pulseAnimation = false
    @State private var showHowToPlay = false
    @State private var showSettings = false
    @State private var showHistory = false
    @State private var showWordsList = false
    
    @State private var hasSavedGame = false
    @State private var resumedSession: GameSession? = nil
    @State private var navigateToResume = false
    
    // Theme Colors
    let primaryColor = Color(red: 0.8, green: 0.2, blue: 0.1) // Dark Red
    let secondaryColor = Color(red: 1.0, green: 0.5, blue: 0.0) // Orange
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background Image
                if let bgImage = UIImage(named: "HomeBackground") {
                    GeometryReader { geo in
                        Image(uiImage: bgImage)
                            .resizable()
                            .scaledToFill()
                            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
                            .clipped()
                    }
                    .ignoresSafeArea()
                } else {
                    LinearGradient(
                        colors: [Color.black, Color(red: 0.15, green: 0.05, blue: 0.02)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()
                }
                
                VStack(spacing: 30) {

                    Spacer().frame(height: 220) // Keep buttons below the logo
                    
                    // Buttons
                    VStack(spacing: 16) {
                        if hasSavedGame {
                            Button {
                                resumeGame()
                            } label: {
                                Text("Resume Game".uppercased())
                            }
                            .buttonStyle(GameButtonStyle(color: .green))
                        }
                        
                        // ── Mafia Game ──
                        NavigationLink(destination: NewGameView()) {
                            Text("Mafia Game".uppercased())
                        }
                        .buttonStyle(GameButtonStyle())
                        
                        // ── Words Imposter Game ──
                        NavigationLink(destination: WordsImposterSetupView()) {
                            Text("Words Imposter".uppercased())
                        }
                        .buttonStyle(GameButtonStyle(color: Color(red: 0.1, green: 0.3, blue: 0.6)))
                        
                        // ── Players ──
                        NavigationLink(destination: PlayersView()) {
                            Text("Players".uppercased())
                        }
                        .buttonStyle(GameButtonStyle())
                        
                        // ── Words Library ──
                        Button {
                            showWordsList = true
                        } label: {
                            Text("Words Library".uppercased())
                        }
                        .buttonStyle(GameButtonStyle(color: Color(red: 0.2, green: 0.4, blue: 0.2)))
                        
                        // ── Game History ──
                        Button {
                            showHistory = true
                        } label: {
                            Text("Game History".uppercased())
                        }
                        .buttonStyle(GameButtonStyle())
                        
                        // ── Settings ──
                        Button {
                            showSettings = true
                        } label: {
                            Text("Settings".uppercased())
                        }
                        .buttonStyle(GameButtonStyle())
                    }
                    .padding(.horizontal, 40)
                    .frame(maxWidth: 400)
                    
                    Spacer()
                    
                    // Footer
                    Text("v3.0")
                        .font(.caption)
                        .foregroundColor(.gray.opacity(0.4))
                        .padding(.bottom, 20)
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $navigateToResume) {
                if let session = resumedSession {
                    GameplayView(gameSession: session)
                }
            }
            .sheet(isPresented: $showHowToPlay) {
                VStack {
                    Text("How to Play")
                        .font(.largeTitle)
                        .padding()
                    Text("Rules coming soon...")
                }
                .presentationDetents([.medium])
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showHistory) {
                HistoryView()
                    .environment(playerStore)
            }
            .sheet(isPresented: $showWordsList) {
                WordsManagementView()
                    .environment(wordStore)
                    .environment(playerStore)
            }
        }
    }
    
    private func resumeGame() {
        let session = GameSession()
        if GamePersistenceManager.shared.loadGame(into: session) {
            resumedSession = session
            navigateToResume = true
        }
    }
}


#Preview {
    HomeView()
        .environment(PlayerStore())
        .environment(WordStore())
}
