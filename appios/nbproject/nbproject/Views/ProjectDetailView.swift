import SwiftUI

struct ProjectDetailView: View {
    @EnvironmentObject var projectStore: ProjectStore
    let savedProject: SavedProject

    @State private var selectedTab = 0
    @State private var isRefreshing = false

    var body: some View {
        VStack {
            if projectStore.isLoading {
                ProgressView("Loading project...")
                    .progressViewStyle(CircularProgressViewStyle())
            } else if let error = projectStore.error {
                VStack {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.red)
                    Text("Error")
                        .font(.title)
                        .padding(.top)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .padding()
                    Button("Try Again") {
                        Task {
                            await projectStore.loadProject(savedProject: savedProject)
                        }
                    }
                    .buttonStyle(.bordered)
                    .padding()
                }
            } else if let project = projectStore.currentProject {
                VStack {
                    // Project header
                    HStack {
                        VStack(alignment: .leading) {
                            Text(project.name)
                                .font(.headline)
                            Text(project.client.name)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        // Status badge
                        Text(project.status)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusColor(for: project.status).opacity(0.2))
                            .foregroundColor(statusColor(for: project.status))
                            .clipShape(Capsule())
                    }
                    .padding(.horizontal)

                    // Tab view
                    TabView(selection: $selectedTab) {
                        // Overview tab
                        ProjectOverviewView(project: project)
                            .tabItem {
                                Label("Overview", systemImage: "house")
                            }
                            .tag(0)

                        // Invoices tab
                        InvoicesView(project: project)
                            .tabItem {
                                Label("Invoices", systemImage: "doc.text")
                            }
                            .tag(1)

                        // Files tab
                        FilesView(project: project)
                            .tabItem {
                                Label("Files", systemImage: "folder")
                            }
                            .tag(2)

                        // Changelog tab
                        ChangelogView(project: project)
                            .tabItem {
                                Label("Changelog", systemImage: "list.bullet")
                            }
                            .tag(3)
                    }
                }
                .refreshable {
                    isRefreshing = true
                    await projectStore.refreshCurrentProject()
                    isRefreshing = false
                }
            } else {
                VStack {
                    Text("No project data")
                        .font(.title)
                    Button("Load Project") {
                        Task {
                            await projectStore.loadProject(savedProject: savedProject)
                        }
                    }
                    .buttonStyle(.bordered)
                    .padding()
                }
            }
        }
        .navigationTitle(savedProject.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    Task {
                        await projectStore.refreshCurrentProject()
                    }
                }) {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isRefreshing || projectStore.isLoading)
            }
        }
        .task {
            if projectStore.currentProject == nil {
                await projectStore.loadProject(savedProject: savedProject)
            }
        }
    }

    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "aktív", "active":
            return .green
        case "befejezett", "completed":
            return .blue
        case "felfüggesztett", "suspended":
            return .orange
        case "törölt", "deleted":
            return .gray
        default:
            return .primary
        }
    }
}

// Tab content views
struct ProjectOverviewView: View {
    let project: Project

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Project description
                GroupBox(label: Label("Description", systemImage: "info.circle")) {
                    Text(project.description)
                        .padding(.top, 8)
                }

                // Client information
                GroupBox(label: Label("Client", systemImage: "person")) {
                    VStack(alignment: .leading, spacing: 8) {
                        InfoRow(label: "Name", value: project.client.name)
                        InfoRow(label: "Email", value: project.client.email)
                        InfoRow(label: "Phone", value: project.client.phone)
                        InfoRow(label: "Company", value: project.client.companyName)

                        Divider()

                        Text("Address")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Text("\(project.client.address.street)")
                        Text("\(project.client.address.postalCode) \(project.client.address.city)")
                        Text("\(project.client.address.country)")
                    }
                    .padding(.top, 8)
                }

                // Stats
                GroupBox(label: Label("Statistics", systemImage: "chart.bar")) {
                    HStack {
                        StatView(title: "Invoices", value: "\(project.invoices.count)", icon: "doc.text")
                        Divider()
                        StatView(title: "Files", value: "\(project.files.count)", icon: "folder")
                        Divider()
                        StatView(title: "Updates", value: "\(project.changelog?.count ?? 0)", icon: "list.bullet")
                    }
                    .padding(.top, 8)
                }
            }
            .padding()
        }
    }
}

struct InvoicesView: View {
    let project: Project

    var body: some View {
        List {
            if project.invoices.isEmpty {
                Text("No invoices available")
                    .foregroundColor(.secondary)
            } else {
                ForEach(project.invoices) { invoice in
                    NavigationLink(destination: InvoiceDetailView(invoice: invoice)) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(invoice.number)
                                    .font(.headline)

                                Spacer()

                                Text("\(invoice.totalAmount, specifier: "%.2f") €")
                                    .font(.headline)
                            }

                            HStack {
                                Text("Due: \(formatDate(invoice.dueDate))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)

                                Spacer()

                                Text(invoice.status)
                                    .font(.caption)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(statusColor(for: invoice.status).opacity(0.2))
                                    .foregroundColor(statusColor(for: invoice.status))
                                    .clipShape(Capsule())
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"

        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }

        return dateString
    }

    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "fizetett", "paid", "bezahlt":
            return .green
        case "kiállított", "issued", "ausgestellt":
            return .blue
        case "késedelmes", "overdue", "überfällig":
            return .red
        case "törölt", "canceled", "storniert":
            return .gray
        default:
            return .primary
        }
    }
}

struct FilesView: View {
    let project: Project

    var body: some View {
        List {
            if project.files.isEmpty {
                Text("No files available")
                    .foregroundColor(.secondary)
            } else {
                ForEach(project.files) { file in
                    Link(destination: URL(string: file.s3url) ?? URL(string: "https://project.nb-studio.net")!) {
                        HStack {
                            Image(systemName: iconForFileType(file.type))
                                .font(.title2)
                                .foregroundColor(.accentColor)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(file.name)
                                    .font(.headline)

                                Text("\(formatFileSize(file.size)) • \(formatDate(file.uploadedAt))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Image(systemName: "arrow.down.circle")
                                .foregroundColor(.accentColor)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }

    private func iconForFileType(_ type: String) -> String {
        if type.contains("image") {
            return "photo"
        } else if type.contains("pdf") {
            return "doc.text"
        } else if type.contains("word") || type.contains("document") {
            return "doc"
        } else if type.contains("excel") || type.contains("spreadsheet") {
            return "chart.bar.xaxis"
        } else {
            return "doc.fill"
        }
    }

    private func formatFileSize(_ size: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(size))
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"

        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .short
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }

        return dateString
    }
}

struct ChangelogView: View {
    let project: Project

    var body: some View {
        List {
            if project.changelog?.isEmpty ?? true {
                Text("No changelog entries available")
                    .foregroundColor(.secondary)
            } else {
                ForEach(project.changelog ?? []) { entry in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: iconForEntryType(entry.type))
                                .foregroundColor(colorForEntryType(entry.type))

                            Text(entry.title)
                                .font(.headline)

                            Spacer()

                            Text(formatDate(entry.date))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Text(entry.description)
                            .font(.body)

                        HStack {
                            Spacer()
                            Text("By \(entry.createdBy)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }

    private func iconForEntryType(_ type: String) -> String {
        switch type.lowercased() {
        case "feature":
            return "star.fill"
        case "fix", "bugfix":
            return "wrench.fill"
        case "improvement":
            return "arrow.up.circle.fill"
        default:
            return "info.circle.fill"
        }
    }

    private func colorForEntryType(_ type: String) -> Color {
        switch type.lowercased() {
        case "feature":
            return .blue
        case "fix", "bugfix":
            return .orange
        case "improvement":
            return .green
        default:
            return .gray
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"

        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }

        return dateString
    }
}

// Helper views
struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)

            Text(value)
                .font(.subheadline)
        }
    }
}

struct StatView: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// Invoice detail view
struct InvoiceDetailView: View {
    let invoice: Invoice

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Invoice header
                HStack {
                    VStack(alignment: .leading) {
                        Text("Invoice #\(invoice.number)")
                            .font(.headline)

                        Text("Issued: \(formatDate(invoice.date))")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Text("Due: \(formatDate(invoice.dueDate))")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Status badge
                    Text(invoice.status)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor(for: invoice.status).opacity(0.2))
                        .foregroundColor(statusColor(for: invoice.status))
                        .clipShape(Capsule())
                }

                Divider()

                // Invoice items
                Text("Items")
                    .font(.headline)

                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text("Description")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        Text("Qty")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(width: 40, alignment: .trailing)

                        Text("Price")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(width: 60, alignment: .trailing)

                        Text("Total")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(width: 70, alignment: .trailing)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemBackground))

                    Divider()

                    // Items
                    ForEach(invoice.items) { item in
                        HStack {
                            Text(item.description)
                                .font(.subheadline)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            Text("\(item.quantity)")
                                .font(.subheadline)
                                .frame(width: 40, alignment: .trailing)

                            Text("\(item.unitPrice, specifier: "%.2f") €")
                                .font(.subheadline)
                                .frame(width: 60, alignment: .trailing)

                            Text("\(item.total, specifier: "%.2f") €")
                                .font(.subheadline)
                                .frame(width: 70, alignment: .trailing)
                        }
                        .padding(.vertical, 8)

                        Divider()
                    }

                    // Total
                    HStack {
                        Spacer()

                        Text("Total:")
                            .font(.headline)

                        Text("\(invoice.totalAmount, specifier: "%.2f") €")
                            .font(.headline)
                            .frame(width: 70, alignment: .trailing)
                    }
                    .padding(.vertical, 8)
                }
                .background(Color(.secondarySystemBackground))
                .cornerRadius(8)
            }
            .padding()
        }
        .navigationTitle("Invoice Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"

        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }

        return dateString
    }

    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "fizetett", "paid", "bezahlt":
            return .green
        case "kiállított", "issued", "ausgestellt":
            return .blue
        case "késedelmes", "overdue", "überfällig":
            return .red
        case "törölt", "canceled", "storniert":
            return .gray
        default:
            return .primary
        }
    }
}

#Preview {
    NavigationView {
        ProjectDetailView(savedProject: SavedProject(url: "https://example.com", token: "token123", pin: "123456", name: "Test Project", lastAccessed: Date()))
            .environmentObject(ProjectStore())
    }
}
