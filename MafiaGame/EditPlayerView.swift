import SwiftUI
import PhotosUI

struct EditPlayerView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss
    
    let player: Player
    
    @State private var playerName: String = ""
    @State private var selectedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var showDeleteConfirm = false
    @State private var showPhotoSourcePicker = false
    @State private var showCamera = false
    @State private var showGallery = false
    @State private var showFiles = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                // Photo picker - tap to show options
                Button {
                    showPhotoSourcePicker = true
                } label: {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 120, height: 120)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color(red: 0.8, green: 0.2, blue: 0.1), lineWidth: 3)
                            )
                    } else {
                        Circle()
                            .fill(Color(red: 0.8, green: 0.2, blue: 0.1).opacity(0.3))
                            .frame(width: 120, height: 120)
                            .overlay(
                                Text(String(playerName.prefix(1)).uppercased())
                                    .font(.system(size: 50, weight: .bold))
                                    .foregroundColor(Color(red: 0.8, green: 0.2, blue: 0.1))
                            )
                            .overlay(
                                Circle()
                                    .stroke(Color(red: 0.8, green: 0.2, blue: 0.1), lineWidth: 3)
                            )
                    }
                }
                
                // Name input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Player Name")
                        .font(.caption)
                        .foregroundColor(.gray)
                    
                    TextField("Enter name", text: $playerName)
                        .textFieldStyle(.plain)
                        .font(.title3)
                        .foregroundColor(.white)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.2))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(red: 0.8, green: 0.2, blue: 0.1).opacity(0.5), lineWidth: 1)
                        )
                }
                .padding(.horizontal)
                
                // Stats (read-only)
                HStack(spacing: 30) {
                    StatBox(title: "Games", value: "\(player.gamesPlayed)")
                    StatBox(title: "Wins", value: "\(player.gamesWon)")
                    StatBox(title: "Win Rate", value: String(format: "%.0f%%", player.winRate))
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Buttons
                VStack(spacing: 12) {
                    // Save button
                    Button(action: savePlayer) {
                        Text("Save Changes")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(playerName.isEmpty ? Color.gray : Color(red: 1.0, green: 0.5, blue: 0.0))
                            )
                    }
                    .disabled(playerName.isEmpty)
                    
                    // Delete button
                    Button(action: { showDeleteConfirm = true }) {
                        Text("Delete Player")
                            .font(.headline)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.red, lineWidth: 1)
                            )
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 30)
            }
                .padding(.top, 40)
            }
            .scrollDismissesKeyboard(.immediately)
            .onTapGesture {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
            .navigationTitle("Edit Player")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .onAppear {
                playerName = player.name
                selectedImage = playerStore.loadImage(for: player)
            }
            .alert("Delete Player?", isPresented: $showDeleteConfirm) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    deletePlayer()
                }
            } message: {
                Text("This will permanently delete \(player.name) and all their stats.")
            }
            .sheet(isPresented: $showPhotoSourcePicker) {
                PhotoSourcePicker { source in
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        switch source {
                        case .gallery:
                            showGallery = true
                        case .camera:
                            showCamera = true
                        case .files:
                            showFiles = true
                        }
                    }
                }
                .presentationDetents([.height(350)])
            }
            .photosPicker(isPresented: $showGallery, selection: $selectedItem, matching: .images)
            .onChange(of: selectedItem) { oldValue, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        selectedImage = image
                        HapticManager.shared.playTap()
                    }
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraImagePicker { image in
                    selectedImage = image
                    HapticManager.shared.playTap()
                }
            }
            .sheet(isPresented: $showFiles) {
                DocumentImagePicker { image in
                    selectedImage = image
                    HapticManager.shared.playTap()
                }
            }
        }
    
    private func savePlayer() {
        var updatedPlayer = player
        updatedPlayer.name = playerName
        
        // If image changed, save new image
        if let newImage = selectedImage {
            // Delete old image if exists
            if let oldFileName = player.imageFileName {
                let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                let oldURL = documentsDirectory.appendingPathComponent(oldFileName)
                try? FileManager.default.removeItem(at: oldURL)
            }
            
            // Save new image
            let newFileName = "\(UUID().uuidString).jpg"
            let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let newURL = documentsDirectory.appendingPathComponent(newFileName)
            if let data = newImage.jpegData(compressionQuality: 0.8) {
                try? data.write(to: newURL)
                updatedPlayer.imageFileName = newFileName
            }
        }
        
        playerStore.updatePlayer(updatedPlayer)
        HapticManager.shared.playSuccess()
        dismiss()
    }
    
    private func deletePlayer() {
        playerStore.deletePlayer(player)
        HapticManager.shared.playSuccess()
        dismiss()
    }
}

// Helper changes below this block


struct StatBox: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.1))
        )
    }
}

#Preview {
    NavigationStack {
        EditPlayerView(player: Player(name: "Test Player"))
            .environment(PlayerStore())
    }
}

