//
//  ContentView.swift
//  nbproject
//
//  Created by Bartus Norbert on 05.04.25.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var projectStore: ProjectStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Projects tab
            ProjectListView()
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }
                .tag(0)

            // Settings tab
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(1)
        }
    }
}

struct SettingsView: View {
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @State private var showingAbout = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Notifications")) {
                    Toggle("Enable Notifications", isOn: $notificationsEnabled)
                }

                Section(header: Text("About")) {
                    Button("About NB Studio") {
                        showingAbout = true
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
        }
    }
}

struct AboutView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "building.2")
                    .font(.system(size: 80))
                    .foregroundColor(.accentColor)

                Text("NB Studio Project Manager")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Version 1.0")
                    .foregroundColor(.secondary)

                Spacer().frame(height: 20)

                VStack(alignment: .leading, spacing: 10) {
                    Text("This app allows you to access your NB Studio projects on the go.")

                    Text("Features:")
                        .fontWeight(.bold)
                        .padding(.top, 10)

                    Text("• View project details")
                    Text("• Check invoices")
                    Text("• Access project files")
                    Text("• Track project updates")

                    Text("© 2025 NB Studio")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 20)
                }
                .padding()

                Spacer()
            }
            .padding()
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(ProjectStore())
}
