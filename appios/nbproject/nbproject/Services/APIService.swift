import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL = "https://admin.nb-studio.net:5001/api"
    private let apiKey = "qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0"

    private init() {}

    // Verify PIN and get project data
    func verifyPin(token: String, pin: String?) async throws -> Project {
        do {
            let url = URL(string: "\(baseURL)/verify-pin")!

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.addValue(apiKey, forHTTPHeaderField: "X-API-Key")

            var body: [String: String] = [
                "token": token
            ]

            // Add PIN if available
            if let pin = pin {
                body["pin"] = pin
            }

            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode != 200 {
                // Try to parse error message from response
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorJson["message"] as? String {
                    print("API Error: \(errorMessage)")
                    throw APIError.serverError(message: errorMessage)
                } else {
                    print("HTTP Error: \(httpResponse.statusCode)")
                    throw APIError.httpError(statusCode: httpResponse.statusCode)
                }
            }

            // Print response data for debugging
            print("Response data: \(String(data: data, encoding: .utf8) ?? "<invalid data>")")

            let decoder = JSONDecoder()
            // Ne használjunk automatikus konverziót, mert az _id mezővel problémát okoz
            // decoder.keyDecodingStrategy = .convertFromSnakeCase

            do {
                // A szerver a projektet egy 'project' mezőben adja vissza
                struct ProjectResponse: Codable {
                    let project: Project
                }

                let response = try decoder.decode(ProjectResponse.self, from: data)
                return response.project
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error: error)
            }
        } catch {
            print("API Error in verifyPin: \(error)")
            throw error
        }
    }

    // Get project invoices
    func getInvoices(token: String) async throws -> [Invoice] {
        do {
            let url = URL(string: "\(baseURL)/public/projects/\(token)/invoices")!

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.addValue(apiKey, forHTTPHeaderField: "X-API-Key")

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode != 200 {
                print("HTTP Error: \(httpResponse.statusCode)")
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            // Ne használjunk automatikus konverziót, mert az _id mezővel problémát okoz
            // decoder.keyDecodingStrategy = .convertFromSnakeCase

            return try decoder.decode([Invoice].self, from: data)
        } catch {
            print("API Error in getInvoices: \(error)")
            throw error
        }
    }

    // Get project files
    func getFiles(token: String) async throws -> [ProjectFile] {
        do {
            let url = URL(string: "\(baseURL)/public/shared-projects/\(token)/files")!

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.addValue(apiKey, forHTTPHeaderField: "X-API-Key")

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode != 200 {
                print("HTTP Error: \(httpResponse.statusCode)")
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            // Ne használjunk automatikus konverziót, mert az _id mezővel problémát okoz
            // decoder.keyDecodingStrategy = .convertFromSnakeCase

            return try decoder.decode([ProjectFile].self, from: data)
        } catch {
            print("API Error in getFiles: \(error)")
            throw error
        }
    }

    // Get project changelog
    func getChangelog(token: String) async throws -> [ChangelogEntry] {
        do {
            // Javított végpont a changelog lekéréséhez
            let url = URL(string: "\(baseURL)/public/shared-projects/\(token)/changelog")!

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.addValue(apiKey, forHTTPHeaderField: "X-API-Key")

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode != 200 {
                print("HTTP Error: \(httpResponse.statusCode)")
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            // Ne használjunk automatikus konverziót, mert az _id mezővel problémát okoz
            // decoder.keyDecodingStrategy = .convertFromSnakeCase

            return try decoder.decode([ChangelogEntry].self, from: data)
        } catch {
            print("API Error in getChangelog: \(error)")
            throw error
        }
    }

    // Upload file to project
    func uploadFile(token: String, fileName: String, fileData: Data, mimeType: String) async throws -> ProjectFile {
        do {
            let url = URL(string: "\(baseURL)/public/shared-projects/\(token)/files")!

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.addValue(apiKey, forHTTPHeaderField: "X-API-Key")

            let base64Data = fileData.base64EncodedString()

            let body: [String: Any] = [
                "name": fileName,
                "size": fileData.count,
                "type": mimeType,
                "content": base64Data,
                "uploadedAt": ISO8601DateFormatter().string(from: Date()),
                "uploadedBy": "iOS App"
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode != 201 {
                print("HTTP Error: \(httpResponse.statusCode)")
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            // Print response data for debugging
            print("Response data: \(String(data: data, encoding: .utf8) ?? "<invalid data>")")

            let responseDict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let fileDict = responseDict?["file"] as? [String: Any]

            guard let fileData = try? JSONSerialization.data(withJSONObject: fileDict ?? [:]) else {
                throw APIError.invalidData
            }

            let decoder = JSONDecoder()
            // Ne használjunk automatikus konverziót, mert az _id mezővel problémát okoz
            // decoder.keyDecodingStrategy = .convertFromSnakeCase

            return try decoder.decode(ProjectFile.self, from: fileData)
        } catch {
            print("API Error in uploadFile: \(error)")
            throw error
        }
    }
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case invalidData
    case httpError(statusCode: Int)
    case serverError(message: String)
    case decodingError(error: Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid server response"
        case .invalidData:
            return "Invalid data received"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .serverError(let message):
            return message
        case .decodingError(let error):
            return "Failed to decode data: \(error.localizedDescription)"
        }
    }
}
