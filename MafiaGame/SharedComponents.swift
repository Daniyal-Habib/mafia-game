import SwiftUI

// MARK: - Game Button Style

struct GameButtonStyle: ButtonStyle {
    var color: Color = Color(red: 0.8, green: 0.1, blue: 0.1) // Default Red
    var fontSize: CGFloat = 20
    
    func makeBody(configuration: Configuration) -> some View {
        ZStack {
            // Background
            CutCornerShape(cutSize: 10)
                .fill(
                    configuration.isPressed 
                    ? LinearGradient(colors: [Color(white: 0.2), Color.black], startPoint: .top, endPoint: .bottom)
                    : LinearGradient(colors: [color, color.opacity(0.6)], startPoint: .top, endPoint: .bottom)
                )
                .overlay(
                    CutCornerShape(cutSize: 10)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color(red: 1.0, green: 0.9, blue: 0.5), // Pale Gold
                                    Color(red: 0.8, green: 0.6, blue: 0.2), // Dark Gold
                                    Color(red: 1.0, green: 0.9, blue: 0.5)  // Pale Gold
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 3
                        )
                )
                // Inner Highlight
                .overlay(
                    CutCornerShape(cutSize: 10)
                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        .padding(3)
                        .mask(CutCornerShape(cutSize: 10))
                )
                .shadow(color: Color.black.opacity(0.5), radius: 4, x: 0, y: 4)
                .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)

            // Label
            configuration.label
                .font(.system(size: fontSize, weight: .bold, design: .rounded))
                .foregroundColor(Color(red: 1.0, green: 0.95, blue: 0.8)) // Light Gold Text
                .shadow(color: Color.black.opacity(0.6), radius: 1, x: 1, y: 1)
                .padding(.horizontal, 8)
        }
        .frame(height: 55)
    }
}


// MARK: - Shapes

struct CutCornerShape: Shape {
    var cutSize: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        path.move(to: CGPoint(x: cutSize, y: 0))
        path.addLine(to: CGPoint(x: rect.width - cutSize, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: cutSize))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height - cutSize))
        path.addLine(to: CGPoint(x: rect.width - cutSize, y: rect.height))
        path.addLine(to: CGPoint(x: cutSize, y: rect.height))
        path.addLine(to: CGPoint(x: 0, y: rect.height - cutSize))
        path.addLine(to: CGPoint(x: 0, y: cutSize))
        path.closeSubpath()
        
        return path
    }
}
