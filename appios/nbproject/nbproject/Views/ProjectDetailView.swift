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

                        // Csak az Overview és Invoices tab marad
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
                    // Csak a számlák statisztikáját mutatjuk
                    HStack {
                        StatView(title: "Invoices", value: "\(project.invoices.count)", icon: "doc.text")
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
    @State private var showingPDFPreview = false
    @State private var selectedInvoice: Invoice? = nil

    var body: some View {
        VStack {
            List {
                if project.invoices.isEmpty {
                    Text("No invoices available")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(project.invoices) { invoice in
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

                            // Letöltés gomb
                            HStack {
                                Spacer()

                                Button(action: {
                                    selectedInvoice = invoice
                                    showingPDFPreview = true
                                }) {
                                    HStack {
                                        Image(systemName: "arrow.down.doc.fill")
                                        Text("Download PDF")
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                                }
                            }
                            .padding(.top, 4)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
        }
        .sheet(isPresented: $showingPDFPreview) {
            if let invoice = selectedInvoice {
                InvoicePDFPreview(invoice: invoice)
            }
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

// Eltávolítottuk a FilesView és ChangelogView komponenseket

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

// Invoice PDF Preview
struct InvoicePDFPreview: View {
    let invoice: Invoice
    @Environment(\.presentationMode) var presentationMode
    @State private var isLoading = false
    @State private var pdfURL: URL? = nil

    var body: some View {
        NavigationView {
            VStack {
                if isLoading {
                    ProgressView("Generating PDF...")
                        .progressViewStyle(CircularProgressViewStyle())
                } else if let url = pdfURL {
                    // PDF megjelenítése (valós alkalmazásban PDFKit vagy WebKit nézet lenne)
                    VStack {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                            .padding()

                        Text("PDF Generated")
                            .font(.title)
                            .padding()

                        Text("Invoice #\(invoice.number)")
                            .font(.headline)

                        Text("Total: \(invoice.totalAmount, specifier: "%.2f") €")
                            .padding()

                        Button(action: {
                            // Itt valójában a PDF-et menthetnénk vagy megnyithatnánk
                            // Ebben a példában csak bezárjuk a nézetet
                            presentationMode.wrappedValue.dismiss()
                        }) {
                            HStack {
                                Image(systemName: "square.and.arrow.down")
                                Text("Save PDF")
                            }
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                    }
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 60))
                            .foregroundColor(.orange)

                        Text("Could not generate PDF")
                            .font(.title)

                        Text("Please try again later.")
                            .foregroundColor(.secondary)

                        Button(action: {
                            generatePDF()
                        }) {
                            Text("Try Again")
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .padding()
            .navigationTitle("Invoice PDF")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Close") {
                presentationMode.wrappedValue.dismiss()
            })
            .onAppear {
                generatePDF()
            }
        }
    }

    private func generatePDF() {
        isLoading = true

        // Szimuláljuk a PDF generálást
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // Valós alkalmazásban itt hívnánk egy API-t a PDF generálásához
            // Például: let url = try await APIService.shared.generateInvoicePDF(invoiceId: invoice._id)

            // Szimulált URL
            pdfURL = URL(string: "https://example.com/invoice_\(invoice.number).pdf")
            isLoading = false
        }
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
