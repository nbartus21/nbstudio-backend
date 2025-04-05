import SwiftUI

struct AddProjectView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var projectStore: ProjectStore
    
    @State private var projectUrl = "https://project.nb-studio.net/shared-project/"
    @State private var projectToken = ""
    @State private var projectPin = ""
    @State private var projectName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Project Information")) {
                    TextField("Project Name", text: $projectName)
                        .autocapitalization(.words)
                }
                
                Section(header: Text("Project URL")) {
                    TextField("Project URL", text: $projectUrl)
                        .autocapitalization(.none)
                        .keyboardType(.URL)
                        .disabled(true)
                    
                    TextField("Project Token", text: $projectToken)
                        .autocapitalization(.none)
                        .onChange(of: projectToken) { newValue in
                            if projectName.isEmpty && !newValue.isEmpty {
                                projectName = "Project \(newValue.prefix(6))"
                            }
                        }
                }
                
                Section(header: Text("Security")) {
                    SecureField("PIN Code", text: $projectPin)
                        .keyboardType(.numberPad)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button(action: addProject) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else {
                            Text("Add Project")
                        }
                    }
                    .disabled(isLoading || projectToken.isEmpty || projectPin.isEmpty || projectName.isEmpty)
                    .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .navigationTitle("Add Project")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func addProject() {
        guard !projectToken.isEmpty, !projectPin.isEmpty, !projectName.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        // Construct the full URL
        let fullUrl = projectUrl + projectToken
        
        // Add the project to the store
        projectStore.addProject(url: fullUrl, token: projectToken, pin: projectPin, name: projectName)
        
        // Dismiss the sheet
        dismiss()
    }
}

#Preview {
    AddProjectView()
        .environmentObject(ProjectStore())
}
