import SwiftUI

// MARK: - NoResignTextField
// UIViewRepresentable wrapper so textFieldShouldReturn can return false,
// preventing the keyboard from ever dismissing when moving between fields.

struct NoResignTextField: UIViewRepresentable {
    let placeholder: String
    @Binding var text: String
    var submitLabel: UIReturnKeyType = .next
    var onSubmit: (() -> Void)? = nil
    var fieldRef: ((UITextField) -> Void)? = nil

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, onSubmit: onSubmit)
    }

    func makeUIView(context: Context) -> UITextField {
        let tf = UITextField()
        tf.delegate = context.coordinator
        tf.returnKeyType = submitLabel
        tf.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [.foregroundColor: UIColor.systemGray]
        )
        tf.textColor = .white
        tf.font = UIFont.preferredFont(forTextStyle: .body)
        tf.backgroundColor = .clear
        tf.autocorrectionType = .no
        tf.autocapitalizationType = .sentences
        tf.addTarget(
            context.coordinator,
            action: #selector(Coordinator.textChanged(_:)),
            for: .editingChanged
        )
        fieldRef?(tf)
        return tf
    }

    func updateUIView(_ uiView: UITextField, context: Context) {
        if uiView.text != text {
            uiView.text = text
        }
        context.coordinator.onSubmit = onSubmit
    }

    class Coordinator: NSObject, UITextFieldDelegate {
        @Binding var text: String
        var onSubmit: (() -> Void)?

        init(text: Binding<String>, onSubmit: (() -> Void)?) {
            _text = text
            self.onSubmit = onSubmit
        }

        @objc func textChanged(_ tf: UITextField) {
            text = tf.text ?? ""
        }

        func textFieldShouldReturn(_ textField: UITextField) -> Bool {
            onSubmit?()
            return false // Keyboard stays up — never resigns
        }
    }
}

// MARK: - Styled wrapper so call sites stay clean

struct DarkNoResignTextField: View {
    let placeholder: String
    @Binding var text: String
    var submitLabel: UIReturnKeyType = .next
    var onSubmit: (() -> Void)? = nil
    var fieldRef: ((UITextField) -> Void)? = nil

    var body: some View {
        NoResignTextField(
            placeholder: placeholder,
            text: $text,
            submitLabel: submitLabel,
            onSubmit: onSubmit,
            fieldRef: fieldRef
        )
        .frame(height: 24)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.07))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
        )
    }
}

// MARK: - WordsManagementView

struct WordsManagementView: View {
    @Environment(WordStore.self) private var wordStore
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPlayer: Player? = nil
    @State private var showPickPlayer = false
    @State private var showAddWord = false
    @State private var wordToEdit: WordEntry? = nil

    private var wordsByPlayer: [(player: Player, words: [WordEntry])] {
        playerStore.players.compactMap { player in
            let entries = wordStore.wordEntries.filter { $0.addedBy == player.name }
            return entries.isEmpty ? nil : (player: player, words: entries)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                Group {
                    if wordStore.wordEntries.isEmpty {
                        emptyState
                    } else {
                        wordList
                    }
                }
            }
            .navigationTitle("Words Library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showPickPlayer = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundColor(.orange)
                    }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.orange)
                }
            }
            .sheet(isPresented: $showPickPlayer) {
                PlayerPickerSheet(playerStore: playerStore) { player in
                    selectedPlayer = player
                    showPickPlayer = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        showAddWord = true
                    }
                }
                .presentationDetents([.medium, .large])
            }
            .sheet(isPresented: $showAddWord) {
                if let player = selectedPlayer {
                    AddWordSheet(player: player, wordStore: wordStore)
                        .presentationDetents([.medium])
                }
            }
            .sheet(item: $wordToEdit) { entry in
                EditWordSheet(entry: entry, wordStore: wordStore, playerStore: playerStore)
                    .presentationDetents([.medium])
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "text.book.closed.fill")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.3))

            Text("No Words Yet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text("Players can each add secret words with hints.\nDuring the game, one player becomes the Imposter — they only see the hint!")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                showPickPlayer = true
            } label: {
                Label("Add First Word", systemImage: "plus")
                    .font(.headline)
                    .foregroundColor(.black)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 14).fill(Color.orange)
                    )
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Word List

    private var wordList: some View {
        ScrollView {
            VStack(spacing: 24) {
                ForEach(wordsByPlayer, id: \.player.id) { group in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 10) {
                            if let image = playerStore.loadImage(for: group.player) {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 32, height: 32)
                                    .clipShape(Circle())
                            } else {
                                Circle()
                                    .fill(Color.orange.opacity(0.3))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Text(String(group.player.name.prefix(1)).uppercased())
                                            .font(.caption)
                                            .fontWeight(.bold)
                                            .foregroundColor(.orange)
                                    )
                            }

                            Text(group.player.name)
                                .font(.headline)
                                .foregroundColor(.white)

                            Text("\(group.words.count) word\(group.words.count == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundColor(.gray)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Color.white.opacity(0.1)))

                            Spacer()

                            Button {
                                selectedPlayer = group.player
                                showAddWord = true
                            } label: {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(.orange)
                            }
                        }

                        ForEach(group.words) { entry in
                            WordEntryRow(entry: entry) {
                                wordToEdit = entry
                            } onDelete: {
                                wordStore.deleteWord(entry)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.top)
            .padding(.bottom, 30)
        }
    }
}

// MARK: - WordEntryRow

struct WordEntryRow: View {
    let entry: WordEntry
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showConfirmDelete = false

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: "text.quote")
                .foregroundColor(.orange.opacity(0.7))
                .frame(width: 24)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.word)
                    .font(.headline)
                    .foregroundColor(.white)
                Text("Hint: \(entry.hint)")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .lineLimit(2)
            }

            Spacer()

            HStack(spacing: 12) {
                Button(action: onEdit) {
                    Image(systemName: "pencil.circle")
                        .font(.title3)
                        .foregroundColor(.blue.opacity(0.8))
                }
                Button { showConfirmDelete = true } label: {
                    Image(systemName: "trash.circle")
                        .font(.title3)
                        .foregroundColor(.red.opacity(0.8))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
        .confirmationDialog("Delete this word?", isPresented: $showConfirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: onDelete)
        }
    }
}

// MARK: - PlayerPickerSheet

struct PlayerPickerSheet: View {
    let playerStore: PlayerStore
    let onPick: (Player) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 12) {
                        Text("Who is entering words?")
                            .font(.headline)
                            .foregroundColor(.gray)
                            .padding(.top)

                        ForEach(playerStore.players) { player in
                            Button { onPick(player) } label: {
                                HStack(spacing: 14) {
                                    if let img = playerStore.loadImage(for: player) {
                                        Image(uiImage: img)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 44, height: 44)
                                            .clipShape(Circle())
                                    } else {
                                        Circle()
                                            .fill(Color.orange.opacity(0.2))
                                            .frame(width: 44, height: 44)
                                            .overlay(
                                                Text(String(player.name.prefix(1)).uppercased())
                                                    .font(.headline)
                                                    .foregroundColor(.orange)
                                            )
                                    }
                                    Text(player.name)
                                        .font(.headline)
                                        .foregroundColor(.white)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.gray)
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.07))
                                )
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 30)
                }
            }
            .navigationTitle("Select Player")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.orange)
                }
            }
        }
    }
}

// MARK: - AddWordSheet

struct AddWordSheet: View {
    let player: Player
    let wordStore: WordStore

    @Environment(\.dismiss) private var dismiss
    @State private var word = ""
    @State private var hint = ""

    // Hold UITextField refs so we can call becomeFirstResponder directly
    @State private var wordField: UITextField?
    @State private var hintField: UITextField?

    var isValid: Bool {
        !word.trimmingCharacters(in: .whitespaces).isEmpty &&
        !hint.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        Text("Adding word for \(player.name)")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .padding(.top)

                        VStack(alignment: .leading, spacing: 8) {
                            Label("Word", systemImage: "text.cursor")
                                .font(.caption)
                                .foregroundColor(.gray)

                            DarkNoResignTextField(
                                placeholder: "Enter the word",
                                text: $word,
                                submitLabel: .next,
                                onSubmit: {
                                    hintField?.becomeFirstResponder()
                                },
                                fieldRef: { tf in
                                    wordField = tf
                                }
                            )
                        }
                        .padding(.horizontal)

                        VStack(alignment: .leading, spacing: 8) {
                            Label("Hint (for the Imposter)", systemImage: "lightbulb")
                                .font(.caption)
                                .foregroundColor(.gray)

                            DarkNoResignTextField(
                                placeholder: "Enter a hint about the word",
                                text: $hint,
                                submitLabel: .done,
                                onSubmit: {
                                    if isValid { addWordAction() }
                                },
                                fieldRef: { tf in
                                    hintField = tf
                                }
                            )
                        }
                        .padding(.horizontal)

                        Text("The imposter will only see this hint, not the actual word.")
                            .font(.caption)
                            .foregroundColor(.gray.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 30)

                        Button {
                            addWordAction()
                        } label: {
                            Text("ADD WORD & MORE")
                        }
                        .buttonStyle(GameButtonStyle())
                        .padding(.horizontal, 40)
                        .disabled(!isValid)
                        .opacity(isValid ? 1.0 : 0.5)
                        .padding(.bottom, 30)
                    }
                }
                .scrollDismissesKeyboard(.never)
            }
            .navigationTitle("Add Word")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.orange)
                }
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    wordField?.becomeFirstResponder()
                }
            }
        }
    }

    private func addWordAction() {
        wordStore.addWord(
            word: word.trimmingCharacters(in: .whitespaces),
            hint: hint.trimmingCharacters(in: .whitespaces),
            byPlayer: player.name
        )
        word = ""
        hint = ""
        // Return focus to word field — keyboard never left so this is seamless
        wordField?.becomeFirstResponder()
    }
}

// MARK: - EditWordSheet

struct EditWordSheet: View {
    let entry: WordEntry
    let wordStore: WordStore
    let playerStore: PlayerStore

    @Environment(\.dismiss) private var dismiss
    @State private var word: String
    @State private var hint: String

    @State private var wordField: UITextField?
    @State private var hintField: UITextField?

    init(entry: WordEntry, wordStore: WordStore, playerStore: PlayerStore) {
        self.entry = entry
        self.wordStore = wordStore
        self.playerStore = playerStore
        _word = State(initialValue: entry.word)
        _hint = State(initialValue: entry.hint)
    }

    var isValid: Bool {
        !word.trimmingCharacters(in: .whitespaces).isEmpty &&
        !hint.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Word", systemImage: "text.cursor")
                            .font(.caption)
                            .foregroundColor(.gray)

                        DarkNoResignTextField(
                            placeholder: "Enter the word",
                            text: $word,
                            submitLabel: .next,
                            onSubmit: {
                                hintField?.becomeFirstResponder()
                            },
                            fieldRef: { tf in
                                wordField = tf
                            }
                        )
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Label("Hint (for the Imposter)", systemImage: "lightbulb")
                            .font(.caption)
                            .foregroundColor(.gray)

                        DarkNoResignTextField(
                            placeholder: "Enter a hint",
                            text: $hint,
                            submitLabel: .done,
                            onSubmit: {
                                if isValid { saveChanges() }
                            },
                            fieldRef: { tf in
                                hintField = tf
                            }
                        )
                    }
                    .padding(.horizontal)

                    Button {
                        saveChanges()
                    } label: {
                        Text("SAVE CHANGES")
                    }
                    .buttonStyle(GameButtonStyle())
                    .padding(.horizontal, 40)
                    .disabled(!isValid)
                    .opacity(isValid ? 1.0 : 0.5)

                    Spacer()
                }
                .padding(.top)
            }
            .navigationTitle("Edit Word")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.orange)
                }
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    wordField?.becomeFirstResponder()
                }
            }
        }
    }

    private func saveChanges() {
        var updated = entry
        updated.word = word.trimmingCharacters(in: .whitespaces)
        updated.hint = hint.trimmingCharacters(in: .whitespaces)
        wordStore.updateWord(updated)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    let wordStore = WordStore()
    let playerStore = PlayerStore()
    playerStore.addPlayer(name: "Daniyal", image: nil)
    playerStore.addPlayer(name: "Hamza", image: nil)
    return WordsManagementView()
        .environment(wordStore)
        .environment(playerStore)
}
