import SwiftUI
import PhotosUI

struct AddPlayerView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss
    
    @State private var playerName = ""
    @State private var selectedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var showPhotoSourcePicker = false
    @State private var showCamera = false
    @State private var showGallery = false
    @State private var showFiles = false
    
    var body: some View {
        NavigationStack {
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
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 120, height: 120)
                                .overlay(
                                    VStack(spacing: 8) {
                                        Image(systemName: "camera.fill")
                                            .font(.title)
                                        Text("Add Photo")
                                            .font(.caption)
                                    }
                                    .foregroundColor(.gray)
                                )
                                .overlay(
                                    Circle()
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 2)
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
                    
                    Spacer()
                    
                    // Save button
                    Button(action: savePlayer) {
                        Text("ADD PLAYER")
                    }
                    .buttonStyle(GameButtonStyle())
                    .opacity(playerName.isEmpty ? 0.5 : 1.0)
                    .disabled(playerName.isEmpty)
                    .padding(.horizontal)
                    .padding(.bottom, 30)
                }
                .padding(.top, 40)
            }
            .scrollDismissesKeyboard(.immediately)
            .onTapGesture {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
            .navigationTitle("Add Player")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.gray)
                }
            }
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
        guard !playerName.isEmpty else { return }
        
        playerStore.addPlayer(name: playerName, image: selectedImage)
        HapticManager.shared.playSuccess()
        dismiss()
    }
}

#Preview {
    AddPlayerView()
        .environment(PlayerStore())
}
