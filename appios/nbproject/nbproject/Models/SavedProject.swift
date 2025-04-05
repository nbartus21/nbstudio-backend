import Foundation

struct SavedProject: Identifiable, Codable {
    var id = UUID()
    var url: String
    var token: String
    var pin: String
    var name: String
    var lastAccessed: Date
    
    // Computed property to get the full URL
    var fullUrl: URL? {
        return URL(string: url)
    }
}
