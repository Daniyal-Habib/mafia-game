import SwiftUI

struct SettingsView: View {
    @Environment(GlobalSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss
    
    // Theme Colors
    let primaryColor = Color(red: 0.8, green: 0.2, blue: 0.1)
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Gameplay")) {
                    Toggle("Reveal Role on Elimination", isOn: Bindable(settings).revealMafiaOnElimination)
                        .tint(primaryColor)
                    
                    Toggle("Turn Timer", isOn: Bindable(settings).turnTimerEnabled)
                        .tint(primaryColor)
                    
                    if settings.turnTimerEnabled {
                        Picker("Timer Duration", selection: Bindable(settings).turnTimerDuration) {
                            Text("1 Minute").tag(60.0)
                            Text("2 Minutes").tag(120.0)
                            Text("3 Minutes").tag(180.0)
                            Text("5 Minutes").tag(300.0)
                        }
                    }
                }
                
                Section(header: Text("Feedback")) {
                    Toggle("Haptic Feedback", isOn: Bindable(settings).hapticsEnabled)
                        .tint(primaryColor)
                    
                    if settings.hapticsEnabled {
                        VStack(alignment: .leading) {
                            Text("Haptic Strength: \(Int(settings.hapticStrength * 100))%")
                            Slider(value: Bindable(settings).hapticStrength, in: 0.5...1.0, step: 0.1)
                                .tint(primaryColor)
                                .onChange(of: settings.hapticStrength) { _, _ in
                                    // Preview haptic
                                    HapticManager.shared.playTap()
                                }
                        }
                    }
                }
                
                Section(footer: Text("Reset to default settings including timer preferences.")) {
                    Button("Reset All Settings") {
                        // Reset logic here would be nice, but simple persistence init handles defaults
                        // This is currently a placeholder for a 'reset' function on GlobalSettings
                    }
                    .foregroundColor(.red)
                }
                
                Section(header: Text("About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("2.0 Beta")
                            .foregroundColor(.gray)
                    }
                    HStack {
                        Text("Developer")
                        Spacer()
                        Text("Daniyal")
                            .foregroundColor(.gray)
                    }
                }
            }
            .navigationTitle("Global Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(primaryColor)
                    .fontWeight(.bold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    SettingsView()
        .environment(GlobalSettings())
}
