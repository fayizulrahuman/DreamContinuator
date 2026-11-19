# 🌙 DreamContinuator

### Where your dreams continue beyond waking.

**DreamContinuator** is an AI-powered web application that transforms unfinished dreams into immersive, creative stories. Describe a dream you remember, customize the mood, genre, language, and creativity level, and let AI imagine what happens next.

Built with modern web technologies and multiple AI providers, DreamContinuator combines creative storytelling with a personalized dream archive.

---

## ✨ Features

### 🧠 AI-Powered Dream Continuation
Turn a short dream description into a detailed, imaginative story that continues naturally from where your dream ended.

### 🎭 Personalized Story Generation
Customize your dream continuation using:

- **Mood:** Choose the emotional atmosphere of the story.
- **Genre:** Explore fantasy, mystery, romance, adventure, and more.
- **Story Length:** Generate short, medium, or long continuations.
- **Creativity Level:** Adjust how imaginative or unpredictable the story becomes.
- **Generation Language:** Create stories in multiple supported languages.

### 🌍 Multilingual Storytelling
Generate dream continuations in different languages, including Malayalam, English, Hindi, Tamil, and more.

The application uses language-specific prompting and script-based validation to reduce unwanted language mixing.

### 🤖 Multi-Model AI Fallback
DreamContinuator supports multiple AI providers:

1. Google Gemini
2. Groq
3. OpenRouter

If one provider is unavailable, the application can automatically attempt another configured provider.

### 🔐 Secure Authentication
Firebase Authentication provides user sign-in, while Firebase Admin verifies authentication tokens on protected backend requests.

### 📚 Personal Dream Archive
Store your generated dreams using MongoDB Atlas.

- Save dream continuations
- Browse previously generated dreams
- Mark favorite dreams
- Delete unwanted dreams
- Access dreams associated with your account

### 🎨 Modern User Interface
A responsive, dream-inspired interface featuring a celestial aesthetic, smooth interactions, and customizable appearance settings.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Frontend | React, JavaScript |
| Build Tool | Vite |
| Styling | CSS |
| Backend | Node.js, Serverless API Functions |
| AI Providers | Google Gemini, Groq, OpenRouter |
| Authentication | Firebase Authentication |
| Server Authentication | Firebase Admin SDK |
| Database | MongoDB Atlas |
| Deployment | Vercel |
| Version Control | Git & GitHub |

---

## 🚀 Getting Started

### Prerequisites

Before starting, make sure you have:

- Node.js installed
- npm installed
- A MongoDB Atlas database
- A Firebase project
- API keys for your chosen AI providers

### 1. Clone the Repository

```bash
git clone https://github.com/fayizulrahuman/DreamContinuator.git
cd DreamContinuator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
# AI Providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# MongoDB Atlas
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=dreamcontinuator

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key

# Firebase Client Configuration
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Additional Firebase client variables may be required depending on your configuration.

Never commit your `.env` file or expose private API credentials in frontend code.

### 4. Start the Development Server

```bash
npm run dev
```

Open:

`http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

---

## ⚙️ How It Works

**Step 1 — Describe Your Dream**

Enter the dream you remember, even if it ended suddenly or feels incomplete.

**Step 2 — Customize the Experience**

Select your preferred mood, genre, story length, language, and creativity level.

**Step 3 — Generate a Continuation**

The backend sends your dream to a configured AI provider. If the request fails, the fallback system can try another provider.

**Step 4 — Read Your Story**

The AI generates a continuation based on the original dream and your preferences.

**Step 5 — Save Your Dream**

Authenticated users can store generated dreams in MongoDB Atlas and revisit them later.

---

## 🏗️ Application Architecture

```text
                    USER
                     |
                     v
               React Frontend
                     |
          +----------+----------+
          |                     |
          v                     v
   Firebase Authentication   Dream Studio
          |                     |
          v                     v
   Firebase Admin          /api/continue
                                |
                                v
                         AI Model Router
                                |
                   +------------+------------+
                   |            |            |
                   v            v            v
                 Gemini        Groq       OpenRouter
                   |            |            |
                   +------------+------------+
                                |
                                v
                      Generated Continuation
                                |
                                v
                           /api/dreams
                                |
                                v
                          MongoDB Atlas
                                |
                                v
                          Dream Archive
```

---

## 📁 Project Structure

Main application files and directories:

```text
DreamContinuator/
│
├── api/
│   ├── lib/
│   │   ├── ai-router.js
│   │   └── mongo-dns.js
│   ├── continue.js
│   └── dreams.js
│
├── src/
│   ├── main.jsx
│   └── styles.css
│
├── public/
│
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

The exact structure may vary as the project develops.

---

## ☁️ Deployment

DreamContinuator is designed for deployment on Vercel.

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Select the Vite framework preset.
4. Configure the required environment variables.
5. Deploy the application.
6. Verify Firebase authentication, AI generation, and MongoDB connectivity.

**Important:** Never expose server-side credentials using the `VITE_` prefix. Only Firebase's public web configuration and other intentionally public values should use that prefix.

---

## 🔒 Security

DreamContinuator uses several security practices:

- Firebase token verification for protected dream endpoints
- User-specific database queries
- Server-side storage of AI provider credentials
- Environment variables for sensitive configuration
- Input validation on API requests

Dream descriptions are personal content. Users should avoid entering passwords or other sensitive information into prompts.

---

## 🔮 Future Improvements

Potential future enhancements include:

- AI-powered dream interpretation
- Dream visualization using image generation
- Voice-to-dream input
- Dream tags and advanced search
- Dream statistics and recurring-theme analysis
- Exporting dream stories as PDF
- Sharing selected dream stories

---

## 👨‍💻 Developer

**Fayizul Rahuman S**

GitHub: [@fayizulrahuman](https://github.com/fayizulrahuman)

Explore more projects on my GitHub profile.

---

## 📄 License

Copyright © 2026 Fayizul Rahuman S.

No open-source license has been specified yet. See the repository for any future licensing updates.

---

**DreamContinuator — Because every dream deserves an ending. 🌙**