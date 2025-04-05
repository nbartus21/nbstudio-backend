import Foundation
import UserNotifications
import UIKit

class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    private override init() {
        super.init()
        requestAuthorization()
        setupNotificationDelegate()
    }

    // Request notification authorization
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("Notification authorization granted")
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } else if let error = error {
                print("Notification authorization denied: \(error.localizedDescription)")
            }
        }
    }

    // Setup notification delegate
    private func setupNotificationDelegate() {
        UNUserNotificationCenter.current().delegate = self
    }

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("Notification tapped with userInfo: \(userInfo)")
        completionHandler()
    }

    // Schedule a notification
    func scheduleNotification(title: String, body: String, identifier: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling notification: \(error.localizedDescription)")
            }
        }
    }

    // Schedule a notification for a new invoice
    func notifyNewInvoice(projectName: String, invoiceNumber: String) {
        let title = "New Invoice"
        let body = "A new invoice (\(invoiceNumber)) has been added to project \(projectName)"
        let identifier = "invoice-\(invoiceNumber)-\(Date().timeIntervalSince1970)"

        scheduleNotification(title: title, body: body, identifier: identifier)
    }

    // Schedule a notification for a new changelog entry
    func notifyNewChangelogEntry(projectName: String, entryTitle: String) {
        let title = "Project Update"
        let body = "New update in project \(projectName): \(entryTitle)"
        let identifier = "changelog-\(projectName)-\(Date().timeIntervalSince1970)"

        scheduleNotification(title: title, body: body, identifier: identifier)
    }
}
