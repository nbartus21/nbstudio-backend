import SwiftUI

struct ProjectListView: View {
    @EnvironmentObject var projectStore: ProjectStore
    @State private var showingAddProject = false
    
    var body: some View {
        NavigationView {
            List {
                if projectStore.savedProjects.isEmpty {
                    Text("No projects added yet. Tap the + button to add a project.")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding()
                } else {
                    ForEach(projectStore.savedProjects) { project in
                        NavigationLink(destination: ProjectDetailView(savedProject: project)) {
                            VStack(alignment: .leading) {
                                Text(project.name)
                                    .font(.headline)
                                Text("Last accessed: \(project.lastAccessed.formatted(date: .abbreviated, time: .shortened))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .onDelete(perform: deleteProjects)
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddProject = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddProject) {
                AddProjectView()
            }
        }
    }
    
    private func deleteProjects(at offsets: IndexSet) {
        projectStore.removeProject(at: offsets)
    }
}

#Preview {
    ProjectListView()
        .environmentObject(ProjectStore())
}
