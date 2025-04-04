# NB Studio Blog Admin Panel

A full-featured admin panel built with React for managing blog posts, customer contacts, and project calculator submissions. The application supports multilingual content management (German, English, Hungarian) and includes AI-powered features for content optimization and customer service.

## Features

### Blog Management
- Create, edit, and delete blog posts
- Multilingual content support (DE, EN, HU)
- SEO optimization assistance
- Automatic content translation
- Scheduled post publishing
- Rich text editing with TinyMCE
- Post status management

### Contact Management
- View and manage customer inquiries
- AI-powered message categorization
- Automated response suggestions
- Priority and status tracking
- Sentiment analysis
- Message tagging system

### Project Calculator
- View and manage project cost calculations
- Detailed project breakdowns
- Status tracking
- AI-powered project analysis
- Customer communication history
- Note-taking functionality

## Technology Stack

### Frontend
- React 18
- React Router for navigation
- TailwindCSS for styling
- Framer Motion for animations
- TinyMCE for rich text editing
- React Intl for internationalization

### Backend
- Express.js
- MongoDB with Mongoose
- CORS support
- Environment variable configuration
- RESTful API architecture

### AI Integration
- DeepSeek API for content analysis
- Automated translations
- SEO optimization suggestions
- Message categorization
- Response generation

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
MONGO_URI=your_mongodb_connection_string
DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── App.jsx
│   │   ├── BlogAdmin.jsx
│   │   ├── BlogCreator.jsx
│   │   ├── ContactAdmin.jsx
│   │   ├── CalculatorAdmin.jsx
│   │   ├── Login.jsx
│   │   ├── Navigation.jsx
│   │   └── SEOAssistant.jsx
│   ├── services/
│   │   └── deepseekService.js
│   ├── models/
│   │   ├── Post.js
│   │   ├── Contact.js
│   │   └── Calculator.js
│   └── routes/
│       ├── posts.js
│       ├── contacts.js
│       └── calculators.js
```

## API Endpoints

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Calculator
- `GET /api/calculators` - Get all calculator entries
- `POST /api/calculators` - Create new calculator entry
- `PUT /api/calculators/:id` - Update calculator entry
- `DELETE /api/calculators/:id` - Delete calculator entry

## Security

- Session-based authentication
- Protected routes
- CORS configuration for specific domains
- Environment variable management

## Development

To contribute to this project:

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Building for Production

```bash
npm run build
```

This will create an optimized production build in the `dist` directory.

## License

This project is private and proprietary. All rights reserved.

## Support

For support, please contact: nbartus21@gmail.com
