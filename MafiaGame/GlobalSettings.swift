import SwiftUI

@Observable
class GlobalSettings {
    // Keys for persistence
    private let kRevealMafia = "settings_reveal_mafia"
    private let kHapticsEnabled = "settings_haptics_enabled"
    private let kHapticsStrength = "settings_haptics_strength"
    private let kTurnTimerEnabled = "settings_turn_timer_enabled"
    private let kTurnTimerDuration = "settings_turn_timer_duration"
    
    // Properties
    var revealMafiaOnElimination: Bool {
        didSet { UserDefaults.standard.set(revealMafiaOnElimination, forKey: kRevealMafia) }
    }
    
    var hapticsEnabled: Bool {
        didSet { UserDefaults.standard.set(hapticsEnabled, forKey: kHapticsEnabled) }
    }
    
    var hapticStrength: Double { // 0.0 to 1.0 (Light to Heavy)
        didSet { UserDefaults.standard.set(hapticStrength, forKey: kHapticsStrength) }
    }
    
    var turnTimerEnabled: Bool {
        didSet { UserDefaults.standard.set(turnTimerEnabled, forKey: kTurnTimerEnabled) }
    }
    
    var turnTimerDuration: TimeInterval { // in seconds
        didSet { UserDefaults.standard.set(turnTimerDuration, forKey: kTurnTimerDuration) }
    }
    
    init() {
        // Load from UserDefaults or use defaults
        self.revealMafiaOnElimination = UserDefaults.standard.object(forKey: kRevealMafia) as? Bool ?? true
        self.hapticsEnabled = UserDefaults.standard.object(forKey: kHapticsEnabled) as? Bool ?? true
        self.hapticStrength = UserDefaults.standard.object(forKey: kHapticsStrength) as? Double ?? 1.0
        self.turnTimerEnabled = UserDefaults.standard.object(forKey: kTurnTimerEnabled) as? Bool ?? false
        self.turnTimerDuration = UserDefaults.standard.object(forKey: kTurnTimerDuration) as? TimeInterval ?? 120 // 2 minutes
    }
}
