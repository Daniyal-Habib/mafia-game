import Foundation

class CloudSaveManager {
    static let shared = CloudSaveManager()
    
    private let fileManager = FileManager.default
    private let queue = DispatchQueue(label: "com.mafiagame.cloudsave", qos: .background)
    
    // Attempt to get the iCloud Documents URL
    private var iCloudDocumentsURL: URL? {
        // "iCloud.com.yourcompany.mafiagame" should match your iCloud container ID if specified, 
        // or just nil to get the default ubiquity container for the app.
        // Users must enable iCloud capability in Xcode.
        return fileManager.url(forUbiquityContainerIdentifier: nil)?.appendingPathComponent("Documents")
    }
    
    // Local Documents URL
    private var localDocumentsURL: URL {
        return fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    private init() {
        // Ensure iCloud Documents directory exists if available
        if let cloudURL = iCloudDocumentsURL {
            if !fileManager.fileExists(atPath: cloudURL.path) {
                try? fileManager.createDirectory(at: cloudURL, withIntermediateDirectories: true, attributes: nil)
            }
        }
    }
    
    // MARK: - Save File
    
    func saveFile(name: String, data: Data) {
        queue.async {
            // Always save locally first
            let localURL = self.localDocumentsURL.appendingPathComponent(name)
            try? data.write(to: localURL)
            
            // Try saving to iCloud
            if let cloudURL = self.iCloudDocumentsURL?.appendingPathComponent(name) {
                do {
                    try data.write(to: cloudURL)
                } catch {
                }
            }
        }
    }
    
    // MARK: - Load File
    
    func loadFile(name: String) -> Data? {
        // Prefer iCloud if available, fallback to local
        if let cloudURL = iCloudDocumentsURL?.appendingPathComponent(name),
           fileManager.fileExists(atPath: cloudURL.path) {
            // Check modification dates to pick newest? 
            // For simplicity, we assume iCloud is truth if valid.
            // But let's check basic availability.
             do {
                let data = try Data(contentsOf: cloudURL)
                // Also update local copy to stay in sync
                let localURL = self.localDocumentsURL.appendingPathComponent(name)
                try? data.write(to: localURL)
                return data
            } catch {
                // Return local on failure
            }
        }
        
        let localURL = localDocumentsURL.appendingPathComponent(name)
        return try? Data(contentsOf: localURL)
    }
    
    // MARK: - Sync Initial Check
    // Call this on app launch to potentially pull newer cloud files to local
    func syncOnLaunch() {
        // This is a simple implementation: we just ensure the load logic prefers cloud.
        // We could explicitly copy cloud -> local if cloud is newer.
        // For now, loadFile handles the precedence.
    }
}
