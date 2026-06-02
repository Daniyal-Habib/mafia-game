import SwiftUI

@main
struct MafiaGameApp: App {
    @State private var playerStore = PlayerStore()
    @State private var globalSettings = GlobalSettings()
    @State private var historyStore = GameHistoryStore()
    @State private var wordStore = WordStore()
    
    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(playerStore)
                .environment(globalSettings)
                .environment(historyStore)
                .environment(wordStore)
                .preferredColorScheme(.dark)
        }
    }
}
