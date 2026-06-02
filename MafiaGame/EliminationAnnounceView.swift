import SwiftUI

struct EliminationAnnounceView: View {
    let player: Player
    let type: EliminationType
    let isMafia: Bool
    let isJester: Bool
    let mafiaCount: Int
    let actualImposters: [Player]
    let onDismiss: () -> Void
    
    @State private var animationPhase: Int = 0 
    @State private var showRealImposter: Bool = false
    
    // Vote out text
    var revealText: String {
        if isJester {
            return "Was Not An Imposter"
        }
        return isMafia ? "Was An Imposter" : "Was Not An Imposter"
    }
    
    var revealColor: Color {
        if isJester {
            return .red
        }
        return isMafia ? .green : .red
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if type == .nightKill {
                swordSliceAnimation
            } else {
                ejectionAnimation
            }
            
            // Imposter Count Screen
            if animationPhase >= 3 {
                imposterCountView
                    .transition(.opacity)
            }
        }
        .onAppear {
            startAnimationSequence()
        }
    }
    
    // MARK: - New Robust Sword Slice Animation
    
    @State private var sliceDistance: CGFloat = 0
    @State private var flashOpacity: Double = 0
    @State private var textOpacity: Double = 0
    
    private var screenBounds: CGRect {
        UIScreen.main.bounds
    }
    
    var swordSliceAnimation: some View {
        let bounds = screenBounds
        let screenWidth = bounds.width
        let screenHeight = bounds.height
        
        return ZStack {
            // 1. Text Layer (Behind image)
            VStack(spacing: 20) {
                Text(player.name.uppercased())
                    .font(.system(size: 55, weight: .black, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                Color(red: 1.0, green: 0.9, blue: 0.5), // Gold
                                Color(red: 0.8, green: 0.1, blue: 0.1)  // Red
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .shadow(color: .black, radius: 2, x: 1, y: 1)
                
                Text("was eliminated")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 1.0, green: 0.2, blue: 0.2))
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.8), radius: 2, x: 1, y: 1)
            }
            .padding(.horizontal, 20)
            .frame(width: screenWidth, height: screenHeight)
            .opacity(textOpacity)
            
            // 2. Image Layer (Split parts)
            ZStack {
                // Top-Right Part
                playerImageContent(width: screenWidth, height: screenHeight)
                    .mask(TopRightTriangle())
                    .offset(x: sliceDistance, y: -sliceDistance)
                
                // Bottom-Left Part
                playerImageContent(width: screenWidth, height: screenHeight)
                    .mask(BottomLeftTriangle())
                    .offset(x: -sliceDistance, y: sliceDistance)
                
                // Flash Line
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.orange, Color.red, Color.orange],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: screenWidth * 2, height: 6)
                    .rotationEffect(.degrees(45))
                    .opacity(flashOpacity)
            }
            .frame(width: screenWidth, height: screenHeight)
            .clipped()
        }
        .edgesIgnoringSafeArea(.all)
    }
    
    private func playerImageContent(width: CGFloat, height: CGFloat) -> some View {
        Group {
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: width, height: height)
                    .clipped()
            } else {
                ZStack {
                    Color.gray
                    Text(String(player.name.prefix(1)).uppercased())
                        .font(.system(size: 100, weight: .bold))
                        .foregroundColor(.white)
                }
                .frame(width: width, height: height)
            }
        }
        .drawingGroup() 
    }
    
    // MARK: - Ejection Animation
    
    @State private var ejectOffset: CGFloat = -500
    @State private var rotation: Double = 0
    
    var ejectionAnimation: some View {
        GeometryReader { geo in
            ZStack {
                StarsView()
                
                if animationPhase >= 2 {
                    VStack(spacing: 16) {
                        Text(player.name)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                        
                        Text(revealText)
                            .font(.title)
                            .fontWeight(.heavy)
                            .foregroundColor(revealColor)
                            .multilineTextAlignment(.center)
                        
                        // Show 'Reveal Imposter' button if this person was NOT the imposter
                        if !isMafia && !isJester {
                            if showRealImposter {
                                VStack(spacing: 8) {
                                    Text("\u{1F3AD} The real Imposters:")
                                        .font(.headline)
                                        .foregroundColor(.orange)
                                        .padding(.bottom, 4)
                                    
                                    ForEach(actualImposters, id: \.id) { imposter in
                                        Text(imposter.name)
                                            .font(.title3)
                                            .fontWeight(.bold)
                                            .foregroundColor(.red)
                                    }
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color.red.opacity(0.1))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 16)
                                                .stroke(Color.red.opacity(0.3), lineWidth: 1)
                                        )
                                )
                                .transition(.opacity.combined(with: .scale(scale: 0.9)))
                            } else {
                                Button {
                                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                                        showRealImposter = true
                                    }
                                } label: {
                                    Label("Continue", systemImage: "arrow.right.circle.fill")
                                        .font(.headline)
                                        .foregroundColor(.black)
                                        .padding(.horizontal, 24)
                                        .padding(.vertical, 12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.orange)
                                        )
                                }
                                .padding(.top, 8)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
                }
                
                if animationPhase >= 1 && animationPhase < 3 {
                    playerImage
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.white, lineWidth: 4))
                        .frame(width: 150, height: 150)
                        .rotationEffect(.degrees(rotation))
                        .position(x: geo.size.width / 2 + ejectOffset, y: geo.size.height / 2)
                }
            }
        }
    }
    
    // MARK: - Imposter Count View (Remaining same)
    
    var imposterCountView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 24) {
                Text("\(mafiaCount) Imposter\(mafiaCount == 1 ? "" : "s") remain")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.red)
                
                if mafiaCount > 0 {
                    HStack(spacing: 12) {
                        ForEach(0..<mafiaCount, id: \.self) { _ in
                            Image(systemName: "person.fill.viewfinder")
                                .font(.title)
                                .foregroundColor(.red.opacity(0.8))
                        }
                    }
                }
            }
        }
        .onTapGesture {
            onDismiss()
        }
    }
    
    // MARK: - Logic & Helpers
    
    @Environment(PlayerStore.self) private var playerStore
    
    private var playerImage: some View {
        Group {
            if let image = playerStore.loadImage(for: player) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    Circle().fill(Color.gray)
                    Text(String(player.name.prefix(1)).uppercased())
                        .font(.system(size: 60, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
    }
    
    private func startAnimationSequence() {
        if type == .nightKill {
            // FASTER SEQUENCE
            
            // 1. Flash
            withAnimation(.linear(duration: 0.1).delay(0.2)) {
                flashOpacity = 1.0
            }
            withAnimation(.linear(duration: 0.1).delay(0.3)) {
                flashOpacity = 0
            }
            
            // 2. Split
            withAnimation(.easeInOut(duration: 1.5).delay(0.4)) {
                sliceDistance = 1500 
                textOpacity = 1.0
                animationPhase = 2
            }
            
            // 3. Count (Quicker transition)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                withAnimation { animationPhase = 3 }
            }
            // 4. Dismiss (Much faster auto-dismiss)
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                onDismiss()
            }
            
        } else {
            // Ejection (Speed up slightly too)
            animationPhase = 1
            withAnimation(.linear(duration: 2.0)) {
                ejectOffset = 500 
                rotation = 720
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                withAnimation { animationPhase = 2 }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                withAnimation { animationPhase = 3 }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                onDismiss()
            }
        }
    }
}

// MARK: - Shapes

struct BottomLeftTriangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: 0, y: rect.height))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        path.closeSubpath()
        return path
    }
}

struct TopRightTriangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        path.closeSubpath()
        return path
    }
}

// Simple Stars background
struct StarsView: View {
    var body: some View {
        GeometryReader { geo in
            ForEach(0..<50, id: \.self) { _ in
                Circle()
                    .fill(Color.white)
                    .frame(width: CGFloat.random(in: 1...3))
                    .position(
                        x: CGFloat.random(in: 0...geo.size.width),
                        y: CGFloat.random(in: 0...geo.size.height)
                    )
                    .opacity(Double.random(in: 0.3...1.0))
            }
        }
    }
}
