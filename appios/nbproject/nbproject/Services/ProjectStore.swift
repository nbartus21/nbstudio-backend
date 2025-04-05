import Foundation
import SwiftUI

class ProjectStore: ObservableObject {
    @Published var savedProjects: [SavedProject] = []
    @Published var currentProject: Project?
    @Published var isLoading = false
    @Published var error: String?

    private let savedProjectsKey = "savedProjects"

    init() {
        loadSavedProjects()
    }

    // Load saved projects from UserDefaults
    private func loadSavedProjects() {
        if let data = UserDefaults.standard.data(forKey: savedProjectsKey) {
            if let decoded = try? JSONDecoder().decode([SavedProject].self, from: data) {
                self.savedProjects = decoded
            }
        }
    }

    // Save projects to UserDefaults
    private func saveSavedProjects() {
        if let encoded = try? JSONEncoder().encode(savedProjects) {
            UserDefaults.standard.set(encoded, forKey: savedProjectsKey)
        }
    }

    // Add a new project
    func addProject(url: String, token: String, pin: String, name: String) {
        let newProject = SavedProject(url: url, token: token, pin: pin, name: name, lastAccessed: Date())
        savedProjects.append(newProject)
        saveSavedProjects()
    }

    // Remove a project
    func removeProject(at indexSet: IndexSet) {
        savedProjects.remove(atOffsets: indexSet)
        saveSavedProjects()
    }

    // Load project data
    func loadProject(savedProject: SavedProject) async {
        await MainActor.run {
            isLoading = true
            error = nil
        }

        do {
            let project = try await APIService.shared.verifyPin(token: savedProject.token, pin: savedProject.pin)

            // Update last accessed date
            await MainActor.run {
                if let index = savedProjects.firstIndex(where: { $0.id == savedProject.id }) {
                    savedProjects[index].lastAccessed = Date()
                    saveSavedProjects()
                }

                self.currentProject = project
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = "Failed to load project: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    // Refresh current project
    @MainActor
    func refreshCurrentProject() async {
        guard let currentProject = currentProject,
              let savedProject = savedProjects.first(where: { $0.token == currentProject.sharing.token }) else {
            return
        }

        await loadProject(savedProject: savedProject)
    }
}
