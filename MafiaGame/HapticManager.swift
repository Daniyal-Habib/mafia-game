import CoreHaptics
import UIKit

class HapticManager {
    static let shared = HapticManager()
    
    // Simple feedback generators - more reliable than CoreHaptics
    private var lightImpact: UIImpactFeedbackGenerator
    private var mediumImpact: UIImpactFeedbackGenerator
    private var heavyImpact: UIImpactFeedbackGenerator
    private var selectionFeedback: UISelectionFeedbackGenerator
    
    // For continuous haptics simulation
    private var hapticTimer: Timer?
    private var currentIntensity: Float = 0.5
    
    init() {
        lightImpact = UIImpactFeedbackGenerator(style: .light)
        mediumImpact = UIImpactFeedbackGenerator(style: .medium)
        heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
        selectionFeedback = UISelectionFeedbackGenerator()
        
        // Prepare generators for low-latency playback
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        selectionFeedback.prepare()
        
        // print("HapticManager initialized with UIImpactFeedbackGenerator")
    }
    
    /// Start continuous haptic feedback (simulated with timer)
    func startContinuousHaptic() {
        // print("Starting continuous haptic")
        stopContinuousHaptic() // Stop any existing timer
        
        // Immediately play first impact
        lightImpact.impactOccurred()
        
        // Start timer to play repeated impacts
        hapticTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.playCurrentIntensityHaptic()
        }
    }
    
    /// Update intensity (0.0 to 1.0)
    func updateHaptic(intensity: Float, sharpness: Float) {
        currentIntensity = max(0, min(1, intensity))
    }
    
    /// Stop continuous haptic feedback
    func stopContinuousHaptic() {
        // print("Stopping continuous haptic")
        hapticTimer?.invalidate()
        hapticTimer = nil
        
        // Final "release" feedback
        mediumImpact.impactOccurred()
    }
    
    /// Play haptic based on current intensity
    private func playCurrentIntensityHaptic() {
        if currentIntensity < 0.33 {
            lightImpact.impactOccurred(intensity: CGFloat(currentIntensity * 3))
        } else if currentIntensity < 0.66 {
            mediumImpact.impactOccurred(intensity: CGFloat((currentIntensity - 0.33) * 3))
        } else {
            heavyImpact.impactOccurred(intensity: CGFloat((currentIntensity - 0.66) * 3))
        }
        
        // Re-prepare for next use
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
    }
    
    /// Single tap feedback
    func playTap() {
        selectionFeedback.selectionChanged()
        selectionFeedback.prepare()
    }
    
    /// Scrub feedback for scrolling/swiping
    func playScrub() {
        mediumImpact.impactOccurred(intensity: 1.0)
        mediumImpact.prepare()
    }
    
    /// Success notification
    func playSuccess() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}
