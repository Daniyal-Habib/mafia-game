import SwiftUI

/// The discussion/voting phase for Words Imposter.
/// Players discuss clues, then tap someone to vote them out.
struct WordsVotingView: View {
    @Environment(PlayerStore.self) private var playerStore
    @Environment(\.dismiss) private var dismiss

    let session: WordsGameSession

    @State private var playerToVote: Player? = nil
    @State private var showResultFor: Player? = nil
    @State private var navigateToResult = false

    let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.black, Color(red: 0.1, green: 0.05, blue: 0.15)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Text("DISCUSSION TIME")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .tracking(4)

                    Text("Tap a player to vote them out")
                        .font(.headline)
                        .foregroundColor(.white)

                    Text("Who is the Imposter?")
                        .font(.subheadline)
                        .foregroundColor(.orange)
                }
                .padding(.top, 20)

                // Player grid
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(session.players) { player in
                            Button {
                                playerToVote = player
                            } label: {
                                VStack(spacing: 8) {
                                    if let image = playerStore.loadImage(for: player) {
                                        Image(uiImage: image)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 70, height: 70)
                                            .clipShape(Circle())
                                    } else {
                                        Circle()
                                            .fill(Color.orange.opacity(0.3))
                                            .frame(width: 70, height: 70)
                                            .overlay(
                                                Text(String(player.name.prefix(1)).uppercased())
                                                    .font(.title)
                                                    .fontWeight(.bold)
                                                    .foregroundColor(.orange)
                                            )
                                    }

                                    Text(player.name)
                                        .font(.caption)
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                }
                                .padding(.vertical, 12)
                                .padding(.horizontal, 8)
                                .frame(maxWidth: .infinity)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.gray.opacity(0.1))
                                )
                            }
                        }
                    }
                    .padding()
                }

                Spacer()
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Circle().fill(.black.opacity(0.5)))
                }
            }
        }
        .navigationDestination(isPresented: $navigateToResult) {
            if let player = showResultFor {
                WordsVoteResultView(session: session, votedPlayer: player)
            }
        }

        // Custom Confirmation Popup Overlay
        if let player = playerToVote {
            ZStack {
                Color.black.opacity(0.6)
                    .ignoresSafeArea()
                    .onTapGesture {
                        playerToVote = nil
                    }

                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Text("VOTE CONFIRMATION")
                            .font(.caption)
                            .foregroundColor(.red)
                            .tracking(2)

                        Text("Vote out \(player.name)?")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }

                    if let image = playerStore.loadImage(for: player) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 80, height: 80)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.red, lineWidth: 2))
                    } else {
                        Circle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(String(player.name.prefix(1)).uppercased())
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            )
                            .overlay(Circle().stroke(Color.red, lineWidth: 2))
                    }

                    HStack(spacing: 16) {
                        Button("Cancel") {
                            playerToVote = nil
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.15)))

                        Button("Confirm") {
                            session.voteOut(player: player)
                            showResultFor = player
                            playerToVote = nil
                            navigateToResult = true
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.red))
                    }
                }
                .padding(30)
                .background(
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color(red: 0.12, green: 0.12, blue: 0.14))
                )
                .padding(.horizontal, 30)
                .transition(.scale(scale: 0.95).combined(with: .opacity))
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: playerToVote)
        }
    }
}
