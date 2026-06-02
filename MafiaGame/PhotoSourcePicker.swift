import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

enum PhotoSource: Identifiable {
    case gallery
    case camera
    case files
    
    var id: String {
        switch self {
        case .gallery: return "gallery"
        case .camera: return "camera"
        case .files: return "files"
        }
    }
    
    var title: String {
        switch self {
        case .gallery: return "Photo Library"
        case .camera: return "Take Photo"
        case .files: return "Choose from Files"
        }
    }
    
    var icon: String {
        switch self {
        case .gallery: return "photo.on.rectangle"
        case .camera: return "camera.fill"
        case .files: return "folder.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .gallery: return .blue
        case .camera: return .green
        case .files: return .orange
        }
    }
}

struct PhotoSourcePicker: View {
    @Environment(\.dismiss) private var dismiss
    
    let onSourceSelected: (PhotoSource) -> Void
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 12) {
                    // Drag indicator
                    Capsule()
                        .fill(Color.gray.opacity(0.5))
                        .frame(width: 40, height: 5)
                        .padding(.top, 16)
                    
                    Text("Add Photo")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 12)
                    
                    Text("Choose how to add your photo")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .padding(.bottom, 8)
                    
                    VStack(spacing: 12) {
                        ForEach([PhotoSource.gallery, .camera, .files]) { source in
                            Button {
                                HapticManager.shared.playTap()
                                dismiss()
                                onSourceSelected(source)
                            } label: {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(source.color.opacity(0.2))
                                            .frame(width: 50, height: 50)
                                        
                                        Image(systemName: source.icon)
                                            .font(.title2)
                                            .foregroundColor(source.color)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(source.title)
                                            .font(.headline)
                                            .foregroundColor(.white)
                                        
                                        Text(sourceDescription(source))
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.gray)
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color.gray.opacity(0.15))
                                )
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer(minLength: 20)
                }
            }
        }
    }
    
    private func sourceDescription(_ source: PhotoSource) -> String {
        switch source {
        case .gallery: return "Choose from your photos"
        case .camera: return "Take a new photo"
        case .files: return "Select from Files app"
        }
    }
}

// MARK: - Document Picker for Files

struct DocumentImagePicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onImagePicked: (UIImage) -> Void
    
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.image])
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let parent: DocumentImagePicker
        
        init(_ parent: DocumentImagePicker) {
            self.parent = parent
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            
            // Start accessing security-scoped resource
            guard url.startAccessingSecurityScopedResource() else { return }
            defer { url.stopAccessingSecurityScopedResource() }
            
            if let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {
                parent.onImagePicked(image)
            }
        }
        
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            // Picker was cancelled
        }
    }
}

// MARK: - Camera Image Picker

struct CameraImagePicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onImagePicked: (UIImage) -> Void
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraImagePicker
        
        init(_ parent: CameraImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.onImagePicked(image)
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

#Preview {
    PhotoSourcePicker { source in
        // Selected source
    }
}
