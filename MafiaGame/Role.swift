import SwiftUI

enum Role: String, CaseIterable, Codable, Identifiable {
    case mafia = "Mafia"
    case crewmate = "Crewmate"
    case doctor = "Doctor"
    case investigator = "Investigator"
    case jester = "Jester"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .mafia: return "person.fill.viewfinder"
        case .crewmate: return "person.fill"
        case .doctor: return "cross.case.fill"
        case .investigator: return "magnifyingglass"
        case .jester: return "theatermasks.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .mafia: return .red
        case .crewmate: return .blue
        case .doctor: return .green
        case .investigator: return .yellow
        case .jester: return .purple
        }
    }
    
    var team: Team {
        switch self {
        case .mafia: return .mafia
        case .crewmate, .doctor, .investigator: return .crew
        case .jester: return .neutral
        }
    }
    
    var description: String {
        switch self {
        case .mafia: return "Kill crewmates at night"
        case .crewmate: return "Find and eliminate the mafia"
        case .doctor: return "Save one player each night"
        case .investigator: return "Investigate one player each night"
        case .jester: return "Get voted out to win"
        }
    }
    
    enum Team: String {
        case mafia = "Mafia"
        case crew = "Crew"
        case neutral = "Neutral"
    }
}
