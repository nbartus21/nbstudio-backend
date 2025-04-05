//
//  nbprojectApp.swift
//  nbproject
//
//  Created by Bartus Norbert on 05.04.25.
//

import SwiftUI
import UserNotifications

@main
struct nbprojectApp: App {
    // Create a ProjectStore instance to be shared across the app
    @StateObject private var projectStore = ProjectStore()

    // Initialize notification service
    init() {
        // Initialize the NotificationService
        _ = NotificationService.shared
    }

    // Register for remote notifications
    class AppDelegate: NSObject, UIApplicationDelegate {
        func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
            return true
        }

        // Handle device token registration
        func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
            let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
            let token = tokenParts.joined()
            print("Device Token: \(token)")
        }

        // Handle registration errors
        func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
            print("Failed to register for remote notifications: \(error.localizedDescription)")
        }
    }

    // Register the app delegate
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(projectStore)
        }
    }
}
