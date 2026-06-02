import Foundation
import SwiftUI
import UIKit

@Observable
class PlayerStore {
    var players: [Player] = []
    
    private let playersFileName = "players.json"
    
    init() {
        loadPlayers()
    }
    
    // MARK: - File Paths
    
    private var documentsDirectory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    private var playersFileURL: URL {
        documentsDirectory.appendingPathComponent(playersFileName)
    }
    
    private func imageURL(for fileName: String) -> URL {
        documentsDirectory.appendingPathComponent(fileName)
    }
    
    // MARK: - Player CRUD
    
    func addPlayer(name: String, image: UIImage?) {
        var imageFileName: String? = nil
        
        if let image = image {
            imageFileName = "\(UUID().uuidString).jpg"
            saveImage(image, fileName: imageFileName!)
        }
        
        let player = Player(name: name, imageFileName: imageFileName)
        players.append(player)
        savePlayers()
    }
    
    func deletePlayer(_ player: Player) {
        // Delete image if exists
        if let imageFileName = player.imageFileName {
            let url = imageURL(for: imageFileName)
            try? FileManager.default.removeItem(at: url)
        }
        
        players.removeAll { $0.id == player.id }
        savePlayers()
    }
    
    func updatePlayer(_ player: Player) {
        if let index = players.firstIndex(where: { $0.id == player.id }) {
            players[index] = player
            savePlayers()
        }
    }
    
    // MARK: - Image Handling
    
    func loadImage(for player: Player) -> UIImage? {
        guard let fileName = player.imageFileName else { return nil }
        let url = imageURL(for: fileName)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
    
    private func saveImage(_ image: UIImage, fileName: String) {
        guard let data = image.jpegData(compressionQuality: 0.8) else { return }
        let url = imageURL(for: fileName)
        try? data.write(to: url)
    }
    
    // MARK: - Persistence
    
    // MARK: - Persistence
    
    private func savePlayers() {
        do {
            let data = try JSONEncoder().encode(players)
            CloudSaveManager.shared.saveFile(name: playersFileName, data: data)
            // print("Players saved: \(players.count)")
        } catch {
            // print("Failed to save players: \(error)")
        }
    }
    
    private func loadPlayers() {
        if let data = CloudSaveManager.shared.loadFile(name: playersFileName) {
            do {
                players = try JSONDecoder().decode([Player].self, from: data)
                // print("Players loaded: \(players.count)")
            } catch {
                // print("Failed to decode players: \(error)")
                players = []
            }
        } else {
            players = []
        }
    }
}
