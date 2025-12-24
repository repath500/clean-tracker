# Clean Tracker - Smart Package Tracking System

A minimalist, privacy-first package tracking application with AI-powered insights, universal carrier support, and local-first data storage. Built with modern web technologies to provide a seamless tracking experience without compromising your privacy.

![Clean Tracker](https://img.shields.io/badge/Clean%20Tracker-Smart%20Package%20Tracking-6366F1)
![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Key Features

### 📦 **Universal Package Tracking**
- **Multi-Carrier Support**: Track packages from UPS, FedEx, USPS, DHL, Amazon Logistics, Canada Post, Australia Post, Royal Mail, An Post, DPD, PostNL, GLS, OnTrac, LaserShip, and more
- **Smart Carrier Detection**: Automatically identifies the shipping carrier based on tracking number format
- **Email Parsing**: Paste entire shipping emails and automatically extract tracking numbers
- **Link Support**: Directly paste tracking links from carrier websites

### 🤖 **AI-Powered Intelligence**
- **Natural Language Q&A**: Ask questions like "Where is my package?" or "Why is it stuck?" and get intelligent answers
- **Smart Summaries**: AI analyzes complex tracking histories and provides concise status summaries
- **Chinese Translation**: Automatically translates Chinese tracking updates from carriers like China Post, AliExpress, Temu, and Shein
- **Contextual Insights**: Get explanations for shipping delays, exceptions, and delivery estimates

### 🔒 **Privacy-First Architecture**
- **Local-First Storage**: All tracking data is stored locally in your browser using IndexedDB
- **No Account Required**: Start tracking immediately without registration
- **No Tracking or Analytics**: We don't track your usage or collect personal data
- **Offline Capability**: Access your tracking history even without internet connection

### 🎨 **Modern User Experience**
- **Clean Minimal Design**: Inspired by Notion and Linear with focus on clarity and usability
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Delightful micro-interactions using Framer Motion

### ⚡ **Power User Features**
- **Keyboard Shortcuts**: Navigate quickly without touching your mouse
- **Command Palette**: Fast access to all actions with ⌘K
- **Advanced Search**: Find packages by tracking number, merchant, description, or carrier
- **Smart Filtering**: Filter by status (In Transit, Delivered, Exception), carrier, or custom tags
- **Bulk Operations**: Select multiple packages for batch actions
- **Export Functionality**: Download your tracking data as JSON or CSV

### 🔗 **Sharing & Collaboration**
- **Shareable Links**: Generate secure links to share tracking status with others
- **Real-time Updates**: Shared links always show the latest tracking information
- **No Login Required**: Recipients can view tracking without creating accounts

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Framework**: Next.js 16.1.1 with App Router for optimal performance and SEO
- **Language**: TypeScript for type safety and better developer experience
- **Styling**: Tailwind CSS 4.0 with custom CSS variables for theming
- **UI Components**: Radix UI primitives for accessibility and consistency
- **State Management**: Zustand with persistence middleware for local storage
- **Animations**: Framer Motion for smooth transitions and micro-interactions
- **Icons**: Lucide React for beautiful, consistent iconography

### **Backend & API**
- **API Routes**: Next.js API routes for server-side functionality
- **Web Scraping**: Cheerio-based scraping system for carrier websites
- **Fallback APIs**: Integration with TrackingMore API for backup tracking data
- **AI Integration**: OpenRouter API integration for AI-powered features
- **Caching System**: Intelligent caching to reduce API calls and improve performance

### **Data Storage**
- **Client Storage**: IndexedDB via idb-keyval for reliable local data persistence
- **State Persistence**: Zustand persist middleware with custom storage adapter
- **Cache Management**: Smart caching system with TTL and invalidation strategies

### **Carrier Integration**
The application supports tracking through multiple methods:

1. **Web Scraping**: Primary method using Cheerio to parse carrier websites
2. **API Integration**: Direct API calls where available (TrackingMore)
3. **Pattern Recognition**: Automatic carrier detection from tracking number formats
4. **Fallback Strategies**: Multiple fallback methods for reliable tracking

## 📁 Project Structure

```
clean-tracker/
├── public/                          # Static assets
│   ├── file.svg, globe.svg         # SVG icons and images
│   └── vercel.svg                  # Deployment badges
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── api/                    # API routes
│   │   │   ├── chat/              # AI chat endpoint
│   │   │   ├── parse/             # Email parsing endpoint
│   │   │   ├── share/             # Package sharing endpoint
│   │   │   ├── summarize/         # AI summary endpoint
│   │   │   ├── track/             # Tracking lookup endpoint
│   │   │   └── translate/         # Translation endpoint
│   │   ├── settings/              # Settings page
│   │   ├── track/share/[id]/      # Shared tracking page
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   └── globals.css            # Global styles
│   ├── components/                 # React components
│   │   ├── layout/                # Layout components
│   │   │   ├── header.tsx         # Application header
│   │   │   ├── sidebar.tsx        # Navigation sidebar
│   │   │   └── faq-modal.tsx      # Help and tips modal
│   │   ├── tracking/              # Tracking-specific components
│   │   │   ├── tracking-card.tsx  # Individual package card
│   │   │   ├── tracking-chat.tsx  # AI chat interface
│   │   │   ├── tracking-input.tsx # Tracking number input
│   │   │   ├── tracking-list.tsx  # Package list view
│   │   │   └── tracking-timeline.tsx # Timeline display
│   │   ├── ui/                    # Base UI components
│   │   │   ├── badge.tsx          # Status badges
│   │   │   ├── button.tsx         # Custom buttons
│   │   │   ├── dialog.tsx         # Modal dialogs
│   │   │   ├── dropdown-menu.tsx  # Dropdown menus
│   │   │   ├── input.tsx          # Form inputs
│   │   │   └── [more ui components...]
│   │   ├── command-palette.tsx    # Keyboard command interface
│   │   └── providers.tsx          # React context providers
│   ├── hooks/                     # Custom React hooks
│   │   └── use-keyboard-shortcuts.ts # Keyboard shortcut handling
│   └── lib/                       # Utilities and core logic
│       ├── cache.ts               # Caching system
│       ├── carriers.ts            # Carrier configurations
│       ├── env.ts                 # Environment variables
│       ├── scraper.ts             # Web scraping logic
│       ├── store.ts               # State management
│       ├── trackingmore.ts        # TrackingMore API integration
│       ├── types.ts               # TypeScript type definitions
│       └── utils.ts               # Utility functions
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies and scripts
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This documentation
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ or npm/yarn package manager
- Modern web browser with JavaScript enabled

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/repath500/clean-tracker.git
   cd clean-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   # AI Features (Optional but recommended)
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   
   # TrackingMore API (Optional backup)
   TRACKINGMORE_API_KEY=your_trackingmore_api_key
   
   # Application settings
   APP_URL=http://localhost:3000
   APP_NAME=Clean Tracker
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### **Building for Production**

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘K` | Open Command Palette | Quick access to all actions and navigation |
| `⌘N` | Focus Tracking Input | Jump to the tracking number input field |
| `⌘F` | Search Packages | Open search to find specific packages |
| `⌘,` | Open Settings | Access application preferences |
| `⌘E` | Export Data | Download tracking data as JSON or CSV |
| `J/K` | Navigate Packages | Move up/down through the package list |
| `Enter` | Expand/Collapse | Toggle package details view |
| `⌘/` | Show Help | Display keyboard shortcuts and tips |
| `Escape` | Close Modals | Dismiss any open dialog or modal |

## 🛠️ Configuration

### **Environment Variables**

#### **Required for AI Features**
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

#### **Optional - Backup Tracking API**
```env
TRACKINGMORE_API_KEY=your_trackingmore_api_key
```

#### **Application Settings**
```env
APP_URL=http://localhost:3000
APP_NAME=Clean Tracker
```

### **Supported Carriers**

The application supports tracking for the following carriers:

**Major International Carriers:**
- UPS (United Parcel Service)
- FedEx (Federal Express)
- USPS (United States Postal Service)
- DHL Express
- Amazon Logistics
- Canada Post
- Australia Post
- Royal Mail (UK)
- An Post (Ireland)
- PostNL (Netherlands)
- DPD
- GLS
- OnTrac
- LaserShip

**Chinese Carriers (with translation support):**
- China Post
- China EMS
- Yanwen
- 4PX
- YunExpress

**And many more...**

### **Tracking Number Patterns**

The app automatically detects carriers using these patterns:

- **UPS**: `1Z[A-Z0-9]{16}`
- **FedEx**: `\d{12,22}`
- **USPS**: `(94|93|92|95)\d{20,22}` or `[A-Z]{2}\d{9}US`
- **Amazon**: `TBA\d{12,}`
- **International**: `[A-Z]{2}\d{9}[A-Z]{2}`

## 🤖 AI Features

### **Chat & Q&A**
The AI chat system allows you to ask natural language questions about your packages:

**Example Questions:**
- "Where is my package right now?"
- "Why is my package delayed?"
- "When will my package be delivered?"
- "What's the current status of my Amazon order?"
- "Explain what 'Exception' means for my package"

### **Smart Summaries**
AI analyzes complex tracking histories and provides concise summaries:

**Example Summaries:**
- "Package departed Shanghai facility on Dec 20, currently in transit to Los Angeles, estimated delivery Dec 25"
- "Delivered to mailbox in New York on Dec 22 at 2:30 PM"
- "Package held at customs in Chicago, requires additional documentation"

### **Translation System**
Comprehensive translation for Chinese tracking updates:

- **Status Messages**: Translates shipping status descriptions
- **Location Names**: Converts Chinese cities and facilities to English
- **Carrier Terms**: Translates logistics terminology
- **Fallback System**: Uses hardcoded translations for common terms

## 📊 Data Management

### **Local Storage**
- **IndexedDB**: All data stored locally in browser
- **Automatic Persistence**: Data survives browser restarts
- **No Server Storage**: Your data never leaves your device
- **Export Capability**: Download your data at any time

### **Data Structure**
Each package contains:
- Basic info (tracking number, carrier, status)
- Timeline events with timestamps and locations
- Chat history with AI interactions
- Custom tags and nicknames
- Archive status

### **Privacy Features**
- **No Tracking**: No analytics or usage tracking
- **No Accounts**: No registration or personal data required
- **Local Processing**: AI features work without storing data externally
- **Secure Sharing**: Share links don't expose personal information

## 🔧 Development

### **Code Quality**
```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Format code
npm run format
```

### **Project Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### **Architecture Decisions**

**Next.js App Router**: Chosen for optimal performance, SEO, and modern React patterns
**TypeScript**: Ensures type safety and better developer experience
**Tailwind CSS**: Provides utility-first styling with excellent customization
**Zustand**: Lightweight state management with persistence
**Radix UI**: Accessible component primitives as building blocks
**Framer Motion**: Smooth animations and transitions
**IndexedDB**: Reliable client-side storage with large capacity

## 🚀 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Manual Deployment**
```bash
# Build the application
npm run build

# Upload the .next folder and public folder to your server
# Install dependencies and run: npm start
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Development Guidelines**
- Follow the existing code style and patterns
- Add TypeScript types for new code
- Include comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 API Reference

### **Tracking API**
```typescript
POST /api/track
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "ups", // Optional, auto-detected if not provided
  "forceRefresh": false, // Optional, bypass cache
  "useFallback": false // Optional, use backup API
}
```

### **Chat API**
```typescript
POST /api/chat
{
  "message": "Where is my package?",
  "packageData": {
    "trackingNumber": "1Z999AA10123456784",
    "status": "in_transit",
    "timeline": [...]
  }
}
```

### **Translate API**
```typescript
POST /api/translate
{
  "events": [
    {
      "message": "到达寄达地",
      "location": "上海市"
    }
  ],
  "origin": "中国",
  "destination": "美国"
}
```

## 🔍 Troubleshooting

### **Common Issues**

**Tracking not working:**
- Check if the tracking number format matches the carrier
- Try the "Refresh" button to bypass cache
- Some carriers may require the backup API

**AI features not working:**
- Verify your OpenRouter API key is correctly set
- Check your internet connection
- Some features may be temporarily unavailable

**Data not saving:**
- Ensure browser supports IndexedDB
- Check browser storage permissions
- Try clearing browser cache and re-adding packages

**Performance issues:**
- Too many packages may slow down the app
- Consider archiving old packages
- Clear cache in settings if needed

### **Debug Mode**
Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=true
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - For the excellent framework
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **Framer Motion** - For smooth animations
- **OpenRouter** - For AI API access
- **TrackingMore** - For backup tracking API

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/repath500/clean-tracker/issues)
3. Create a new issue with detailed information
4. Join our community discussions

---

**Clean Tracker** - Built with ❤️ for package tracking simplicity and privacy.

*Track smarter, not harder.*
