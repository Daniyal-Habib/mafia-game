import SwiftUI

struct SplashScreenView: View {
    @State private var isActive = false
    @State private var size = 0.8
    @State private var opacity = 0.5
    
    // Theme Colors
    let primaryColor = Color(red: 0.8, green: 0.2, blue: 0.1) // Dark Red
    let secondaryColor = Color(red: 1.0, green: 0.5, blue: 0.0) // Orange
    
    var body: some View {
        if isActive {
            HomeView()
        } else {
            ZStack {
                Color.black.ignoresSafeArea()
                
                VStack {
                    ZStack {
                        // Glow
                        Circle()
                            .fill(primaryColor.opacity(0.4))
                            .frame(width: 150, height: 150)
                            .blur(radius: 20)
                        
                        Image(systemName: "moon.stars.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [primaryColor, secondaryColor],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    .scaleEffect(size)
                    .opacity(opacity)
                    .onAppear {
                        withAnimation(.easeIn(duration: 1.2)) {
                            self.size = 1.0
                            self.opacity = 1.0
                        }
                    }
                    
                    Text("MAFIA AMONGUS")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.8, green: 0.2, blue: 0.1).opacity(0.8))
                        .padding(.top, 20)
                        .opacity(opacity)
                }
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    withAnimation {
                        self.isActive = true
                    }
                }
            }
        }
    }
}

#Preview {
    SplashScreenView()
        .environment(PlayerStore())
}
