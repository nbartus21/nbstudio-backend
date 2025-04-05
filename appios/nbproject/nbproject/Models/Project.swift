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
    var financial: Financial?
    var sharing: Sharing

    enum CodingKeys: String, CodingKey {
        case _id, name, description, status, client, invoices, files, changelog, financial, sharing
    }

    // Egyedi dekodóló implementáció az opcionális mezők kezeléséhez
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        _id = try container.decode(String.self, forKey: ._id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decode(String.self, forKey: .description)
        status = try container.decode(String.self, forKey: .status)
        client = try container.decode(Client.self, forKey: .client)
        invoices = try container.decode([Invoice].self, forKey: .invoices)
        files = try container.decode([ProjectFile].self, forKey: .files)
        sharing = try container.decode(Sharing.self, forKey: .sharing)

        // Opcionális mezők dekodólása
        changelog = try container.decodeIfPresent([ChangelogEntry].self, forKey: .changelog)
        financial = try container.decodeIfPresent(Financial.self, forKey: .financial)
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
        var pin: String?
        var expiresAt: String
        var createdAt: String
        var hideFiles: Bool?
        var hideDocuments: Bool?

        // Egyedi dekodóló implementáció az opcionális mezők kezeléséhez
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)

            token = try container.decode(String.self, forKey: .token)
            expiresAt = try container.decode(String.self, forKey: .expiresAt)
            createdAt = try container.decode(String.self, forKey: .createdAt)

            // Opcionális mezők dekodólása
            pin = try container.decodeIfPresent(String.self, forKey: .pin)
            hideFiles = try container.decodeIfPresent(Bool.self, forKey: .hideFiles)
            hideDocuments = try container.decodeIfPresent(Bool.self, forKey: .hideDocuments)
        }

        enum CodingKeys: String, CodingKey {
            case token, pin, expiresAt, createdAt, hideFiles, hideDocuments
        }
    }

    struct Financial: Codable {
        var currency: String
        var budget: Budget?

        struct Budget: Codable {
            var min: Double?
            var max: Double?
        }
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
