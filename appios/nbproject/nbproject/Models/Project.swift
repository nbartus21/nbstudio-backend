import Foundation

struct Project: Identifiable, Codable {
    var id: String { _id }
    var _id: String
    var name: String
    var description: String
    var status: String
    var client: Client
    var invoices: [Invoice]
    var files: [ProjectFile]
    var changelog: [ChangelogEntry]? // Opcionális, mert nem minden válaszban van jelen
    var sharing: Sharing

    enum CodingKeys: String, CodingKey {
        case _id, name, description, status, client, invoices, files, changelog, sharing
    }

    struct Client: Codable {
        var name: String
        var email: String
        var phone: String
        var companyName: String
        var address: Address

        struct Address: Codable {
            var street: String
            var city: String
            var postalCode: String
            var country: String
        }
    }

    struct Sharing: Codable {
        var token: String
        var pin: String
        var expiresAt: String
        var createdAt: String
    }
}

struct Invoice: Identifiable, Codable {
    var id: String { _id }
    var _id: String
    var number: String
    var date: String
    var dueDate: String
    var status: String
    var totalAmount: Double
    var items: [InvoiceItem]

    enum CodingKeys: String, CodingKey {
        case _id, number, date, dueDate, status, totalAmount, items
    }

    struct InvoiceItem: Identifiable, Codable {
        var id: String { _id }
        var _id: String
        var description: String
        var quantity: Int
        var unitPrice: Double
        var total: Double

        enum CodingKeys: String, CodingKey {
            case _id, description, quantity, unitPrice, total
        }
    }
}

struct ProjectFile: Identifiable, Codable {
    var id: String
    var name: String
    var size: Int
    var type: String
    var uploadedAt: String
    var uploadedBy: String?
    var s3url: String
    var s3key: String?

    enum CodingKeys: String, CodingKey {
        case id, name, size, type, uploadedAt, uploadedBy, s3url, s3key
    }
}

struct ChangelogEntry: Identifiable, Codable {
    var id: String { _id }
    var _id: String
    var title: String
    var description: String
    var date: String
    var type: String
    var createdBy: String

    enum CodingKeys: String, CodingKey {
        case _id, title, description, date, type, createdBy
    }
}
