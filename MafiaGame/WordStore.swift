import Foundation
import SwiftUI

// MARK: - Word Entry

struct WordEntry: Identifiable, Codable {
    var id: UUID = UUID()
    var word: String
    var hint: String
    var addedBy: String // Player name who added this word
}

// MARK: - Word Store

@Observable
class WordStore {
    var wordEntries: [WordEntry] = []

    private let fileName = "word_entries.json"

    init() {
        load()
    }

    // MARK: - CRUD

    func addWord(word: String, hint: String, byPlayer playerName: String) {
        let entry = WordEntry(word: word, hint: hint, addedBy: playerName)
        wordEntries.append(entry)
        save()
    }

    func deleteWord(_ entry: WordEntry) {
        wordEntries.removeAll { $0.id == entry.id }
        save()
    }

    func updateWord(_ entry: WordEntry) {
        if let idx = wordEntries.firstIndex(where: { $0.id == entry.id }) {
            wordEntries[idx] = entry
            save()
        }
    }

    /// Words that are "safe" for the given imposter player (not added by them)
    func safeWords(for imposterName: String) -> [WordEntry] {
        wordEntries.filter { $0.addedBy != imposterName }
    }

    /// All words
    var allWords: [WordEntry] { wordEntries }

    // MARK: - Pick logic
    /// Picks a word + hint for a game, favouring words NOT added by the imposter.
    /// ~80% chance from non-imposter pool, ~20% chance the imposter gets their own word.
    func pickWord(imposterName: String) -> WordEntry? {
        guard !wordEntries.isEmpty else { return nil }

        let safe = safeWords(for: imposterName)
        let own = wordEntries.filter { $0.addedBy == imposterName }

        // If no safe words, fall back to any word
        guard !safe.isEmpty else { return wordEntries.randomElement() }

        // ~20% chance the imposter gets a hint for their own word
        if Bool.random(withProbability: 0.20) && !own.isEmpty {
            return own.randomElement()
        }
        return safe.randomElement()
    }

    // MARK: - Persistence

    private func save() {
        do {
            let data = try JSONEncoder().encode(wordEntries)
            CloudSaveManager.shared.saveFile(name: fileName, data: data)
        } catch {}
    }

    private func load() {
        if let data = CloudSaveManager.shared.loadFile(name: fileName) {
            wordEntries = (try? JSONDecoder().decode([WordEntry].self, from: data)) ?? []
        }
    }
}

// MARK: - Bool helper
private extension Bool {
    static func random(withProbability probability: Double) -> Bool {
        Double.random(in: 0...1) < probability
    }
}
